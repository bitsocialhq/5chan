import { Fragment, memo, useEffect, useReducer } from 'react';
import { useAccount, usePkcRpcSettings } from '@bitsocial/bitsocial-react-hooks';
import { useTranslation } from 'react-i18next';
import { getCountryFlagPosition, getCountryLabel, normalizeCountryCode } from '../../../lib/country-flags';
import {
  fetchIpMapLocation,
  fetchOwnIpCountryCode,
  fetchOwnPublicEndpoint,
  fetchPeerMapLocation,
  getApproximateCountryCode,
  getFirstPublicIpFromAddresses,
  isPrivateOrReservedIpv4,
  type PeerMapLocation,
  type PublicEndpoint,
} from '../../../lib/peer-geo';
import { getP2PRuntimeMode, type P2PRuntimeMode } from '../../../lib/p2p-runtime';
import PeerWorldMap from './peer-world-map';
import styles from './p2p-stats-settings.module.css';

type AccountShape = Record<string, any>;

type TextStatRow = {
  name: string;
  type?: 'text';
  value: string;
};

type ConnectedPeerEntry = {
  address: string;
  countryCode?: string;
  direction?: string;
  id: string;
  location?: PeerMapLocation;
  peerId: string;
  role?: PeerConnectionRole;
  status?: string;
  transport: string;
};

type PeerConnectionRole = 'leecher' | 'seeder';

type PeerMapEntry = {
  address: string;
  id: string;
  location?: PeerMapLocation;
  peerId: string;
  role?: PeerConnectionRole;
};

type ConnectedPeersStatRow = {
  connectionCount: number;
  entries: ConnectedPeerEntry[];
  mapEntries?: PeerMapEntry[];
  name: string;
  peerCount: number;
  type: 'connectedPeers';
};

type NodeEndpointStatRow = {
  countryCode?: string;
  ip: string;
  name: string;
  type: 'nodeEndpoint';
};

type StatRow = ConnectedPeersStatRow | NodeEndpointStatRow | TextStatRow;

type StatsState = {
  error?: string;
  loading: boolean;
  rows: StatRow[];
  updatedAt?: number;
};

type StatsAction =
  | {
      type: 'loading';
    }
  | {
      rows: StatRow[];
      timestamp: number;
      type: 'loaded';
    }
  | {
      error: string;
      timestamp: number;
      type: 'failed';
    };

type Libp2pClientShape = {
  _helia?: {
    libp2p?: {
      components?: {
        addressManager?: Libp2pAddressManagerShape;
      };
      getConnections?: () => unknown[] | Promise<unknown[]>;
      getMultiaddrs?: () => unknown[] | Promise<unknown[]>;
      getPeers?: () => unknown[] | Promise<unknown[]>;
      peerId?: { toString: () => string };
      services?: {
        pubsub?: {
          getPeers?: () => unknown[] | Promise<unknown[]>;
        };
      };
      metrics?: unknown;
    };
    metrics?: unknown;
    routing?: {
      routers?: unknown[];
    };
  };
  heliaWithKuboRpcClientFunctions?: {
    add?: unknown;
  };
  key?: string;
};

type Libp2pAddressManagerShape = {
  getAddressesWithMetadata?: () => unknown[] | Promise<unknown[]>;
  getObservedAddrs?: () => unknown[] | Promise<unknown[]>;
};

type BrowserLibp2pShape = NonNullable<NonNullable<NonNullable<Libp2pClientShape['_helia']>['libp2p']>>;

type PkcRpcClientShape = {
  getPeers?: () => unknown | Promise<unknown>;
  getStats?: () => unknown | Promise<unknown>;
  state?: string;
};

type TransferStats = {
  downloadedBytes?: number;
  uploadedBytes?: number;
};

type ObservedTransferStats = {
  connections: WeakSet<object>;
  downloadedBytes: number;
  streams: WeakSet<object>;
  uploadedBytes: number;
};

const KUBO_API_URL = 'http://localhost:50019/api/v0';
const SEEDER_REPO_URL = 'https://github.com/bitsocialnet/bitsocial-seeder';
const STATS_REFRESH_MS = 5000;
const MAX_TRANSFER_COUNTER_DEPTH = 10;
const MAX_TRANSFER_COUNTER_OBJECTS = 400;
const observedBrowserTransferStats = new WeakMap<object, ObservedTransferStats>();

const statsReducer = (state: StatsState, action: StatsAction): StatsState => {
  if (action.type === 'loading') return { ...state, error: undefined, loading: true };
  if (action.type === 'loaded') return { loading: false, rows: action.rows, updatedAt: action.timestamp };
  return { error: action.error, loading: false, rows: [], updatedAt: action.timestamp };
};

const getErrorMessage = (error: unknown, fallback = 'Error') => (error instanceof Error ? error.message : String(error || fallback));

const formatCount = (count: number, singular: string, plural = `${singular}s`) => `${count} ${count === 1 ? singular : plural}`;

const formatBytes = (value: unknown) => {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) return String(value ?? 'unknown');
  if (numericValue < 1024) return `${numericValue} B`;
  const units = ['KB', 'MB', 'GB', 'TB'];
  let size = numericValue / 1024;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  return `${size.toFixed(size >= 10 ? 1 : 2)} ${units[unitIndex]}`;
};

const formatOptionalBytes = (value: unknown) => (getFiniteNumber(value) === undefined ? 'unknown' : formatBytes(value));

const getFirstObjectValue = <T,>(value?: Record<string, T>) => (value ? Object.values(value)[0] : undefined);

const isRecord = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object';

const getStringValue = (value: unknown, fallback = 'unknown') => {
  if (value === null || value === undefined) return fallback;
  try {
    const stringValue = String(value);
    return stringValue || fallback;
  } catch {
    return fallback;
  }
};

