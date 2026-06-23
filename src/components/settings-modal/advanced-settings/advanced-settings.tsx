import { memo, RefObject, useRef, useState } from 'react';
import { setAccount, useAccount, usePkcRpcSettings } from '@bitsocial/bitsocial-react-hooks';
import { useTranslation } from 'react-i18next';
import { getBrowserGatewayPkcOptions, getBrowserPureP2PPkcOptions, setPureP2PBrowserPreference } from '../../../lib/p2p-browser-config';
import { canConfigureBrowserPureP2P, isBrowserPureP2PEnabled } from '../../../lib/p2p-runtime';
import styles from './advanced-settings.module.css';

interface SettingsProps {
  ipfsGatewayUrlsRef?: RefObject<HTMLTextAreaElement | null>;
  mediaIpfsGatewayUrlRef?: RefObject<HTMLInputElement | null>;
  pubsubProvidersRef?: RefObject<HTMLTextAreaElement | null>;
  httpRoutersRef?: RefObject<HTMLTextAreaElement | null>;
  ethRpcRef?: RefObject<HTMLTextAreaElement | null>;
  p2pRpcRef?: RefObject<HTMLInputElement | null>;
  p2pDataPathRef?: RefObject<HTMLInputElement | null>;
  onPureP2PBrowserChange?: (enabled: boolean) => void;
  pureP2PBrowserEnabled?: boolean;
  pureP2PBrowserRef?: RefObject<HTMLInputElement | null>;
}

type AccountProtocolOptions = {
  chainProviders?: Record<string, { urls?: string[]; chainId: number }>;
  dataPath?: string;
  httpRoutersOptions?: string[];
  ipfsGatewayUrls?: string[];
  kuboRpcClientsOptions?: unknown[];
  libp2pJsClientsOptions?: unknown[];
  pkcRpcClientsOptions?: string[];
  pubsubHttpClientsOptions?: string[];
  pubsubKuboRpcClientsOptions?: string[];
};

type AccountShape = {
  chainProviders?: AccountProtocolOptions['chainProviders'];
  mediaIpfsGatewayUrl?: string;
  pkcOptions?: AccountProtocolOptions;
};

type RpcSettingsShape = {
  pkcOptions?: { dataPath?: string };
};

const getProtocolOptions = (account?: AccountShape) => account?.pkcOptions;

const getChainProviders = (account?: AccountShape) => account?.chainProviders ?? getProtocolOptions(account)?.chainProviders;

const getNodeRpcClientsOptions = (protocolOptions?: AccountProtocolOptions) => protocolOptions?.pkcRpcClientsOptions;

const getPubsubRpcClientsOptions = (protocolOptions?: AccountProtocolOptions) =>
  protocolOptions?.pubsubKuboRpcClientsOptions ?? protocolOptions?.pubsubHttpClientsOptions;

const getRpcSettingsDataPath = (rpcSettings?: RpcSettingsShape) => rpcSettings?.pkcOptions?.dataPath ?? '';

const IPFSGatewaysSettings = ({ ipfsGatewayUrlsRef, mediaIpfsGatewayUrlRef }: SettingsProps) => {
  const { t } = useTranslation();
  const account = useAccount() as AccountShape | undefined;
  const protocolOptions = getProtocolOptions(account);
  const { ipfsGatewayUrls } = protocolOptions || {};
  const { mediaIpfsGatewayUrl } = account || {};
  const pkcRpc = usePkcRpcSettings();
  const isConnectedToRpc = pkcRpc?.state === 'connected';
  const ipfsGatewayUrlsDefaultValue = ipfsGatewayUrls?.join('\n');

  return (
    <div className={styles.ipfsGatewaysSettings}>
      <div className={styles.ipfsGatewaysSetting}>
        <textarea
          aria-label={t('advanced_ipfs_gateway_urls_aria')}
          defaultValue={ipfsGatewayUrlsDefaultValue}
          ref={ipfsGatewayUrlsRef}
          disabled={isConnectedToRpc}
          autoCorrect='off'
          autoComplete='off'
          spellCheck='false'
          rows={ipfsGatewayUrls?.length || 1}
        />
      </div>
      <span className={styles.settingTip}>{t('advanced_media_ipfs_gateway')}</span>
      <div>
        <input
          type='text'
          aria-label={t('advanced_media_ipfs_gateway_url_aria')}
          defaultValue={mediaIpfsGatewayUrl}
          ref={mediaIpfsGatewayUrlRef}
          disabled={isConnectedToRpc}
          autoCorrect='off'
          autoCapitalize='off'
          spellCheck='false'
        />
      </div>
    </div>
  );
};

