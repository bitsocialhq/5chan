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
});