const getFiniteNumber = (value: unknown) => {
  if (value === null || value === undefined) return undefined;
  const numericValue = typeof value === 'bigint' ? Number(value) : Number(value);
  return Number.isFinite(numericValue) ? numericValue : undefined;
};

const addTransferStats = (stats: TransferStats, direction: keyof TransferStats, value: unknown) => {
  const numericValue = getFiniteNumber(value);
  if (numericValue === undefined) return;
  stats[direction] = (stats[direction] ?? 0) + numericValue;
};

const getEntries = (value: unknown): [string, unknown][] => {
  try {
    if (value instanceof Map) return Array.from(value.entries()).map(([key, entry]) => [String(key), entry]);
    if (Array.isArray(value)) return value.map((entry, index) => [String(index), entry]);
    if (isRecord(value)) return Object.entries(value);
    return [];
  } catch {
    return [];
  }
};

const toArray = (value: unknown): unknown[] => {
  if (Array.isArray(value)) return value;
  if (value && typeof value === 'object' && Symbol.iterator in value) return Array.from(value as Iterable<unknown>);
  return [];
};

const getRecordField = (record: unknown, fields: string[]) => {
  if (!isRecord(record)) return undefined;
  for (const field of fields) {
    if (field in record) return record[field];
  }
  return undefined;
};

const getStringField = (record: unknown, fields: string[], fallback = '') => {
  const value = getRecordField(record, fields);
  if (Array.isArray(value)) return getStringValue(value[0], fallback);
  return getStringValue(value, fallback);
};

const getAddressValues = (value: unknown): string[] => {
  const iterableValues = Array.isArray(value) ? value : toArray(value);
  const values = iterableValues.length ? iterableValues : [value];
  return values.flatMap((entry) => {
    const address = getStringValue(entry, '');
    return address ? [address] : [];
  });
};

const getNestedValue = (source: unknown, path: string[]) => {
  let current = source;
  for (const key of path) {
    if (!isRecord(current) || !(key in current)) return undefined;
    current = current[key];
  }
  return current;
};

const getFirstNestedValue = (source: unknown, paths: string[][]) => {
  for (const path of paths) {
    const value = getNestedValue(source, path);
    if (value !== undefined) return value;
  }
  return undefined;
};

const getSafeArray = async (getValue?: () => unknown[] | Promise<unknown[]> | undefined): Promise<unknown[]> => {
  try {
    return toArray(getValue ? await getValue() : undefined);
  } catch {
    return [];
  }
};

const getAddressManagerAddresses = async (libp2p?: BrowserLibp2pShape): Promise<unknown[]> => {
  const addressManager = isRecord(libp2p?.components) ? (libp2p.components.addressManager as Libp2pAddressManagerShape | undefined) : undefined;
  const [observedAddrs, addressesWithMetadata] = await Promise.all([
    getSafeArray(() => addressManager?.getObservedAddrs?.()),
    getSafeArray(() => addressManager?.getAddressesWithMetadata?.()),
  ]);
  return [
    ...observedAddrs,
    ...addressesWithMetadata.flatMap((entry) => {
      const address = isRecord(entry) ? (entry.multiaddr ?? entry.address) : entry;
      return address ? [address] : [];
    }),
  ];
};

const getFirstPkcRpcClient = (account?: AccountShape) => getFirstObjectValue(account?.pkc?.clients?.pkcRpcClients) as PkcRpcClientShape | undefined;

const getPkcRpcUrls = (account?: AccountShape) => {
  const optionUrls = Array.isArray(account?.pkcOptions?.pkcRpcClientsOptions) ? account.pkcOptions.pkcRpcClientsOptions : [];
  const clientUrls = isRecord(account?.pkc?.clients?.pkcRpcClients) ? Object.keys(account.pkc.clients.pkcRpcClients) : [];
  return [...new Set([...optionUrls, ...clientUrls].filter((url): url is string => typeof url === 'string' && url.trim().length > 0))];
};

const getByteLength = (value: unknown): number | undefined => {
  if (value === null || value === undefined) return undefined;
  if (typeof value === 'string') return new TextEncoder().encode(value).byteLength;
  if (value instanceof ArrayBuffer) return value.byteLength;
  if (ArrayBuffer.isView(value)) return value.byteLength;
  if (isRecord(value)) {
    const directByteLength = getFiniteNumber(value.byteLength);
    if (directByteLength !== undefined) return directByteLength;
    const dataByteLength = getByteLength(value.data);
    if (dataByteLength !== undefined) return dataByteLength;
  }
  if (Array.isArray(value)) {
    const total = value.reduce((sum, entry) => sum + (getByteLength(entry) ?? 0), 0);
    return total > 0 ? total : undefined;
  }
  return undefined;
};

const getTransferStatsFromHeliaCounters = (helia: unknown): TransferStats => {
  const stats: TransferStats = {};
  const visited = new WeakSet<object>();
  let objectsVisited = 0;

  const visit = (value: unknown, depth: number) => {
    try {
      if (!isRecord(value) || visited.has(value) || depth > MAX_TRANSFER_COUNTER_DEPTH || objectsVisited > MAX_TRANSFER_COUNTER_OBJECTS) return;
      visited.add(value);
      objectsVisited++;

      if ('bytesReceived' in value || 'bytesSent' in value) {
        addTransferStats(stats, 'downloadedBytes', value.bytesReceived);
        addTransferStats(stats, 'uploadedBytes', value.bytesSent);
      }

      for (const [key, entry] of getEntries(value)) {
        if (typeof entry === 'function' || key === 'logger' || key === 'log' || key === 'events' || key === 'datastore' || key === 'routing') continue;
        visit(entry, depth + 1);
      }
    } catch {
      return;
    }
  };

  visit(helia, 0);
  return stats;
};

