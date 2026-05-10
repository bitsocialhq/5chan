import { memo, useEffect, useReducer } from 'react';
import { useAccount, usePkcRpcSettings } from '@bitsocial/bitsocial-react-hooks';
import { useTranslation } from 'react-i18next';
import { getP2PRuntimeMode, type P2PRuntimeMode } from '../../../lib/p2p-runtime';
import styles from './p2p-stats-settings.module.css';

type AccountShape = Record<string, any>;

type StatRow = {
  name: string;
  value: string;
};

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

type TransferStats = {
  downloadedBytes?: number;
  uploadedBytes?: number;
};

const KUBO_API_URL = 'http://localhost:50019/api/v0';
const STATS_REFRESH_MS = 5000;
const MAX_TRANSFER_COUNTER_DEPTH = 10;
const MAX_TRANSFER_COUNTER_OBJECTS = 400;

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

const stringifyList = (items?: unknown[], maxItems = 5) => {
  if (!items?.length) return 'none';
  const values = items.map((item) => String(item));
  const visibleValues = values.slice(0, maxItems);
  return values.length > maxItems ? `${visibleValues.join(', ')} +${values.length - maxItems} more` : visibleValues.join(', ');
};

const getFirstObjectValue = <T,>(value?: Record<string, T>) => (value ? Object.values(value)[0] : undefined);

const isRecord = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object';

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
  for (const method of ['getMetrics', 'getMetricValues', 'toJSON']) {
    const candidate = source[method];
    if (typeof candidate !== 'function') continue;
    try {
      const snapshot = await candidate.call(source);
      if (snapshot !== undefined) return snapshot;
    } catch {
      return undefined;
    }
  }
  return source;
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

const getBrowserTransferStats = async (client?: Libp2pClientShape): Promise<TransferStats> => {
  try {
    const helia = client?._helia;
    const counterStats = getTransferStatsFromHeliaCounters(helia);
    const metricSources = [helia?.metrics, helia?.libp2p?.metrics].filter(Boolean);
    const metricSnapshots = await Promise.all(metricSources.map((source) => getMetricSnapshot(source)));
    const metricStats = metricSnapshots
      .map((snapshot) => getTransferStatsFromMetricSnapshot(snapshot))
      .reduce<TransferStats>((stats, nextStats) => mergeTransferStats(stats, nextStats), {});

    return mergeTransferStats(counterStats, metricStats);
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
  if (!client) return 'unknown';
  return hasSupportedAdd(client) && hasProviderPublishingRouter(client) ? 'seeding' : 'leeching';
};

const getBrowserLibp2pStats = async (account?: AccountShape): Promise<StatRow[]> => {
  const client = getFirstObjectValue(account?.pkc?.clients?.libp2pJsClients) as Libp2pClientShape | undefined;
  const libp2p = client?._helia?.libp2p;
  const pubsub = libp2p?.services?.pubsub;
  const [peers, connections, multiaddrs, pubsubPeers, transferStats] = await Promise.all([
    getSafeArray(() => libp2p?.getPeers?.()),
    getSafeArray(() => libp2p?.getConnections?.()),
    getSafeArray(() => libp2p?.getMultiaddrs?.()),
    getSafeArray(() => pubsub?.getPeers?.()),
    getBrowserTransferStats(client),
  ]);

  return [
    { name: 'mode', value: getBrowserMode(client) },
    { name: 'peer id', value: libp2p?.peerId?.toString() ?? 'unknown' },
    { name: 'client key', value: client?.key ?? 'unknown' },
    { name: 'connected peers', value: formatCount(peers.length, 'peer') },
    { name: 'connections', value: formatCount(connections.length, 'connection') },
    { name: 'downloaded data', value: transferStats.downloadedBytes === undefined ? 'unknown' : formatBytes(transferStats.downloadedBytes) },
    { name: 'uploaded data', value: transferStats.uploadedBytes === undefined ? 'unknown' : formatBytes(transferStats.uploadedBytes) },
    { name: 'listen addresses', value: stringifyList(multiaddrs) },
    { name: 'pubsub peers', value: formatCount(pubsubPeers.length, 'peer') },
    { name: 'routers', value: stringifyList(account?.pkcOptions?.httpRoutersOptions) },
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
    { name: 'mode', value: 'desktop Kubo' },
    { name: 'PKC RPC', value: rpcState ?? 'unknown' },
    { name: 'peer id', value: identity.ID ?? 'unknown' },
    { name: 'agent', value: identity.AgentVersion ?? version.Version ?? 'unknown' },
    { name: 'connected peers', value: formatCount(Array.isArray(peers.Peers) ? peers.Peers.length : 0, 'peer') },
    { name: 'bandwidth in', value: `${formatBytes(bandwidth.TotalIn)} total, ${formatRate(bandwidth.RateIn)}` },
    { name: 'bandwidth out', value: `${formatBytes(bandwidth.TotalOut)} total, ${formatRate(bandwidth.RateOut)}` },
    { name: 'repo size', value: formatBytes(repo.RepoSize) },
    { name: 'repo objects', value: String(repo.NumObjects ?? 'unknown') },
    { name: 'bitswap peers', value: formatCount(Array.isArray(bitswap.Peers) ? bitswap.Peers.length : 0, 'peer') },
    { name: 'bitswap wantlist', value: formatCount(Array.isArray(bitswap.Wantlist) ? bitswap.Wantlist.length : 0, 'item') },
  ];
};

const getP2PStats = async (mode: P2PRuntimeMode, account?: AccountShape, rpcState?: string, signal?: AbortSignal) => {
  if (mode === 'browser-libp2p') return getBrowserLibp2pStats(account);
  return getElectronKuboStats(rpcState, signal);
};

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
              {statsState.rows.map((row) => (
                <tr key={row.name}>
                  <td className={styles.statName}>{row.name}</td>
                  <td className={styles.statValue}>{row.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className={styles.statsMeta}>
            {statsState.loading ? t('p2p_stats_loading') : updatedAtLabel ? `${t('p2p_stats_updated')} ${updatedAtLabel}` : null}
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