const PubsubProvidersSettings = ({ pubsubProvidersRef }: SettingsProps) => {
  const { t } = useTranslation();
  const account = useAccount() as AccountShape | undefined;
  const protocolOptions = getProtocolOptions(account);
  const pubsubKuboRpcClientsOptions = getPubsubRpcClientsOptions(protocolOptions);
  const pkcRpc = usePkcRpcSettings();
  const isConnectedToRpc = pkcRpc?.state === 'connected';
  const pubsubProvidersDefaultValue = pubsubKuboRpcClientsOptions?.join('\n');

  return (
    <div className={styles.pubsubProvidersSettings}>
      <textarea
        aria-label={t('advanced_pubsub_providers_aria')}
        defaultValue={pubsubProvidersDefaultValue}
        ref={pubsubProvidersRef}
        disabled={isConnectedToRpc}
        autoCorrect='off'
        autoCapitalize='off'
        autoComplete='off'
        spellCheck='false'
        rows={pubsubKuboRpcClientsOptions?.length || 1}
      />
    </div>
  );
};

const HttpRoutersSettings = ({ httpRoutersRef }: SettingsProps) => {
  const { t } = useTranslation();
  const account = useAccount() as AccountShape | undefined;
  const protocolOptions = getProtocolOptions(account);
  const { httpRoutersOptions } = protocolOptions || {};
  const pkcRpc = usePkcRpcSettings();
  const isConnectedToRpc = pkcRpc?.state === 'connected';
  const httpRoutersDefaultValue = httpRoutersOptions?.join('\n');

  return (
    <div className={styles.httpRoutersSettings}>
      <textarea
        aria-label={t('advanced_http_routers_aria')}
        defaultValue={httpRoutersDefaultValue}
        ref={httpRoutersRef}
        disabled={isConnectedToRpc}
        autoCorrect='off'
        autoCapitalize='off'
        autoComplete='off'
        spellCheck='false'
        rows={httpRoutersOptions?.length || 1}
      />
    </div>
  );
};

const BlockchainProvidersSettings = ({ ethRpcRef }: SettingsProps) => {
  const { t } = useTranslation();
  const account = useAccount() as AccountShape | undefined;
  const chainProviders = getChainProviders(account);
  const ethRpcDefaultValue = chainProviders?.['eth']?.urls?.join('\n');

  return (
    <div className={styles.blockchainProvidersSettings}>
      <span className={styles.settingTip}>{t('advanced_ethereum_rpc_bso_domains')}</span>
      <div>
        <textarea
          aria-label={t('advanced_ethereum_rpc_urls_aria')}
          defaultValue={ethRpcDefaultValue}
          ref={ethRpcRef}
          autoCorrect='off'
          autoComplete='off'
          spellCheck='false'
          rows={chainProviders?.['eth']?.urls?.length || 1}
        />
      </div>
    </div>
  );
};

const P2pRPCSettings = ({ p2pRpcRef }: SettingsProps) => {
  const { t } = useTranslation();
  const account = useAccount() as AccountShape | undefined;
  const protocolOptions = getProtocolOptions(account);
  const pkcRpcClientsOptions = getNodeRpcClientsOptions(protocolOptions);

  return (
    <div className={styles.p2pRPCSettings}>
      <input
        type='text'
        aria-label={t('advanced_p2p_rpc_clients_aria')}
        defaultValue={pkcRpcClientsOptions}
        placeholder={t('advanced_p2p_rpc_placeholder')}
        ref={p2pRpcRef}
        autoCorrect='off'
        autoCapitalize='off'
        spellCheck='false'
      />
    </div>
  );
};

const P2pDataPathSettings = ({ p2pDataPathRef }: SettingsProps) => {
  const { t } = useTranslation();
  const pkcRpc = usePkcRpcSettings();
  const { pkcRpcSettings } = pkcRpc || {};
  const isConnectedToRpc = pkcRpc?.state === 'connected';
  const path = getRpcSettingsDataPath(pkcRpcSettings as RpcSettingsShape | undefined);

  return (
    <div className={styles.p2pDataPathSettings}>
      <div>
        <input
          autoCorrect='off'
          autoCapitalize='off'
          spellCheck='false'
          type='text'
          aria-label={t('advanced_p2p_data_path_aria')}
          defaultValue={path}
          disabled={!isConnectedToRpc}
          ref={p2pDataPathRef}
        />
      </div>
    </div>
  );
};

