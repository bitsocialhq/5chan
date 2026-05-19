import * as React from 'react';
import { createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DesktopBoardButtons, MobileBoardButtons } from '../board-buttons';
import useThreadLiveUpdatesStore from '../../../stores/use-thread-live-updates-store';
import useHiddenCatalogThreadsStore from '../../../stores/use-hidden-catalog-threads-store';
import { clearStableLastVisitTimeFilterName, LAST_VISIT_STORAGE_KEY } from '../../../lib/utils/time-filter-utils';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
const act = (React as { act?: (cb: () => void | Promise<void>) => void | Promise<void> }).act as (cb: () => void | Promise<void>) => void | Promise<void>;

type DirectoryEntry = {
  address: string;
  features?: { requirePostLinkIsMedia?: boolean };
  name?: string;
  publicKey?: string;
  title?: string;
};

const testState = vi.hoisted(() => ({
  account: { blockedCids: {} as Record<string, boolean>, subscriptions: [] as string[] },
  accountCommunityAddresses: [] as string[],
  accountComment: undefined as { communityAddress?: string } | undefined,
  alertThresholdUnit: 'minutes' as 'hours' | 'minutes',
  alertThresholdValue: 5,
  commentsByCid: {} as Record<string, any>,
  directories: [
    { address: 'music-posting.eth', features: {}, name: 'music-posting.eth', publicKey: 'music-public-key', title: '/mu/ - Music' },
    { address: 'tech-posting.eth', features: { requirePostLinkIsMedia: true }, title: '/g/ - Technology' },
  ] as DirectoryEntry[],
  enableInfiniteScroll: false,
  filter: 'all' as 'all' | 'nsfw' | 'sfw',
  filteredCount: 0,
  filteredDirectoryAddresses: ['music-posting.eth', 'tech-posting.eth'] as string[],
  hiddenThreadsByScope: {} as Record<string, Array<{ cid: string }>>,
  imageSize: 'Small' as 'Small' | 'Large',
  isMobile: true,
  linkCount: 3,
  navigateMock: vi.fn(),
  pageNumber: 7 as number | null,
  resetMock: vi.fn(),
  resolvedCommunityAddress: 'music-posting.eth' as string | undefined,
  searchText: '',
  setAlertThresholdMock: vi.fn(),
  setFilterMock: vi.fn(),
  setImageSizeMock: vi.fn(),
  setShowOPCommentMock: vi.fn(),
  setSortTypeMock: vi.fn(),
  setViewModeMock: vi.fn(),
  showOPComment: false,
  sortType: 'active' as 'active' | 'new' | 'replyCount',
  subscribeMock: vi.fn(),
  subscribed: false,
  unsubscribeMock: vi.fn(),
  useCommentCalls: [] as Array<{ commentCid?: string; community?: { name?: string; publicKey?: string } }>,
  viewMode: 'compact' as 'compact' | 'feed',
}));

function useCatalogFiltersStoreMock<T>(selector?: (state: { filteredCount: number; searchText: string }) => T) {
  const state = {
    filteredCount: testState.filteredCount,
    searchText: testState.searchText,
  };
  return selector ? selector(state) : (state as T);
}

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => testState.navigateMock,
  };
});

vi.mock('@bitsocial/bitsocial-react-hooks', () => ({
  useAccount: () => testState.account,
  useAccountComment: () => testState.accountComment,
  useComment: ({ commentCid, community }: { commentCid?: string; community?: { name?: string; publicKey?: string } }) => {
    testState.useCommentCalls.push({ commentCid, community });
    return commentCid ? testState.commentsByCid[commentCid] : undefined;
  },
  useSubscribe: () => ({
    subscribe: testState.subscribeMock,
    subscribed: testState.subscribed,
    unsubscribe: testState.unsubscribeMock,
  }),
}));

vi.mock('../../../hooks/use-account-community-addresses', () => ({
  useAccountCommunityAddresses: () => testState.accountCommunityAddresses,
}));

