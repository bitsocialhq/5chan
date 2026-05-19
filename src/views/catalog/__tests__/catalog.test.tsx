import * as React from 'react';
import { createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Catalog, { getCatalogRenderFeed, type CatalogProps } from '../catalog';
import { clearStableLastVisitTimeFilterName, LAST_VISIT_STORAGE_KEY } from '../../../lib/utils/time-filter-utils';
import useHiddenCatalogThreadsStore from '../../../stores/use-hidden-catalog-threads-store';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
const act = (React as { act?: (cb: () => void | Promise<void>) => void | Promise<void> }).act as (cb: () => void | Promise<void>) => void | Promise<void>;

type TestComment = {
  cid: string;
  content?: string;
  title?: string;
  pinned?: boolean;
  communityAddress?: string;
  deleted?: boolean;
  parentCid?: string;
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
  account: { blockedCids: {} as Record<string, boolean>, subscriptions: [] as string[] },
  accountComments: [] as TestComment[],
  accountCommentsCalls: [] as Array<{ commentIndices?: number[]; communityAddress?: string; newerThan?: number; sortType?: 'new' | 'old' } | undefined>,
  accountCommunityAddresses: [] as string[],
  blockCidMock: vi.fn(),
  commentsByCid: {} as Record<string, TestComment>,
  directoryByAddress: {
    'music-posting.eth': {
      address: 'music-posting.eth',
      features: { postsPerPage: 2 },
    },
  } as Record<string, { address: string; features?: Record<string, unknown> }>,
  directories: [{ address: 'music-posting.eth', directoryCode: 'mu', title: '/mu/ - Music' }] as Array<{
    address: string;
    directoryCode?: string;
    features?: Record<string, unknown>;
    name?: string;
    publicKey?: string;
    title?: string;
  }>,
  feed: [] as TestComment[],
  feedOptionsCalls: [] as Array<{ communitiesLength?: number; filterKey?: string; newerThan?: number; postsPerPage?: number; sortType?: string }>,
  filterItems: [] as FilterItem[],
  filteredDirectoryAddresses: ['music-posting.eth'] as string[],
  hasMore: false,
  imageSize: 'Small' as 'Large' | 'Small',
  incrementFilterCountMock: vi.fn(),
  expandTimeWindowMock: vi.fn(),
  loadMoreMock: vi.fn(),
  pageSizes: {
    guiPostsPerPage: 2,
    maxGuiPages: 3,
    paginationFeedPostsPerPage: 6,
  },
  respectPostsPerPageForNewerThan: new Set<number>(),
  resetMock: vi.fn(),
  resolvedCommunityAddress: 'music-posting.eth' as string | undefined,
  searchText: '',
  setCurrentCommunityAddressMock: vi.fn(),
  setResetFunctionMock: vi.fn(),
  showOPComment: true,
  sortType: 'new' as 'active' | 'new',
  unblockCidMock: vi.fn(),
  virtuosoInitialScrollTops: [] as Array<number | undefined>,
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
    setCurrentCommunityAddress: testState.setCurrentCommunityAddressMock,
  };
}

function useCatalogFiltersStoreMock<T>(selector?: (state: ReturnType<typeof getCatalogFiltersState>) => T) {
  const state = getCatalogFiltersState();
  return selector ? selector(state) : (state as T);
}

useCatalogFiltersStoreMock.getState = getCatalogFiltersState;

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

type FeedFilter = {
  filter: (comment: TestComment) => boolean;
  key?: string;
};

const getScopedFeed = (options?: { filter?: FeedFilter; newerThan?: number; postsPerPage?: number }) => {
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
  useFeed: (options: { communities?: unknown[]; filter?: FeedFilter; newerThan?: number; postsPerPage?: number; sortType?: string }) => {
    testState.feedOptionsCalls.push({
      communitiesLength: options.communities?.length,
      filterKey: options.filter?.key,
      newerThan: options.newerThan,
      postsPerPage: options.postsPerPage,
      sortType: options.sortType,
    });
    return {
      feed: getScopedFeed(options),
      hasMore: testState.hasMore,
      expandTimeWindow: testState.expandTimeWindowMock,
      loadMore: testState.loadMoreMock,
      reset: testState.resetMock,
    };
  },
  useCommunity: () => testState.community,
  useComments: ({ commentCids = [] }: { commentCids?: string[] } = {}) => ({
    comments: commentCids.map((cid) => testState.commentsByCid[cid]),
    state: 'succeeded',
  }),
}));