const PureP2PBrowserSettings = ({ onPureP2PBrowserChange, pureP2PBrowserEnabled, pureP2PBrowserRef }: SettingsProps) => {
  const { t } = useTranslation();
  const account = useAccount() as AccountShape | undefined;
  const isChecked = pureP2PBrowserEnabled ?? isBrowserPureP2PEnabled(account);

  return (
    <div className={styles.pureP2PSettings}>
      <label>
        <input
          className={styles.pureP2PCheckbox}
          type='checkbox'
          aria-label={t('advanced_pure_p2p_browser_aria')}
          checked={isChecked}
          ref={pureP2PBrowserRef}
          onChange={(event) => onPureP2PBrowserChange?.(event.currentTarget.checked)}
        />
        {t('enable_pure_p2p')}
      </label>
      <div className={styles.settingTip}>{t('enable_pure_p2p_tip')}</div>
    </div>
  );
};

const isElectron = window.electronApi?.isElectron === true;

const getTrimmedLines = (value: string | undefined): string[] | undefined => {
  return value?.split('\n').reduce<string[]>((lines, line) => {
    const trimmedLine = line.trim();
    if (trimmedLine) lines.push(trimmedLine);
    return lines;
  }, []);
};

const applyBrowserGatewayPkcOptions = (
  pkcOptions: AccountProtocolOptions,
  ipfsGatewayUrls: string[] | undefined,
  pubsubKuboRpcClientsOptions: string[] | undefined,
  httpRoutersOptions: string[] | undefined,
) => {
  const gatewayOptions = getBrowserGatewayPkcOptions();

  return {
    ...pkcOptions,
    ...gatewayOptions,
    ipfsGatewayUrls: ipfsGatewayUrls?.length ? ipfsGatewayUrls : gatewayOptions.ipfsGatewayUrls,
    pubsubKuboRpcClientsOptions: pubsubKuboRpcClientsOptions?.length ? pubsubKuboRpcClientsOptions : gatewayOptions.pubsubKuboRpcClientsOptions,
    httpRoutersOptions: httpRoutersOptions?.length ? httpRoutersOptions : gatewayOptions.httpRoutersOptions,
  };
};

