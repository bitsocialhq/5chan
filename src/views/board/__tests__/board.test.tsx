import * as React from 'react';
import { createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Board, { type BoardProps } from '../board';
import { clearStableLastVisitTimeFilterName, LAST_VISIT_STORAGE_KEY } from '../../../lib/utils/time-filter-utils';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
const act = (React as { act?: (cb: () => void | Promise<void>) => void | Promise<void> }).act as (cb: () => void | Promise<void>) => void | Promise<void>;

type TestComment = {
  cid: string;
  pinned?: boolean;
  communityAddress?: string;
  deleted?: boolean;
  postCid?: string;
  removed?: boolean;
  state?: string;
  timestamp?: number;
};

type TestCommunity = {
  error?: Error;
  nameResolved?: boolean;
  shortAddress?: string;
  state?: string;
  title?: string;
};

const testState = vi.hoisted(() => ({
  account: { subscriptions: [] as string[] },
  accountComments: [] as TestComment[],
  accountCommentsCalls: [] as Array<{ commentIndices?: number[]; communityAddress?: string; newerThan?: number; sortType?: 'new' | 'old' } | undefined>,
  accountCommunityAddresses: [] as string[],
  directories: [{ address: 'music-posting.eth', title: '/mu/ - Music' }] as Array<{ address: string; title?: string; directoryCode?: string }>,
  directoryByAddress: {
    'music-posting.eth': {
      address: 'music-posting.eth',
      features: { postsPerPage: 2 },
    },
  } as Record<string, { address: string; features?: Record<string, unknown> }>,
  feed: [] as TestComment[],
  feedOptionsCalls: [] as Array<{ communities?: unknown[]; communitiesLength?: number; newerThan?: number; postsPerPage?: number; sortType?: string }>,
  feedState: undefined as string | undefined,
  feedStateString: 'syncing' as string | undefined,
  filteredDirectoryAddresses: ['music-posting.eth'] as string[],
  hasMore: false,
  respectPostsPerPageForNewerThan: new Set<number>(),
  lastVirtuosoDefaultItemHeight: undefined as number | undefined,
  lastVirtuosoIncreaseViewportBy: undefined as { top: number; bottom: number } | undefined,
  lastVirtuosoMinOverscanItemCount: undefined as { top: number; bottom: number } | undefined,
  expandTimeWindowMock: vi.fn(),
  loadMoreMock: vi.fn(),
  pageSizes: {
    guiPostsPerPage: 2,
    infiniteFeedPostsPerPage: 2,
    maxGuiPages: 3,
    paginationFeedPostsPerPage: 6,
  },
  resetMock: vi.fn(),
  registerCommentsMock: vi.fn(),
  resolvedCommunityAddress: 'music-posting.eth' as string | undefined,
  setEnableInfiniteScrollMock: vi.fn(),
  setResetFunctionMock: vi.fn(),
  community: {
    error: undefined as Error | undefined,
    shortAddress: 'music-posting.eth',
    state: 'ready',
    title: '/mu/ - Music',
  } as TestCommunity,
  communitySnapshot: {
    shortAddress: 'music-posting.eth',
    title: '/mu/ - Music',
  } as { shortAddress?: string; title?: string },
}));

vi.mock('react-i18next', () => ({
  Trans: ({ components, i18nKey }: { components?: Record<number, React.ReactNode>; i18nKey: string }) => createElement(React.Fragment, {}, i18nKey, components?.[1]),
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

const getScopedAccountComments = (options?: { commentIndices?: number[]; communityAddress?: string; newerThan?: number; sortType?: 'new' | 'old' }) => {
  let scopedComments = [...testState.accountComments];

  if (options?.commentIndices?.length) {
    const normalizedCommentIndices = options.commentIndices.filter((commentIndex) => Number.isInteger(commentIndex) && commentIndex >= 0);
    scopedComments = normalizedCommentIndices.map((commentIndex) => testState.accountComments[commentIndex]).filter(Boolean) as TestComment[];
  } else if (options?.communityAddress) {
    scopedComments = scopedComments.filter((comment) => comment.communityAddress === options.communityAddress);
  }

  if (typeof options?.newerThan === 'number') {
    const newerThanTimestamp = Math.floor(Date.now() / 1000) - options.newerThan;
    scopedComments = scopedComments.filter((comment) => (comment.timestamp || 0) > newerThanTimestamp);
  }

  if (options?.sortType === 'new') {
    scopedComments = [...scopedComments].reverse();
  }

  return scopedComments;
};

const getScopedFeed = (options?: { filter?: { filter: (comment: TestComment) => boolean }; newerThan?: number; postsPerPage?: number }) => {
  let scopedFeed = [...testState.feed];

  if (typeof options?.newerThan === 'number') {
    const newerThanTimestamp = Math.floor(Date.now() / 1000) - options.newerThan;
    scopedFeed = scopedFeed.filter((comment) => (comment.timestamp ?? Math.floor(Date.now() / 1000)) > newerThanTimestamp);
  }

  if (options?.filter) {
    scopedFeed = scopedFeed.filter((comment) => options.filter?.filter(comment));
  }

  if (typeof options?.postsPerPage === 'number' && testState.respectPostsPerPageForNewerThan.has(options?.newerThan ?? -1)) {
    scopedFeed = scopedFeed.slice(0, options.postsPerPage);
  }

  return scopedFeed;
};

vi.mock('@bitsocial/bitsocial-react-hooks', () => ({
  useAccount: () => testState.account,
  useAccountComments: (options?: { commentIndices?: number[]; communityAddress?: string; newerThan?: number; sortType?: 'new' | 'old' }) => {
    testState.accountCommentsCalls.push(options);
    return { accountComments: getScopedAccountComments(options) };
  },
  useFeed: (options?: {
    communities?: unknown[];
    filter?: { filter: (comment: TestComment) => boolean };
    newerThan?: number;
    postsPerPage?: number;
    sortType?: string;
  }) => {
    testState.feedOptionsCalls.push({
      communities: options?.communities,
      communitiesLength: options?.communities?.length,
      newerThan: options?.newerThan,
      postsPerPage: options?.postsPerPage,
      sortType: options?.sortType,
    });
    return {
      feed: getScopedFeed(options),
      hasMore: testState.hasMore,
      state: testState.feedState ?? (testState.hasMore ? 'fetching-ipns' : 'succeeded'),
      expandTimeWindow: testState.expandTimeWindowMock,
      loadMore: testState.loadMoreMock,
      reset: testState.resetMock,
    };
  },
  useCommunity: () => testState.community,
}));

vi.mock('../../../hooks/use-stable-community', () => ({
  useCommunityField: (_address: string | undefined, selector: (community: typeof testState.communitySnapshot) => unknown) => selector(testState.communitySnapshot),
}));

vi.mock('react-virtuoso', () => ({
  Virtuoso: React.forwardRef(
    (
      {
        components,
        data = [],
        defaultItemHeight,
        increaseViewportBy,
        minOverscanItemCount,
        endReached,
        itemContent,
      }: {
        components?: { Footer?: React.ComponentType };
        data?: TestComment[];
        defaultItemHeight?: number;
        increaseViewportBy?: { top: number; bottom: number };
        minOverscanItemCount?: { top: number; bottom: number };
        endReached?: ((index: number) => void) | undefined;
        itemContent: (index: number, item: TestComment) => React.ReactNode;
      },
      ref: React.ForwardedRef<{ getState: (cb: (snapshot: { ranges: number[]; scrollTop: number }) => void) => void }>,
    ) => {
      testState.lastVirtuosoDefaultItemHeight = defaultItemHeight;
      testState.lastVirtuosoIncreaseViewportBy = increaseViewportBy;
      testState.lastVirtuosoMinOverscanItemCount = minOverscanItemCount;
      React.useImperativeHandle(ref, () => ({
        getState: (cb) => cb({ ranges: [0], scrollTop: 42 }),
      }));

      return createElement(
        'div',
        { 'data-testid': 'virtuoso' },
        data.map((item, index) => createElement('div', { key: item.cid }, itemContent(index, item))),
        endReached ? createElement('button', { 'data-testid': 'end-reached', onClick: () => endReached(data.length) }, 'end-reached') : null,
        components?.Footer ? createElement(components.Footer) : null,
      );
    },
  ),
}));

vi.mock('../../../hooks/use-account-community-addresses', () => ({
  useAccountCommunityAddresses: () => testState.accountCommunityAddresses,
}));

vi.mock('../../../hooks/use-directories', () => ({
  useDirectories: () => testState.directories,
  useDirectoryAddresses: () => testState.directories.map((entry) => entry.address),
  useDirectoryByAddress: (address: string | undefined) => (address ? testState.directoryByAddress[address] : undefined),
  findDirectoryByAddress: (directories: Array<{ address: string; title?: string; directoryCode?: string }>, address: string | undefined) =>
    directories.find((entry) => entry.address === address || entry.directoryCode === address || entry.title === address),
}));

vi.mock('../../../hooks/use-filtered-directory-addresses', () => ({
  useFilteredDirectoryAddresses: () => testState.filteredDirectoryAddresses,
}));

vi.mock('../../../hooks/use-resolved-community-address', () => ({
  useResolvedCommunityAddress: () => testState.resolvedCommunityAddress,
}));

vi.mock('../../../hooks/use-state-string', () => ({
  useFeedStateString: () => testState.feedStateString,
}));

vi.mock('../../../stores/use-feed-reset-store', () => ({
  default: (selector: (state: { setResetFunction: typeof testState.setResetFunctionMock }) => unknown) =>
    selector({
      setResetFunction: testState.setResetFunctionMock,
    }),
}));

vi.mock('../../../stores/use-feed-view-settings-store', () => ({
  default: (selector: (state: { enableInfiniteScroll: boolean; setEnableInfiniteScroll: typeof testState.setEnableInfiniteScrollMock }) => unknown) =>
    selector({
      enableInfiniteScroll: false,
      setEnableInfiniteScroll: testState.setEnableInfiniteScrollMock,
    }),
}));

vi.mock('../../../stores/use-post-number-store', () => ({
  default: (selector: (state: { registerComments: typeof testState.registerCommentsMock }) => unknown) =>
    selector({
      registerComments: testState.registerCommentsMock,
    }),
}));

vi.mock('../../../hooks/use-board-feed-page-size', () => ({
  useBoardFeedPageSize: () => testState.pageSizes,
}));

vi.mock('../../../components/error-display/error-display', () => ({
  default: ({ error }: { error?: Error }) => createElement('div', { 'data-testid': 'error-display' }, error?.message || 'no-error'),
}));

vi.mock('../../../components/loading-ellipsis', () => ({
  default: ({ string }: { string: string }) => createElement('div', { 'data-testid': 'loading-ellipsis' }, string),
}));

vi.mock('../../../components/board-pagination', () => ({
  default: ({ basePath, currentPage, totalPages }: { basePath: string; currentPage: number; totalPages: number }) =>
    createElement('div', { 'data-testid': 'board-pagination' }, `${basePath}:${currentPage}:${totalPages}`),
}));

vi.mock('../../../components/board-buttons/board-buttons', () => ({
  CatalogButton: ({ address }: { address?: string }) => createElement('div', { 'data-testid': 'catalog-button' }, address || 'catalog'),
}));

vi.mock('../../../components/footer', () => ({
  PageFooterDesktop: ({ firstRow }: { firstRow: React.ReactNode }) => createElement('div', { 'data-testid': 'footer-desktop' }, firstRow),
  PageFooterMobile: ({ children }: { children: React.ReactNode }) => createElement('div', { 'data-testid': 'footer-mobile' }, children),
}));

vi.mock('../../post', () => ({
  Post: ({ post }: { post?: TestComment }) => createElement('div', { 'data-testid': 'post' }, post?.cid || 'missing-post'),
}));

vi.mock('../../../lib/snow', () => ({
  shouldShowSnow: () => false,
}));

let container: HTMLDivElement;
let latestLocation = '';
let root: Root;

const LocationProbe = () => {
  const location = useLocation();
  React.useLayoutEffect(() => {
    latestLocation = location.pathname;
  }, [location.pathname]);
  return null;
};

const flushEffects = async (count = 5) => {
  for (let i = 0; i < count; i += 1) {
    await act(async () => {
      await Promise.resolve();
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
  }
};

const renderBoard = async ({ boardProps, initialEntry, routePath }: { boardProps?: BoardProps; initialEntry: string; routePath: string }) => {
  latestLocation = initialEntry;
  await act(async () => {
    root.render(
      createElement(
        MemoryRouter,
        { initialEntries: [initialEntry] },
        createElement(
          Routes,
          {},
          createElement(Route, { path: routePath, element: createElement(Board, boardProps) }),
          createElement(Route, { path: '*', element: createElement(Board, boardProps) }),
        ),
        createElement(LocationProbe),
      ),
    );
  });
  await flushEffects();
};

describe('Board', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    latestLocation = '';
    testState.account = { subscriptions: [] };
    testState.accountComments = [];
    testState.accountCommentsCalls = [];
    testState.accountCommunityAddresses = [];
    testState.directories = [{ address: 'music-posting.eth', title: '/mu/ - Music' }];
    testState.directoryByAddress = {
      'music-posting.eth': {
        address: 'music-posting.eth',
        features: { postsPerPage: 2 },
      },
    };
    testState.feed = [];
    testState.feedOptionsCalls = [];
    testState.feedState = undefined;
    testState.feedStateString = 'syncing';
    testState.filteredDirectoryAddresses = ['music-posting.eth'];
    testState.hasMore = false;
    testState.respectPostsPerPageForNewerThan = new Set();
    testState.lastVirtuosoDefaultItemHeight = undefined;
    testState.lastVirtuosoIncreaseViewportBy = undefined;
    testState.lastVirtuosoMinOverscanItemCount = undefined;
    testState.pageSizes = {
      guiPostsPerPage: 2,
      infiniteFeedPostsPerPage: 2,
      maxGuiPages: 3,
      paginationFeedPostsPerPage: 6,
    };
    testState.resolvedCommunityAddress = 'music-posting.eth';
    testState.community = {
      error: undefined,
      shortAddress: 'music-posting.eth',
      state: 'ready',
      title: '/mu/ - Music',
    };
    testState.communitySnapshot = {
      shortAddress: 'music-posting.eth',
      title: '/mu/ - Music',
    };
    testState.loadMoreMock.mockReset();
    testState.resetMock.mockReset();
    testState.registerCommentsMock.mockReset();
    testState.setEnableInfiniteScrollMock.mockReset();
    testState.setResetFunctionMock.mockReset();
    document.title = 'before';
    clearStableLastVisitTimeFilterName();
    localStorage.setItem(LAST_VISIT_STORAGE_KEY, String(Date.now()));
    Object.defineProperty(window, 'scrollTo', {
      configurable: true,
      value: vi.fn(),
      writable: true,
    });

    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    clearStableLastVisitTimeFilterName();
    localStorage.clear();
  });

  it('uses the resolved directory winner for cached board feeds', async () => {
    testState.directories = [{ address: 'business-and-finance.bso', directoryCode: 'biz', title: '/biz/ - Business & Finance' }];
    testState.directoryByAddress = {
      'bizraelis.bso': {
        address: 'bizraelis.bso',
        features: { postsPerPage: 2 },
      },
    };
    testState.resolvedCommunityAddress = 'bizraelis.bso';

    await renderBoard({
      boardProps: { boardIdentifier: 'biz', viewType: 'board' },
      initialEntry: '/biz',
      routePath: '/:boardIdentifier/*',
    });

    expect(testState.feedOptionsCalls.map((call) => call.communities)).toContainEqual([
      {
        name: 'bizraelis.bso',
        publicKey: '12D3KooWR7nTdKZqZ1twGWMfVsXYDGp1XAKUrnYznKP651jFrizE',
      },
    ]);
  });

  it('warns when a loaded board address is not verified', async () => {
    testState.directories = [{ address: 'business-and-finance.bso', directoryCode: 'biz', title: '/biz/ - Business & Finance' }];
    testState.directoryByAddress = {
      'business-and-finance.bso': {
        address: 'business-and-finance.bso',
        features: { postsPerPage: 2 },
      },
    };
    testState.resolvedCommunityAddress = 'business-and-finance.bso';
    testState.community = {
      nameResolved: false,
      shortAddress: 'business-and-finance.bso',
      state: 'ready',
      title: '/biz/ - Business & Finance',
    };
    testState.communitySnapshot = {
      shortAddress: 'business-and-finance.bso',
      title: '/biz/ - Business & Finance',
    };

    await renderBoard({
      boardProps: { boardIdentifier: 'business-and-finance.bso', viewType: 'board' },
      initialEntry: '/business-and-finance.bso',
      routePath: '/:boardIdentifier/*',
    });

    expect(container.textContent).toContain('board_address_unverified_warning');
  });

  it('does not warn when a loaded board address is verified', async () => {
    testState.directories = [{ address: 'business-and-finance.bso', directoryCode: 'biz', title: '/biz/ - Business & Finance' }];
    testState.directoryByAddress = {
      'business-and-finance.bso': {
        address: 'business-and-finance.bso',
        features: { postsPerPage: 2 },
      },
    };
    testState.resolvedCommunityAddress = 'business-and-finance.bso';
    testState.community = {
      nameResolved: true,
      shortAddress: 'business-and-finance.bso',
      state: 'ready',
      title: '/biz/ - Business & Finance',
    };
    testState.communitySnapshot = {
      shortAddress: 'business-and-finance.bso',
      title: '/biz/ - Business & Finance',
    };

    await renderBoard({
      boardProps: { boardIdentifier: 'business-and-finance.bso', viewType: 'board' },
      initialEntry: '/business-and-finance.bso',
      routePath: '/:boardIdentifier/*',
    });

    expect(container.textContent).not.toContain('board_address_unverified_warning');
  });

  it('renders the current page feed, inserts recent account comments, and wires footer actions', async () => {
    const currentTimestamp = Math.floor(Date.now() / 1000);
    testState.feed = [
      { cid: 'pinned-post', pinned: true, communityAddress: 'music-posting.eth' },
      { cid: 'older-post', communityAddress: 'music-posting.eth' },
      { cid: 'oldest-post', communityAddress: 'music-posting.eth' },
    ];
    testState.accountComments = [
      {
        cid: 'fresh-post',
        postCid: 'fresh-post',
        state: 'succeeded',
        communityAddress: 'music-posting.eth',
        timestamp: currentTimestamp,
      },
      {
        cid: 'fresh-reply',
        postCid: 'another-post',
        state: 'succeeded',
        communityAddress: 'music-posting.eth',
        timestamp: currentTimestamp,
      },
    ];
    testState.hasMore = true;

    await renderBoard({ initialEntry: '/mu', routePath: '/:boardIdentifier/*' });

    expect(document.title).toBe('/mu/ - 5chan');
    expect(testState.setResetFunctionMock).toHaveBeenCalledWith(testState.resetMock);
    expect(testState.accountCommentsCalls).toContainEqual({
      communityAddress: 'music-posting.eth',
      newerThan: 3600,
      sortType: 'old',
    });
    expect(Array.from(container.querySelectorAll('[data-testid="post"]')).map((element) => element.textContent)).toEqual(['pinned-post', 'fresh-post']);
    expect(container.querySelector('[data-testid="board-pagination"]')?.textContent).toBe('/mu:1:2');

    await act(async () => {
      const topButton = Array.from(container.querySelectorAll('button')).find((button) => button.textContent === 'top');
      topButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(window.scrollTo).toHaveBeenCalledWith({ behavior: 'instant', left: 0, top: 0 });

    await act(async () => {
      const refreshButton = Array.from(container.querySelectorAll('button')).find((button) => button.textContent === 'refresh');
      refreshButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      const loadMoreButton = Array.from(container.querySelectorAll('button')).find((button) => button.textContent === 'load_more');
      loadMoreButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(testState.resetMock).toHaveBeenCalledTimes(2);
    expect(testState.setEnableInfiniteScrollMock).toHaveBeenCalledWith(true);
  });

  it('redirects oversized board pages back to the last available page', async () => {
    testState.feed = [
      { cid: 'first-post', communityAddress: 'music-posting.eth' },
      { cid: 'second-post', communityAddress: 'music-posting.eth' },
      { cid: 'third-post', communityAddress: 'music-posting.eth' },
    ];

    await renderBoard({ initialEntry: '/mu/4', routePath: '/:boardIdentifier/*' });

    expect(latestLocation).toBe('/mu/2');
  });

  it('registers visible feed posts with the post-number store', async () => {
    testState.feed = [
      { cid: 'first-post', communityAddress: 'music-posting.eth' },
      { cid: 'second-post', communityAddress: 'music-posting.eth' },
    ];

    await renderBoard({ initialEntry: '/mu', routePath: '/:boardIdentifier/*' });

    expect(testState.registerCommentsMock).toHaveBeenCalledWith(testState.feed);
  });

  it('uses a taller Virtuoso default item height on mobile feeds', async () => {
    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      value: 480,
      writable: true,
    });

    testState.feed = [
      { cid: 'first-post', communityAddress: 'music-posting.eth' },
      { cid: 'second-post', communityAddress: 'music-posting.eth' },
    ];

    await renderBoard({
      boardProps: { viewType: 'all' },
      initialEntry: '/all',
      routePath: '/all/*',
    });

    expect(testState.lastVirtuosoDefaultItemHeight).toBe(420);
    expect(testState.lastVirtuosoIncreaseViewportBy).toEqual({ top: 2400, bottom: 1400 });
    expect(testState.lastVirtuosoMinOverscanItemCount).toEqual({ top: 8, bottom: 4 });
  });

  it('uses an asymmetric reverse-scroll buffer on desktop multiboard feeds', async () => {
    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      value: 1280,
      writable: true,
    });

    testState.feed = [
      { cid: 'first-post', communityAddress: 'music-posting.eth' },
      { cid: 'second-post', communityAddress: 'music-posting.eth' },
    ];

    await renderBoard({
      boardProps: { viewType: 'all' },
      initialEntry: '/all',
      routePath: '/all/*',
    });

    expect(testState.lastVirtuosoIncreaseViewportBy).toEqual({ top: 2400, bottom: 1200 });
  });

  it('canonicalizes multiboard paths and shows the subscriptions empty state', async () => {
    testState.account = { subscriptions: [] };
    testState.filteredDirectoryAddresses = [];

    await renderBoard({
      boardProps: { viewType: 'subs' },
      initialEntry: '/subs/9',
      routePath: '/subs/*',
    });

    expect(latestLocation).toBe('/subs');
    expect(container.textContent).toContain('not_subscribed_to_any_board');
    expect(container.querySelector('[role="status"]')?.className).toContain('searchNothingFound');
  });

  it('links empty mod feeds to account import settings', async () => {
    testState.accountCommunityAddresses = [];

    await renderBoard({
      boardProps: { viewType: 'mod' },
      initialEntry: '/mod',
      routePath: '/mod/*',
    });

    expect(container.textContent).toContain('not_mod_of_any_board');
    expect(container.textContent).toContain('go_to_settings_to_import_mod_account');
    expect(container.querySelector('[role="status"]')?.className).toContain('modEmptyState');
    expect(container.querySelector('a')?.getAttribute('href')).toBe('/mod/settings#account-settings');
  });

  it('passes multiboard time filters to useFeed and honors cached overrides', async () => {
    testState.feed = [{ cid: 'all-post', communityAddress: 'music-posting.eth' }];

    await renderBoard({
      boardProps: { viewType: 'all', timeFilterNameFromCache: '1w' },
      initialEntry: '/all?t=24h',
      routePath: '/all/*',
    });

    expect(testState.feedOptionsCalls).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          newerThan: 7 * 24 * 60 * 60,
          postsPerPage: 2,
          sortType: 'active',
        }),
      ]),
    );
  });

  it('shows a wider multiboard time-filter suggestion when older threads exist', async () => {
    const now = Math.floor(Date.now() / 1000);
    localStorage.setItem(LAST_VISIT_STORAGE_KEY, String((now - 3 * 24 * 60 * 60) * 1000));
    testState.feed = [
      { cid: 'recent-post', communityAddress: 'music-posting.eth', timestamp: now - 2 * 24 * 60 * 60 },
      { cid: 'older-post', communityAddress: 'music-posting.eth', timestamp: now - 5 * 24 * 60 * 60 },
    ];

    await renderBoard({
      boardProps: { viewType: 'all' },
      initialEntry: '/all?t=last',
      routePath: '/all/*',
    });

    expect(testState.feedOptionsCalls).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ newerThan: 7 * 24 * 60 * 60 }),
        expect.objectContaining({ newerThan: 30 * 24 * 60 * 60 }),
        expect.objectContaining({ newerThan: 365 * 24 * 60 * 60 }),
      ]),
    );
    expect(container.querySelector('[data-testid="expand-time-window-button"]')).toBeTruthy();
  });

  it('expands the multiboard time window in place from the footer suggestion', async () => {
    const now = Math.floor(Date.now() / 1000);
    localStorage.setItem(LAST_VISIT_STORAGE_KEY, String((now - 3 * 24 * 60 * 60) * 1000));
    testState.feed = [
      { cid: 'recent-post', communityAddress: 'music-posting.eth', timestamp: now - 2 * 24 * 60 * 60 },
      { cid: 'older-post', communityAddress: 'music-posting.eth', timestamp: now - 5 * 24 * 60 * 60 },
    ];

    await renderBoard({
      boardProps: { viewType: 'all' },
      initialEntry: '/all?t=last',
      routePath: '/all/*',
    });

    const expandButton = container.querySelector('[data-testid="expand-time-window-button"]');
    expect(expandButton).toBeTruthy();
    expect(Array.from(container.querySelectorAll('a')).some((link) => link.getAttribute('href') === '/all?t=1w')).toBe(false);

    await act(async () => {
      expandButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(testState.expandTimeWindowMock).toHaveBeenCalledWith(7 * 24 * 60 * 60);
  });

  it('keeps broader suggestion feeds on the base page size so their identities stay stable while scrolling', async () => {
    const now = Math.floor(Date.now() / 1000);
    testState.feed = [
      { cid: 'post-1', communityAddress: 'music-posting.eth', timestamp: now - 2 * 24 * 60 * 60 },
      { cid: 'post-2', communityAddress: 'music-posting.eth', timestamp: now - 3 * 24 * 60 * 60 },
      { cid: 'post-3', communityAddress: 'music-posting.eth', timestamp: now - 5 * 24 * 60 * 60 },
      { cid: 'post-4', communityAddress: 'music-posting.eth', timestamp: now - 20 * 24 * 60 * 60 },
    ];
    testState.pageSizes = {
      guiPostsPerPage: 2,
      infiniteFeedPostsPerPage: 2,
      maxGuiPages: 3,
      paginationFeedPostsPerPage: 6,
    };
    testState.respectPostsPerPageForNewerThan = new Set([30 * 24 * 60 * 60, 365 * 24 * 60 * 60]);

    await renderBoard({
      boardProps: { viewType: 'all' },
      initialEntry: '/all?t=1w',
      routePath: '/all/*',
    });

    expect(testState.feedOptionsCalls).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ newerThan: 30 * 24 * 60 * 60, postsPerPage: 2, sortType: 'active' }),
        expect.objectContaining({ newerThan: 365 * 24 * 60 * 60, postsPerPage: 2, sortType: 'active' }),
      ]),
    );
  });

  it('disables suggestion probe feeds for hidden cached multiboard views', async () => {
    testState.feed = [{ cid: 'recent-post', communityAddress: 'music-posting.eth' }];

    await renderBoard({
      boardProps: { viewType: 'all', isVisible: false },
      initialEntry: '/all?t=24h',
      routePath: '/all/*',
    });

    expect(testState.feedOptionsCalls).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ newerThan: 7 * 24 * 60 * 60, communitiesLength: 0 }),
        expect.objectContaining({ newerThan: 30 * 24 * 60 * 60, communitiesLength: 0 }),
        expect.objectContaining({ newerThan: 365 * 24 * 60 * 60, communitiesLength: 0 }),
      ]),
    );
  });

  it('surfaces board load errors when the feed is empty', async () => {
    testState.community = {
      error: new Error('board failed'),
      shortAddress: 'music-posting.eth',
      state: 'failed',
      title: '/mu/ - Music',
    };

    await renderBoard({ initialEntry: '/mu', routePath: '/:boardIdentifier/*' });

    expect(container.querySelector('[data-testid="error-display"]')?.textContent).toBe('board failed');
    expect(container.textContent).toContain('failed');
  });

  it('does not show no threads while a board is still loading', async () => {
    testState.feedStateString = undefined;
    testState.community = {
      error: undefined,
      shortAddress: 'music-posting.eth',
      state: 'fetching-community-ipfs',
      title: '/mu/ - Music',
    };

    await renderBoard({ initialEntry: '/mu', routePath: '/:boardIdentifier/*' });

    expect(container.textContent).not.toContain('no_threads');
    expect(container.querySelector('[data-testid="loading-ellipsis"]')?.textContent).toBe('loading_feed');
  });

  it('does not show no threads while an empty board feed is still loading', async () => {
    testState.feedStateString = undefined;
    testState.hasMore = true;
    testState.community = {
      error: undefined,
      shortAddress: 'music-posting.eth',
      state: 'succeeded',
      title: '/mu/ - Music',
    };

    await renderBoard({ initialEntry: '/mu', routePath: '/:boardIdentifier/*' });

    expect(container.textContent).not.toContain('no_threads');
    expect(container.querySelector('[data-testid="loading-ellipsis"]')?.textContent).toBe('loading_feed');
  });

  it('shows no threads after an empty board feed finishes loading', async () => {
    testState.feedStateString = undefined;
    testState.community = {
      error: undefined,
      shortAddress: 'music-posting.eth',
      state: 'succeeded',
      title: '/mu/ - Music',
    };

    await renderBoard({ initialEntry: '/mu', routePath: '/:boardIdentifier/*' });

    expect(container.textContent).toContain('no_threads');
    expect(container.querySelector('[data-testid="loading-ellipsis"]')).toBeNull();
  });
});