vi.mock('@bitsocial/bitsocial-react-hooks/dist/stores/accounts', () => ({
  default: {
    getState: () => ({
      accounts: { account: testState.account },
      accountsActions: {
        blockCid: testState.blockCidMock,
        unblockCid: testState.unblockCidMock,
      },
      activeAccountId: 'account',
    }),
  },
}));

vi.mock('react-virtuoso', () => ({
  Virtuoso: React.forwardRef(
    (
      {
        components,
        data = [],
        endReached,
        initialScrollTop,
        itemContent,
      }: {
        components?: { Footer?: React.ComponentType };
        data?: Array<TestComment[]>;
        endReached?: ((index: number) => void) | undefined;
        initialScrollTop?: number;
        itemContent: (index: number, item: TestComment[]) => React.ReactNode;
      },
      ref: React.ForwardedRef<{ getState: (cb: (snapshot: { ranges: number[]; scrollTop: number }) => void) => void }>,
    ) => {
      React.useImperativeHandle(ref, () => ({
        getState: (cb) => cb({ ranges: [0], scrollTop: 24 }),
      }));
      testState.virtuosoInitialScrollTops.push(initialScrollTop);

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
  normalizeBoardAddress: (address: string) => address.replace(/\.(bso|eth)$/, ''),
  findDirectoryByAddress: (
    directories: Array<{ address: string; title?: string; directoryCode?: string; name?: string; publicKey?: string }>,
    address: string | undefined,
  ) => {
    if (!address) {
      return undefined;
    }
    const normalize = (value: string) => value.replace(/\.(bso|eth)$/, '');
    return directories.find((entry) =>
      [entry.address, entry.directoryCode, entry.name, entry.publicKey, entry.title].some(
        (identifier) => identifier === address || (!!identifier && normalize(identifier) === normalize(address)),
      ),
    );
  },
}));

vi.mock('../../../hooks/use-board-feed-page-size', () => ({
  useBoardFeedPageSize: () => testState.pageSizes,
}));

vi.mock('../../../hooks/use-account-community-addresses', () => ({
  useAccountCommunityAddresses: () => testState.accountCommunityAddresses,
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
  useIsMobileBreakpoint: () => testState.windowWidth < 640,
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
  default: (selector?: (state: { sortType: typeof testState.sortType }) => unknown) => {
    const state = { sortType: testState.sortType };
    return selector ? selector(state) : state;
  },
}));

vi.mock('../../../stores/use-catalog-filters-store', () => ({
  default: useCatalogFiltersStoreMock,
}));

vi.mock('../../../components/catalog-row', () => ({
  default: ({ estimatedHeight, row, showHiddenPosts }: { estimatedHeight?: number; row: TestComment[]; showHiddenPosts?: boolean }) =>
    createElement(
      'div',
      { 'data-pretext-height': estimatedHeight, 'data-show-hidden': showHiddenPosts ? 'true' : 'false', 'data-testid': 'catalog-row' },
      `row:${row.map((comment) => comment.cid).join(',')}`,
      ...row.map((comment) =>
        createElement('button', {
          'aria-label': `hide-${comment.cid}`,
          key: `hide-${comment.cid}`,
          onClick: () => testState.blockCidMock(comment.cid),
          type: 'button',
        }),
      ),
    ),
}));

vi.mock('../../../components/footer', () => ({
  CatalogFooterFirstRow: ({ communityAddress }: { communityAddress?: string }) =>
    createElement(
      'div',
      { 'data-testid': 'catalog-first-row' },
      communityAddress || 'multi',
      testState.searchText ? ` - search_results_for: ${testState.searchText}` : null,
    ),
  CatalogFooterStyleRow: () => createElement('div', { 'data-testid': 'catalog-style-row' }, 'style'),
  PageFooterDesktop: ({ firstRow, styleRow }: { firstRow?: React.ReactNode; styleRow?: React.ReactNode }) =>
    createElement('div', { 'data-testid': 'catalog-footer-desktop' }, firstRow, styleRow),
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
    latestLocation = `${location.pathname}${location.search}`;
  }, [location.pathname, location.search]);
  return null;
};

const getHiddenCatalogThreadsScopeKey = (communityAddresses: string[]) => communityAddresses.filter(Boolean).slice().sort().join('\u0000');

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
    testState.account = { blockedCids: {}, subscriptions: [] };
    testState.accountComments = [];
    testState.accountCommentsCalls = [];
    testState.accountCommunityAddresses = [];
    testState.blockCidMock.mockReset();
    testState.blockCidMock.mockImplementation(async (cid: string) => {
      testState.account = {
        ...testState.account,
        blockedCids: {
          ...testState.account.blockedCids,
          [cid]: true,
        },
      };
    });
    testState.commentsByCid = {};
    testState.directories = [{ address: 'music-posting.eth', directoryCode: 'mu', title: '/mu/ - Music' }];
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
    testState.respectPostsPerPageForNewerThan = new Set();
    testState.resolvedCommunityAddress = 'music-posting.eth';
    testState.searchText = '';
    testState.showOPComment = true;
    testState.sortType = 'new';
    testState.unblockCidMock.mockReset();
    testState.unblockCidMock.mockResolvedValue(undefined);
    testState.virtuosoInitialScrollTops = [];
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
    clearStableLastVisitTimeFilterName();
    localStorage.setItem(LAST_VISIT_STORAGE_KEY, String(Date.now()));
    useHiddenCatalogThreadsStore.setState({ hiddenCommentsByCid: {}, scopeHiddenThreadsCounts: {}, shownScopeKey: null });

    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    useHiddenCatalogThreadsStore.setState({ hiddenCommentsByCid: {}, scopeHiddenThreadsCounts: {}, shownScopeKey: null });
    clearStableLastVisitTimeFilterName();
    localStorage.clear();
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

  it('removes hidden account-backed threads from the normal board catalog feed', async () => {
    testState.account = { blockedCids: { 'hidden-board-post': true }, subscriptions: [] };
    testState.feed = [
      { cid: 'visible-board-post', title: 'visible', communityAddress: 'music-posting.eth' },
      { cid: 'hidden-board-post', title: 'hidden', communityAddress: 'music-posting.eth', postCid: 'hidden-board-post' },
    ];
    testState.commentsByCid = {
      'hidden-board-post': { cid: 'hidden-board-post', title: 'hidden', communityAddress: 'music-posting.eth', postCid: 'hidden-board-post' },
    };

    await renderCatalog({ initialEntry: '/mu/catalog', routePath: '/:boardIdentifier/catalog' });

    expect(Array.from(container.querySelectorAll('[data-testid="catalog-row"]')).map((element) => element.textContent)).toEqual(['row:visible-board-post']);
    expect(container.textContent).not.toContain('hidden-board-post');
  });

  it('shows only hidden threads for the current board when hidden catalog mode is enabled', async () => {
    testState.account = { blockedCids: { 'hidden-board-post': true }, subscriptions: [] };
    testState.feed = [
      { cid: 'visible-board-post', title: 'visible', communityAddress: 'music-posting.eth' },
      { cid: 'hidden-board-post', title: 'hidden', communityAddress: 'music-posting.eth', postCid: 'hidden-board-post' },
    ];
    testState.commentsByCid = {
      'hidden-board-post': { cid: 'hidden-board-post', title: 'hidden', communityAddress: 'music-posting.eth', postCid: 'hidden-board-post' },
    };
    useHiddenCatalogThreadsStore.getState().setShownScopeKey(getHiddenCatalogThreadsScopeKey(['music-posting.eth']));

    await renderCatalog({ initialEntry: '/mu/catalog', routePath: '/:boardIdentifier/catalog' });

    const rows = Array.from(container.querySelectorAll<HTMLElement>('[data-testid="catalog-row"]'));
    expect(rows.map((element) => element.textContent)).toEqual(['row:hidden-board-post']);
    expect(rows[0]?.dataset.showHidden).toBe('true');
  });

  it('keeps a thread hidden on its board when it was hidden from a multiboard catalog', async () => {
    const sportsPublicKey = 'sports-public-key';
    testState.account = { blockedCids: { 'hidden-sp-post': true }, subscriptions: [] };
    testState.directories = [
      { address: 'music-posting.eth', directoryCode: 'mu', title: '/mu/ - Music' },
      { address: 'sports-posting.bso', directoryCode: 'sp', publicKey: sportsPublicKey, title: '/sp/ - Sports' },
    ];
    testState.directoryByAddress = {
      'sports-posting.bso': { address: 'sports-posting.bso', features: { postsPerPage: 2 } },
    };
    testState.resolvedCommunityAddress = 'sports-posting.bso';
    testState.feed = [{ cid: 'hidden-sp-post', title: 'sports hidden', communityAddress: sportsPublicKey, postCid: 'hidden-sp-post' }];
    testState.commentsByCid = {
      'hidden-sp-post': { cid: 'hidden-sp-post', title: 'sports hidden', communityAddress: sportsPublicKey, postCid: 'hidden-sp-post' },
    };

    await renderCatalog({ initialEntry: '/sp/catalog', routePath: '/:boardIdentifier/catalog' });

    expect(container.querySelector('[data-testid="catalog-row"]')).toBeNull();

    useHiddenCatalogThreadsStore.getState().setShownScopeKey(getHiddenCatalogThreadsScopeKey(['sports-posting.bso']));
    await renderCatalog({ initialEntry: '/sp/catalog', routePath: '/:boardIdentifier/catalog' });

    const hiddenRow = container.querySelector<HTMLElement>('[data-testid="catalog-row"]');
    expect(hiddenRow?.textContent).toBe('row:hidden-sp-post');
    expect(hiddenRow?.dataset.showHidden).toBe('true');
  });

  it('hides a board thread from its own catalog after the thread is hidden in all catalog', async () => {
    const musicThread = { cid: 'mu-thread-hidden-from-all', title: 'music thread', communityAddress: 'music-posting.eth', postCid: 'mu-thread-hidden-from-all' };
    testState.filteredDirectoryAddresses = ['music-posting.eth', 'sports-posting.eth'];
    testState.feed = [musicThread, { cid: 'sports-thread', title: 'sports thread', communityAddress: 'sports-posting.eth', postCid: 'sports-thread' }];
    testState.commentsByCid = {
      'mu-thread-hidden-from-all': musicThread,
    };

    await renderCatalog({
      catalogProps: { viewType: 'all' },
      initialEntry: '/all/catalog',
      routePath: '/all/*',
    });

    expect(container.textContent).toContain('mu-thread-hidden-from-all');

    await act(async () => {
      container.querySelector<HTMLButtonElement>('[aria-label="hide-mu-thread-hidden-from-all"]')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(testState.account.blockedCids).toEqual({ 'mu-thread-hidden-from-all': true });

    testState.resolvedCommunityAddress = 'music-posting.eth';
    testState.feed = [musicThread, { cid: 'mu-visible-thread', title: 'other music thread', communityAddress: 'music-posting.eth', postCid: 'mu-visible-thread' }];

    await renderCatalog({ initialEntry: '/mu/catalog', routePath: '/:boardIdentifier/catalog' });

    expect(Array.from(container.querySelectorAll('[data-testid="catalog-row"]')).map((element) => element.textContent)).toEqual(['row:mu-visible-thread']);
    expect(container.textContent).not.toContain('mu-thread-hidden-from-all');
  });

  it('counts and shows hidden board threads from the raw feed when blocked cid lookup has not resolved them', async () => {
    const hiddenThread = {
      cid: 'raw-feed-hidden-thread',
      communityAddress: 'music-posting.eth',
      postCid: 'raw-feed-hidden-thread',
      title: 'raw feed hidden',
    };
    testState.account = { blockedCids: { 'raw-feed-hidden-thread': true }, subscriptions: [] };
    testState.commentsByCid = {};
    testState.feed = [hiddenThread, { cid: 'raw-feed-visible-thread', communityAddress: 'music-posting.eth', postCid: 'raw-feed-visible-thread', title: 'visible' }];

    await renderCatalog({ initialEntry: '/mu/catalog', routePath: '/:boardIdentifier/catalog' });

    expect(useHiddenCatalogThreadsStore.getState().scopeHiddenThreadsCounts[getHiddenCatalogThreadsScopeKey(['music-posting.eth'])]).toBe(1);
    expect(Array.from(container.querySelectorAll('[data-testid="catalog-row"]')).map((element) => element.textContent)).toEqual(['row:raw-feed-visible-thread']);

    useHiddenCatalogThreadsStore.getState().setShownScopeKey(getHiddenCatalogThreadsScopeKey(['music-posting.eth']));
    await renderCatalog({ initialEntry: '/mu/catalog', routePath: '/:boardIdentifier/catalog' });

    const hiddenRow = container.querySelector<HTMLElement>('[data-testid="catalog-row"]');
    expect(hiddenRow?.textContent).toBe('row:raw-feed-hidden-thread');
    expect(hiddenRow?.dataset.showHidden).toBe('true');
  });

  it('uses the multiboard board scope for hidden catalog mode', async () => {
    const sportsPublicKey = 'sports-public-key';
    testState.account = {
      blockedCids: {
        'hidden-mu-post': true,
        'hidden-sp-post': true,
        'hidden-other-post': true,
      },
      subscriptions: [],
    };
    testState.directories = [
      { address: 'music-posting.eth', directoryCode: 'mu', title: '/mu/ - Music' },
      { address: 'sports-posting.bso', directoryCode: 'sp', publicKey: sportsPublicKey, title: '/sp/ - Sports' },
    ];
    testState.filteredDirectoryAddresses = ['music-posting.eth', 'sports-posting.bso'];
    testState.feed = [
      { cid: 'visible-mu-post', title: 'visible', communityAddress: 'music-posting.eth' },
      { cid: 'hidden-mu-post', title: 'music hidden', communityAddress: 'music-posting.eth', postCid: 'hidden-mu-post' },
      { cid: 'hidden-sp-post', title: 'sports hidden', communityAddress: sportsPublicKey, postCid: 'hidden-sp-post' },
    ];
    testState.commentsByCid = {
      'hidden-mu-post': { cid: 'hidden-mu-post', title: 'music hidden', communityAddress: 'music-posting.eth', postCid: 'hidden-mu-post', timestamp: 100 },
      'hidden-other-post': { cid: 'hidden-other-post', title: 'other hidden', communityAddress: 'other-board.eth', postCid: 'hidden-other-post', timestamp: 101 },
      'hidden-sp-post': { cid: 'hidden-sp-post', title: 'sports hidden', communityAddress: sportsPublicKey, postCid: 'hidden-sp-post', timestamp: 102 },
    };
    useHiddenCatalogThreadsStore.getState().setShownScopeKey(getHiddenCatalogThreadsScopeKey(['music-posting.eth', 'sports-posting.bso']));

    await renderCatalog({
      catalogProps: { viewType: 'all' },
      initialEntry: '/all/catalog',
      routePath: '/all/*',
    });

    expect(Array.from(container.querySelectorAll('[data-testid="catalog-row"]')).map((element) => element.textContent)).toEqual(['row:hidden-sp-post,hidden-mu-post']);
  });

  it('leaves hidden mode automatically when the last hidden thread is unhidden', async () => {
    testState.account = { blockedCids: { 'hidden-board-post': true }, subscriptions: [] };
    testState.feed = [{ cid: 'hidden-board-post', title: 'hidden', communityAddress: 'music-posting.eth', postCid: 'hidden-board-post' }];
    testState.commentsByCid = {
      'hidden-board-post': { cid: 'hidden-board-post', title: 'hidden', communityAddress: 'music-posting.eth', postCid: 'hidden-board-post' },
    };
    useHiddenCatalogThreadsStore.getState().setShownScopeKey(getHiddenCatalogThreadsScopeKey(['music-posting.eth']));

    await renderCatalog({ initialEntry: '/mu/catalog', routePath: '/:boardIdentifier/catalog' });
    expect(container.querySelector('[data-testid="catalog-row"]')?.textContent).toBe('row:hidden-board-post');

    testState.account = { blockedCids: {}, subscriptions: [] };
    testState.commentsByCid = {};
    testState.feed = [];
    await renderCatalog({ initialEntry: '/mu/catalog', routePath: '/:boardIdentifier/catalog' });

    expect(useHiddenCatalogThreadsStore.getState().shownScopeKey).toBeNull();
  });

  it('does not prune hidden board threads just because the visible board feed filtered them out', async () => {
    testState.account = { blockedCids: { 'removed-hidden-post': true }, subscriptions: [] };
    testState.commentsByCid = {
      'removed-hidden-post': { cid: 'removed-hidden-post', title: 'removed', communityAddress: 'music-posting.eth', postCid: 'removed-hidden-post' },
    };
    testState.feed = [{ cid: 'visible-board-post', title: 'visible', communityAddress: 'music-posting.eth' }];
    testState.hasMore = false;

    await renderCatalog({ initialEntry: '/mu/catalog', routePath: '/:boardIdentifier/catalog' });

    expect(testState.unblockCidMock).not.toHaveBeenCalled();
  });

  it('prefers the immediate feed until deferred catalog rows exist', () => {
    const immediateFeed = [{ cid: 'all-post', title: 'one', communityAddress: 'music-posting.eth' }];

    expect(getCatalogRenderFeed(immediateFeed, [])).toBe(immediateFeed);
    expect(getCatalogRenderFeed(immediateFeed, immediateFeed)).toBe(immediateFeed);
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
    expect(testState.feedOptionsCalls).toEqual(expect.arrayContaining([expect.objectContaining({ postsPerPage: 24 })]));
    const loadMoreCallCountBeforeEndReached = testState.loadMoreMock.mock.calls.length;

    await act(async () => {
      container.querySelector<HTMLButtonElement>('[data-testid="end-reached"]')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(testState.loadMoreMock.mock.calls.length).toBe(loadMoreCallCountBeforeEndReached + 1);
  });

  it('passes multiboard time filters to useFeed and keeps query params during canonical redirects', async () => {
    testState.feed = [{ cid: 'all-post', title: 'one', communityAddress: 'music-posting.eth' }];

    await renderCatalog({
      catalogProps: { viewType: 'all', timeFilterNameFromCache: '48h' },
      initialEntry: '/all/catalog/7?t=24h',
      routePath: '/all/*',
    });

    expect(latestLocation).toBe('/all/catalog?t=24h');
    expect(testState.feedOptionsCalls).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          newerThan: 48 * 60 * 60,
          postsPerPage: 24,
          sortType: 'new',
        }),
      ]),
    );
  });

  it('shows a wider multiboard catalog time-filter suggestion when older threads exist', async () => {
    const now = Math.floor(Date.now() / 1000);
    localStorage.setItem(LAST_VISIT_STORAGE_KEY, String((now - 3 * 24 * 60 * 60) * 1000));
    testState.feed = [
      { cid: 'recent-post', title: 'recent', communityAddress: 'music-posting.eth', timestamp: now - 2 * 24 * 60 * 60 },
      { cid: 'older-post', title: 'older', communityAddress: 'music-posting.eth', timestamp: now - 5 * 24 * 60 * 60 },
    ];

    await renderCatalog({
      catalogProps: { viewType: 'all' },
      initialEntry: '/all/catalog?t=last',
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

  it('expands the multiboard catalog time window in place from the footer suggestion', async () => {
    const now = Math.floor(Date.now() / 1000);
    localStorage.setItem(LAST_VISIT_STORAGE_KEY, String((now - 3 * 24 * 60 * 60) * 1000));
    testState.feed = [
      { cid: 'recent-post', title: 'recent', communityAddress: 'music-posting.eth', timestamp: now - 2 * 24 * 60 * 60 },
      { cid: 'older-post', title: 'older', communityAddress: 'music-posting.eth', timestamp: now - 5 * 24 * 60 * 60 },
    ];

    await renderCatalog({
      catalogProps: { viewType: 'all' },
      initialEntry: '/all/catalog?t=last',
      routePath: '/all/*',
    });

    const expandButton = container.querySelector('[data-testid="expand-time-window-button"]');
    expect(expandButton).toBeTruthy();
    expect(Array.from(container.querySelectorAll('a')).some((link) => link.getAttribute('href') === '/all/catalog?t=1w')).toBe(false);

    await act(async () => {
      expandButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(testState.expandTimeWindowMock).toHaveBeenCalledWith(7 * 24 * 60 * 60);
  });

  it('keeps broader catalog suggestion feeds on the base page size so their identities stay stable while scrolling', async () => {
    const now = Math.floor(Date.now() / 1000);
    testState.feed = [
      ...Array.from({ length: 25 }, (_, index) => ({
        cid: `post-${index + 1}`,
        title: `thread ${index + 1}`,
        communityAddress: 'music-posting.eth',
        timestamp: now - (index + 1) * 60 * 60,
      })),
      { cid: 'older-post', title: 'older thread', communityAddress: 'music-posting.eth', timestamp: now - 20 * 24 * 60 * 60 },
    ];
    testState.pageSizes = {
      guiPostsPerPage: 2,
      maxGuiPages: 3,
      paginationFeedPostsPerPage: 6,
    };
    testState.respectPostsPerPageForNewerThan = new Set([30 * 24 * 60 * 60, 365 * 24 * 60 * 60]);

    await renderCatalog({
      catalogProps: { viewType: 'all' },
      initialEntry: '/all/catalog?t=1w',
      routePath: '/all/*',
    });

    expect(testState.feedOptionsCalls).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ newerThan: 30 * 24 * 60 * 60, postsPerPage: 24, sortType: 'new' }),
        expect.objectContaining({ newerThan: 365 * 24 * 60 * 60, postsPerPage: 24, sortType: 'new' }),
      ]),
    );
  });

  it('disables broader suggestion probe feeds when the multiboard filter is already all', async () => {
    testState.feed = [{ cid: 'all-post', title: 'one', communityAddress: 'music-posting.eth' }];

    await renderCatalog({
      catalogProps: { viewType: 'all' },
      initialEntry: '/all/catalog?t=all',
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

  it('restores multiboard catalog state after remounting', async () => {
    testState.feed = [{ cid: 'all-post', title: 'one', communityAddress: 'music-posting.eth' }];
    const catalogProps = { feedCacheKey: 'restore-check', viewType: 'all' as const };

    await renderCatalog({
      catalogProps,
      initialEntry: '/all/catalog',
      routePath: '/all/*',
    });

    expect(testState.virtuosoInitialScrollTops.at(-1)).toBeUndefined();

    act(() => root.unmount());
    root = createRoot(container);

    await renderCatalog({
      catalogProps,
      initialEntry: '/all/catalog',
      routePath: '/all/*',
    });

    expect(testState.virtuosoInitialScrollTops.at(-1)).toBe(24);
  });

  it('shows the empty subscriptions state when there are no subscribed boards to browse', async () => {
    testState.account = { blockedCids: {}, subscriptions: [] };

    await renderCatalog({
      catalogProps: { viewType: 'subs' },
      initialEntry: '/subs/catalog',
      routePath: '/subs/*',
    });

    expect(container.textContent).toContain('not_subscribed_to_any_board');
    expect(container.querySelector('[data-testid="catalog-first-row"]')?.textContent).toBe('music-posting.eth');
  });

  it('shows centered nothing found when catalog search has no matches', async () => {
    testState.feed = [{ cid: 'network-post', title: 'cats on stage', communityAddress: 'music-posting.eth' }];
    testState.searchText = 'asddasd';
    testState.hasMore = false;

    await renderCatalog({ initialEntry: '/mu/catalog?q=asddasd', routePath: '/:boardIdentifier/catalog' });

    expect(container.textContent).toContain('nothing_found');
    expect(container.textContent).not.toContain('no_threads');
    expect(container.querySelector('[role="status"]')?.className).toContain('searchNothingFound');
    expect(container.querySelector('[role="status"]')?.textContent).toBe('nothing_found');
    expect(container.querySelectorAll('[data-testid="catalog-row"]')).toHaveLength(0);
    expect(container.textContent).toContain('search_results_for');
    expect(container.textContent).toContain('asddasd');
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

  it('reuses the board feed identity when catalog search and filters are inactive', async () => {
    testState.sortType = 'active';
    testState.feed = [{ cid: 'network-post', title: 'cats on stage', communityAddress: 'music-posting.eth' }];

    await renderCatalog({ initialEntry: '/mu/catalog', routePath: '/:boardIdentifier/catalog' });

    expect(testState.feedOptionsCalls).toEqual(expect.arrayContaining([expect.objectContaining({ filterKey: 'exclude-archived' })]));
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