const classifyTransferMetricPath = (path: string[]) => {
  const normalizedPath = path
    .join('_')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
  if (normalizedPath.includes('rate')) return undefined;
  if (
    normalizedPath.includes('totalin') ||
    normalizedPath.includes('bytesreceived') ||
    normalizedPath.includes('receivedbytes') ||
    normalizedPath.includes('datareceivedbytes')
  ) {
    return 'downloadedBytes' as const;
  }
  if (
    normalizedPath.includes('totalout') ||
    normalizedPath.includes('bytessent') ||
    normalizedPath.includes('sentbytes') ||
    normalizedPath.includes('datasentbytes') ||
    normalizedPath.includes('sentdatabytes')
  ) {
    return 'uploadedBytes' as const;
  }
  return undefined;
};

const getMetricSnapshot = async (source: unknown) => {
  if (!isRecord(source)) return source;
  const snapshots = await Promise.all(
    ['getMetrics', 'getMetricValues', 'toJSON'].map(async (method) => {
      const candidate = source[method];
      if (typeof candidate !== 'function') return undefined;
      try {
        return await candidate.call(source);
      } catch {
        return undefined;
      }
    }),
  );
  return snapshots.find((snapshot) => snapshot !== undefined) ?? source;
};

const getTransferStatsFromMetricSnapshot = (snapshot: unknown): TransferStats => {
  const stats: TransferStats = {};
  const visited = new WeakSet<object>();

  const visit = (value: unknown, path: string[], depth: number) => {
    const direction = classifyTransferMetricPath(path);
    const numericValue = getFiniteNumber(value);
    if (direction && numericValue !== undefined) {
      addTransferStats(stats, direction, numericValue);
      return;
    }

    if (!isRecord(value) || visited.has(value) || depth > MAX_TRANSFER_COUNTER_DEPTH) return;
    visited.add(value);

    if (direction && 'global' in value) {
      addTransferStats(stats, direction, value.global);
      return;
    }

    if (direction && 'value' in value) {
      addTransferStats(stats, direction, value.value);
      return;
    }

    for (const [key, entry] of getEntries(value)) visit(entry, [...path, key], depth + 1);
  };

  visit(snapshot, [], 0);
  return stats;
};

const mergeTransferStats = (primary: TransferStats, fallback: TransferStats): TransferStats => ({
  downloadedBytes: primary.downloadedBytes ?? fallback.downloadedBytes,
  uploadedBytes: primary.uploadedBytes ?? fallback.uploadedBytes,
});

const getTransferStatsFromClientShape = (client?: Libp2pClientShape): TransferStats => {
  const clientRecord = isRecord(client) ? (client as Record<string, unknown>) : undefined;
  const statsSources = [clientRecord, clientRecord?.stats, clientRecord?.sessionStats].filter(Boolean);
  return statsSources.reduce<TransferStats>((stats, source) => {
    if (!isRecord(source)) return stats;
    const downloadedBytes = source.totalIn ?? source.downloadedBytes ?? source.bytesReceived ?? source.receivedBytes;
    const uploadedBytes = source.totalOut ?? source.uploadedBytes ?? source.bytesSent ?? source.sentBytes;
    addTransferStats(stats, 'downloadedBytes', downloadedBytes);
    addTransferStats(stats, 'uploadedBytes', uploadedBytes);
    return stats;
  }, {});
};

const getObservedTransferStats = (client?: Libp2pClientShape): ObservedTransferStats | undefined => {
  if (!isRecord(client)) return undefined;
  let stats = observedBrowserTransferStats.get(client);
  if (!stats) {
    stats = {
      connections: new WeakSet<object>(),
      downloadedBytes: 0,
      streams: new WeakSet<object>(),
      uploadedBytes: 0,
    };
    observedBrowserTransferStats.set(client, stats);
  }
  return stats;
};

const instrumentStreamTransferStats = (stream: unknown, stats: ObservedTransferStats) => {
  if (!isRecord(stream) || stats.streams.has(stream)) return;
  stats.streams.add(stream);

  const send = stream.send;
  if (typeof send === 'function') {
    try {
      stream.send = function sendWithTransferStats(this: unknown, data: unknown, ...args: unknown[]) {
        addTransferStats(stats, 'uploadedBytes', getByteLength(data));
        return send.call(this, data, ...args);
      };
    } catch {
      // Some stream implementations may expose read-only methods.
    }
  }

  const addEventListener = stream.addEventListener;
  if (typeof addEventListener === 'function') {
    try {
      addEventListener.call(stream, 'message', (event: unknown) => {
        const data = isRecord(event) ? (event.data ?? event.detail) : undefined;
        addTransferStats(stats, 'downloadedBytes', getByteLength(data));
      });
    } catch {
      return;
    }
  }
};

const instrumentConnectionTransferStats = (connection: unknown, stats: ObservedTransferStats) => {
  if (!isRecord(connection)) return;

  if (!stats.connections.has(connection)) {
    stats.connections.add(connection);
    const newStream = connection.newStream;
    if (typeof newStream === 'function') {
      try {
        connection.newStream = async function newStreamWithTransferStats(this: unknown, ...args: unknown[]) {
          const stream = await newStream.apply(this, args);
          instrumentStreamTransferStats(stream, stats);
          return stream;
        };
      } catch {
        // Some connection implementations may expose read-only methods.
      }
    }
  }

  for (const stream of toArray(connection.streams)) instrumentStreamTransferStats(stream, stats);
};