vi.mock('../../../hooks/use-filtered-directory-addresses', () => ({
  useFilteredDirectoryAddresses: () => testState.filteredDirectoryAddresses,
}));

vi.mock('../../../hooks/use-hidden-catalog-threads', () => ({
  default: ({ communityAddresses }: { communityAddresses: string[] }) => {
    const scopeKey = communityAddresses.filter(Boolean).slice().sort().join('\u0000');
    return {
      hiddenCatalogThreads: testState.hiddenThreadsByScope[scopeKey] || [],
      hiddenThreadCandidates: testState.hiddenThreadsByScope[scopeKey] || [],
      isLoadingHiddenCatalogThreads: false,
      scopeKey,
    };
  },
}));

vi.mock('../../../hooks/use-post-page-number', () => ({
  usePostPageNumber: () => testState.pageNumber,
}));

vi.mock('../../../hooks/use-directories', () => ({
  findDirectoryByAddress: (directories: DirectoryEntry[], address?: string) =>
    directories.find((entry) => address && [entry.address, entry.name, entry.publicKey].includes(address)),
  useDirectories: () => testState.directories,
  useDirectoryByAddress: (address: string | undefined) => testState.directories.find((entry) => entry.address === address),
}));

vi.mock('../../../hooks/use-resolved-community-address', () => ({
  useResolvedCommunityAddress: () => testState.resolvedCommunityAddress,
}));

vi.mock('../../../stores/use-catalog-filters-store', () => ({
  default: useCatalogFiltersStoreMock,
}));

vi.mock('../../../stores/use-catalog-style-store', () => ({
  default: () => ({
    imageSize: testState.imageSize,
    setImageSize: testState.setImageSizeMock,
    setShowOPComment: testState.setShowOPCommentMock,
    showOPComment: testState.showOPComment,
  }),
}));

vi.mock('../../../stores/use-feed-reset-store', () => ({
  default: (selector: (state: { reset: typeof testState.resetMock }) => unknown) =>
    selector({
      reset: testState.resetMock,
    }),
}));

vi.mock('../../../stores/use-sorting-store', () => ({
  default: (selector?: (state: { setSortType: typeof testState.setSortTypeMock; sortType: typeof testState.sortType }) => unknown) => {
    const state = {
      setSortType: testState.setSortTypeMock,
      sortType: testState.sortType,
    };
    return selector ? selector(state) : state;
  },
}));

vi.mock('../../../stores/use-all-feed-filter-store', () => ({
  default: () => ({
    filter: testState.filter,
    setFilter: testState.setFilterMock,
  }),
}));

vi.mock('../../../stores/use-mod-queue-store', () => ({
  default: () => ({
    alertThresholdUnit: testState.alertThresholdUnit,
    alertThresholdValue: testState.alertThresholdValue,
    setAlertThreshold: testState.setAlertThresholdMock,
    setViewMode: testState.setViewModeMock,
    viewMode: testState.viewMode,
  }),
}));

vi.mock('../../../stores/use-feed-view-settings-store', () => ({
  default: (selector: (state: { enableInfiniteScroll: boolean }) => unknown) =>
    selector({
      enableInfiniteScroll: testState.enableInfiniteScroll,
    }),
}));

vi.mock('../../../hooks/use-count-links-in-replies', () => ({
  default: () => testState.linkCount,
}));

vi.mock('../../../hooks/use-is-mobile', () => ({
  default: () => testState.isMobile,
}));

vi.mock('../../catalog-filters', () => ({
  default: () => createElement('div', { 'data-testid': 'catalog-filters' }, 'catalog-filters'),
}));

vi.mock('../../catalog-search', () => ({
  default: () => createElement('div', { 'data-testid': 'catalog-search' }, 'catalog-search'),
}));

vi.mock('../../tooltip', () => ({
  default: ({ content, children }: { content: string; children: React.ReactNode }) =>
    createElement('span', { 'data-content': content, 'data-testid': 'tooltip' }, children),
}));

