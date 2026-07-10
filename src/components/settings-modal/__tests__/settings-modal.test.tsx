import * as React from 'react';
import { createElement } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import SettingsModal from '../settings-modal';
import useSettingsUpgradeReviewStore from '../../../stores/use-settings-upgrade-review-store';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
const act = (React as { act?: (cb: () => void | Promise<void>) => void | Promise<void> }).act as (cb: () => void | Promise<void>) => void | Promise<void>;

const testState = vi.hoisted(() => ({
  account: {
    id: 'account-1',
    pkcOptions: {
      libp2pJsClientsOptions: [{ key: 'libp2pjs' }],
    },
  } as Record<string, any>,
  rpcSettings: {
    state: 'disconnected',
  } as Record<string, any>,
}));

vi.mock('@bitsocial/bitsocial-react-hooks', () => ({
  useAccount: () => testState.account,
  usePkcRpcSettings: () => testState.rpcSettings,
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock('../account-settings/account-settings', () => ({
  default: () => <div data-testid='account-settings'>account-settings</div>,
}));

vi.mock('../crypto-address-setting/crypto-address-setting', () => ({
  default: () => <div data-testid='crypto-address-setting'>crypto-address-setting</div>,
}));

vi.mock('../crypto-wallets-setting/crypto-wallets-setting', () => ({
  default: () => <div data-testid='crypto-wallets-setting'>crypto-wallets-setting</div>,
}));

vi.mock('../interface-settings/interface-settings', () => ({
  default: () => <div data-testid='interface-settings-panel'>interface-settings</div>,
}));

vi.mock('../media-hosting-settings/media-hosting-settings', () => ({
  default: () => <div data-testid='media-hosting-settings-panel'>media-hosting-settings</div>,
}));

vi.mock('../advanced-settings/advanced-settings', () => ({
  default: () => <div data-testid='advanced-settings-panel'>advanced-settings</div>,
}));

vi.mock('../subscriptions-setting/subscriptions-setting', () => ({
  default: () => <div data-testid='subscriptions-settings-panel'>subscriptions-settings</div>,
}));

vi.mock('../trusted-board-links-setting/trusted-board-links-setting', () => ({
  default: () => <div data-testid='trusted-board-links-settings-panel'>trusted-board-links-settings</div>,
}));

vi.mock('../p2p-stats-settings/p2p-stats-settings', () => ({
  default: () => <div data-testid='p2p-stats-settings-panel'>p2p-stats-settings</div>,
}));

const LocationProbe = () => {
  const location = useLocation();
  return <div data-testid='location'>{location.pathname + location.search + location.hash}</div>;
};

let root: Root;
let container: HTMLDivElement;

const render = (initialEntry = '/all/settings') => {
  act(() => {
    root.render(
      createElement(MemoryRouter, { initialEntries: [initialEntry] }, createElement(React.Fragment, {}, createElement(SettingsModal), createElement(LocationProbe))),
    );
  });
};

const getLocationText = () => container.querySelector('[data-testid="location"]')?.textContent ?? '';

const getSectionToggleByText = (text: string) => {
  const control = Array.from(container.querySelectorAll<HTMLElement>('label, button')).find((candidate) => (candidate.textContent ?? '').includes(text));
  if (!control) {
    throw new Error(`Section toggle containing "${text}" not found`);
  }
  return control;
};

describe('SettingsModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    testState.account = {
      id: 'account-1',
      pkcOptions: {
        libp2pJsClientsOptions: [{ key: 'libp2pjs' }],
      },
    };
    testState.rpcSettings = {
      state: 'disconnected',
    };
    useSettingsUpgradeReviewStore.setState({
      hiddenReviewUpgradeKeys: [],
      persistentDismissedUpgradeKeys: [],
      reviewedUpgradeKeys: [],
      reviewRequestId: 0,
    });
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  it('opens the account section for crypto subsection hashes', () => {
    render('/all/settings#crypto-wallet-settings');

    expect(container.querySelector('[data-testid="account-settings"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="crypto-address-setting"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="crypto-wallets-setting"]')).not.toBeNull();
  });

  it('updates the section query when sections open and close', async () => {
    render('/all/settings?section=account-settings');

    expect(getLocationText()).toBe('/all/settings?section=account-settings');

    await act(async () => {
      getSectionToggleByText('interface').click();
    });

    expect(getLocationText()).toBe('/all/settings?section=interface-settings');
    expect(container.querySelector('[data-testid="interface-settings-panel"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="account-settings"]')).not.toBeNull();

    await act(async () => {
      getSectionToggleByText('interface').click();
    });

    expect(getLocationText()).toBe('/all/settings?section=account-settings');
    expect(container.querySelector('[data-testid="interface-settings-panel"]')).toBeNull();

    await act(async () => {
      getSectionToggleByText('bitsocial_account').click();
    });

    expect(getLocationText()).toBe('/all/settings');
    expect(container.querySelector('[data-testid="account-settings"]')).toBeNull();
  });

  it('expands and collapses all settings sections', async () => {
    render('/all/settings');

    const expandAllControl = Array.from(container.querySelectorAll('button')).find((candidate) => (candidate.textContent ?? '').includes('expand_all_settings'));
    if (!expandAllControl) {
      throw new Error('expand_all_settings control not found');
    }

    await act(async () => {
      expandAllControl.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(container.querySelector('[data-testid="interface-settings-panel"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="media-hosting-settings-panel"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="account-settings"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="subscriptions-settings-panel"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="trusted-board-links-settings-panel"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="advanced-settings-panel"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="p2p-stats-settings-panel"]')).not.toBeNull();

    const collapseAllControl = Array.from(container.querySelectorAll('button')).find((candidate) => (candidate.textContent ?? '').includes('collapse_all_settings'));
    if (!collapseAllControl) {
      throw new Error('collapse_all_settings control not found');
    }

    await act(async () => {
      collapseAllControl.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(container.querySelector('[data-testid="interface-settings-panel"]')).toBeNull();
    expect(container.querySelector('[data-testid="media-hosting-settings-panel"]')).toBeNull();
    expect(container.querySelector('[data-testid="account-settings"]')).toBeNull();
    expect(container.querySelector('[data-testid="subscriptions-settings-panel"]')).toBeNull();
    expect(container.querySelector('[data-testid="trusted-board-links-settings-panel"]')).toBeNull();
    expect(container.querySelector('[data-testid="advanced-settings-panel"]')).toBeNull();
    expect(container.querySelector('[data-testid="p2p-stats-settings-panel"]')).toBeNull();
  });

  it('shows a review button for dismissed settings upgrades', async () => {
    const upgradeKey = 'account-1:http-routers:https://routerofbitsocial.xyz|https://bsotracker.online';
    testState.account = {
      id: 'account-1',
      pkcOptions: {
        httpRoutersOptions: ['https://routing.lol', 'https://peers.pleb.bot', 'https://peers.plebpubsub.xyz', 'https://peers.forumindex.com'],
        libp2pJsClientsOptions: [{ key: 'libp2pjs' }],
      },
    };
    useSettingsUpgradeReviewStore.getState().dismissUpgradeKeys([upgradeKey]);

    render('/all/settings');

    expect(container.textContent).toContain('settings_upgrade_review_notice');
    const reviewButton = Array.from(container.querySelectorAll('button')).find((candidate) => candidate.textContent === 'settings_upgrade_review_button');
    if (!reviewButton) {
      throw new Error('settings upgrade review button not found');
    }
    const reviewBanner = container.querySelector('[data-testid="settings-upgrade-review-banner"]');
    const settingsDialog = container.querySelector('dialog[aria-labelledby="settings-modal-title"]');

    expect(reviewBanner).not.toBeNull();
    expect(reviewBanner?.textContent).toBe('settings_upgrade_review_notice [settings_upgrade_review_button]');
    expect(reviewBanner?.querySelector('br')).toBeNull();
    expect(reviewBanner?.textContent).not.toContain('settings_upgrade_never_show_again');
    expect(settingsDialog?.lastElementChild).toBe(reviewBanner);

    await act(async () => {
      reviewButton.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(localStorage.getItem('5chan:dismissed-settings-upgrades')).not.toContain(upgradeKey);
    expect(localStorage.getItem('5chan:hidden-settings-upgrade-reviews')).not.toContain(upgradeKey);
    expect(useSettingsUpgradeReviewStore.getState().reviewRequestId).toBe(1);
  });

  it.each(['/all/settings?section=p2p-stats-settings', '/all/settings#p2p-stats-settings'])('opens the p2p stats section from route %s', (route) => {
    render(route);

    expect(container.querySelector('[data-testid="p2p-stats-settings-panel"]')).not.toBeNull();
  });

  it('closes the modal when the overlay is clicked', async () => {
    render('/all/settings#interface-settings');

    const overlay = container.querySelector('button');
    if (!overlay) {
      throw new Error('overlay not found');
    }

    await act(async () => {
      overlay.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(getLocationText()).toBe('/all');
  });

  it('closes the modal when Escape is pressed', async () => {
    render('/all/settings');

    await act(async () => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    });

    expect(getLocationText()).toBe('/all');
  });
});
