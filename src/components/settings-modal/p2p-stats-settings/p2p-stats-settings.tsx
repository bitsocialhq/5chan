import { Fragment, memo, useEffect, useReducer } from 'react';
import { useAccount, usePkcRpcSettings } from '@bitsocial/bitsocial-react-hooks';
import { useTranslation } from 'react-i18next';
import { getCountryFlagPosition, getCountryLabel, normalizeCountryCode } from '../../../lib/country-flags';
import {
  fetchOwnIpCountryCode,
  fetchOwnPublicEndpoint,
  fetchPeerMapLocation,
  getApproximateCountryCode,
  getFirstPublicIpFromAddresses,
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
  status?: string;
  transport: string;
};

type ConnectedPeersStatRow = {
  connectionCount: number;
  entries: ConnectedPeerEntry[];
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

const formatRate = (value: unknown) => `${formatBytes(value)}/s`;

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

// Resolves the "Your IP" row from the node's own observed addresses. The shown IP
// is geolocated accurately (it is the user's own address, never a peer's) so the
// flag matches it, instead of the coarse continent guess used for connected peers.
// Falls back to a public-endpoint lookup when libp2p only knows local/private addresses.
const resolveOwnEndpoint = async (addresses: unknown[], signal?: AbortSignal): Promise<PublicEndpoint | undefined> => {
  const ip = getFirstPublicIpFromAddresses(addresses);
  if (ip) return { countryCode: await fetchOwnIpCountryCode(ip, signal), ip };
  return fetchOwnPublicEndpoint(signal);
};

const getElectronConnectedPeersRow = (peers: unknown): ConnectedPeersStatRow => {
  const peerEntries = isRecord(peers) && Array.isArray(peers.Peers) ? peers.Peers : [];
  const entries = peerEntries.map<ConnectedPeerEntry>((peer) => {
    const address = isRecord(peer) ? getStringValue(peer.Addr, 'address unavailable') : 'address unavailable';
    const peerId = isRecord(peer) ? getStringValue(peer.Peer) : 'unknown';
    const direction = isRecord(peer) ? getStringValue(peer.Direction, '') : undefined;
    return {
      address,
      direction,
      id: `${peerId}-${address}-${direction ?? ''}`,
      peerId,
      transport: getTransportLabel(address),
    };
  });
  const peerIds = entries.reduce<Set<string>>((ids, entry) => {
    if (entry.peerId && entry.peerId !== 'unknown') ids.add(entry.peerId);
    return ids;
  }, new Set());

  return {
    connectionCount: entries.length,
    entries,
    name: 'Connected peers',
    peerCount: peerIds.size || entries.length,
    type: 'connectedPeers',
  };
};

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
  const [transferStats, nodeEndpoint, connectedPeers] = await Promise.all([
    getBrowserTransferStats(client, connections),
    resolveOwnEndpoint([...multiaddrs, ...addressManagerAddresses, ...localAddresses], signal),
    resolveConnectedPeerLocations(connectedPeersRow, signal),
  ]);

  return [
    { name: 'Mode', value: getBrowserMode(client) },
    { name: 'Peer ID', value: libp2p?.peerId?.toString() ?? 'unknown' },
    nodeEndpoint ? { countryCode: nodeEndpoint.countryCode, ip: nodeEndpoint.ip, name: 'Your IP', type: 'nodeEndpoint' } : { name: 'Your IP', value: 'unavailable' },
    { name: 'Data received', value: transferStats.downloadedBytes === undefined ? 'unknown' : formatBytes(transferStats.downloadedBytes) },
    { name: 'Data sent', value: transferStats.uploadedBytes === undefined ? 'unknown' : formatBytes(transferStats.uploadedBytes) },
    connectedPeers,
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

const getElectronKuboStats = async (rpcState?: string, signal?: AbortSignal): Promise<StatRow[]> => {
  const [identity, version, peers, bandwidth, repo, bitswap] = await Promise.all([
    kuboPostJson('id', undefined, signal),
    kuboPostJson('version', undefined, signal),
    kuboPostJson('swarm/peers', { direction: true, latency: true, streams: true }, signal),
    kuboPostJson('stats/bw', undefined, signal),
    kuboPostJson('repo/stat', undefined, signal),
    kuboPostJson('bitswap/stat', undefined, signal),
  ]);

  return [
    { name: 'Mode', value: 'Desktop Kubo' },
    { name: 'PKC RPC', value: rpcState ?? 'unknown' },
    { name: 'Peer ID', value: identity.ID ?? 'unknown' },
    { name: 'Agent', value: identity.AgentVersion ?? version.Version ?? 'unknown' },
    { name: 'Bandwidth in', value: `${formatBytes(bandwidth.TotalIn)} total, ${formatRate(bandwidth.RateIn)}` },
    { name: 'Bandwidth out', value: `${formatBytes(bandwidth.TotalOut)} total, ${formatRate(bandwidth.RateOut)}` },
    { name: 'Repo size', value: formatBytes(repo.RepoSize) },
    { name: 'Repo objects', value: String(repo.NumObjects ?? 'unknown') },
    { name: 'Bitswap peers', value: formatCount(Array.isArray(bitswap.Peers) ? bitswap.Peers.length : 0, 'peer') },
    { name: 'Bitswap wantlist', value: formatCount(Array.isArray(bitswap.Wantlist) ? bitswap.Wantlist.length : 0, 'item') },
    await resolveConnectedPeerLocations(getElectronConnectedPeersRow(peers), signal),
  ];
};

const getP2PStats = async (mode: P2PRuntimeMode, account?: AccountShape, rpcState?: string, signal?: AbortSignal) => {
  if (mode === 'browser-libp2p') return getBrowserLibp2pStats(account, signal);
  return getElectronKuboStats(rpcState, signal);
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
    <PeerWorldMap peers={row.entries} />
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