vi.mock('../../../views/mod-queue/mod-queue', () => ({
  ModQueueButton: ({ boardIdentifier, isMobile }: { boardIdentifier?: string; isMobile?: boolean }) =>
    createElement('div', { 'data-mobile': String(!!isMobile), 'data-testid': 'mod-queue-button' }, boardIdentifier || 'global-mod-queue'),
}));

let container: HTMLDivElement;
let root: Root;

const renderWithRoute = async (element: React.ReactElement, initialEntry: string) => {
  await act(async () => {
    root.render(
      createElement(
        MemoryRouter,
        { initialEntries: [initialEntry] },
        createElement(
          Routes,
          {},
          createElement(Route, { path: '/all', element }),
          createElement(Route, { path: '/all/catalog', element }),
          createElement(Route, { path: '/subs', element }),
          createElement(Route, { path: '/subs/catalog', element }),
          createElement(Route, { path: '/mod', element }),
          createElement(Route, { path: '/mod/catalog', element }),
          createElement(Route, { path: '/mod/queue', element }),
          createElement(Route, { path: '/:boardIdentifier/catalog', element }),
          createElement(Route, { path: '/:boardIdentifier/archive', element }),
          createElement(Route, { path: '/:boardIdentifier/thread/:commentCid', element }),
          createElement(Route, { path: '/:boardIdentifier', element }),
        ),
      ),
    );
  });
};

