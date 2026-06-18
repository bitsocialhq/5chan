import { describe, expect, it, vi } from 'vitest';
import { createDefaultPkcOptions, DEFAULT_ETH_RPC_URLS } from './pkc-rpc-options.js';
import { startPkcRpcServer } from './start-pkc-rpc-core.js';

describe('createDefaultPkcOptions', () => {
  it('configures BSO name resolvers for the desktop RPC server', () => {
    const options = createDefaultPkcOptions({ dataPath: '/tmp/5chan-pkc' });

    expect(options.dataPath).toBe('/tmp/5chan-pkc');
    expect(options.kuboRpcClientsOptions).toEqual([{ url: 'http://localhost:50019/api/v0' }]);
    expect(options.nameResolvers).toHaveLength(DEFAULT_ETH_RPC_URLS.length);
    expect(options.nameResolvers.map((resolver) => resolver.provider)).toEqual(DEFAULT_ETH_RPC_URLS);
    expect(options.nameResolvers[0]).toMatchObject({
      key: 'eth-ethereum-rpc.publicnode.com',
      provider: DEFAULT_ETH_RPC_URLS[0],
    });
    expect(options.nameResolvers[0].canResolve({ name: 'business-and-finance.bso' })).toBe(true);
  });
});

describe('startPkcRpcServer', () => {
  it('passes the Electron data path through pkcOptions', async () => {
    const pkcOptions = {
      dataPath: '/tmp/5chan-pkc',
      kuboRpcClientsOptions: [{ url: 'http://localhost:50019/api/v0' }],
    };
    const server = {
      on: vi.fn(),
      ws: { on: vi.fn() },
    };
    const PKCRpcModule = {
      PKCWsServer: vi.fn(async () => server),
    };

    await startPkcRpcServer({
      PKCRpcModule,
      port: 9138,
      pkcOptions,
      authKey: 'test-auth-key',
      logger: { log: vi.fn() },
    });

    expect(PKCRpcModule.PKCWsServer).toHaveBeenCalledWith({
      port: 9138,
      pkcOptions,
      authKey: 'test-auth-key',
    });
    expect(PKCRpcModule.PKCWsServer.mock.calls[0][0]).not.toHaveProperty('pkc');
  });
});
