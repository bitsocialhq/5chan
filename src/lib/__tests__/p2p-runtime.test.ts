import { describe, expect, it } from 'vitest';
import {
  getBrowserGatewayAccountOptions,
  getBrowserPureP2PAccountOptions,
  getP2PRuntimeMode,
  isBrowserPureP2PEnabled,
  shouldShowP2PSettingsSection,
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

  it('shows p2p settings in browsers when pure p2p is enabled by default', () => {
    expect(shouldShowP2PSettingsSection(undefined, browserWindow)).toBe(true);
    expect(shouldShowP2PSettingsSection({ pkcOptions: { ipfsGatewayUrls: ['https://gateway.example'] } }, browserWindow)).toBe(true);
    expect(isBrowserPureP2PEnabled({ pkcOptions: { ipfsGatewayUrls: ['https://gateway.example'] } }, browserWindow)).toBe(true);
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
      ipfsGatewayUrls: [],
      pkcRpcClientsOptions: undefined,
    });
    expect(getBrowserGatewayAccountOptions(account)).toMatchObject({
      ipfsGatewayUrls: ['https://ipfsgateway.xyz', 'https://gateway.plebpubsub.xyz', 'https://gateway.forumindex.com'],
      libp2pJsClientsOptions: undefined,
      pkcRpcClientsOptions: undefined,
    });
  });
});