const getBrowserTransferStats = async (client?: Libp2pClientShape, connections: unknown[] = []): Promise<TransferStats> => {
  try {
    const helia = client?._helia;
    const observedStats = getObservedTransferStats(client);
    if (observedStats) connections.forEach((connection) => instrumentConnectionTransferStats(connection, observedStats));

    const clientStats = getTransferStatsFromClientShape(client);
    const counterStats = getTransferStatsFromHeliaCounters(helia);
    const metricSources = [helia?.metrics, helia?.libp2p?.metrics].filter(Boolean);
    const metricSnapshots = await Promise.all(metricSources.map((source) => getMetricSnapshot(source)));
    const metricStats = metricSnapshots
      .map((snapshot) => getTransferStatsFromMetricSnapshot(snapshot))
      .reduce<TransferStats>((stats, nextStats) => mergeTransferStats(stats, nextStats), {});

    return mergeTransferStats(mergeTransferStats(mergeTransferStats(clientStats, counterStats), metricStats), observedStats ?? {});
  } catch {
    return {};
  }
};

const getFunctionSource = (value: unknown) => {
  if (typeof value !== 'function') return undefined;
  try {
    return Function.prototype.toString.call(value).toLowerCase();
  } catch {
    return undefined;
  }
};

const hasSupportedAdd = (client?: Libp2pClientShape) => {
  const add = client?.heliaWithKuboRpcClientFunctions?.add;
  const source = getFunctionSource(add);
  return typeof add === 'function' && !source?.includes('not supported') && !source?.includes('unsupported');
};

const isKnownNoopProvide = (provide: unknown) => {
  const source = getFunctionSource(provide);
  if (typeof provide !== 'function') return true;
  return Boolean(source?.includes('noop') || source?.replace(/\s/g, '') === 'asyncprovide(){}');
};

const hasProviderPublishingRouter = (client?: Libp2pClientShape) =>
  (client?._helia?.routing?.routers ?? []).some((router) => isRecord(router) && !isKnownNoopProvide(router.provide));

const getBrowserMode = (client?: Libp2pClientShape) => {
  if (!client) return 'Unknown';
  return hasSupportedAdd(client) && hasProviderPublishingRouter(client) ? 'Seeding' : 'Leeching';
};

const getEndpointAddress = (ip: string) => (ip.includes(':') ? `/ip6/${ip}/tcp/0` : `/ip4/${ip}/tcp/0`);

const isIpv4Address = (value: string) => /^\d{1,3}(?:\.\d{1,3}){3}$/.test(value);

const isLikelyPublicIp = (value: string) => {
  const ip = value.trim();
  if (!ip) return false;
  if (isIpv4Address(ip)) return !isPrivateOrReservedIpv4(ip);
  if (!ip.includes(':')) return false;
  const normalized = ip.toLowerCase();
  return normalized !== '::1' && !normalized.startsWith('fe80:') && !normalized.startsWith('fc') && !normalized.startsWith('fd');
};

const getHostnameFromUrl = (url: string) => {
  try {
    return new URL(url).hostname.replace(/^\[|\]$/g, '');
  } catch {
    return undefined;
  }
};

const resolveEndpointFromIp = async (ip: string, signal?: AbortSignal): Promise<PublicEndpoint | undefined> => {
  if (!isLikelyPublicIp(ip)) return undefined;
  const location = await fetchIpMapLocation(ip, signal);
  return {
    countryCode: location?.countryCode ?? getApproximateCountryCode(getEndpointAddress(ip)),
    ip,
    location,
  };
};

const resolveEndpointFromHost = async (hostname: string, signal?: AbortSignal): Promise<PublicEndpoint | undefined> => {
  const normalizedHostname = hostname.trim().toLowerCase();
  if (!normalizedHostname || normalizedHostname === 'localhost') return undefined;
  return isLikelyPublicIp(normalizedHostname) ? resolveEndpointFromIp(normalizedHostname, signal) : undefined;
};

const getTransportLabel = (address: string) => {
  const normalizedAddress = address.toLowerCase();
  let transport = 'Unknown transport';
  if (normalizedAddress.includes('/webtransport')) transport = 'WebTransport';
  else if (normalizedAddress.includes('/webrtc-direct')) transport = 'WebRTC direct';
  else if (normalizedAddress.includes('/webrtc')) transport = 'WebRTC';
  else if (normalizedAddress.includes('/wss')) transport = 'Secure WebSocket';
  else if (normalizedAddress.includes('/ws')) transport = 'WebSocket';
  else if (normalizedAddress.includes('/quic')) transport = 'QUIC';
  else if (normalizedAddress.includes('/tcp')) transport = 'TCP';
  else if (normalizedAddress.includes('/udp')) transport = 'UDP';

  return normalizedAddress.includes('/p2p-circuit') ? `${transport} through relay` : transport;
};

const getConnectionPeerId = (connection: unknown) => (isRecord(connection) ? getStringValue(connection.remotePeer) : 'unknown');

const getConnectionAddress = (connection: unknown) => (isRecord(connection) ? getStringValue(connection.remoteAddr, 'address unavailable') : 'address unavailable');

const getBrowserConnectedPeersRow = (peers: unknown[], connections: unknown[]): ConnectedPeersStatRow => {
  const entries = connections.map<ConnectedPeerEntry>((connection) => {
    const address = getConnectionAddress(connection);
    const peerId = getConnectionPeerId(connection);
    const fallbackId = `${peerId}-${address}`;
    return {
      address,
      direction: isRecord(connection) ? getStringValue(connection.direction, '') : undefined,
      id: isRecord(connection) ? getStringValue(connection.id, fallbackId) : fallbackId,
      peerId,
      status: isRecord(connection) ? getStringValue(connection.status, '') : undefined,
      transport: getTransportLabel(address),
    };
  });
  const peerIds = [...peers, ...entries].reduce<Set<string>>((ids, peerOrEntry) => {
    const peerId = isRecord(peerOrEntry) && 'peerId' in peerOrEntry ? getStringValue(peerOrEntry.peerId) : getStringValue(peerOrEntry);
    if (peerId && peerId !== 'unknown') ids.add(peerId);
    return ids;
  }, new Set());

  return {
    connectionCount: connections.length,
    entries,
    name: 'Connected peers',
    peerCount: peerIds.size || entries.length,
    type: 'connectedPeers',
  };
};

