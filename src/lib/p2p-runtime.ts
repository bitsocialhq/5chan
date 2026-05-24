import { getBrowserGatewayPkcOptions, getBrowserPureP2PPkcOptions, isElectronRuntime, shouldUsePureP2PBrowser } from './p2p-browser-config';

export const P2P_STATS_SECTION_ID = 'p2p-stats-settings';

export type P2PRuntimeMode = 'browser-libp2p' | 'electron-kubo-rpc' | 'full-node-rpc';

type AccountProtocolOptions = {
  httpRoutersOptions?: string[];
  ipfsGatewayUrls?: string[];
  kuboRpcClientsOptions?: unknown[];
  libp2pJsClientsOptions?: unknown[];
  pkcRpcClientsOptions?: string[];
  pubsubHttpClientsOptions?: unknown[];
  pubsubKuboRpcClientsOptions?: unknown[];
};

type AccountShape = {
  pkc?: {
    clients?: {
      libp2pJsClients?: Record<string, unknown>;
      pkcRpcClients?: Record<string, unknown>;
    };
  };
  pkcOptions?: AccountProtocolOptions;
};

const toAccountShape = (account: unknown) => account as AccountShape | undefined;

const hasArrayItems = (value: unknown) => Array.isArray(value) && value.length > 0;

const hasObjectItems = (value: unknown) => !!value && typeof value === 'object' && Object.keys(value).length > 0;

export const getP2PRuntimeMode = (account?: unknown, targetWindow: Window = window): P2PRuntimeMode | null => {
  const accountShape = toAccountShape(account);
  const protocolOptions = accountShape?.pkcOptions;
  const clients = accountShape?.pkc?.clients;

  if (hasArrayItems(protocolOptions?.libp2pJsClientsOptions) || hasObjectItems(clients?.libp2pJsClients)) {
    return 'browser-libp2p';
  }

  if (hasArrayItems(protocolOptions?.pkcRpcClientsOptions) || hasObjectItems(clients?.pkcRpcClients)) {
    return isElectronRuntime(targetWindow) ? 'electron-kubo-rpc' : 'full-node-rpc';
  }

  return null;
};

export const canConfigureBrowserPureP2P = (targetWindow: Window = window) => !isElectronRuntime(targetWindow);

export const shouldShowP2PSettingsSection = (account?: unknown, targetWindow: Window = window) =>
  getP2PRuntimeMode(account, targetWindow) !== null || (canConfigureBrowserPureP2P(targetWindow) && isBrowserPureP2PEnabled(account, targetWindow));

export const isBrowserPureP2PEnabled = (account?: unknown, targetWindow: Window = window) => {
  if (!canConfigureBrowserPureP2P(targetWindow)) return false;
  if (getP2PRuntimeMode(account, targetWindow) === 'browser-libp2p') return true;
  return shouldUsePureP2PBrowser(targetWindow);
};

export const getBrowserPureP2PAccountOptions = (account?: unknown) => ({
  ...toAccountShape(account)?.pkcOptions,
  ...getBrowserPureP2PPkcOptions(),
  pkcRpcClientsOptions: undefined,
});

export const getBrowserGatewayAccountOptions = (account?: unknown) => ({
  ...toAccountShape(account)?.pkcOptions,
  ...getBrowserGatewayPkcOptions(),
  pkcRpcClientsOptions: undefined,
});
