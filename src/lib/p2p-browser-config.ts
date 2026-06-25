export const PURE_P2P_BROWSER_SETTING_KEY = '5chan:pure-p2p-browser-enabled';
export const BROWSER_PURE_P2P_DEFAULT_ENABLED = false;

const BROWSER_PUBSUB_KUBO_RPC_CLIENTS_OPTIONS = ['https://pubsubprovider.xyz/api/v0', 'https://plebpubsub.xyz/api/v0', 'https://rannithepleb.com/api/v0'];
// Keep this aligned with bitsocial-react-hooks' DEFAULT_HTTP_ROUTER_URLS without relying on a package-internal runtime import before window.defaultPkcOptions is configured.
const DEFAULT_HTTP_ROUTER_URLS = [
  'https://peers.pleb.bot',
  'https://routing.lol',
  'https://peers.forumindex.com',
  'https://peers.plebpubsub.xyz',
  'https://routerofbitsocial.xyz',
  'https://bsotracker.online',
];

export const P2P_BROWSER_PKC_OPTIONS = {
  libp2pJsClientsOptions: [{ key: 'libp2pjs' }],
  ipfsGatewayUrls: undefined,
  kuboRpcClientsOptions: undefined,
  pubsubHttpClientsOptions: undefined,
  pubsubKuboRpcClientsOptions: undefined as string[] | undefined,
  httpRoutersOptions: DEFAULT_HTTP_ROUTER_URLS,
};

const GATEWAY_BROWSER_PKC_OPTIONS = {
  ipfsGatewayUrls: ['https://ipfsgateway.xyz', 'https://gateway.plebpubsub.xyz', 'https://gateway.forumindex.com'],
  kuboRpcClientsOptions: undefined,
  libp2pJsClientsOptions: undefined,
  pubsubHttpClientsOptions: undefined,
  pubsubKuboRpcClientsOptions: BROWSER_PUBSUB_KUBO_RPC_CLIENTS_OPTIONS,
  httpRoutersOptions: DEFAULT_HTTP_ROUTER_URLS,
};

type P2PBrowserConfigWindow = {
  location?: Pick<Location, 'hostname'>;
  defaultPkcOptions?: Record<string, unknown>;
  electronApi?: { isElectron?: boolean };
  isElectron?: boolean;
  localStorage?: Pick<Storage, 'getItem' | 'setItem'>;
};

const cloneArray = <T>(value: T[] | undefined) => (value ? [...value] : undefined);

export const getBrowserPureP2PPkcOptions = () => ({
  ...P2P_BROWSER_PKC_OPTIONS,
  libp2pJsClientsOptions: P2P_BROWSER_PKC_OPTIONS.libp2pJsClientsOptions.map((options) => ({ ...options })),
  pubsubKuboRpcClientsOptions: cloneArray(P2P_BROWSER_PKC_OPTIONS.pubsubKuboRpcClientsOptions),
  httpRoutersOptions: [...P2P_BROWSER_PKC_OPTIONS.httpRoutersOptions],
});

export const getBrowserGatewayPkcOptions = () => ({
  ...GATEWAY_BROWSER_PKC_OPTIONS,
  ipfsGatewayUrls: [...GATEWAY_BROWSER_PKC_OPTIONS.ipfsGatewayUrls],
  pubsubKuboRpcClientsOptions: [...GATEWAY_BROWSER_PKC_OPTIONS.pubsubKuboRpcClientsOptions],
  httpRoutersOptions: [...GATEWAY_BROWSER_PKC_OPTIONS.httpRoutersOptions],
});

export const getPureP2PBrowserPreference = (targetWindow: P2PBrowserConfigWindow = window) => {
  try {
    const storedValue = targetWindow.localStorage?.getItem(PURE_P2P_BROWSER_SETTING_KEY);
    if (storedValue === 'true') return true;
    if (storedValue === 'false') return false;
  } catch {
    return undefined;
  }

  return undefined;
};

export const setPureP2PBrowserPreference = (enabled: boolean, targetWindow: P2PBrowserConfigWindow = window) => {
  try {
    targetWindow.localStorage?.setItem(PURE_P2P_BROWSER_SETTING_KEY, String(enabled));
  } catch {
    return;
  }
};

export const isElectronRuntime = (targetWindow: P2PBrowserConfigWindow = window) => targetWindow.electronApi?.isElectron === true || targetWindow.isElectron === true;

export const canUsePureP2PBrowser = (targetWindow: P2PBrowserConfigWindow = window) => !isElectronRuntime(targetWindow);

export const shouldUsePureP2PBrowser = (targetWindow: P2PBrowserConfigWindow = window) => {
  if (!canUsePureP2PBrowser(targetWindow)) return false;

  const preference = getPureP2PBrowserPreference(targetWindow);
  if (preference !== undefined) return preference;

  return BROWSER_PURE_P2P_DEFAULT_ENABLED;
};

export const configureP2PBrowserPkcOptions = (targetWindow: P2PBrowserConfigWindow = window) => {
  if (!shouldUsePureP2PBrowser(targetWindow)) {
    if (canUsePureP2PBrowser(targetWindow)) {
      targetWindow.defaultPkcOptions = {
        ...targetWindow.defaultPkcOptions,
        ...getBrowserGatewayPkcOptions(),
      };
    }

    return false;
  }

  targetWindow.defaultPkcOptions = {
    ...targetWindow.defaultPkcOptions,
    ...getBrowserPureP2PPkcOptions(),
  };

  return true;
};
