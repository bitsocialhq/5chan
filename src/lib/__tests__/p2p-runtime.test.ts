import { describe, expect, it } from 'vitest';
import {
  getBrowserGatewayAccountOptions,
  getBrowserPureP2PAccountOptions,
  getP2PRuntimeMode,
  isBrowserPureP2PEnabled,
  shouldShowP2PSettingsSection,
  shouldUpgradeBrowserPureP2PAccount,
} from '../p2p-runtime';

const browserWindow = {
  electronApi: undefined,
  isElectron: false,
  location: { hostname: '5chan.app' },
  localStorage: {
    getItem: () => null,
    setItem: () => undefined,
  },
} as unknown as Window;

const browserWindowWithDisabledPureP2P = {
  electronApi: undefined,
  isElectron: false,
  location: { hostname: '5chan.app' },
  localStorage: {
    getItem: () => 'false',
    setItem: () => undefined,
  },
} as unknown as Window;

const browserWindowWithEnabledPureP2P = {
  electronApi: undefined,
  isElectron: false,
  location: { hostname: '5chan.app' },
  localStorage: {
    getItem: () => 'true',
    setItem: () => undefined,
  },
} as unknown as Window;

const electronWindow = {
  electronApi: { isElectron: true },
  isElectron: true,
  location: { hostname: 'localhost' },
} as unknown as Window;

const p2pBrowserWindowWithDisabledPureP2P = {
  electronApi: undefined,
  isElectron: false,
  location: { hostname: 'p2p.5chan.app' },
  localStorage: {
    getItem: () => 'false',
    setItem: () => undefined,
  },
} as unknown as Window;

describe('p2p-runtime', () => {
  it('detects browser libp2p accounts from options and live clients', () => {
    expect(getP2PRuntimeMode({ pkcOptions: { libp2pJsClientsOptions: [{ key: 'libp2pjs' }] } }, browserWindow)).toBe('browser-libp2p');
    expect(getP2PRuntimeMode({ pkc: { clients: { libp2pJsClients: { libp2pjs: {} } } } }, browserWindow)).toBe('browser-libp2p');
  });

  it('detects full-node RPC accounts in browser and electron runtimes', () => {
    const account = { pkcOptions: { pkcRpcClientsOptions: ['ws://localhost:9138'] } };

    expect(getP2PRuntimeMode(account, electronWindow)).toBe('electron-kubo-rpc');
    expect(getP2PRuntimeMode(account, browserWindow)).toBe('full-node-rpc');
  });

  it('keeps browser pure p2p on by default while honoring explicit preference and active libp2p accounts', () => {
    expect(shouldShowP2PSettingsSection(undefined, browserWindow)).toBe(true);
    expect(shouldShowP2PSettingsSection({ pkcOptions: { ipfsGatewayUrls: ['https://gateway.example'] } }, browserWindow)).toBe(true);
    expect(isBrowserPureP2PEnabled({ pkcOptions: { ipfsGatewayUrls: ['https://gateway.example'] } }, browserWindow)).toBe(true);
    expect(shouldShowP2PSettingsSection({ pkcOptions: { libp2pJsClientsOptions: [{ key: 'libp2pjs' }] } }, browserWindow)).toBe(true);
    expect(isBrowserPureP2PEnabled({ pkcOptions: { libp2pJsClientsOptions: [{ key: 'libp2pjs' }] } }, browserWindow)).toBe(true);
    expect(shouldShowP2PSettingsSection({ pkcOptions: { ipfsGatewayUrls: ['https://gateway.example'] } }, browserWindowWithEnabledPureP2P)).toBe(true);
    expect(isBrowserPureP2PEnabled({ pkcOptions: { ipfsGatewayUrls: ['https://gateway.example'] } }, browserWindowWithEnabledPureP2P)).toBe(true);
  });

  it('allows browser gateway mode when pure p2p is disabled', () => {
    const gatewayAccount = { pkcOptions: { ipfsGatewayUrls: ['https://gateway.example'] } };

    expect(isBrowserPureP2PEnabled(gatewayAccount, browserWindowWithDisabledPureP2P)).toBe(false);
    expect(shouldShowP2PSettingsSection(gatewayAccount, browserWindowWithDisabledPureP2P)).toBe(false);
    expect(isBrowserPureP2PEnabled(gatewayAccount, p2pBrowserWindowWithDisabledPureP2P)).toBe(false);
  });

  it('still shows browser full-node RPC stats when browser pure p2p was toggled off', () => {
    const account = { pkcOptions: { pkcRpcClientsOptions: ['ws://node.example'] } };

    expect(isBrowserPureP2PEnabled(account, browserWindowWithDisabledPureP2P)).toBe(false);
    expect(shouldShowP2PSettingsSection(account, browserWindowWithDisabledPureP2P)).toBe(true);
  });

  it('upgrades only stale gateway browser accounts when pure p2p is enabled', () => {
    const gatewayAccount = { pkcOptions: { ipfsGatewayUrls: ['https://gateway.example'] } };
    const browserAccount = { pkcOptions: { libp2pJsClientsOptions: [{ key: 'libp2pjs' }] } };
    const mixedBrowserAccount = { pkcOptions: { libp2pJsClientsOptions: [{ key: 'libp2pjs' }], pubsubKuboRpcClientsOptions: ['https://pubsub.example/api/v0'] } };
    const fullNodeAccount = { pkcOptions: { pkcRpcClientsOptions: ['ws://node.example'] } };

    expect(shouldUpgradeBrowserPureP2PAccount(gatewayAccount, browserWindow)).toBe(true);
    expect(shouldUpgradeBrowserPureP2PAccount(gatewayAccount, browserWindowWithEnabledPureP2P)).toBe(true);
    expect(shouldUpgradeBrowserPureP2PAccount(browserAccount, browserWindow)).toBe(false);
    expect(shouldUpgradeBrowserPureP2PAccount(mixedBrowserAccount, browserWindow)).toBe(true);
    expect(shouldUpgradeBrowserPureP2PAccount(fullNodeAccount, browserWindow)).toBe(false);
    expect(shouldUpgradeBrowserPureP2PAccount(gatewayAccount, browserWindowWithDisabledPureP2P)).toBe(false);
    expect(shouldUpgradeBrowserPureP2PAccount(gatewayAccount, electronWindow)).toBe(false);
  });

  it('builds browser p2p and gateway account options without a direct pkc-js import', () => {
    const account = {
      pkcOptions: {
        httpRoutersOptions: ['https://custom-router.example'],
        ipfsGatewayUrls: ['https://gateway.example'],
        pkcRpcClientsOptions: ['ws://remote.example'],
      },
    };

    expect(getBrowserPureP2PAccountOptions(account)).toMatchObject({
      libp2pJsClientsOptions: [{ key: 'libp2pjs' }],
      ipfsGatewayUrls: undefined,
      pkcRpcClientsOptions: undefined,
      pubsubKuboRpcClientsOptions: undefined,
    });
    expect(getBrowserGatewayAccountOptions(account)).toMatchObject({
      httpRoutersOptions: ['https://custom-router.example'],
      ipfsGatewayUrls: ['https://gateway.example'],
      libp2pJsClientsOptions: undefined,
      pkcRpcClientsOptions: undefined,
      pubsubKuboRpcClientsOptions: ['https://pubsubprovider.xyz/api/v0', 'https://plebpubsub.xyz/api/v0', 'https://rannithepleb.com/api/v0'],
    });
  });
});