const PEER_LIST_FIELDS = ['Peers', 'peers', 'connectedPeers', 'connections'];
const PEER_ADDRESS_FIELDS = ['Addr', 'address', 'addr', 'remoteAddr', 'multiaddr', 'multiaddrString'];
const PEER_ID_FIELDS = ['Peer', 'peer', 'peerId', 'id', 'remotePeer'];
const PEER_DIRECTION_FIELDS = ['Direction', 'direction'];
const PEER_STATUS_FIELDS = ['Status', 'status', 'state'];
const PEER_ROLE_FIELDS = ['role', 'Role', 'mode', 'Mode', 'connectionRole', 'connectionType'];
const PEER_LISTEN_ADDRESS_FIELDS = ['listenAddress', 'listenAddresses', 'ListenAddress', 'ListenAddresses'];

const normalizePeerRecords = (peers: unknown): unknown[] => {
  if (isRecord(peers)) {
    for (const field of PEER_LIST_FIELDS) {
      const value = peers[field];
      if (Array.isArray(value)) return value;
    }
    return Object.values(peers);
  }
  return toArray(peers);
};

const getPeerAddress = (peer: unknown) => {
  const address = getStringField(peer, PEER_ADDRESS_FIELDS, '');
  if (address) return address;
  const listenAddress = getAddressValues(getRecordField(peer, PEER_LISTEN_ADDRESS_FIELDS))[0];
  return listenAddress || 'address unavailable';
};

const normalizePeerRole = (value: unknown): PeerConnectionRole | undefined => {
  const role = getStringValue(value, '').toLowerCase();
  if (!role) return undefined;
  if (role.includes('leech') || role === 'client') return 'leecher';
  if (role.includes('seed') || role === 'server') return 'seeder';
  return undefined;
};

const getListenAddressRole = (peer: unknown): PeerConnectionRole | undefined => {
  if (!isRecord(peer)) return undefined;
  for (const field of PEER_LISTEN_ADDRESS_FIELDS) {
    if (!(field in peer)) continue;
    return getAddressValues(peer[field]).length > 0 ? 'seeder' : 'leecher';
  }
  return undefined;
};

const getPeerConnectionRole = (peer: unknown) => normalizePeerRole(getRecordField(peer, PEER_ROLE_FIELDS)) ?? getListenAddressRole(peer);

const getConnectedPeersRowFromRecords = (peers: unknown): ConnectedPeersStatRow => {
  const peerRecords = normalizePeerRecords(peers);
  const entries = peerRecords.map<ConnectedPeerEntry>((peer, index) => {
    const address = getPeerAddress(peer);
    const peerId = getStringField(peer, PEER_ID_FIELDS, getStringValue(peer, 'unknown'));
    const direction = getStringField(peer, PEER_DIRECTION_FIELDS, '');
    const status = getStringField(peer, PEER_STATUS_FIELDS, '');
    const fallbackId = `${peerId}-${address}-${direction}-${index}`;
    return {
      address,
      direction: direction || undefined,
      id: fallbackId,
      peerId,
      role: getPeerConnectionRole(peer),
      status: status || undefined,
      transport: getTransportLabel(address),
    };
  });
  const peerIds = entries.reduce<Set<string>>((ids, entry) => {
    if (entry.peerId && entry.peerId !== 'unknown') ids.add(entry.peerId);
    return ids;
  }, new Set());
  const peerCount = getFiniteNumber(getRecordField(peers, ['peerCount', 'peersCount', 'PeerCount']));
  const connectionCount = getFiniteNumber(getRecordField(peers, ['connectionCount', 'connectionsCount', 'ConnectionCount']));

  return {
    connectionCount: connectionCount ?? entries.length,
    entries,
    name: 'Connected peers',
    peerCount: peerCount ?? (peerIds.size || entries.length),
    type: 'connectedPeers',
  };
};

const resolveConnectedPeerLocations = async (row: ConnectedPeersStatRow, signal?: AbortSignal): Promise<ConnectedPeersStatRow> => {
  if (!row.entries.length) return row;
  const lookups = new Map<string, Promise<PeerMapLocation | undefined>>();
  const entries = await Promise.all(
    row.entries.map(async (entry) => {
      let lookup = lookups.get(entry.address);
      if (!lookup) {
        lookup = fetchPeerMapLocation(entry.address, signal);
        lookups.set(entry.address, lookup);
      }
      const location = await lookup;
      if (!location) return entry;
      return {
        ...entry,
        countryCode: location.countryCode ?? entry.countryCode,
        location,
      };
    }),
  );
  return { ...row, entries };
};

// Resolves the "Your IP" row from observed node addresses for browser/full-node
// paths. Electron Kubo uses resolveKuboOwnEndpoint below because its address list
// can include relay/circuit endpoints owned by other peers.
const resolveOwnEndpoint = async (addresses: unknown[], signal?: AbortSignal): Promise<PublicEndpoint | undefined> => {
  const ip = getFirstPublicIpFromAddresses(addresses);
  if (ip) {
    const [countryCode, location] = await Promise.all([fetchOwnIpCountryCode(ip, signal), fetchIpMapLocation(ip, signal)]);
    return {
      countryCode: location?.countryCode ?? countryCode ?? getApproximateCountryCode(getEndpointAddress(ip)),
      ip,
      location,
    };
  }
  return fetchOwnPublicEndpoint(signal);
};

