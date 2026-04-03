import * as React from 'react';
import { createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Catalog, { type CatalogProps } from '../catalog';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
const act = (React as { act?: (cb: () => void | Promise<void>) => void | Promise<void> }).act as (cb: () => void | Promise<void>) => void | Promise<void>;

type TestComment = {
  cid: string;
  content?: string;
  title?: string;
  pinned?: boolean;
  communityAddress?: string;
  deleted?: boolean;
  postCid?: string;
  removed?: boolean;
  state?: string;
  timestamp?: number;
};

type FilterItem = {
  color?: string;
  count: number;
  enabled: boolean;
  filteredCids: Set<string>;
  hide: boolean;
  text: string;
  top: boolean;
};

const testState = vi.hoisted(() => ({
  account: { subscriptions: [] as string[] },
  accountComments: [] as TestComment[],
  accountCommentsCalls: [] as Array<{ commentIndices?: number[]; communityAddress?: string; newerThan?: number; sortType?: 'new' | 'old' } | undefined>,
  directoryByAddress: {
    'music-posting.eth': {
      address: 'music-posting.eth',
      features: { postsPerPage: 2 },
    },
  } as Record<string, { address: string; features?: Record<string, unknown> }>,
  directories: [{ address: 'music-posting.eth', title: '/mu/ - Music' }] as Array<{ address: string; title?: string }>,
  feed: [] as TestComment[],
  feedOptionsCalls: [] as Array<{ postsPerPage?: number }>,
  filterItems: [] as FilterItem[],
  filteredDirectoryAddresses: ['music-posting.eth'] as string[],
  hasMore: false,
  imageSize: 'Small' as 'Large' | 'Small',
  incrementFilterCountMock: vi.fn(),
  loadMoreMock: vi.fn(),
  pageSizes: {
    guiPostsPerPage: 2,
    maxGuiPages: 3,
    paginationFeedPostsPerPage: 6,
  },
  resetMock: vi.fn(),
  resolvedCommunityAddress: 'music-posting.eth' as string | undefined,
  searchText: '',
  setCurrentCommunityAddressMock: vi.fn(),
  setResetFunctionMock: vi.fn(),
  showOPComment: true,
  sortType: 'new' as 'active' | 'new',
  windowWidth: 900,
  community: {
    error: undefined as Error | undefined,
    shortAddress: 'music-posting.eth',
    state: 'ready',
    title: '/mu/ - Music',
  },
}));

function getCatalogFiltersState() {
  return {
    filterItems: testState.filterItems,
    incrementFilterCount: testState.incrementFilterCountMock,
    searchText: testState.searchText,
    setCurrentSubplebbitAddress: testState.setCurrentCommunityAddressMock,
  };
}

function useCatalogFiltersStoreMock<T>(selector?: (state: ReturnType<typeof getCatalogFiltersState>) => T) {
  const state = getCatalogFiltersState();
  return selector ? selector(state) : (state as T);
}

useCatalogFiltersStoreMock.getState = getCatalogFiltersState;

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
  useFeed: (options: { filter?: { filter: (comment: TestComment) => boolean }; postsPerPage?: number }) => {
    testState.feedOptionsCalls.push({ postsPerPage: options.postsPerPage });
    return {
      feed: options.filter ? testState.feed.filter((comment) => options.filter?.filter(comment)) : testState.feed,
      hasMore: testState.hasMore,
      loadMore: testState.loadMoreMock,
      reset: testState.resetMock,
    };
  },
  useCommunity: () => testState.community,
}));

vi.mock('react-virtuoso', () => ({
  Virtuoso: React.forwardRef(
    (
      {
        components,
        data = [],
        endReached,
        itemContent,
      }: {
        components?: { Footer?: React.ComponentType };
        data?: Array<TestComment[]>;
        endReached?: ((index: number) => void) | undefined;
        itemContent: (index: number, item: TestComment[]) => React.ReactNode;
      },
      ref: React.ForwardedRef<{ getState: (cb: (snapshot: { ranges: number[]; scrollTop: number }) => void) => void }>,
    ) => {
      React.useImperativeHandle(ref, () => ({
        getState: (cb) => cb({ ranges: [0], scrollTop: 24 }),
      }));

      return createElement(
        'div',
        { 'data-testid': 'virtuoso' },
        data.map((row, index) => createElement('div', { key: `row-${index}` }, itemContent(index, row))),
        endReached ? createElement('button', { 'data-testid': 'end-reached', onClick: () => endReached(data.length) }, 'end-reached') : null,
        components?.Footer ? createElement(components.Footer) : null,
      );
    },
  ),
}));

