import * as React from 'react';
import { createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import BoardHeader from '../board-header';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
const act = (React as { act?: (cb: () => void | Promise<void>) => void | Promise<void> }).act as (cb: () => void | Promise<void>) => void | Promise<void>;

const testState = vi.hoisted(() => ({
  accountComment: undefined as { communityAddress?: string } | undefined,
  directories: [{ address: 'music-posting.eth', title: '/mu/ - Music' }] as Array<{ address: string; title?: string }>,
  directoriesMetadata: { title: '/all/ - Directories' } as { title?: string } | undefined,
  isMobile: false,
  navigateMock: vi.fn(),
  offlineIconClass: 'offline',
  offlineTitle: 'Board offline',
  resolvedAddress: 'music-posting.eth' as string | undefined,
  shouldShowSnow: false,
  stableCommunity: {
    address: 'music-posting.eth',
    shortAddress: 'music-posting.eth',
    title: '/mu/ - Music',
  } as { address?: string; shortAddress?: string; title?: string } | undefined,
  subscriptionsCount: 2,
  communities: {
    'music-posting.eth': { address: 'music-posting.eth' },
  } as Record<string, unknown>,
  useIsCommunityOfflineValue: {
    isOffline: false,
    isOnlineStatusLoading: false,
    offlineIconClass: 'offline',
    offlineTitle: 'Board offline',
  },
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) => (options ? `${key}:${JSON.stringify(options)}` : key),
  }),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => testState.navigateMock,
  };
});

vi.mock('@bitsocialnet/bitsocial-react-hooks', () => ({
  useAccount: () => undefined,
  useAccountComment: () => testState.accountComment,
}));

vi.mock('@bitsocialnet/bitsocial-react-hooks/dist/stores/accounts', () => ({
  default: (selector: (state: { activeAccountId?: string; accounts: Record<string, { subscriptions?: string[] }> }) => unknown) =>
    selector({
      accounts: {
        active: {
          subscriptions: new Array(testState.subscriptionsCount).fill('sub'),
        },
      },
      activeAccountId: 'active',
    }),
}));

vi.mock('@bitsocialnet/bitsocial-react-hooks/dist/stores/communities', () => ({
  default: (selector: (state: { communities: typeof testState.communities }) => unknown) =>
    selector({
      communities: testState.communities,
    }),
}));

vi.mock('../../../hooks/use-stable-community', () => ({
  useStableCommunity: () => testState.stableCommunity,
}));

vi.mock('../../../hooks/use-directories', () => ({
  useDirectories: () => testState.directories,
  useDirectoriesMetadata: () => testState.directoriesMetadata,
}));

vi.mock('../../../hooks/use-resolved-community-address', () => ({
  useResolvedCommunityAddress: () => testState.resolvedAddress,
}));

vi.mock('../../../hooks/use-is-mobile', () => ({
  default: () => testState.isMobile,
}));

vi.mock('../../../hooks/use-is-community-offline', () => ({
  default: () => testState.useIsCommunityOfflineValue,
}));

vi.mock('../../../lib/snow', () => ({
  shouldShowSnow: () => testState.shouldShowSnow,
}));

vi.mock('../../tooltip', () => ({
  default: ({ content, children }: { content: string; children: React.ReactNode }) =>
    createElement('span', { 'data-testid': 'tooltip', 'data-content': content }, children),
}));

vi.mock('../../../generated/asset-manifest', () => ({
  BANNERS: ['banner-a.png', 'banner-b.png'],
}));

let container: HTMLDivElement;
let root: Root;

const renderHeader = async (initialEntry: string) => {
  await act(async () => {
    root.render(createElement(MemoryRouter, { initialEntries: [initialEntry] }, createElement(BoardHeader)));
  });
};

describe('BoardHeader', () => {
  let mathRandomSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    testState.accountComment = undefined;
    testState.directories = [{ address: 'music-posting.eth', title: '/mu/ - Music' }];
    testState.directoriesMetadata = { title: '/all/ - Directories' };
    testState.isMobile = false;
    testState.navigateMock.mockReset();
    testState.offlineIconClass = 'offline';
    testState.offlineTitle = 'Board offline';
    testState.resolvedAddress = 'music-posting.eth';
    testState.shouldShowSnow = false;
    testState.stableCommunity = {
      address: 'music-posting.eth',
      shortAddress: 'music-posting.eth',
      title: '/mu/ - Music',
    };
    testState.subscriptionsCount = 2;
    testState.communities = {
      'music-posting.eth': { address: 'music-posting.eth' },
    };
    testState.useIsCommunityOfflineValue = {
      isOffline: false,
      isOnlineStatusLoading: false,
      offlineIconClass: 'offline',
      offlineTitle: 'Board offline',
    };
    mathRandomSpy = vi.spyOn(Math, 'random').mockReturnValue(0);
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    mathRandomSpy.mockRestore();
  });

  it('renders the all view title and banner chrome on desktop', async () => {
    await renderHeader('/all');

    expect(container.textContent).toContain('/all/ - Directories');
    expect(container.querySelector('img')?.getAttribute('src')).toBe('banner-a.png');
    expect(container.textContent).not.toContain('subscriptions_subtitle');
  });

  it('renders a clickable subscriptions subtitle that navigates to subscription settings', async () => {
    await renderHeader('/subs');

    expect(container.textContent).toContain('/subs/ - Subscriptions');
    expect(container.textContent).toContain('subscriptions_subtitle:{"count":2}');

    const clickableSubtitle = container.querySelector('[role="button"]');
    await act(async () => {
      clickableSubtitle?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(testState.navigateMock).toHaveBeenCalledWith('/subs/settings#subscriptions-settings');
  });

  it('renders the board title, address subtitle, and offline indicator for board routes', async () => {
    testState.useIsCommunityOfflineValue = {
      isOffline: true,
      isOnlineStatusLoading: false,
      offlineIconClass: 'offline',
      offlineTitle: 'Board offline',
    };

    await renderHeader('/mu');

    expect(container.textContent).toContain('/mu/ - Music');
    expect(container.textContent).toContain('music-posting.eth');
    expect(container.querySelector('[data-testid="tooltip"]')?.getAttribute('data-content')).toBe('Board offline');
    expect(container.querySelector('img')?.getAttribute('src')).toBe('banner-a.png');
  });
});