const resolveKuboOwnEndpoint = async (addresses: unknown[], signal?: AbortSignal): Promise<PublicEndpoint | undefined> => {
  const endpoint = await fetchOwnPublicEndpoint(signal);
  if (endpoint) return endpoint;
  const directAddresses = addresses.filter((address) => !getStringValue(address, '').toLowerCase().includes('/p2p-circuit'));
  return resolveOwnEndpoint(directAddresses.length ? directAddresses : addresses, signal);
};

const getOwnMapEntry = (endpoint: PublicEndpoint | undefined, mode: string): PeerMapEntry[] => {
  if (!endpoint?.location) return [];
  return [
    {
      address: getEndpointAddress(endpoint.ip),
      id: 'self-node-endpoint',
      location: endpoint.location,
      peerId: 'Your node',
      role: mode === 'Leeching' ? 'leecher' : 'seeder',
    },
  ];
};

const getPeerMapEntries = (row: ConnectedPeersStatRow): PeerMapEntry[] =>
  row.entries.map((entry) => ({
    address: entry.address,
    id: entry.id,
    location: entry.location,
    peerId: entry.peerId,
    role: entry.role ?? 'seeder',
  }));

const getElectronConnectedPeersRow = (peers: unknown): ConnectedPeersStatRow => getConnectedPeersRowFromRecords(peers);

const getAddressListFromRecord = (record: unknown) =>
  [
    ...getAddressValues(getRecordField(record, ['Addresses', 'addresses'])),
    ...getAddressValues(getRecordField(record, ['listenAddress', 'listenAddresses', 'ListenAddress', 'ListenAddresses'])),
    ...getAddressValues(getRecordField(record, ['multiaddr', 'multiaddrs', 'Multiaddrs'])),
  ].filter(Boolean);

const getBrowserLibp2pStats = async (account?: AccountShape, signal?: AbortSignal): Promise<StatRow[]> => {
  const client = getFirstObjectValue(account?.pkc?.clients?.libp2pJsClients) as Libp2pClientShape | undefined;
  const libp2p = client?._helia?.libp2p;
  const [peers, connections, multiaddrs, addressManagerAddresses] = await Promise.all([
    getSafeArray(() => libp2p?.getPeers?.()),
    getSafeArray(() => libp2p?.getConnections?.()),
    getSafeArray(() => libp2p?.getMultiaddrs?.()),
    getAddressManagerAddresses(libp2p),
  ]);
  const localAddresses = connections.flatMap((connection) => {
    const localAddr = isRecord(connection) ? connection.localAddr : undefined;
    return localAddr ? [localAddr] : [];
  });
  const connectedPeersRow = getBrowserConnectedPeersRow(peers, connections);
  const mode = getBrowserMode(client);
  const [transferStats, nodeEndpoint, connectedPeers] = await Promise.all([
    getBrowserTransferStats(client, connections),
    resolveOwnEndpoint([...multiaddrs, ...addressManagerAddresses, ...localAddresses], signal),
    resolveConnectedPeerLocations(connectedPeersRow, signal),
  ]);
  const connectedPeersWithMapEntries = {
    ...connectedPeers,
    mapEntries: [...getOwnMapEntry(nodeEndpoint, mode), ...getPeerMapEntries(connectedPeers)],
  };

  return [
    { name: 'Mode', value: mode },
    { name: 'Peer ID', value: libp2p?.peerId?.toString() ?? 'unknown' },
    nodeEndpoint ? { countryCode: nodeEndpoint.countryCode, ip: nodeEndpoint.ip, name: 'Your IP', type: 'nodeEndpoint' } : { name: 'Your IP', value: 'unavailable' },
    { name: 'Data received', value: transferStats.downloadedBytes === undefined ? 'unknown' : formatBytes(transferStats.downloadedBytes) },
    { name: 'Data sent', value: transferStats.uploadedBytes === undefined ? 'unknown' : formatBytes(transferStats.uploadedBytes) },
    connectedPeersWithMapEntries,
  ];
};

const getFullNodeRpcEndpoint = async (account?: AccountShape, signal?: AbortSignal): Promise<PublicEndpoint | undefined> => {
  const hostnames = getPkcRpcUrls(account).flatMap((rpcUrl) => {
    const hostname = getHostnameFromUrl(rpcUrl);
    return hostname ? [hostname] : [];
  });
  const hasRemoteHost = hostnames.some((hostname) => hostname !== 'localhost' && hostname !== '127.0.0.1' && hostname !== '::1');
  const endpoints = await Promise.all(hostnames.map((hostname) => resolveEndpointFromHost(hostname, signal)));
  const endpoint = endpoints.find(Boolean);
  if (endpoint) return endpoint;
  return hasRemoteHost ? undefined : fetchOwnPublicEndpoint(signal);
};

const isImplementedRpcMethod = (method: unknown): method is () => unknown | Promise<unknown> => {
  if (typeof method !== 'function') return false;
  const source = getFunctionSource(method);
  return !source?.includes('not implemented');
};

const callPkcRpcMethod = async (client: PkcRpcClientShape | undefined, methodName: 'getPeers' | 'getStats') => {
  const method = client?.[methodName];
  if (!isImplementedRpcMethod(method)) return undefined;
  try {
    return await method.call(client);
  } catch {
    return undefined;
  }
};

const getRpcIdentity = (stats: unknown) => getFirstNestedValue(stats, [['identity'], ['Identity'], ['id'], ['node']]);

const getRpcPeerId = (stats: unknown) => {
  const identity = getRpcIdentity(stats);
  return getStringValue(getRecordField(identity, ['ID', 'id', 'PeerID', 'peerId']) ?? getRecordField(stats, ['ID', 'id', 'PeerID', 'peerId']));
};

const getRpcAgent = (stats: unknown) => {
  const identity = getRpcIdentity(stats);
  return getStringValue(getRecordField(identity, ['AgentVersion', 'agentVersion', 'agent']) ?? getRecordField(stats, ['AgentVersion', 'agentVersion', 'agent']));
};

