import * as React from 'react';
import { createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
const act = (React as { act?: (cb: () => void | Promise<void>) => void | Promise<void> }).act as (cb: () => void | Promise<void>) => void | Promise<void>;

const testState = vi.hoisted(() => ({
  account: {
    id: 'account-1',
    name: 'Imported',
    mediaIpfsGatewayUrl: 'https://media.example',
    pkcOptions: {
      httpRoutersOptions: ['https://routing.lol', 'https://peers.pleb.bot', 'https://peers.plebpubsub.xyz', 'https://peers.forumindex.com'],
      libp2pJsClientsOptions: [{ key: 'libp2pjs' }],
    },
  } as Record<string, any> | undefined,
  rpcSettings: {
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
let consoleLogSpy: ReturnType<typeof vi.spyOn>;
let container: HTMLDivElement;
const originalLocation = window.location;
let reloadMock: ReturnType<typeof vi.fn>;
let root: Root;

const renderModal = async () => {
  const SettingsUpgradeModal = (await import('../settings-upgrade-modal')).default;
  await act(async () => {
    root.render(createElement(SettingsUpgradeModal));
  });
};

const getUpgradeCheckbox = (routerUrl: string) => {
  const label = Array.from(container.querySelectorAll('label')).find((candidate) => candidate.textContent?.includes(routerUrl));
  return label?.querySelector<HTMLInputElement>('input[type="checkbox"]');
};

const clickButton = async (text: string) => {
  const button = Array.from(container.querySelectorAll('button')).find((candidate) => candidate.textContent === text);
  await act(async () => {
    button?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await Promise.resolve();
  });
};

describe('SettingsUpgradeModal', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    localStorage.clear();
    testState.account = {
      id: 'account-1',
      name: 'Imported',
      mediaIpfsGatewayUrl: 'https://media.example',
      pkcOptions: {
        httpRoutersOptions: ['https://routing.lol', 'https://peers.pleb.bot', 'https://peers.plebpubsub.xyz', 'https://peers.forumindex.com'],
        libp2pJsClientsOptions: [{ key: 'libp2pjs' }],
      },
    };
    testState.rpcSettings = {
      state: 'disconnected',
    };
    testState.setAccountMock.mockReset().mockResolvedValue(undefined);
    reloadMock = vi.fn();
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: {
        ...originalLocation,
        reload: reloadMock,
      },
    });
    alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => undefined);
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
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

  it('opens automatically when an active account has reviewable HTTP tracker upgrades', async () => {
    await renderModal();

    expect(container.textContent).toContain('advanced_settings_upgrade_available');
    expect(container.textContent).toContain('advanced_settings_upgrade_tip');
    expect(container.textContent).toContain('https://routerofbitsocial.xyz');
    expect(container.textContent).toContain('https://bsotracker.online');
    expect(container.textContent).not.toContain('settings_upgrade_never_show_again');
    expect(getUpgradeCheckbox('https://routerofbitsocial.xyz')?.checked).toBe(true);
    expect(getUpgradeCheckbox('https://bsotracker.online')?.checked).toBe(true);
  });

  it('applies only selected HTTP tracker upgrades', async () => {
    await renderModal();

    await act(async () => {
      getUpgradeCheckbox('https://bsotracker.online')?.click();
    });
    await clickButton('settings_upgrade_apply_selected');

    expect(testState.setAccountMock).toHaveBeenCalledWith(
      expect.objectContaining({
        mediaIpfsGatewayUrl: 'https://media.example',
        pkcOptions: expect.objectContaining({
          httpRoutersOptions: [
            'https://routing.lol',
            'https://peers.pleb.bot',
            'https://peers.plebpubsub.xyz',
            'https://peers.forumindex.com',
            'https://routerofbitsocial.xyz',
          ],
          libp2pJsClientsOptions: [{ key: 'libp2pjs' }],
        }),
      }),
    );
    expect(reloadMock).toHaveBeenCalledOnce();
  });

  it('remembers when the user keeps current settings', async () => {
    await renderModal();

    await clickButton('settings_upgrade_keep_current');

    expect(container.querySelector('dialog')).toBeNull();
    expect(testState.setAccountMock).not.toHaveBeenCalled();
    expect(localStorage.getItem('5chan:dismissed-settings-upgrades')).toContain('account-1:http-routers:https://routerofbitsocial.xyz|https://bsotracker.online');

    await renderModal();

    expect(container.querySelector('dialog')).toBeNull();
  });

  it('reopens dismissed upgrades when the user reviews them from settings', async () => {
    await renderModal();

    await clickButton('settings_upgrade_keep_current');
    expect(container.querySelector('dialog')).toBeNull();

    const useSettingsUpgradeReviewStore = (await import('../../../stores/use-settings-upgrade-review-store')).default;
    await act(async () => {
      useSettingsUpgradeReviewStore.getState().reviewUpgradeKeys(['account-1:http-routers:https://routerofbitsocial.xyz|https://bsotracker.online']);
    });

    expect(container.querySelector('dialog')).not.toBeNull();
    expect(container.textContent).toContain('https://routerofbitsocial.xyz');
    expect(localStorage.getItem('5chan:dismissed-settings-upgrades')).not.toContain('account-1:http-routers:https://routerofbitsocial.xyz|https://bsotracker.online');
    expect(localStorage.getItem('5chan:hidden-settings-upgrade-reviews')).not.toContain('account-1:http-routers:https://routerofbitsocial.xyz|https://bsotracker.online');
  });

  it('shows the permanent hide action only after the upgrade is reopened from settings review', async () => {
    const upgradeKey = 'account-1:http-routers:https://routerofbitsocial.xyz|https://bsotracker.online';
    await renderModal();

    expect(container.textContent).not.toContain('settings_upgrade_never_show_again');

    await clickButton('settings_upgrade_keep_current');
    const useSettingsUpgradeReviewStore = (await import('../../../stores/use-settings-upgrade-review-store')).default;
    await act(async () => {
      useSettingsUpgradeReviewStore.getState().reviewUpgradeKeys([upgradeKey]);
    });

    expect(container.querySelector('dialog')).not.toBeNull();
    expect(container.textContent).toContain('settings_upgrade_never_show_again');
    expect(
      Array.from(container.querySelectorAll('button')).find((candidate) => candidate.textContent === 'settings_upgrade_never_show_again')?.parentElement?.textContent,
    ).toBe('settings_upgrade_never_show_again');

    await clickButton('settings_upgrade_never_show_again');

    expect(container.querySelector('dialog')).toBeNull();
    expect(localStorage.getItem('5chan:dismissed-settings-upgrades')).toContain(upgradeKey);
    expect(localStorage.getItem('5chan:hidden-settings-upgrade-reviews')).toContain(upgradeKey);
  });

  it('does not reopen upgrade prompts hidden from settings review', async () => {
    localStorage.setItem('5chan:hidden-settings-upgrade-reviews', JSON.stringify(['account-1:http-routers:https://routerofbitsocial.xyz|https://bsotracker.online']));

    await renderModal();

    expect(container.querySelector('dialog')).toBeNull();
  });

  it('stays hidden for custom routers and connected RPC settings', async () => {
    testState.account = {
      id: 'account-1',
      pkcOptions: {
        httpRoutersOptions: ['https://router.custom.example'],
      },
    };
    await renderModal();
    expect(container.querySelector('dialog')).toBeNull();

    testState.account = {
      id: 'account-2',
      pkcOptions: {
        httpRoutersOptions: ['https://routing.lol', 'https://peers.pleb.bot', 'https://peers.plebpubsub.xyz', 'https://peers.forumindex.com'],
      },
    };
    testState.rpcSettings = { state: 'connected' };
    await renderModal();
    expect(container.querySelector('dialog')).toBeNull();
  });
});
