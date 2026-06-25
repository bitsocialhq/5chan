import * as React from 'react';
import { createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
const act = (React as { act?: (cb: () => void | Promise<void>) => void | Promise<void> }).act as (cb: () => void | Promise<void>) => void | Promise<void>;

const testState = vi.hoisted(() => ({
  account: undefined as Record<string, any> | undefined,
  accounts: [] as Record<string, any>[] | undefined,
  accountsState: 'initializing',
  createAccountMock: vi.fn().mockResolvedValue(undefined),
  setActiveAccountMock: vi.fn().mockResolvedValue(undefined),
  setAccountMock: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@bitsocial/bitsocial-react-hooks', () => ({
  createAccount: () => testState.createAccountMock(),
  setAccount: (account: unknown) => testState.setAccountMock(account),
  setActiveAccount: (accountName: string) => testState.setActiveAccountMock(accountName),
  useAccount: () => testState.account,
  useAccounts: () => ({ accounts: testState.accounts, state: testState.accountsState }),
}));

let container: HTMLDivElement;
const originalLocation = window.location;
let reloadMock: ReturnType<typeof vi.fn>;
let root: Root;

const loadHook = async () => (await import('../use-browser-pure-p2p-account-upgrade')).useBrowserPureP2PAccountUpgrade;

const TestComponent = ({ useUpgrade }: { useUpgrade: () => void }) => {
  useUpgrade();
  return null;
};

const renderHook = async () => {
  const useUpgrade = await loadHook();
  await act(async () => {
    root.render(createElement(TestComponent, { useUpgrade }));
    await Promise.resolve();
    await Promise.resolve();
  });
};

describe('useBrowserPureP2PAccountUpgrade', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    localStorage.clear();
    testState.account = undefined;
    testState.accounts = [];
    testState.accountsState = 'initializing';
    testState.createAccountMock.mockReset().mockResolvedValue(undefined);
    testState.setActiveAccountMock.mockReset().mockResolvedValue(undefined);
    testState.setAccountMock.mockReset().mockResolvedValue(undefined);
    reloadMock = vi.fn();
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: {
        ...originalLocation,
        hostname: '5chan.app',
        reload: reloadMock,
      },
    });
    window.electronApi = undefined;
    window.isElectron = false;
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    vi.useRealTimers();
    if (root) {
      act(() => root.unmount());
    }
    container?.remove();
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: originalLocation,
    });
    window.BITSOCIAL_REACT_HOOKS_ACCOUNTS_STORE_INITIALIZING = undefined;
    window.electronApi = undefined;
    window.isElectron = false;
  });

  it('does not upgrade stale gateway browser accounts when pure p2p is explicitly disabled', async () => {
    localStorage.setItem('5chan:pure-p2p-browser-enabled', 'false');
    testState.account = {
      id: 'account-1',
      name: 'Account 1',
      pkcOptions: {
        httpRoutersOptions: ['https://router.old.example'],
        ipfsGatewayUrls: ['https://gateway.old.example'],
        pubsubKuboRpcClientsOptions: ['https://pubsub.old.example/api/v0'],
      },
    };
    testState.accounts = [testState.account];

    await renderHook();

    expect(testState.setAccountMock).not.toHaveBeenCalled();
    expect(reloadMock).not.toHaveBeenCalled();
  });

  it('upgrades stale gateway browser accounts by default and reloads after saving', async () => {
    testState.account = {
      id: 'account-1',
      name: 'Account 1',
      pkcOptions: {
        httpRoutersOptions: ['https://router.old.example'],
        ipfsGatewayUrls: ['https://gateway.old.example'],
        pubsubKuboRpcClientsOptions: ['https://pubsub.old.example/api/v0'],
      },
    };
    testState.accounts = [testState.account];

    await renderHook();

    expect(testState.setAccountMock).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'account-1',
        pkcOptions: expect.objectContaining({
          ipfsGatewayUrls: undefined,
          libp2pJsClientsOptions: [{ key: 'libp2pjs' }],
          pkcRpcClientsOptions: undefined,
          pubsubKuboRpcClientsOptions: undefined,
        }),
      }),
    );
    expect(reloadMock).toHaveBeenCalledOnce();
  });

  it('does not upgrade browser full-node accounts', async () => {
    testState.account = {
      id: 'account-1',
      name: 'Account 1',
      pkcOptions: {
        pkcRpcClientsOptions: ['ws://node.example/key'],
      },
    };
    testState.accounts = [testState.account];

    await renderHook();

    expect(testState.setAccountMock).not.toHaveBeenCalled();
    expect(reloadMock).not.toHaveBeenCalled();
  });

  it('waits for the hooks store instead of creating duplicate accounts while initialization is running', async () => {
    vi.useFakeTimers();
    window.BITSOCIAL_REACT_HOOKS_ACCOUNTS_STORE_INITIALIZING = true;

    await renderHook();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000);
    });

    expect(testState.createAccountMock).not.toHaveBeenCalled();
    expect(testState.setActiveAccountMock).not.toHaveBeenCalled();
    expect(reloadMock).not.toHaveBeenCalled();
  });

  it('recovers an empty account store without reloading', async () => {
    window.BITSOCIAL_REACT_HOOKS_ACCOUNTS_STORE_INITIALIZING = false;

    await renderHook();

    expect(testState.createAccountMock).toHaveBeenCalledOnce();
    expect(testState.setActiveAccountMock).not.toHaveBeenCalled();
    expect(reloadMock).not.toHaveBeenCalled();
  });

  it('selects the first existing account when no active account is selected', async () => {
    testState.accountsState = 'succeeded';
    testState.account = undefined;
    testState.accounts = [
      {
        id: 'account-1',
        name: 'Account 1',
      },
      {
        id: 'account-2',
        name: 'Account 2',
      },
    ];

    await renderHook();

    expect(testState.setActiveAccountMock).toHaveBeenCalledWith('Account 1');
    expect(testState.createAccountMock).not.toHaveBeenCalled();
    expect(reloadMock).not.toHaveBeenCalled();
  });

  it('treats temporarily missing accounts as still initializing', async () => {
    vi.useFakeTimers();
    testState.accounts = undefined;
    window.BITSOCIAL_REACT_HOOKS_ACCOUNTS_STORE_INITIALIZING = true;

    await renderHook();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
      await Promise.resolve();
    });

    expect(testState.createAccountMock).not.toHaveBeenCalled();
    expect(testState.setActiveAccountMock).not.toHaveBeenCalled();
    expect(reloadMock).not.toHaveBeenCalled();
  });
});
