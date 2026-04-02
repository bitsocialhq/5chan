import * as React from 'react';
import { createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Board, { type BoardProps } from '../board';

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

const testState = vi.hoisted(() => ({
  account: { subscriptions: [] as string[] },
  accountComments: [] as TestComment[],
  accountCommentsCalls: [] as Array<{ commentIndices?: number[]; communityAddress?: string; newerThan?: number; sortType?: 'new' | 'old' } | undefined>,
  accountCommunityAddresses: [] as string[],
  directories: [{ address: 'music-posting.eth', title: '/mu/ - Music' }] as Array<{ address: string; title?: string }>,
  directoryByAddress: {
    'music-posting.eth': {
      address: 'music-posting.eth',
      features: { postsPerPage: 2 },
    },
  } as Record<string, { address: string; features?: Record<string, unknown> }>,
  feed: [] as TestComment[],
  feedStateString: 'syncing',
  filteredDirectoryAddresses: ['music-posting.eth'] as string[],
  hasMore: false,
  lastVirtuosoDefaultItemHeight: undefined as number | undefined,
  lastVirtuosoIncreaseViewportBy: undefined as { top: number; bottom: number } | undefined,
  lastVirtuosoMinOverscanItemCount: undefined as { top: number; bottom: number } | undefined,
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
  },
  communitySnapshot: {
    shortAddress: 'music-posting.eth',
    title: '/mu/ - Music',
  } as { shortAddress?: string; title?: string },
}));

vi.mock('react-i18next', () => ({
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
    scopedComments = scopedComments.filter(
      (comment) => (comment.communityAddress || (comment as TestComment & { subplebbitAddress?: string }).subplebbitAddress) === options.communityAddress,
    );
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

vi.mock('@bitsocialnet/bitsocial-react-hooks', () => ({
  useAccount: () => testState.account,
  useAccountComments: (options?: { commentIndices?: number[]; communityAddress?: string; newerThan?: number; sortType?: 'new' | 'old' }) => {
    testState.accountCommentsCalls.push(options);
    return { accountComments: getScopedAccountComments(options) };
  },
  useFeed: () => ({
    feed: testState.feed,
    hasMore: testState.hasMore,
    loadMore: testState.loadMoreMock,
    reset: testState.resetMock,
  }),
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
    testState.feedStateString = 'syncing';
    testState.filteredDirectoryAddresses = ['music-posting.eth'];
    testState.hasMore = false;
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
});
