import * as React from 'react';
import { createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Directory from '../directory';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
const act = (React as { act?: (cb: () => void | Promise<void>) => void | Promise<void> }).act as (cb: () => void | Promise<void>) => void | Promise<void>;

const testState = vi.hoisted(() => ({
  boardIdentifier: 'a' as string | undefined,
  communities: {} as Record<string, { address: string; name?: string; state?: string; updatedAt?: number }>,
  communityIdentifierRequests: [] as Array<string | undefined>,
  directoryListLoading: false,
  directoryBoards: [
    {
      address: 'anime-and-manga.bso',
      score: 12,
      managedByDevs: false,
    },
  ],
  directories: [
    {
      address: 'anime-and-manga.bso',
      directoryCode: 'a',
      title: '/a/ - Anime & Manga',
    },
  ],
  offlineHookRequests: [] as Array<{ address?: string; communityAddressHint?: string }>,
  offlineHookValue: {
    isOffline: false,
    isOnlineStatusLoading: false,
    offlineIconClass: '',
    offlineTitle: false as string | false,
  },
  offlineStates: {} as Record<string, { state?: string; updatedAt?: number }>,
  nowSeconds: 1_704_067_210,
}));

vi.mock('react-i18next', () => ({
  Trans: ({ i18nKey }: { i18nKey: string }) => createElement(React.Fragment, null, i18nKey),
  useTranslation: () => ({
    t: (key: string, values?: Record<string, unknown>) => {
      if (key === 'directory_status_online') return 'online';
      if (key === 'directory_status_offline') return 'offline';
      if (key === 'directory_heading') return `${values?.boardIdentifier} directory`;
      return key;
    },
  }),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useParams: () => ({
      boardIdentifier: testState.boardIdentifier,
    }),
  };
});

vi.mock('@bitsocial/bitsocial-react-hooks', () => ({
  useCommunity: (options?: { community?: { name?: string; publicKey?: string } }) => {
    const communityAddress = options?.community?.name ?? options?.community?.publicKey;
    return communityAddress ? testState.communities[communityAddress] : undefined;
  },
}));

vi.mock('../../../components/board-buttons/board-buttons', () => ({
  BottomButton: () => createElement('button', { type: 'button' }, 'bottom'),
  CatalogButton: () => createElement('a', null, 'catalog'),
  ReturnButton: () => createElement('a', null, 'return'),
  TopButton: () => createElement('button', { type: 'button' }, 'top'),
}));

vi.mock('../../../components/footer', () => ({
  PageFooterDesktop: ({ firstRow, styleRow }: { firstRow: React.ReactNode; styleRow: React.ReactNode }) =>
    createElement('footer', { 'data-testid': 'desktop-footer' }, firstRow, styleRow),
  PageFooterMobile: ({ children }: { children: React.ReactNode }) => createElement('footer', { 'data-testid': 'mobile-footer' }, children),
  ThreadFooterStyleRow: () => createElement('div', null, 'style'),
}));

vi.mock('../../../components/loading-ellipsis', () => ({
  default: ({ string }: { string: string }) => createElement('span', null, string),
}));

vi.mock('../../../hooks/use-directories', () => ({
  useDirectories: () => testState.directories,
}));

vi.mock('../../../hooks/use-directory-list', async () => {
  const actual = await vi.importActual<typeof import('../../../hooks/use-directory-list')>('../../../hooks/use-directory-list');
  return {
    ...actual,
    useDirectoryList: () => ({
      list: {
        directoryCode: testState.boardIdentifier,
        title: '/a/ - Anime & Manga',
        boards: testState.directoryBoards,
      },
      loading: testState.directoryListLoading,
      error: null,
    }),
  };
});

vi.mock('../../../hooks/use-resolved-community-address', () => ({
  useResolvedCommunityAddress: () => undefined,
}));

vi.mock('../../../hooks/use-community-identifiers', () => ({
  useCommunityIdentifier: (address?: string) => {
    testState.communityIdentifierRequests.push(address);
    return address ? { name: address } : undefined;
  },
}));

vi.mock('../../../hooks/use-is-community-offline', () => ({
  default: (community?: { address?: string }, communityAddressHint?: string) => {
    testState.offlineHookRequests.push({ address: community?.address, communityAddressHint });
    return testState.offlineHookValue;
  },
}));

vi.mock('../../../hooks/use-now-seconds', () => ({
  useNowSeconds: () => testState.nowSeconds,
}));

vi.mock('../../../stores/use-community-offline-store', () => ({
  default: <T,>(selector: (state: { communityOfflineState: typeof testState.offlineStates }) => T) =>
    selector({
      communityOfflineState: testState.offlineStates,
    }),
}));

vi.mock('../../../lib/snow', () => ({
  shouldShowSnow: () => false,
}));

let container: HTMLDivElement;
let root: Root;

const renderDirectory = async () => {
  await act(async () => {
    root.render(createElement(MemoryRouter, {}, createElement(Directory)));
  });
};

const getDirectoryRow = () => Array.from(container.querySelectorAll('tbody tr')).find((row) => row.textContent?.includes('anime-and-manga.bso'));

describe('Directory', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    testState.boardIdentifier = 'a';
    testState.communities = {
      'anime-and-manga.bso': {
        address: 'anime-and-manga.bso',
        name: 'anime-and-manga.bso',
        state: 'started',
        updatedAt: testState.nowSeconds - 60,
      },
    };
    testState.communityIdentifierRequests = [];
    testState.directoryListLoading = false;
    testState.directoryBoards = [
      {
        address: 'anime-and-manga.bso',
        score: 12,
        managedByDevs: false,
      },
    ];
    testState.directories = [
      {
        address: 'anime-and-manga.bso',
        directoryCode: 'a',
        title: '/a/ - Anime & Manga',
      },
    ];
    testState.offlineHookRequests = [];
    testState.offlineHookValue = {
      isOffline: false,
      isOnlineStatusLoading: false,
      offlineIconClass: '',
      offlineTitle: false,
    };
    testState.offlineStates = {};
    testState.nowSeconds = 1_704_067_210;
    window.alert = vi.fn();

    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  it('shows online status for a listed board after loading its community', async () => {
    await renderDirectory();

    const cells = Array.from(getDirectoryRow()?.querySelectorAll('td') ?? []).map((cell) => cell.textContent?.replace(/\s+/g, ' ').trim());
    expect(cells.slice(0, 5)).toEqual(['1', 'anime-and-manga.bso', 'directory_owner_anonymous', 'online', '12']);
    expect(cells[5]).toContain('+1');
    expect(cells[5]).toContain('-1');
    expect(cells[5]).toContain('open');
    expect(testState.communityIdentifierRequests).toContain('anime-and-manga.bso');
    expect(testState.offlineHookRequests).toContainEqual({
      address: 'anime-and-manga.bso',
      communityAddressHint: 'anime-and-manga.bso',
    });
  });

  it('shows loading status while the listed board status is loading', async () => {
    testState.communities = {};
    testState.offlineHookValue = {
      isOffline: false,
      isOnlineStatusLoading: true,
      offlineIconClass: 'yellowOfflineIcon',
      offlineTitle: 'downloading board...',
    };

    await renderDirectory();

    expect(getDirectoryRow()?.textContent).toContain('loading');
  });

  it('shows offline status when the listed board community is stale', async () => {
    testState.communities['anime-and-manga.bso'] = {
      address: 'anime-and-manga.bso',
      name: 'anime-and-manga.bso',
      state: 'started',
      updatedAt: testState.nowSeconds - 31 * 60,
    };

    await renderDirectory();

    expect(getDirectoryRow()?.textContent).toContain('offline');
  });
});