const clickButton = async (text: string) => {
  const button = Array.from(container.querySelectorAll('button')).find((candidate) => candidate.textContent === text);
  await act(async () => {
    button?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
};

const findButtonLink = (text: string) => Array.from(container.querySelectorAll<HTMLAnchorElement>('a.button')).find((candidate) => candidate.textContent === text);

const changeSelect = async (select: HTMLSelectElement, value: string) => {
  await act(async () => {
    select.value = value;
    select.dispatchEvent(new Event('change', { bubbles: true }));
  });
};

const setTrackedInputValue = (input: HTMLInputElement, value: string) => {
  const descriptor = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value');
  descriptor?.set?.call(input, value);
};

const getScopeKey = (communityAddresses: string[]) => communityAddresses.filter(Boolean).slice().sort().join('\u0000');

describe('BoardButtons', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    testState.account = { blockedCids: {}, subscriptions: [] };
    testState.accountCommunityAddresses = [];
    testState.accountComment = undefined;
    testState.alertThresholdUnit = 'minutes';
    testState.alertThresholdValue = 5;
    testState.commentsByCid = {};
    testState.directories = [
      { address: 'music-posting.eth', features: {}, name: 'music-posting.eth', publicKey: 'music-public-key', title: '/mu/ - Music' },
      { address: 'tech-posting.eth', features: { requirePostLinkIsMedia: true }, title: '/g/ - Technology' },
    ];
    testState.enableInfiniteScroll = false;
    testState.filter = 'all';
    testState.filteredCount = 0;
    testState.filteredDirectoryAddresses = ['music-posting.eth', 'tech-posting.eth'];
    testState.hiddenThreadsByScope = {};
    testState.imageSize = 'Small';
    testState.isMobile = true;
    testState.linkCount = 3;
    testState.pageNumber = 7;
    testState.resolvedCommunityAddress = 'music-posting.eth';
    testState.searchText = '';
    testState.showOPComment = false;
    testState.sortType = 'active';
    testState.subscribed = false;
    testState.useCommentCalls = [];
    testState.viewMode = 'compact';
    useThreadLiveUpdatesStore.getState().resetState();
    useHiddenCatalogThreadsStore.setState({ hiddenCommentsByCid: {}, scopeHiddenThreadsCounts: {}, shownScopeKey: null });
    clearStableLastVisitTimeFilterName();
    localStorage.setItem(LAST_VISIT_STORAGE_KEY, String(Date.now()));
    Object.defineProperty(globalThis, 'alert', {
      configurable: true,
      value: vi.fn(),
      writable: true,
    });
    Object.defineProperty(window, 'scrollTo', {
      configurable: true,
      value: vi.fn(),
      writable: true,
    });
    Object.defineProperty(document.documentElement, 'scrollHeight', {
      configurable: true,
      value: 2400,
      writable: true,
    });

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

  it('renders desktop board actions for browsing boards, then searches OPs and triggers refresh, directory, subscribe, and archive flows', async () => {
    await renderWithRoute(createElement(DesktopBoardButtons), '/mu');

    expect(container.querySelector('[data-testid="mod-queue-button"]')?.textContent).toBe('mu');
    expect(container.textContent).toContain('subscribe');
    expect(container.textContent).toContain('directory');
    expect(findButtonLink('catalog')?.getAttribute('href')).toBe('/mu/catalog');
    expect(findButtonLink('directory')?.getAttribute('href')).toBe('/mu/directory');

    const searchInput = container.querySelector<HTMLInputElement>('input[type="text"]');
    expect(searchInput).toBeTruthy();

    await act(async () => {
      if (searchInput) {
        searchInput.value = 'cats';
        searchInput.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'Enter' }));
      }
    });

    expect(testState.navigateMock).toHaveBeenCalledWith('/mu/catalog?q=cats');

    await clickButton('refresh');
    await clickButton('subscribe');
    await clickButton('archive');

    expect(testState.resetMock).toHaveBeenCalledTimes(1);
    expect(testState.subscribeMock).toHaveBeenCalledTimes(1);
    expect(testState.navigateMock).toHaveBeenCalledWith('/mu/archive');
    expect(globalThis.alert).not.toHaveBeenCalled();
  });

  it('does not render the directory button on a full board address route', async () => {
    await renderWithRoute(createElement(DesktopBoardButtons), '/music-posting.eth');

    expect(container.textContent).not.toContain('directory');
  });

  it('renders desktop catalog controls and wires sort, style, filter, and refresh updates', async () => {
    testState.filteredCount = 4;

    await renderWithRoute(createElement(DesktopBoardButtons), '/all/catalog?t=24h');

    expect(container.textContent).toContain('filtered_threads');
    expect(container.textContent).toContain('4');
    expect(container.textContent).not.toContain('archive');
    expect(container.querySelector('[data-testid="catalog-filters"]')?.textContent).toBe('catalog-filters');
    expect(container.querySelector('[data-testid="catalog-search"]')?.textContent).toBe('catalog-search');
    expect(findButtonLink('return')?.getAttribute('href')).toBe('/all?t=24h');

    const selects = Array.from(container.querySelectorAll<HTMLSelectElement>('select'));
    expect(selects).toHaveLength(5);

    await changeSelect(selects[0]!, 'replyCount');
    await changeSelect(selects[1]!, 'Large');
    await changeSelect(selects[2]!, 'On');
    await changeSelect(selects[3]!, 'nsfw');
    await changeSelect(selects[4]!, '1w');
    await clickButton('refresh');

    expect(testState.setSortTypeMock).toHaveBeenCalledWith('replyCount');
    expect(testState.setImageSizeMock).toHaveBeenCalledWith('Large');
    expect(testState.setShowOPCommentMock).toHaveBeenCalledWith(true);
    expect(testState.setFilterMock).toHaveBeenCalledWith('nsfw');
    expect(testState.navigateMock).toHaveBeenCalledWith({ pathname: '/all/catalog', search: '?t=1w' });
    expect(testState.resetMock).toHaveBeenCalledTimes(1);
  });

  it('renders the desktop hidden-thread catalog control immediately after refresh', async () => {
    testState.hiddenThreadsByScope[getScopeKey(['music-posting.eth'])] = [{ cid: 'hidden-thread' }];

    await renderWithRoute(createElement(DesktopBoardButtons), '/mu/catalog');

    const control = container.querySelector<HTMLElement>('[data-testid="hidden-threads-control"]');
    expect(control?.dataset.placement).toBe('desktop');
    expect(control?.textContent).toContain('Hidden threads: 1');
    expect(control?.querySelector('strong')?.textContent).toBe('1');
    expect(container.textContent?.indexOf('refresh')).toBeLessThan(container.textContent?.indexOf('Hidden threads') ?? -1);

    await clickButton('Show');

    expect(useHiddenCatalogThreadsStore.getState().shownScopeKey).toBe(getScopeKey(['music-posting.eth']));
    expect(container.querySelector<HTMLElement>('[data-testid="hidden-threads-control"]')?.textContent).toContain('Back');
  });

  it('renders the mobile hidden-thread catalog control below the refresh row', async () => {
    testState.hiddenThreadsByScope[getScopeKey(['music-posting.eth'])] = [{ cid: 'hidden-thread' }, { cid: 'second-hidden-thread' }];

    await renderWithRoute(createElement(MobileBoardButtons), '/mu/catalog');

    const control = container.querySelector<HTMLElement>('[data-testid="hidden-threads-control"]');
    expect(control?.dataset.placement).toBe('mobile');
    expect(control?.className).toContain('mobileHiddenCatalogThreadsToggle');
    expect(control?.textContent).toContain('Hidden threads: 2');
    expect(container.textContent?.indexOf('refresh')).toBeLessThan(container.textContent?.indexOf('Hidden threads') ?? -1);
  });

  it('counts hidden threads for every board in the all catalog scope', async () => {
    testState.hiddenThreadsByScope[getScopeKey(['music-posting.eth', 'tech-posting.eth'])] = [{ cid: 'hidden-music' }, { cid: 'hidden-tech' }];

    await renderWithRoute(createElement(DesktopBoardButtons), '/all/catalog?t=24h');

    expect(container.querySelector<HTMLElement>('[data-testid="hidden-threads-control"]')?.textContent).toContain('Hidden threads: 2');
  });

  it('uses the catalog-provided hidden count when the blocked cid lookup has not resolved yet', async () => {
    useHiddenCatalogThreadsStore.getState().setScopeHiddenThreadsCount(getScopeKey(['music-posting.eth']), 1);

    await renderWithRoute(createElement(DesktopBoardButtons), '/mu/catalog');

    expect(container.querySelector<HTMLElement>('[data-testid="hidden-threads-control"]')?.textContent).toContain('Hidden threads: 1');
  });

  it('preserves the current multiboard time filter when searching OPs', async () => {
    localStorage.setItem(LAST_VISIT_STORAGE_KEY, String(Date.now() - 3 * 24 * 60 * 60 * 1000));

    await renderWithRoute(createElement(DesktopBoardButtons), '/all?t=last');

    const searchInput = container.querySelector<HTMLInputElement>('input[type="text"]');
    expect(searchInput).toBeTruthy();

    await act(async () => {
      if (searchInput) {
        searchInput.value = 'cats';
        searchInput.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'Enter' }));
      }
    });

    expect(testState.navigateMock).toHaveBeenCalledWith({ pathname: '/all/catalog', search: '?t=last&q=cats' });
  });

  it('lets multiboard views switch back to the last-visit filter alias', async () => {
    localStorage.setItem(LAST_VISIT_STORAGE_KEY, String(Date.now() - (2 * 24 * 60 * 60 + 1) * 1000));

    await renderWithRoute(createElement(DesktopBoardButtons), '/all/catalog?t=1w');

    const timeFilterSelect = Array.from(container.querySelectorAll<HTMLSelectElement>('select')).at(-1);
    expect(timeFilterSelect).toBeTruthy();
    expect(Array.from(timeFilterSelect?.options || []).some((option) => option.value === 'last')).toBe(true);

    await changeSelect(timeFilterSelect!, 'last');

    expect(testState.navigateMock).toHaveBeenCalledWith({ pathname: '/all/catalog', search: '?t=last' });
  });

  it('renders thread actions and post stats, then requests refreshes, toggles auto updates, and scrolls to the bottom', async () => {
    testState.commentsByCid = {
      'comment-1': {
        cid: 'comment-1',
        archived: true,
        closed: true,
        number: 99,
        pinned: true,
        postCid: 'comment-1',
        replyCount: 9,
      },
    };

    await renderWithRoute(createElement(DesktopBoardButtons), '/mu/thread/comment-1');

    const tooltips = Array.from(container.querySelectorAll<HTMLElement>('[data-testid="tooltip"]'));
    expect(tooltips.map((tooltip) => tooltip.dataset.content)).toEqual(['Replies', 'Links', 'pagination.pageLabel']);
    expect(tooltips.map((tooltip) => tooltip.textContent)).toEqual(['9', '3', '7']);
    expect(container.textContent).toContain('Archived /');
    expect(container.textContent).toContain('Sticky /');
    expect(container.textContent).toContain('Closed /');
    expect(testState.useCommentCalls).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          commentCid: 'comment-1',
          community: { name: 'music-posting.eth', publicKey: 'music-public-key' },
        }),
      ]),
    );

    await clickButton('bottom');
    await clickButton('update');
    const autoCheckbox = container.querySelector<HTMLInputElement>('input[type="checkbox"]');
    expect(autoCheckbox?.checked).toBe(false);
    await act(async () => {
      autoCheckbox?.click();
    });

    expect(window.scrollTo).toHaveBeenCalledWith({ behavior: 'instant', top: 2400 });
    expect(useThreadLiveUpdatesStore.getState().updateRequestId).toBe(1);
    expect(useThreadLiveUpdatesStore.getState().enabled).toBe(true);
    expect(autoCheckbox?.checked).toBe(true);
  });

  it('keeps the update button enabled while a manual thread refresh is in progress', async () => {
    testState.commentsByCid = {
      'comment-1': {
        cid: 'comment-1',
        postCid: 'comment-1',
        replyCount: 9,
      },
    };
    useThreadLiveUpdatesStore.getState().startUpdate();

    await renderWithRoute(createElement(DesktopBoardButtons), '/mu/thread/comment-1');

    const updateButton = Array.from(container.querySelectorAll('button')).find((candidate) => candidate.textContent === 'update');
    expect(updateButton?.hasAttribute('disabled')).toBe(false);

    await clickButton('update');

    expect(useThreadLiveUpdatesStore.getState().updateRequestId).toBe(1);
  });

  it('renders mobile mod-queue controls and clamps alert threshold updates', async () => {
    testState.alertThresholdValue = 60;

    await renderWithRoute(createElement(MobileBoardButtons), '/mod/queue');

    expect(findButtonLink('return')?.getAttribute('href')).toBe('/mod');

    const thresholdInput = container.querySelector<HTMLInputElement>('input[type="number"]');
    const selects = Array.from(container.querySelectorAll<HTMLSelectElement>('select'));
    expect(thresholdInput).toBeTruthy();
    expect(selects).toHaveLength(2);

    await act(async () => {
      if (thresholdInput) {
        setTrackedInputValue(thresholdInput, '0');
        thresholdInput.dispatchEvent(new Event('input', { bubbles: true }));
        thresholdInput.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });
    expect(testState.setAlertThresholdMock).toHaveBeenCalledWith(1, 'minutes');

    testState.setAlertThresholdMock.mockClear();
    await changeSelect(selects[0]!, 'hours');
    await changeSelect(selects[1]!, 'feed');
    await clickButton('refresh');

    expect(testState.setAlertThresholdMock).toHaveBeenCalledWith(1, 'hours');
    expect(testState.setViewModeMock).toHaveBeenCalledWith('feed');
    expect(testState.resetMock).toHaveBeenCalledTimes(1);
  });
});
