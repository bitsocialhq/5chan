import * as React from 'react';
import { createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
const act = (React as { act?: (cb: () => void | Promise<void>) => void | Promise<void> }).act as (cb: () => void | Promise<void>) => void | Promise<void>;

const testState = vi.hoisted(() => ({
  account: {} as Record<string, any>,
  rpcSettings: { state: 'disconnected' } as Record<string, any>,
  setAccountMock: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock('@bitsocial/bitsocial-react-hooks', () => ({
  setAccount: (account: unknown) => testState.setAccountMock(account),
  useAccount: () => testState.account,
  usePkcRpcSettings: () => testState.rpcSettings,
}));

let container: HTMLDivElement;
let root: Root;

const loadComponent = async (isElectron = false) => {
  vi.resetModules();
  window.electronApi = isElectron ? ({ isElectron: true } as Window['electronApi']) : undefined;
  window.isElectron = isElectron;
  return (await import('../p2p-stats-settings')).default;
};

const renderSettings = async (isElectron = false) => {
  const P2PStatsSettings = await loadComponent(isElectron);
  await act(async () => {
    root.render(createElement(P2PStatsSettings));
    await Promise.resolve();
  });
};

const getStatRows = () =>
  new Map(Array.from(container.querySelectorAll('tr')).map((row) => [row.children.item(0)?.textContent ?? '', row.children.item(1)?.textContent ?? '']));

const getMarkerByTitle = (title: string) => Array.from(container.querySelectorAll('svg rect')).find((rect) => rect.querySelector('title')?.textContent === title);

describe('P2PStatsSettings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    window.electronApi = undefined;
    window.isElectron = false;
    testState.account = {
      id: 'account-1',
      author: { address: 'author', wallets: {} },
      pkcOptions: {
        ipfsGatewayUrls: ['https://gateway.example'],
      },
    };
    testState.rpcSettings = { state: 'disconnected' };
    testState.setAccountMock.mockReset().mockResolvedValue(undefined);
    // Default: own-IP country lookups (api.country.is) resolve offline so browser
    // stats tests never hit the network. Individual tests can override this stub.
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ country: 'US', ip: '147.75.84.175' }),
      }),
    );
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    vi.unstubAllGlobals();
  });

  it('renders browser libp2p stats from the active PKC client', async () => {
    testState.account = {
      ...testState.account,
      pkcOptions: {
        httpRoutersOptions: ['https://router.example'],
        libp2pJsClientsOptions: [{ key: 'libp2pjs' }],
      },
      pkc: {
        clients: {
          libp2pJsClients: {
            libp2pjs: {
              key: 'libp2pjs',
              heliaWithKuboRpcClientFunctions: {
                add: async () => {
                  throw new Error("Helia 'add' is not supported at the moment in pkc-js API");
                },
              },
              _helia: {
                libp2p: {
                  getConnections: () => [
                    {
                      direction: 'outbound',
                      remoteAddr: { toString: () => '/ip4/127.0.0.1/tcp/4001/ws/p2p/peer-1' },
                      remotePeer: { toString: () => 'peer-1' },
                      status: 'open',
                    },
                  ],
                  getMultiaddrs: () => ['/ip4/147.75.84.175/tcp/4001/ws'],
                  getPeers: () => ['peer-1', 'peer-2'],
                  metrics: {
                    toJSON: () => ({
                      helia_bitswap_data_received_bytes: { global: 2048, peer1: 2048 },
                      helia_bitswap_sent_data_bytes_total: 1024,
                    }),
                  },
                  peerId: { toString: () => 'self-peer' },
                  services: {
                    pubsub: {
                      getPeers: () => ['peer-1'],
                    },
                  },
                },
                routing: {
                  routers: [
                    {
                      async provide() {
                        // noop
                      },
                    },
                  ],
                },
              },
            },
          },
        },
      },
    };

    await renderSettings(false);
    await act(async () => Promise.resolve());

    const rows = getStatRows();
    const connectedPeers = container.querySelector('[data-testid="connected-peers"]');
    expect(container.textContent).toContain('Leeching');
    expect(container.textContent).toContain('want to seed');
    const seederLink = container.querySelector('a[href="https://github.com/bitsocialnet/bitsocial-seeder"]');
    expect(seederLink).not.toBeNull();
    expect(seederLink?.textContent).toBe('want to seed?');
    expect(rows.get('Your IP')).toContain('147.75.84.175');
    // The own IP is geolocated accurately (per-IP lookup), not via the coarse peer guess.
    expect(fetch).toHaveBeenCalledWith('https://api.country.is/147.75.84.175', expect.objectContaining({ signal: expect.any(AbortSignal) }));
    const yourIpRow = Array.from(container.querySelectorAll('tr')).find((row) => row.textContent?.includes('Your IP'));
    expect(yourIpRow?.querySelector('[role="img"]')).not.toBeNull();
    expect(container.textContent).not.toContain('browser Helia');
    expect(container.textContent).not.toContain('seed mode');
    expect(container.textContent).not.toContain('status');
    expect(connectedPeers?.textContent).toContain('2 peers, 1 connection');
    expect(connectedPeers?.textContent).toContain('WebSocket');
    expect(connectedPeers?.textContent).toContain('/ip4/127.0.0.1/tcp/4001/ws/p2p/peer-1');
    expect(rows.has('connections')).toBe(false);
    expect(rows.has('Listen addresses')).toBe(false);
    expect(rows.has('p2p_stats_updated')).toBe(true);
    const tableRows = Array.from(container.querySelectorAll('tr'));
    const rowTexts = tableRows.map((row) => row.textContent ?? '');
    const dataSentIndex = rowTexts.findIndex((text) => text.includes('Data sent'));
    const updatedIndex = rowTexts.findIndex((text) => text.includes('p2p_stats_updated'));
    const connectedPeersIndex = rowTexts.findIndex((text) => text.includes('Connected peers'));
    expect(dataSentIndex).toBeGreaterThanOrEqual(0);
    expect(updatedIndex).toBeGreaterThan(dataSentIndex);
    expect(connectedPeersIndex).toBeGreaterThan(updatedIndex);
    expect(container.textContent).toContain('self-peer');
    expect(container.textContent).toContain('Peer ID');
    expect(container.textContent).toContain('Data received');
    expect(container.textContent).toContain('2.00 KB');
    expect(container.textContent).toContain('Data sent');
    expect(container.textContent).toContain('1.00 KB');
    expect(container.textContent).not.toContain('client key');
    expect(container.textContent).not.toContain('pubsub peers');
    expect(container.textContent).not.toContain('routers');
    expect(container.textContent).not.toContain('pubsub topics');
    expect(container.textContent).not.toContain('topic subscribers');
  });

  it('places peer map markers from city-level IP locations', async () => {
    const fetchMock = vi.fn(async (url: string | URL | Request) => {
      const requestUrl = String(url);
      if (requestUrl === 'https://free.freeipapi.com/api/json/91.234.199.189') {
        return {
          ok: true,
          json: async () => ({
            cityName: 'Haarlem',
            countryCode: 'NL',
            ipAddress: '91.234.199.189',
            latitude: 52.3874,
            longitude: 4.64622,
            regionName: 'North Holland',
          }),
        };
      }
      return {
        ok: true,
        json: async () => ({ country: 'US', ip: '147.75.84.175' }),
      };
    });
    vi.stubGlobal('fetch', fetchMock);
    testState.account = {
      ...testState.account,
      pkcOptions: {
        libp2pJsClientsOptions: [{ key: 'libp2pjs' }],
      },
      pkc: {
        clients: {
          libp2pJsClients: {
            libp2pjs: {
              key: 'libp2pjs',
              _helia: {
                libp2p: {
                  getConnections: () => [
                    {
                      remoteAddr: { toString: () => '/ip4/91.234.199.189/tcp/4001/ws/p2p/peer-geo' },
                      remotePeer: { toString: () => 'peer-geo' },
                    },
                  ],
                  getMultiaddrs: () => ['/ip4/147.75.84.175/tcp/4001/ws'],
                  getPeers: () => ['peer-geo'],
                  peerId: { toString: () => 'self-peer' },
                },
              },
            },
          },
        },
      },
    };

    await renderSettings(false);
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    const marker = getMarkerByTitle('peer-geo - Haarlem, North Holland, NL');
    expect(marker).not.toBeNull();
    expect(marker?.getAttribute('height')).toBe('3');
    expect(marker?.getAttribute('width')).toBe('3');
    expect(Number(marker?.getAttribute('x'))).toBeCloseTo(183.15, 1);
    expect(Number(marker?.getAttribute('y'))).toBeCloseTo(36.11, 1);
    expect(fetchMock).toHaveBeenCalledWith('https://free.freeipapi.com/api/json/91.234.199.189', expect.objectContaining({ signal: expect.any(AbortSignal) }));
  });

  it('shows the own IP flag and a red precise map marker when leeching', async () => {
    const fetchMock = vi.fn(async (url: string | URL | Request) => {
      const requestUrl = String(url);
      if (requestUrl === 'https://api.country.is/117.2.120.113') {
        return {
          ok: false,
          json: async () => ({}),
        };
      }
      if (requestUrl === 'https://free.freeipapi.com/api/json/117.2.120.113') {
        return {
          ok: true,
          json: async () => ({
            cityName: 'Da Nang',
            countryCode: 'VN',
            ipAddress: '117.2.120.113',
            latitude: 16.0678,
            longitude: 108.221,
            regionName: 'Da Nang City',
          }),
        };
      }
      return {
        ok: true,
        json: async () => ({ country: 'US', ip: '147.75.84.175' }),
      };
    });
    vi.stubGlobal('fetch', fetchMock);
    testState.account = {
      ...testState.account,
      pkcOptions: {
        libp2pJsClientsOptions: [{ key: 'libp2pjs' }],
      },
      pkc: {
        clients: {
          libp2pJsClients: {
            libp2pjs: {
              key: 'libp2pjs',
              _helia: {
                libp2p: {
                  getConnections: () => [],
                  getMultiaddrs: () => ['/ip4/117.2.120.113/tcp/4001/ws'],
                  getPeers: () => [],
                  peerId: { toString: () => 'self-peer' },
                },
              },
            },
          },
        },
      },
    };

    await renderSettings(false);
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    const rows = getStatRows();
    const yourIpRow = Array.from(container.querySelectorAll('tr')).find((row) => row.textContent?.includes('Your IP'));
    const marker = getMarkerByTitle('Your node - Da Nang, Da Nang City, VN');
    expect(container.textContent).toContain('Leeching');
    expect(rows.get('Your IP')).toContain('117.2.120.113');
    expect(yourIpRow?.querySelector('[role="img"]')?.getAttribute('aria-label')).toBe('Vietnam');
    expect(marker?.getAttribute('data-peer-role')).toBe('leecher');
    expect(Number(marker?.getAttribute('x'))).toBeCloseTo(286.72, 1);
    expect(Number(marker?.getAttribute('y'))).toBeCloseTo(72.43, 1);
  });

  it('reads browser transfer counters from Helia bitswap ledgers', async () => {
    testState.account = {
      ...testState.account,
      pkcOptions: {
        libp2pJsClientsOptions: [{ key: 'libp2pjs' }],
      },
      pkc: {
        clients: {
          libp2pJsClients: {
            libp2pjs: {
              key: 'libp2pjs',
              _helia: {
                blockstore: {
                  child: {
                    blockBrokers: [
                      {
                        bitswap: {
                          peerWantLists: {
                            ledgerMap: new Map([['peer-1', { bytesReceived: 4096, bytesSent: 2048 }]]),
                          },
                        },
                      },
                    ],
                  },
                },
                libp2p: {
                  getConnections: () => [],
                  getMultiaddrs: () => ['/ip4/147.75.84.175/tcp/4001/ws'],
                  getPeers: () => [],
                  peerId: { toString: () => 'self-peer' },
                },
              },
            },
          },
        },
      },
    };

    await renderSettings(false);
    await act(async () => Promise.resolve());

    expect(container.textContent).toContain('Data received');
    expect(container.textContent).toContain('4.00 KB');
    expect(container.textContent).toContain('Data sent');
    expect(container.textContent).toContain('2.00 KB');
  });

  it('starts browser transfer counters at zero when Helia exposes no byte totals yet', async () => {
    testState.account = {
      ...testState.account,
      pkcOptions: {
        libp2pJsClientsOptions: [{ key: 'libp2pjs' }],
      },
      pkc: {
        clients: {
          libp2pJsClients: {
            libp2pjs: {
              key: 'libp2pjs',
              _helia: {
                libp2p: {
                  getConnections: () => [],
                  getMultiaddrs: () => ['/ip4/147.75.84.175/tcp/4001/ws'],
                  getPeers: () => [],
                  peerId: { toString: () => 'self-peer' },
                },
              },
            },
          },
        },
      },
    };

    await renderSettings(false);
    await act(async () => Promise.resolve());

    const rows = getStatRows();
    expect(rows.get('Data received')).toBe('0 B');
    expect(rows.get('Data sent')).toBe('0 B');
  });

  it('falls back to the browser node public endpoint when Helia exposes no public address', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ country: 'US', ip: '2001:4860:4860::8888' }),
      }),
    );
    testState.account = {
      ...testState.account,
      pkcOptions: {
        libp2pJsClientsOptions: [{ key: 'libp2pjs' }],
      },
      pkc: {
        clients: {
          libp2pJsClients: {
            libp2pjs: {
              key: 'libp2pjs',
              _helia: {
                libp2p: {
                  getConnections: () => [
                    {
                      localAddr: { toString: () => '/ip4/127.0.0.1/tcp/4001/ws' },
                      remoteAddr: { toString: () => '/ip4/127.0.0.1/tcp/4001/ws/p2p/peer-1' },
                      remotePeer: { toString: () => 'peer-1' },
                    },
                  ],
                  getMultiaddrs: () => [],
                  getPeers: () => [],
                  peerId: { toString: () => 'self-peer' },
                },
              },
            },
          },
        },
      },
    };

    await renderSettings(false);
    await act(async () => Promise.resolve());

    const rows = getStatRows();
    expect(rows.get('Your IP')).toContain('2001:4860:4860::8888');
    expect(rows.get('Your IP')).not.toContain('unknown');
    const yourIpRow = Array.from(container.querySelectorAll('tr')).find((row) => row.textContent?.includes('Your IP'));
    expect(yourIpRow?.querySelector('[role="img"]')).not.toBeNull();
    expect(fetch).toHaveBeenCalledWith('https://api.country.is', expect.objectContaining({ signal: expect.any(AbortSignal) }));
  });

  it('reports seeding only when browser Helia can add and publish provider records', async () => {
    testState.account = {
      ...testState.account,
      pkcOptions: {
        libp2pJsClientsOptions: [{ key: 'libp2pjs' }],
      },
      pkc: {
        clients: {
          libp2pJsClients: {
            libp2pjs: {
              key: 'libp2pjs',
              heliaWithKuboRpcClientFunctions: {
                add: async () => ({ cid: 'cid' }),
              },
              _helia: {
                libp2p: {
                  getConnections: () => [],
                  getMultiaddrs: () => ['/ip4/147.75.84.175/tcp/4001/ws'],
                  getPeers: () => [],
                  peerId: { toString: () => 'self-peer' },
                },
                routing: {
                  routers: [
                    {
                      provide: async (cid: unknown) => cid,
                    },
                  ],
                },
              },
            },
          },
        },
      },
    };

    await renderSettings(false);
    await act(async () => Promise.resolve());

    expect(container.textContent).toContain('Seeding');
    expect(container.querySelector('a[href="https://github.com/bitsocialnet/bitsocial-seeder"]')).toBeNull();
    expect(container.textContent).not.toContain('seed mode');
  });

  it('renders browser full-node RPC stats with seeding mode and leecher peer markers', async () => {
    const fetchMock = vi.fn(async (url: string | URL | Request) => {
      const requestUrl = String(url);
      if (requestUrl === 'https://free.freeipapi.com/api/json/147.75.84.175') {
        return {
          ok: true,
          json: async () => ({
            cityName: 'New York',
            countryCode: 'US',
            latitude: 40.7128,
            longitude: -74.006,
            regionName: 'New York',
          }),
        };
      }
      if (requestUrl === 'https://free.freeipapi.com/api/json/91.234.199.189') {
        return {
          ok: true,
          json: async () => ({
            cityName: 'Haarlem',
            countryCode: 'NL',
            latitude: 52.3874,
            longitude: 4.64622,
            regionName: 'North Holland',
          }),
        };
      }
      if (requestUrl === 'https://free.freeipapi.com/api/json/117.2.120.113') {
        return {
          ok: true,
          json: async () => ({
            cityName: 'Da Nang',
            countryCode: 'VN',
            latitude: 16.0678,
            longitude: 108.221,
            regionName: 'Da Nang City',
          }),
        };
      }
      return {
        ok: true,
        json: async () => ({ country: 'US', ip: '147.75.84.175' }),
      };
    });
    vi.stubGlobal('fetch', fetchMock);
    testState.rpcSettings = { state: 'connected' };
    testState.account = {
      ...testState.account,
      pkcOptions: {
        pkcRpcClientsOptions: ['ws://147.75.84.175:9138'],
      },
      pkc: {
        clients: {
          pkcRpcClients: {
            'ws://147.75.84.175:9138': {
              getPeers: vi.fn().mockResolvedValue({
                peers: [
                  {
                    address: '/ip4/91.234.199.189/tcp/4001',
                    listenAddress: '/ip4/91.234.199.189/tcp/4001',
                    peerId: 'seed-peer',
                  },
                  {
                    address: '/ip4/117.2.120.113/tcp/4001',
                    listenAddress: '',
                    peerId: 'leech-peer',
                  },
                ],
              }),
              getStats: vi.fn().mockResolvedValue({
                bandwidth: { TotalIn: 1024, TotalOut: 2048 },
                identity: {
                  AgentVersion: 'kubo/full-node',
                  ID: 'full-node-peer',
                  Addresses: ['/ip4/147.75.84.175/tcp/4001'],
                },
              }),
              state: 'connected',
            },
          },
        },
      },
    };

    await renderSettings(false);
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    const rows = getStatRows();
    const markers = Array.from(container.querySelectorAll('svg rect'));
    const ownMarker = markers.find((marker) => marker.querySelector('title')?.textContent?.startsWith('Your node'));
    const leecherMarker = markers.find((marker) => marker.querySelector('title')?.textContent?.startsWith('leech-peer'));
    expect(rows.get('Mode')).toBe('Seeding');
    expect(rows.get('PKC RPC')).toBe('connected');
    expect(rows.get('Peer ID')).toBe('full-node-peer');
    expect(rows.get('Your IP')).toContain('147.75.84.175');
    expect(rows.get('Data received')).toBe('1.00 KB');
    expect(rows.get('Data sent')).toBe('2.00 KB');
    expect(container.textContent).toContain('seed-peer');
    expect(container.textContent).toContain('leech-peer');
    expect(container.textContent).toContain('Leeching');
    expect(container.querySelector('a[href="https://github.com/bitsocialnet/bitsocial-seeder"]')).toBeNull();
    expect(ownMarker?.getAttribute('data-peer-role')).toBe('seeder');
    expect(leecherMarker?.getAttribute('data-peer-role')).toBe('leecher');
  });

  it('does not resolve full-node RPC hostnames through external DNS', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    testState.rpcSettings = { state: 'connected' };
    testState.account = {
      ...testState.account,
      pkcOptions: {
        pkcRpcClientsOptions: ['ws://node.example:9138'],
      },
      pkc: {
        clients: {
          pkcRpcClients: {
            'ws://node.example:9138': {
              getPeers: vi.fn().mockResolvedValue({ peers: [] }),
              getStats: vi.fn().mockResolvedValue({
                bandwidth: { TotalIn: 0, TotalOut: 0 },
                identity: {
                  ID: 'hostname-rpc-node',
                },
              }),
              state: 'connected',
            },
          },
        },
      },
    };

    await renderSettings(false);
    await act(async () => Promise.resolve());

    const rows = getStatRows();
    expect(rows.get('Mode')).toBe('Seeding');
    expect(rows.get('Peer ID')).toBe('hostname-rpc-node');
    expect(rows.get('Your IP')).toBe('unavailable');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('renders Electron Kubo stats as seeding with the node location on the map', async () => {
    const fetchMock = vi.fn(async (url: string | URL | Request) => {
      const requestUrl = String(url);
      if (requestUrl === 'http://localhost:50019/api/v0/id') {
        return {
          ok: true,
          text: async () =>
            JSON.stringify({
              Addresses: [
                '/dns4/77-168-54-121.example/tcp/4001/tls/ws/p2p/relay-peer/p2p-circuit/p2p/desktop-kubo-peer',
                '/ip4/117.2.120.113/udp/4001/webrtc-direct/p2p/desktop-kubo-peer',
              ],
              AgentVersion: 'kubo/0.41.0',
              ID: 'desktop-kubo-peer',
            }),
        };
      }
      if (requestUrl === 'http://localhost:50019/api/v0/swarm/peers?direction=true&latency=true&streams=true') {
        return {
          ok: true,
          text: async () =>
            JSON.stringify({
              Peers: [
                {
                  Addr: '/ip4/91.234.199.189/tcp/4001',
                  Direction: 'outbound',
                  ListenAddress: '/ip4/91.234.199.189/tcp/4001',
                  Peer: 'kubo-seeder',
                },
                {
                  Addr: '/ip4/203.0.113.10/tcp/4001',
                  Direction: 'inbound',
                  ListenAddress: '',
                  Peer: 'kubo-leecher',
                },
              ],
            }),
        };
      }
      if (requestUrl === 'http://localhost:50019/api/v0/stats/bw') {
        return { ok: true, text: async () => JSON.stringify({ RateIn: 12, RateOut: 34, TotalIn: 4096, TotalOut: 8192 }) };
      }
      if (requestUrl === 'https://free.freeipapi.com/api/json/117.2.120.113') {
        return {
          ok: true,
          json: async () => ({
            cityName: 'Da Nang',
            countryCode: 'VN',
            latitude: 16.0678,
            longitude: 108.221,
            regionName: 'Da Nang City',
          }),
        };
      }
      if (requestUrl === 'https://free.freeipapi.com/api/json/91.234.199.189') {
        return {
          ok: true,
          json: async () => ({
            cityName: 'Haarlem',
            countryCode: 'NL',
            latitude: 52.3874,
            longitude: 4.64622,
            regionName: 'North Holland',
          }),
        };
      }
      return {
        ok: true,
        json: async () => ({ country: 'VN', ip: '117.2.120.113' }),
      };
    });
    vi.stubGlobal('fetch', fetchMock);
    testState.rpcSettings = { state: 'connected' };
    testState.account = {
      ...testState.account,
      pkcOptions: {
        pkcRpcClientsOptions: ['ws://localhost:9138'],
      },
    };

    await renderSettings(true);
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    const rows = getStatRows();
    const markers = Array.from(container.querySelectorAll('svg rect'));
    const ownMarker = markers.find((marker) => marker.querySelector('title')?.textContent?.startsWith('Your node'));
    const leecherMarker = markers.find((marker) => marker.querySelector('title')?.textContent?.startsWith('kubo-leecher'));
    expect(rows.get('Mode')).toBe('Seeding');
    expect(rows.get('Kubo RPC')).toBe('http://localhost:50019/api/v0');
    expect(rows.get('Peer ID')).toBe('desktop-kubo-peer');
    expect(rows.get('Your IP')).toContain('117.2.120.113');
    expect(rows.get('Your IP')).not.toContain('77.168.54.121');
    expect(rows.get('Data received')).toBe('4.00 KB');
    expect(rows.get('Data sent')).toBe('8.00 KB');
    expect(rows.has('PKC RPC')).toBe(false);
    expect(rows.has('Agent')).toBe(false);
    expect(rows.has('Repo size')).toBe(false);
    expect(rows.has('Repo objects')).toBe(false);
    expect(rows.has('Bitswap peers')).toBe(false);
    expect(rows.has('Bitswap wantlist')).toBe(false);
    expect(rows.has('Bandwidth in')).toBe(false);
    expect(rows.has('Bandwidth out')).toBe(false);
    expect(container.textContent).toContain('kubo-seeder');
    expect(container.textContent).toContain('kubo-leecher');
    expect(container.textContent).toContain('Leeching');
    expect(container.textContent).not.toContain('Listen addresses');
    expect(ownMarker?.getAttribute('data-peer-role')).toBe('seeder');
    expect(leecherMarker?.getAttribute('data-peer-role')).toBe('leecher');
    expect(fetchMock).not.toHaveBeenCalledWith('http://localhost:50019/api/v0/repo/stat', expect.anything());
    expect(fetchMock).not.toHaveBeenCalledWith('http://localhost:50019/api/v0/bitswap/stat', expect.anything());
    expect(fetchMock).not.toHaveBeenCalledWith('http://localhost:50019/api/v0/version', expect.anything());
    expect(fetchMock).not.toHaveBeenCalledWith('http://localhost:50019/api/v0/swarm/addrs/local', expect.anything());
  });
});