vi.mock('../../../hooks/use-directories', () => ({
  useDirectories: () => testState.directories,
  useDirectoryByAddress: (address: string | undefined) => (address ? testState.directoryByAddress[address] : undefined),
}));

vi.mock('../../../hooks/use-board-feed-page-size', () => ({
  useBoardFeedPageSize: () => testState.pageSizes,
}));

vi.mock('../../../hooks/use-filtered-directory-addresses', () => ({
  useFilteredDirectoryAddresses: () => testState.filteredDirectoryAddresses,
}));

vi.mock('../../../hooks/use-resolved-community-address', () => ({
  useResolvedCommunityAddress: () => testState.resolvedCommunityAddress,
}));

vi.mock('../../../hooks/use-state-string', () => ({
  useFeedStateString: () => 'loading_feed',
}));

vi.mock('../../../hooks/use-window-width', () => ({
  default: () => testState.windowWidth,
}));

vi.mock('../../../stores/use-catalog-style-store', () => ({
  default: () => ({
    imageSize: testState.imageSize,
    showOPComment: testState.showOPComment,
  }),
}));

vi.mock('../../../stores/use-feed-reset-store', () => ({
  default: (selector: (state: { setResetFunction: typeof testState.setResetFunctionMock }) => unknown) =>
    selector({
      setResetFunction: testState.setResetFunctionMock,
    }),
}));

vi.mock('../../../stores/use-sorting-store', () => ({
  default: () => ({
    sortType: testState.sortType,
  }),
}));

vi.mock('../../../stores/use-catalog-filters-store', () => ({
  default: useCatalogFiltersStoreMock,
}));

vi.mock('../../../components/catalog-row', () => ({
  default: ({ estimatedHeight, row }: { estimatedHeight?: number; row: TestComment[] }) =>
    createElement('div', { 'data-pretext-height': estimatedHeight, 'data-testid': 'catalog-row' }, `row:${row.map((comment) => comment.cid).join(',')}`),
}));

vi.mock('../../../components/footer', () => ({
  CatalogFooterFirstRow: ({ communityAddress }: { communityAddress?: string }) =>
    createElement('div', { 'data-testid': 'catalog-first-row' }, communityAddress || 'multi'),
  PageFooterDesktop: ({ firstRow }: { firstRow: React.ReactNode }) => createElement('div', { 'data-testid': 'catalog-footer-desktop' }, firstRow),
  PageFooterMobile: ({ children }: { children: React.ReactNode }) => createElement('div', { 'data-testid': 'catalog-footer-mobile' }, children),
}));

vi.mock('../../../components/board-buttons/board-buttons', () => ({
  ReturnButton: () => createElement('button', {}, 'Return'),
  ArchiveButton: () => createElement('button', {}, 'Archive'),
  TopButton: () => createElement('button', {}, 'Top'),
  RefreshButton: () => createElement('button', {}, 'Refresh'),
}));

vi.mock('../../../components/loading-ellipsis', () => ({
  default: ({ string }: { string: string }) => createElement('div', { 'data-testid': 'loading-ellipsis' }, string),
}));

vi.mock('../../../components/error-display/error-display', () => ({
  default: ({ error }: { error?: Error }) => createElement('div', { 'data-testid': 'error-display' }, error?.message || 'no-error'),
}));

vi.mock('../../../lib/utils/pattern-utils', () => ({
  commentMatchesPattern: (comment: TestComment, pattern: string) => {
    const loweredPattern = pattern.toLowerCase();
    return `${comment.title || ''} ${comment.content || ''}`.toLowerCase().includes(loweredPattern);
  },
}));