const AdvancedSettings = () => {
  const { t } = useTranslation();
  const account = useAccount() as AccountShape | undefined;
  const protocolOptions = getProtocolOptions(account);
  const canConfigurePureP2PBrowser = canConfigureBrowserPureP2P();
  const activeBrowserPureP2PEnabled = canConfigurePureP2PBrowser && isBrowserPureP2PEnabled(account);
  const [browserPureP2PSelection, setBrowserPureP2PSelection] = useState<boolean | undefined>(undefined);
  const browserPureP2PEnabled = browserPureP2PSelection ?? activeBrowserPureP2PEnabled;
  const shouldShowGatewayModeSettings = !canConfigurePureP2PBrowser || !activeBrowserPureP2PEnabled;

  const ipfsGatewayUrlsRef = useRef<HTMLTextAreaElement>(null);
  const mediaIpfsGatewayUrlRef = useRef<HTMLInputElement>(null);
  const pubsubProvidersRef = useRef<HTMLTextAreaElement>(null);
  const ethRpcRef = useRef<HTMLTextAreaElement>(null);
  const httpRoutersRef = useRef<HTMLTextAreaElement>(null);
  const p2pRpcRef = useRef<HTMLInputElement>(null);
  const p2pDataPathRef = useRef<HTMLInputElement>(null);
  const pureP2PBrowserRef = useRef<HTMLInputElement>(null);

  const handleSave = async () => {
    const ipfsGatewayUrls = ipfsGatewayUrlsRef.current ? getTrimmedLines(ipfsGatewayUrlsRef.current.value) : protocolOptions?.ipfsGatewayUrls;

    const mediaIpfsGatewayUrl = mediaIpfsGatewayUrlRef.current ? mediaIpfsGatewayUrlRef.current.value.trim() : account?.mediaIpfsGatewayUrl;

    const pubsubKuboRpcClientsOptions = pubsubProvidersRef.current ? getTrimmedLines(pubsubProvidersRef.current.value) : getPubsubRpcClientsOptions(protocolOptions);

    const ethRpcUrls = getTrimmedLines(ethRpcRef.current?.value);

    const httpRoutersOptions = getTrimmedLines(httpRoutersRef.current?.value);

    const pkcRpcClientsOptions = p2pRpcRef.current?.value.trim() ? [p2pRpcRef.current.value.trim()] : undefined;
    const dataPath = p2pDataPathRef.current?.value.trim() || undefined;
    const pureP2PBrowserPreference = canConfigurePureP2PBrowser ? browserPureP2PEnabled : undefined;

    const chainProviders: Record<string, { urls: string[] | undefined; chainId: number }> = {};
    if (ethRpcUrls && ethRpcUrls.length > 0) {
      chainProviders.eth = { urls: ethRpcUrls, chainId: 1 };
    }

    let pkcOptions: AccountProtocolOptions = {
      ...protocolOptions,
      ipfsGatewayUrls,
      pubsubKuboRpcClientsOptions,
      httpRoutersOptions,
      pkcRpcClientsOptions,
      dataPath,
    };

    if (pureP2PBrowserPreference !== undefined) {
      if (pureP2PBrowserPreference) {
        const pureP2POptions = getBrowserPureP2PPkcOptions();
        pkcOptions = {
          ...pkcOptions,
          ...pureP2POptions,
          httpRoutersOptions: httpRoutersOptions?.length ? httpRoutersOptions : pureP2POptions.httpRoutersOptions,
          pkcRpcClientsOptions: undefined,
        };
      } else {
        pkcOptions = applyBrowserGatewayPkcOptions(pkcOptions, ipfsGatewayUrls, pubsubKuboRpcClientsOptions, httpRoutersOptions);
      }
    }

    try {
      await setAccount({
        ...account,
        mediaIpfsGatewayUrl,
        chainProviders,
        pkcOptions,
      });
      if (pureP2PBrowserPreference !== undefined) setPureP2PBrowserPreference(pureP2PBrowserPreference);
      alert(t('advanced_options_saved_reloading'));
      window.location.reload();
    } catch (e) {
      if (e instanceof Error) {
        alert(t('advanced_error_saving_options', { message: e.message }));
        console.log(e);
      } else {
        alert(t('error'));
      }
    }
  };

  return (
    <div className={styles.content}>
      {shouldShowGatewayModeSettings ? (
        <>
          <div className={styles.category}>
            <span className={styles.categoryTitle}>{t('advanced_ipfs_gateways')}</span>
            <span className={styles.categorySettings}>
              <IPFSGatewaysSettings ipfsGatewayUrlsRef={ipfsGatewayUrlsRef} mediaIpfsGatewayUrlRef={mediaIpfsGatewayUrlRef} />
            </span>
          </div>
          <div className={styles.category}>
            <span className={styles.categoryTitle}>{t('advanced_pubsub_providers')}</span>
            <span className={styles.categorySettings}>
              <PubsubProvidersSettings pubsubProvidersRef={pubsubProvidersRef} />
            </span>
          </div>
        </>
      ) : null}
      <div className={styles.category}>
        <span className={styles.categoryTitle}>{t('advanced_http_routers')}</span>
        <span className={styles.categorySettings}>
          <HttpRoutersSettings httpRoutersRef={httpRoutersRef} />
        </span>
      </div>
      <div className={styles.category}>
        <span className={styles.categoryTitle} style={{ marginBottom: '-5px' }}>
          {t('advanced_blockchain_providers')}
        </span>
        <span className={styles.categorySettings}>
          <BlockchainProvidersSettings ethRpcRef={ethRpcRef} />
        </span>
      </div>
      <div className={styles.category}>
        <span className={styles.categoryTitle}>{t('advanced_full_node_websocket_rpc')}</span>
        <span className={styles.categorySettings}>
          <P2pRPCSettings p2pRpcRef={p2pRpcRef} />
        </span>
      </div>
      {isElectron && (
        <div className={styles.category}>
          <span className={styles.categoryTitle}>{t('advanced_p2p_data_path')}</span>
          <span className={styles.categorySettings}>
            <P2pDataPathSettings p2pDataPathRef={p2pDataPathRef} />
          </span>
        </div>
      )}
      {canConfigurePureP2PBrowser ? (
        <PureP2PBrowserSettings pureP2PBrowserEnabled={browserPureP2PEnabled} pureP2PBrowserRef={pureP2PBrowserRef} onPureP2PBrowserChange={setBrowserPureP2PSelection} />
      ) : null}
      <button type='button' className={styles.saveOptions} onClick={handleSave}>
        {t('save_advanced_settings')}
      </button>
    </div>
  );
};

export default memo(AdvancedSettings);
