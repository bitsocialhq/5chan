import * as React from 'react';
import { createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
const act = (React as { act?: (cb: () => void | Promise<void>) => void | Promise<void> }).act as (cb: () => void | Promise<void>) => void | Promise<void>;

const testState = vi.hoisted(() => ({
  account: {
    mediaIpfsGatewayUrl: 'https://media.old.example',
    chainProviders: {
      eth: { chainId: 1, urls: ['https://eth.old.example'] },
      sol: { chainId: 101, urls: ['https://sol.old.example'] },
    },
    pkcOptions: {
      httpRoutersOptions: ['https://router.old.example'],
      ipfsGatewayUrls: ['https://ipfs.old.example'],
      pkcRpcClientsOptions: ['ws://old.example/key'],
      pubsubKuboRpcClientsOptions: ['https://pubsub.old.example'],
    },
  } as Record<string, any>,
  rpcSettings: {
    pkcRpcSettings: {
      pkcOptions: {
        dataPath: '/tmp/pkc-data',
      },
    },
    state: 'disconnected',
  } as Record<string, any>,
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

let alertSpy: ReturnType<typeof vi.spyOn>;
let container: HTMLDivElement;
let consoleLogSpy: ReturnType<typeof vi.spyOn>;
const originalLocation = window.location;
let reloadMock: ReturnType<typeof vi.fn>;
let root: Root;

const loadComponent = async (isElectron = false) => {
  vi.resetModules();
  (window as unknown as { electronApi?: { isElectron?: boolean } }).electronApi = isElectron ? { isElectron: true } : undefined;
  return (await import('../advanced-settings')).default;
};

const renderSettings = async (isElectron = false) => {
  const AdvancedSettings = await loadComponent(isElectron);
  await act(async () => {
    root.render(createElement(AdvancedSettings));
  });
};

const dispatchInput = async (element: HTMLInputElement | HTMLTextAreaElement, value: string) => {
  await act(async () => {
    const prototype = element instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    const descriptor = Object.getOwnPropertyDescriptor(prototype, 'value');
    descriptor?.set?.call(element, value);
    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
  });
};

const clickButton = async (text: string) => {
  const button = Array.from(container.querySelectorAll('button')).find((candidate) => candidate.textContent === text);
  await act(async () => {
    button?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await Promise.resolve();
  });
};

const setTestHostname = (hostname: string) => {
  Object.defineProperty(window, 'location', {
    configurable: true,
    value: {
      ...originalLocation,
      hostname,
      reload: reloadMock,
    },
  });
};

describe('AdvancedSettings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    testState.account = {
      mediaIpfsGatewayUrl: 'https://media.old.example',
      chainProviders: {
        eth: { chainId: 1, urls: ['https://eth.old.example'] },
        sol: { chainId: 101, urls: ['https://sol.old.example'] },
      },
      pkcOptions: {
        httpRoutersOptions: ['https://router.old.example'],
        ipfsGatewayUrls: ['https://ipfs.old.example'],
        pkcRpcClientsOptions: ['ws://old.example/key'],
        pubsubKuboRpcClientsOptions: ['https://pubsub.old.example'],
      },
    };
    testState.rpcSettings = {
      pkcRpcSettings: {
        pkcOptions: {
          dataPath: '/tmp/pkc-data',
        },
      },
      state: 'disconnected',
    };
    testState.setAccountMock.mockReset().mockResolvedValue(undefined);
    alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => undefined);
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    reloadMock = vi.fn();
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: {
        ...originalLocation,
        hostname: '5chan.app',
        reload: reloadMock,
      },
    });
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    if (root) {
      act(() => root.unmount());
    }
    container?.remove();
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: originalLocation,
    });
    alertSpy?.mockRestore();
    consoleLogSpy?.mockRestore();
  });

  it('saves trimmed gateway, provider, router, rpc, and chain settings', async () => {
    await renderSettings(true);

    const textareas = container.querySelectorAll<HTMLTextAreaElement>('textarea');
    const textInputs = container.querySelectorAll<HTMLInputElement>('input[type="text"]');
    expect(textareas.length).toBe(4);
    expect(textInputs.length).toBe(3);
    expect(container.textContent).not.toContain('Solana RPC');

    await dispatchInput(textareas[0], ' https://ipfs.one.example \n\nhttps://ipfs.two.example ');
    await dispatchInput(textInputs[0], ' https://media.new.example ');
    await dispatchInput(textareas[1], ' https://pubsub.one.example \n');
    await dispatchInput(textareas[2], ' https://router.one.example \n');
    await dispatchInput(textareas[3], ' https://eth.one.example \n');
    await dispatchInput(textInputs[1], ' ws://127.0.0.1:9138/secret ');
    await dispatchInput(textInputs[2], ' /tmp/next-pkc ');
    await clickButton('save_advanced_settings');

    expect(testState.setAccountMock).toHaveBeenCalledWith({
      mediaIpfsGatewayUrl: 'https://media.new.example',
      chainProviders: {
        eth: { chainId: 1, urls: ['https://eth.one.example'] },
      },
      pkcOptions: {
        dataPath: '/tmp/next-pkc',
        httpRoutersOptions: ['https://router.one.example'],
        ipfsGatewayUrls: ['https://ipfs.one.example', 'https://ipfs.two.example'],
        pkcRpcClientsOptions: ['ws://127.0.0.1:9138/secret'],
        pubsubKuboRpcClientsOptions: ['https://pubsub.one.example'],
      },
    });
    expect(alertSpy).toHaveBeenCalledWith('advanced_options_saved_reloading');
    expect(reloadMock).toHaveBeenCalledOnce();
  });

  it('disables remote-managed textareas and shows the electron data path when RPC is connected', async () => {
    testState.rpcSettings = {
      pkcRpcSettings: {
        pkcOptions: {
          dataPath: '/tmp/connected-node',
        },
      },
      state: 'connected',
    };

    await renderSettings(true);

    const textareas = container.querySelectorAll<HTMLTextAreaElement>('textarea');
    const textInputs = container.querySelectorAll<HTMLInputElement>('input[type="text"]');
    expect(textareas[0]?.disabled).toBe(true);
    expect(textareas[1]?.disabled).toBe(true);
    expect(textareas[2]?.disabled).toBe(true);
    expect(textInputs[0]?.disabled).toBe(true);
    expect(textInputs[2]?.disabled).toBe(false);
    expect(textInputs[2]?.value).toBe('/tmp/connected-node');
  });

  it('shows pure p2p browser mode unchecked by default', async () => {
    await renderSettings(false);

    expect(container.textContent).toContain('advanced_ipfs_gateways');
    expect(container.textContent).toContain('advanced_pubsub_providers');
    expect(container.textContent).toContain('advanced_http_routers');
    expect(container.textContent).toContain('advanced_full_node_websocket_rpc');
    const checkbox = container.querySelector<HTMLInputElement>('input[type="checkbox"]');
    expect(checkbox?.checked).toBe(false);

    const nodeRpcInput = Array.from(container.querySelectorAll<HTMLInputElement>('input[type="text"]')).find(
      (input) => input.placeholder === 'advanced_p2p_rpc_placeholder',
    );
    expect(nodeRpcInput).toBeTruthy();
  });

  it('saves browser pure p2p settings when the toggle is turned on', async () => {
    localStorage.setItem('5chan:pure-p2p-browser-enabled', 'false');

    await renderSettings(false);

    const checkbox = container.querySelector<HTMLInputElement>('input[type="checkbox"]');
    expect(checkbox?.checked).toBe(false);
    expect(checkbox?.closest('label')?.nextElementSibling?.textContent).toBe('enable_pure_p2p_tip');

    await act(async () => {
      checkbox?.click();
    });
    await clickButton('save_advanced_settings');

    expect(testState.setAccountMock).toHaveBeenCalledWith(
      expect.objectContaining({
        pkcOptions: expect.objectContaining({
          httpRoutersOptions: ['https://router.old.example'],
          ipfsGatewayUrls: undefined,
          libp2pJsClientsOptions: [{ key: 'libp2pjs' }],
          pkcRpcClientsOptions: undefined,
          pubsubKuboRpcClientsOptions: undefined,
        }),
      }),
    );
    expect(localStorage.getItem('5chan:pure-p2p-browser-enabled')).toBe('true');
    expect(reloadMock).toHaveBeenCalledOnce();
  });

  it('saves gateway defaults when the browser pure p2p setting is turned off', async () => {
    localStorage.setItem('5chan:pure-p2p-browser-enabled', 'true');
    testState.account = {
      mediaIpfsGatewayUrl: 'https://media.old.example',
      pkcOptions: {
        httpRoutersOptions: ['https://peers.pleb.bot'],
        libp2pJsClientsOptions: [{ key: 'libp2pjs' }],
      },
    };

    await renderSettings(false);

    const checkbox = container.querySelector<HTMLInputElement>('input[type="checkbox"]');
    expect(checkbox?.checked).toBe(true);

    await act(async () => {
      checkbox?.click();
    });
    await clickButton('save_advanced_settings');

    expect(testState.setAccountMock).toHaveBeenCalledWith(
      expect.objectContaining({
        pkcOptions: expect.objectContaining({
          httpRoutersOptions: ['https://peers.pleb.bot'],
          ipfsGatewayUrls: ['https://ipfsgateway.xyz', 'https://gateway.plebpubsub.xyz', 'https://gateway.forumindex.com'],
          libp2pJsClientsOptions: undefined,
          pkcRpcClientsOptions: undefined,
          pubsubKuboRpcClientsOptions: ['https://pubsubprovider.xyz/api/v0', 'https://plebpubsub.xyz/api/v0', 'https://rannithepleb.com/api/v0'],
        }),
      }),
    );
    expect(localStorage.getItem('5chan:pure-p2p-browser-enabled')).toBe('false');
    expect(reloadMock).toHaveBeenCalledOnce();
  });

  it('preserves custom browser gateway providers while pure p2p is unavailable', async () => {
    localStorage.setItem('5chan:pure-p2p-browser-enabled', 'false');
    setTestHostname('p2p.5chan.app');

    await renderSettings(false);

    const checkbox = container.querySelector<HTMLInputElement>('input[type="checkbox"]');
    expect(checkbox?.checked).toBe(false);

    await clickButton('save_advanced_settings');

    expect(testState.setAccountMock).toHaveBeenCalledWith(
      expect.objectContaining({
        pkcOptions: expect.objectContaining({
          ipfsGatewayUrls: ['https://ipfs.old.example'],
          libp2pJsClientsOptions: undefined,
          pkcRpcClientsOptions: ['ws://old.example/key'],
          pubsubKuboRpcClientsOptions: ['https://pubsub.old.example'],
        }),
      }),
    );
    expect(localStorage.getItem('5chan:pure-p2p-browser-enabled')).toBe('false');
  });

  it('saves gateway mode defaults when browser pure p2p settings have no gateway endpoints', async () => {
    testState.account = {
      mediaIpfsGatewayUrl: 'https://media.old.example',
      pkcOptions: {
        httpRoutersOptions: ['https://peers.pleb.bot'],
        libp2pJsClientsOptions: [{ key: 'libp2pjs' }],
      },
    };

    await renderSettings(false);

    const checkbox = container.querySelector<HTMLInputElement>('input[type="checkbox"]');
    expect(checkbox?.checked).toBe(true);

    await act(async () => {
      checkbox?.click();
    });
    await clickButton('save_advanced_settings');

    expect(testState.setAccountMock).toHaveBeenCalledWith(
      expect.objectContaining({
        pkcOptions: expect.objectContaining({
          httpRoutersOptions: ['https://peers.pleb.bot'],
          ipfsGatewayUrls: ['https://ipfsgateway.xyz', 'https://gateway.plebpubsub.xyz', 'https://gateway.forumindex.com'],
          libp2pJsClientsOptions: undefined,
          pubsubKuboRpcClientsOptions: ['https://pubsubprovider.xyz/api/v0', 'https://plebpubsub.xyz/api/v0', 'https://rannithepleb.com/api/v0'],
        }),
      }),
    );
    expect(localStorage.getItem('5chan:pure-p2p-browser-enabled')).toBe('false');
  });

  it('renders the full node WebSocket RPC field without redundant instructions', async () => {
    await renderSettings(false);

    const nodeRpcInput = Array.from(container.querySelectorAll<HTMLInputElement>('input[type="text"]')).find(
      (input) => input.placeholder === 'advanced_p2p_rpc_placeholder',
    );

    expect(container.textContent).toContain('advanced_full_node_websocket_rpc');
    expect(nodeRpcInput).toBeTruthy();
    expect(container.querySelector('button')?.textContent).not.toBe('?');
  });

  it('alerts with the error message when saving fails with an Error instance', async () => {
    testState.setAccountMock.mockRejectedValueOnce(new Error('boom'));

    await renderSettings(false);
    await clickButton('save_advanced_settings');

    expect(alertSpy).toHaveBeenCalledWith('advanced_error_saving_options');
    expect(consoleLogSpy).toHaveBeenCalledWith(expect.objectContaining({ message: 'boom' }));
  });

  it('alerts with a generic message when saving fails with a non-error value', async () => {
    testState.setAccountMock.mockRejectedValueOnce('bad');

    await renderSettings(false);
    await clickButton('save_advanced_settings');

    expect(alertSpy).toHaveBeenCalledWith('error');
  });
});