vi.mock('../../../lib/utils/catalog-sort', () => ({
  sortCatalogFeedForDisplay: (feed: TestComment[]) => feed,
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

const renderCatalog = async ({ catalogProps, initialEntry, routePath }: { catalogProps?: CatalogProps; initialEntry: string; routePath: string }) => {
  latestLocation = initialEntry;
  await act(async () => {
    root.render(
      createElement(
        MemoryRouter,
        { initialEntries: [initialEntry] },
        createElement(
          Routes,
          {},
          createElement(Route, { path: routePath, element: createElement(Catalog, catalogProps) }),
          createElement(Route, { path: '*', element: createElement(Catalog, catalogProps) }),
        ),
        createElement(LocationProbe),
      ),
    );
  });
  await flushEffects();
};

describe('Catalog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    latestLocation = '';
    testState.account = { subscriptions: [] };
    testState.accountComments = [];
    testState.accountCommentsCalls = [];
    testState.directories = [{ address: 'music-posting.eth', title: '/mu/ - Music' }];
    testState.directoryByAddress = {
      'music-posting.eth': {
        address: 'music-posting.eth',
        features: { postsPerPage: 2 },
      },
    };
    testState.feed = [];
    testState.feedOptionsCalls = [];
    testState.filterItems = [];
    testState.filteredDirectoryAddresses = ['music-posting.eth'];
    testState.hasMore = false;
    testState.imageSize = 'Small';
    testState.pageSizes = {
      guiPostsPerPage: 2,
      maxGuiPages: 3,
      paginationFeedPostsPerPage: 6,
    };
    testState.resolvedCommunityAddress = 'music-posting.eth';
    testState.searchText = '';
    testState.showOPComment = true;
    testState.sortType = 'new';
    testState.windowWidth = 900;
    testState.community = {
      error: undefined,
      shortAddress: 'music-posting.eth',
      state: 'ready',
      title: '/mu/ - Music',
    };
    testState.incrementFilterCountMock.mockReset();
    testState.loadMoreMock.mockReset();
    testState.resetMock.mockReset();
    testState.setCurrentCommunityAddressMock.mockReset();
    testState.setResetFunctionMock.mockReset();
    document.title = 'before';

    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  it('applies catalog filters and promotes top matches', async () => {
    testState.feed = [
      { cid: 'boring-post', title: 'plain talk', content: 'nothing special', communityAddress: 'music-posting.eth' },
      { cid: 'hidden-post', title: 'cats and spoilers', content: 'spoiler content', communityAddress: 'music-posting.eth' },
      { cid: 'top-post', title: 'cats forever', content: 'hello world', communityAddress: 'music-posting.eth' },
    ];
    testState.filterItems = [
      { count: 0, enabled: true, filteredCids: new Set(), hide: true, text: 'spoiler', top: false },
      { color: 'red', count: 0, enabled: true, filteredCids: new Set(), hide: false, text: 'cats', top: true },
    ];

    await renderCatalog({ initialEntry: '/mu/catalog', routePath: '/:boardIdentifier/catalog' });

    expect(document.title).toBe('/mu/ - catalog - 5chan');
    expect(testState.setCurrentCommunityAddressMock).toHaveBeenCalledWith('music-posting.eth');
    expect(Array.from(container.querySelectorAll('[data-testid="catalog-row"]')).map((element) => element.textContent)).toEqual(['row:top-post,boring-post']);
    expect(testState.incrementFilterCountMock).toHaveBeenCalledWith(0, 'hidden-post', 'music-posting.eth');
    expect(testState.incrementFilterCountMock).toHaveBeenCalledWith(1, 'top-post', 'music-posting.eth');

    act(() => root.unmount());

    expect(testState.setCurrentCommunityAddressMock).toHaveBeenLastCalledWith(null);

    root = createRoot(container);
  });

  it('renders single-board catalogs without Virtuoso virtualization', async () => {
    testState.feed = [
      { cid: 'board-post-1', title: 'one', communityAddress: 'music-posting.eth' },
      { cid: 'board-post-2', title: 'two', communityAddress: 'music-posting.eth' },
    ];

    await renderCatalog({ initialEntry: '/mu/catalog', routePath: '/:boardIdentifier/catalog' });

    expect(container.querySelector('[data-testid="virtuoso"]')).toBeNull();
    expect(Array.from(container.querySelectorAll('[data-testid="catalog-row"]')).map((element) => element.textContent)).toEqual(['row:board-post-1,board-post-2']);
  });

  it('canonicalizes multiboard catalog paths and keeps load-more wired for infinite scrolling', async () => {
    testState.feed = [{ cid: 'all-post', title: 'one', communityAddress: 'music-posting.eth' }];
    testState.hasMore = true;

    await renderCatalog({
      catalogProps: { viewType: 'all' },
      initialEntry: '/all/catalog/7',
      routePath: '/all/*',
    });

    expect(latestLocation).toBe('/all/catalog');
    expect(testState.feedOptionsCalls.at(-1)?.postsPerPage).toBe(24);

    await act(async () => {
      container.querySelector<HTMLButtonElement>('[data-testid="end-reached"]')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(testState.loadMoreMock).toHaveBeenCalledTimes(1);
  });

  it('captures Virtuoso state on pagehide instead of wiring a scroll hot-path listener', async () => {
    testState.feed = [{ cid: 'all-post', title: 'one', communityAddress: 'music-posting.eth' }];
    const addEventListenerSpy = vi.spyOn(window, 'addEventListener');
    const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');

    await renderCatalog({
      catalogProps: { viewType: 'all' },
      initialEntry: '/all/catalog',
      routePath: '/all/*',
    });

    expect(addEventListenerSpy.mock.calls.some(([eventName]) => String(eventName) === 'pagehide')).toBe(true);

    act(() => root.unmount());

    expect(removeEventListenerSpy.mock.calls.some(([eventName]) => String(eventName) === 'pagehide')).toBe(true);

    addEventListenerSpy.mockRestore();
    removeEventListenerSpy.mockRestore();

    root = createRoot(container);
  });

  it('shows the empty subscriptions state when there are no subscribed boards to browse', async () => {
    testState.account = { subscriptions: [] };

    await renderCatalog({
      catalogProps: { viewType: 'subs' },
      initialEntry: '/subs/catalog',
      routePath: '/subs/*',
    });

    expect(container.textContent).toContain('not_subscribed_to_any_board');
    expect(container.querySelector('[data-testid="catalog-first-row"]')?.textContent).toBe('music-posting.eth');
  });

  it('queries scoped recent account posts and still applies local search filtering before injecting them', async () => {
    const currentTimestamp = Math.floor(Date.now() / 1000);
    testState.feed = [{ cid: 'network-post', title: 'cats on stage', communityAddress: 'music-posting.eth' }];
    testState.searchText = 'cats';
    testState.accountComments = [
      {
        cid: 'local-cats-post',
        content: 'cats local thread',
        postCid: 'local-cats-post',
        state: 'succeeded',
        communityAddress: 'music-posting.eth',
        timestamp: currentTimestamp,
        title: 'cats local',
      },
      {
        cid: 'local-dogs-post',
        content: 'dogs local thread',
        postCid: 'local-dogs-post',
        state: 'succeeded',
        communityAddress: 'music-posting.eth',
        timestamp: currentTimestamp,
        title: 'dogs local',
      },
    ];

    await renderCatalog({ initialEntry: '/mu/catalog', routePath: '/:boardIdentifier/catalog' });

    expect(testState.accountCommentsCalls).toContainEqual({
      communityAddress: 'music-posting.eth',
      newerThan: 3600,
      sortType: 'old',
    });
    expect(Array.from(container.querySelectorAll('[data-testid="catalog-row"]')).map((element) => element.textContent)).toEqual(['row:local-cats-post,network-post']);
  });

  it('chunks catalog rows safely even when the viewport is narrower than one card', async () => {
    testState.windowWidth = 0;
    testState.feed = [
      { cid: 'first-post', title: 'one', communityAddress: 'music-posting.eth' },
      { cid: 'second-post', title: 'two', communityAddress: 'music-posting.eth' },
    ];

    await renderCatalog({ initialEntry: '/mu/catalog', routePath: '/:boardIdentifier/catalog' });

    expect(Array.from(container.querySelectorAll('[data-testid="catalog-row"]')).map((element) => element.textContent)).toEqual(['row:first-post', 'row:second-post']);
  });
});