const getRpcBandwidthValue = (stats: unknown, fields: string[][]) => getFirstNestedValue(stats, fields);

const getFullNodeRpcStats = async (account?: AccountShape, rpcState?: string, signal?: AbortSignal): Promise<StatRow[]> => {
  const rpcClient = getFirstPkcRpcClient(account);
  const [stats, rpcPeers] = await Promise.all([callPkcRpcMethod(rpcClient, 'getStats'), callPkcRpcMethod(rpcClient, 'getPeers')]);
  const identity = getRpcIdentity(stats);
  const statsAddresses = [...getAddressListFromRecord(identity), ...getAddressListFromRecord(stats)];
  const peerRecords = rpcPeers ?? getFirstNestedValue(stats, [['peers'], ['Peers'], ['connectedPeers'], ['connections']]);
  const connectedPeers = await resolveConnectedPeerLocations(getConnectedPeersRowFromRecords(peerRecords), signal);
  const nodeEndpoint = statsAddresses.length ? await resolveOwnEndpoint(statsAddresses, signal) : await getFullNodeRpcEndpoint(account, signal);
  const connectedPeersWithMapEntries = {
    ...connectedPeers,
    mapEntries: [...getOwnMapEntry(nodeEndpoint, 'Seeding'), ...getPeerMapEntries(connectedPeers)],
  };
  const bandwidthIn = getRpcBandwidthValue(stats, [
    ['bandwidth', 'TotalIn'],
    ['bandwidth', 'totalIn'],
    ['Bandwidth', 'TotalIn'],
    ['TotalIn'],
    ['totalIn'],
    ['downloadedBytes'],
  ]);
  const bandwidthOut = getRpcBandwidthValue(stats, [
    ['bandwidth', 'TotalOut'],
    ['bandwidth', 'totalOut'],
    ['Bandwidth', 'TotalOut'],
    ['TotalOut'],
    ['totalOut'],
    ['uploadedBytes'],
  ]);

  return [
    { name: 'Mode', value: 'Seeding' },
    { name: 'PKC RPC', value: rpcClient?.state ?? rpcState ?? 'unknown' },
    { name: 'Peer ID', value: getRpcPeerId(stats) },
    nodeEndpoint ? { countryCode: nodeEndpoint.countryCode, ip: nodeEndpoint.ip, name: 'Your IP', type: 'nodeEndpoint' } : { name: 'Your IP', value: 'unavailable' },
    ...(getRpcAgent(stats) !== 'unknown' ? [{ name: 'Agent', value: getRpcAgent(stats) } satisfies TextStatRow] : []),
    { name: 'Data received', value: formatOptionalBytes(bandwidthIn) },
    { name: 'Data sent', value: formatOptionalBytes(bandwidthOut) },
    connectedPeersWithMapEntries,
  ];
};

const kuboPostJson = async (path: string, params?: Record<string, string | boolean>, signal?: AbortSignal) => {
  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params ?? {})) searchParams.set(key, String(value));
  const query = searchParams.toString();
  const response = await fetch(`${KUBO_API_URL}/${path}${query ? `?${query}` : ''}`, { method: 'POST', signal });
  if (!response.ok) throw new Error(`Kubo ${path} returned ${response.status}`);
  const text = await response.text();
  const firstJsonLine = text
    .split('\n')
    .map((line) => line.trim())
    .find(Boolean);
  return firstJsonLine ? JSON.parse(firstJsonLine) : {};
};

const getElectronKuboStats = async (signal?: AbortSignal): Promise<StatRow[]> => {
  const [identity, peers, bandwidth] = await Promise.all([
    kuboPostJson('id', undefined, signal),
    kuboPostJson('swarm/peers', { direction: true, latency: true, streams: true }, signal),
    kuboPostJson('stats/bw', undefined, signal),
  ]);
  const peerId = getStringValue(identity.ID, 'unknown');
  const [nodeEndpoint, connectedPeers] = await Promise.all([
    resolveKuboOwnEndpoint(getAddressListFromRecord(identity), signal),
    resolveConnectedPeerLocations(getElectronConnectedPeersRow(peers), signal),
  ]);
  const connectedPeersWithMapEntries = {
    ...connectedPeers,
    mapEntries: [...getOwnMapEntry(nodeEndpoint, 'Seeding'), ...getPeerMapEntries(connectedPeers)],
  };

  return [
    { name: 'Mode', value: 'Seeding' },
    { name: 'Kubo RPC', value: KUBO_API_URL },
    { name: 'Peer ID', value: peerId },
    nodeEndpoint ? { countryCode: nodeEndpoint.countryCode, ip: nodeEndpoint.ip, name: 'Your IP', type: 'nodeEndpoint' } : { name: 'Your IP', value: 'unavailable' },
    { name: 'Data received', value: formatOptionalBytes(bandwidth.TotalIn) },
    { name: 'Data sent', value: formatOptionalBytes(bandwidth.TotalOut) },
    connectedPeersWithMapEntries,
  ];
};

const getP2PStats = async (mode: P2PRuntimeMode, account?: AccountShape, rpcState?: string, signal?: AbortSignal) => {
  if (mode === 'browser-libp2p') return getBrowserLibp2pStats(account, signal);
  if (mode === 'full-node-rpc') return getFullNodeRpcStats(account, rpcState, signal);
  return getElectronKuboStats(signal);
};

