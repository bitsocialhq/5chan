import { DEFAULT_HTTP_ROUTER_URLS } from '@bitsocial/bitsocial-react-hooks/dist/stores/accounts/account-generator.js';
import { describe, expect, it } from 'vitest';

import {
  configureP2PBrowserPkcOptions,
  getBrowserGatewayPkcOptions,
  getPureP2PBrowserPreference,
  PURE_P2P_BROWSER_SETTING_KEY,
  setPureP2PBrowserPreference,
  shouldUsePureP2PBrowser,
} from '../p2p-browser-config';

const createStorage = (values: Record<string, string | undefined> = {}) => ({
  getItem: (key: string) => values[key] ?? null,
  setItem: (key: string, value: string) => {
    values[key] = value;
  },
});

describe('p2p-browser-config', () => {
  const defaultHttpRouters = DEFAULT_HTTP_ROUTER_URLS;

  it('configures browser PKC options for gateway mode by default', () => {
    const chainProviders = {
      eth: { urls: ['https://eth.example'], chainId: 1 },
    };
    const targetWindow = {
      location: { hostname: '5chan.app' },
      localStorage: createStorage(),
      defaultPkcOptions: {
        chainProviders,
        ipfsGatewayUrls: ['https://gateway.example'],
      },
    };

    expect(shouldUsePureP2PBrowser(targetWindow)).toBe(false);
    expect(configureP2PBrowserPkcOptions(targetWindow)).toBe(false);
    expect(targetWindow.defaultPkcOptions).toEqual({
      chainProviders,
      ...getBrowserGatewayPkcOptions(),
      httpRoutersOptions: defaultHttpRouters,
    });
  });

  it('configures browser PKC options for gateway mode when pure p2p is explicitly disabled', () => {
    const chainProviders = {
      eth: { urls: ['https://eth.example'], chainId: 1 },
    };
    const targetWindow = {
      location: { hostname: '5chan.app' },
      localStorage: createStorage({ [PURE_P2P_BROWSER_SETTING_KEY]: 'false' }),
      defaultPkcOptions: {
        chainProviders,
        ipfsGatewayUrls: ['https://gateway.example'],
      },
    };

    expect(shouldUsePureP2PBrowser(targetWindow)).toBe(false);
    expect(configureP2PBrowserPkcOptions(targetWindow)).toBe(false);
    expect(targetWindow.defaultPkcOptions).toEqual({
      chainProviders,
      ...getBrowserGatewayPkcOptions(),
      httpRoutersOptions: defaultHttpRouters,
    });
  });

  it('configures browser PKC options when pure p2p is explicitly enabled', () => {
    const targetWindow = {
      location: { hostname: '5chan.app' },
      localStorage: createStorage({ [PURE_P2P_BROWSER_SETTING_KEY]: 'true' }),
      defaultPkcOptions: {
        ipfsGatewayUrls: ['https://gateway.example'],
      },
    };

    expect(shouldUsePureP2PBrowser(targetWindow)).toBe(true);
    expect(configureP2PBrowserPkcOptions(targetWindow)).toBe(true);
    expect(targetWindow.defaultPkcOptions).toMatchObject({
      httpRoutersOptions: defaultHttpRouters,
      ipfsGatewayUrls: undefined,
      libp2pJsClientsOptions: [{ key: 'libp2pjs' }],
      pubsubKuboRpcClientsOptions: undefined,
    });
  });

  it('leaves electron defaults untouched', () => {
    const defaultPkcOptions = {
      pkcRpcClientsOptions: ['ws://localhost:9138'],
    };
    const targetWindow = {
      electronApi: { isElectron: true },
      location: { hostname: 'localhost' },
      localStorage: createStorage(),
      defaultPkcOptions,
    };

    expect(configureP2PBrowserPkcOptions(targetWindow)).toBe(false);
    expect(targetWindow.defaultPkcOptions).toBe(defaultPkcOptions);
  });

  it('persists and reads the browser pure p2p preference', () => {
    const targetWindow = {
      location: { hostname: '5chan.app' },
      localStorage: createStorage(),
    };

    expect(getPureP2PBrowserPreference(targetWindow)).toBeUndefined();
    expect(shouldUsePureP2PBrowser(targetWindow)).toBe(false);

    setPureP2PBrowserPreference(false, targetWindow);
    expect(getPureP2PBrowserPreference(targetWindow)).toBe(false);
    expect(shouldUsePureP2PBrowser(targetWindow)).toBe(false);

    setPureP2PBrowserPreference(true, targetWindow);
    expect(getPureP2PBrowserPreference(targetWindow)).toBe(true);
    expect(shouldUsePureP2PBrowser(targetWindow)).toBe(true);
  });
});