const NodeEndpointValue = ({ row }: { row: NodeEndpointStatRow }) => {
  const countryCode = normalizeCountryCode(row.countryCode);
  const flagPosition = getCountryFlagPosition(countryCode);
  const countryLabel = getCountryLabel(row.countryCode);

  return (
    <span className={styles.nodeEndpoint}>
      {flagPosition && (
        <span
          aria-label={countryLabel}
          className={styles.peerFlag}
          role='img'
          style={{ backgroundPosition: `-${flagPosition.x}px -${flagPosition.y}px` }}
          title={countryLabel}
        />
      )}
      <span className={styles.nodeIp}>{row.ip}</span>
    </span>
  );
};

const StatValueCell = ({ row }: { row: TextStatRow }) => {
  if (row.name === 'Mode' && row.value === 'Leeching') {
    return (
      <>
        Leeching (
        <a href={SEEDER_REPO_URL} rel='noopener noreferrer' target='_blank'>
          want to seed?
        </a>
        )
      </>
    );
  }
  return row.value;
};

const ConnectedPeersValue = ({ row }: { row: ConnectedPeersStatRow }) => (
  <details data-testid='connected-peers' open>
    <summary className={styles.connectedPeersSummary}>
      {row.name}: {formatCount(row.peerCount, 'peer')}, {formatCount(row.connectionCount, 'connection')}
    </summary>
    <PeerWorldMap peers={row.mapEntries ?? row.entries} />
    <div className={styles.connectedPeerList}>
      {row.entries.length ? (
        row.entries.map((entry) => {
          const countryCode = entry.countryCode ?? getApproximateCountryCode(entry.address);
          const flagPosition = getCountryFlagPosition(countryCode);
          return (
            <div className={styles.connectedPeer} key={entry.id}>
              <div className={styles.connectedPeerMeta}>
                <span className={styles.connectionTransport}>{entry.transport}</span>
                {entry.direction && (
                  <span className={styles.connectionDirection} data-direction={entry.direction}>
                    {entry.direction}
                  </span>
                )}
                {entry.status && (
                  <span className={styles.connectionStatus} data-status={entry.status}>
                    {entry.status}
                  </span>
                )}
                {entry.role && (
                  <span className={styles.connectionRole} data-peer-role={entry.role}>
                    {entry.role === 'leecher' ? 'Leeching' : 'Seeding'}
                  </span>
                )}
              </div>
              <div className={styles.peerId} title={entry.peerId}>
                {entry.peerId}
              </div>
              <div className={styles.connectionAddressRow}>
                {flagPosition && (
                  <span
                    aria-label={getCountryLabel(countryCode)}
                    className={styles.peerFlag}
                    role='img'
                    style={{ backgroundPosition: `-${flagPosition.x}px -${flagPosition.y}px` }}
                    title={getCountryLabel(countryCode)}
                  />
                )}
                <code className={styles.connectionAddress} title={entry.address}>
                  {entry.address}
                </code>
              </div>
            </div>
          );
        })
      ) : (
        <div className={styles.connectedPeerEmpty}>No active peer addresses</div>
      )}
    </div>
  </details>
);

const P2PStatsSettings = () => {
  const { t } = useTranslation();
  const account = useAccount() as AccountShape | undefined;
  const pkcRpcSettings = usePkcRpcSettings();
  const mode = getP2PRuntimeMode(account);
  const [statsState, dispatchStats] = useReducer(statsReducer, { loading: !!mode, rows: [] });
  const updatedAtLabel = statsState.updatedAt ? new Date(statsState.updatedAt).toLocaleTimeString() : undefined;

  useEffect(() => {
    const abortController = new AbortController();
    const { signal } = abortController;
    const activeMode = mode;
    const rpcState = pkcRpcSettings?.state;

    if (!activeMode) return () => abortController.abort();

    const refreshStats = async () => {
      dispatchStats({ type: 'loading' });
      try {
        const rows = await getP2PStats(activeMode, account, rpcState, signal);
        if (!signal.aborted) dispatchStats({ rows, timestamp: Date.now(), type: 'loaded' });
      } catch (error) {
        if (!signal.aborted) {
          dispatchStats({
            error: getErrorMessage(error),
            timestamp: Date.now(),
            type: 'failed',
          });
        }
      }
    };

    void refreshStats();
    const intervalId = window.setInterval(refreshStats, STATS_REFRESH_MS);
    return () => {
      abortController.abort();
      window.clearInterval(intervalId);
    };
  }, [account, mode, pkcRpcSettings?.state]);

  return (
    <div className={styles.content} data-testid='p2p-stats-settings-panel'>
      {mode ? (
        <>
          <table className={styles.stats}>
            <tbody>
              {statsState.rows.map((row) =>
                row.type === 'connectedPeers' ? (
                  <Fragment key={row.name}>
                    {updatedAtLabel && (
                      <tr>
                        <td className={styles.statName}>{t('p2p_stats_updated')}</td>
                        <td className={styles.statValue}>{updatedAtLabel}</td>
                      </tr>
                    )}
                    <tr>
                      <td className={styles.connectedPeersCell} colSpan={2}>
                        <ConnectedPeersValue row={row} />
                      </td>
                    </tr>
                  </Fragment>
                ) : row.type === 'nodeEndpoint' ? (
                  <tr key={row.name}>
                    <td className={styles.statName}>{row.name}</td>
                    <td className={styles.statValue}>
                      <NodeEndpointValue row={row} />
                    </td>
                  </tr>
                ) : (
                  <tr key={row.name}>
                    <td className={styles.statName}>{row.name}</td>
                    <td className={styles.statValue}>
                      <StatValueCell row={row} />
                    </td>
                  </tr>
                ),
              )}
            </tbody>
          </table>
          <div className={styles.statsMeta}>
            {statsState.loading ? t('p2p_stats_loading') : null}
            {statsState.error && <div className={styles.error}>{statsState.error}</div>}
          </div>
        </>
      ) : (
        <div className={styles.statsMeta}>{t('p2p_stats_starting')}</div>
      )}
    </div>
  );
};

export default memo(P2PStatsSettings);
