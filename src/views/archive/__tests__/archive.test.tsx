import * as React from 'react';
import { createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Archive from '../archive';
import { renderArchiveRoute } from './helpers';

type TestComment = {
  cid: string;
  archived?: boolean;
  commentModeration?: {
    archived?: boolean;
  };
  title?: string;
  content?: string;
  timestamp?: number;
  threadCid?: string;
};

const testState = vi.hoisted(() => ({
  directories: [{ address: 'music-posting.eth', title: '/mu/ - Music' }],
  feed: [] as TestComment[],
  hasMore: false,
  isMobile: false,
  loadMoreMock: vi.fn(),
  resolvedCommunityAddress: 'music-posting.eth' as string | undefined,
  community: {
    error: undefined as Error | undefined,
    title: '/mu/ - Music',
  },
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) => {
      if (key === 'displaying_x_archived_threads') {
        return `Displaying ${options?.count ?? 0} archived threads`;
      }

      if (key === 'displaying_x_archived_threads_from_past_x_days') {
        return `Displaying ${options?.count ?? 0} archived threads from the past ${options?.days ?? 0} days`;
      }

      return key;
    },
  }),
}));

vi.mock('@bitsocial/bitsocial-react-hooks', () => ({
  useFeed: (options: { filter?: { filter?: (comment: TestComment) => boolean } }) => ({
    feed: options.filter?.filter ? testState.feed.filter((comment) => options.filter?.filter?.(comment)) : testState.feed,
    hasMore: testState.hasMore,
    loadMore: testState.loadMoreMock,
    reset: vi.fn(),
  }),
  useCommunity: () => testState.community,
}));

vi.mock('../../../hooks/use-directories', () => ({
  useDirectories: () => testState.directories,
  findDirectoryByAddress: (directories: Array<{ address: string; title?: string; directoryCode?: string }>, address: string | undefined) =>
    directories.find((entry) => entry.address === address || entry.directoryCode === address || entry.title === address),
}));

vi.mock('../../../hooks/use-resolved-community-address', () => ({
  useResolvedCommunityAddress: () => testState.resolvedCommunityAddress,
}));

vi.mock('../../../hooks/use-state-string', () => ({
  useFeedStateString: () => 'loading_feed',
}));

vi.mock('../../../hooks/use-stable-community', () => ({
  useCommunityField: (_address: string | undefined, selector: (value: typeof testState.community) => unknown) => selector(testState.community),
}));

vi.mock('../../../hooks/use-is-mobile', () => ({
  default: () => testState.isMobile,
}));

vi.mock('../../../components/board-buttons/board-buttons', () => ({
  BracketedCatalogButton: () => createElement('span', null, '[', createElement('button', { type: 'button' }, 'catalog'), ']'),
  BottomButton: () => createElement('button', { type: 'button' }, 'bottom'),
  CatalogButton: () => createElement('button', { type: 'button' }, 'catalog'),
  ReturnButton: () => createElement('button', { type: 'button' }, 'return'),
  TopButton: () => createElement('button', { type: 'button' }, 'top'),
}));

vi.mock('../../../components/footer', () => ({
  PageFooterDesktop: ({ firstRow, styleRow }: { firstRow: React.ReactNode; styleRow: React.ReactNode }) =>
    createElement('div', { 'data-testid': 'footer-desktop' }, firstRow, styleRow),
  PageFooterMobile: ({ children }: { children: React.ReactNode }) => createElement('div', { 'data-testid': 'footer-mobile' }, children),
  ThreadFooterStyleRow: () =>
    createElement(
      'div',
      { 'data-testid': 'thread-footer-style-row' },
      createElement('span', {}, 'style'),
      createElement('span', { 'data-testid': 'style-selector' }, 'style-selector'),
    ),
}));

vi.mock('../../../components/style-selector/style-selector', () => ({
  default: () => createElement('span', { 'data-testid': 'style-selector' }),
}));

vi.mock('../../../components/error-display/error-display', () => ({
  default: ({ error }: { error?: Error }) => createElement('div', { 'data-testid': 'error-display' }, error?.message || 'no-error'),
}));

vi.mock('../../../components/loading-ellipsis', () => ({
  default: ({ string }: { string: string }) => createElement('div', { 'data-testid': 'loading-ellipsis' }, string),
}));

vi.mock('../../../lib/snow', () => ({
  shouldShowSnow: () => false,
}));

let container: HTMLDivElement;
let root: Root;

const act = (React as { act?: (callback: () => void | Promise<void>) => void | Promise<void> }).act as (callback: () => void | Promise<void>) => void | Promise<void>;

describe('Archive', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
    testState.feed = [];
    testState.hasMore = false;
    testState.isMobile = false;
    testState.community = {
      error: undefined,
      title: '/mu/ - Music',
    };
    testState.loadMoreMock = vi.fn();

    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
  });

  it('filters the feed by truthy archived state and shows archive links', async () => {
    testState.feed = [
      { cid: 'a', archived: true, threadCid: '111', title: 'Archived one', content: 'first excerpt' },
      { cid: 'b', archived: false, threadCid: '222', title: 'Not archived', content: 'not shown' },
      { cid: 'c', commentModeration: { archived: true }, threadCid: '333', title: 'Second archived' },
    ];

    await renderArchiveRoute({ root, element: createElement(Archive), initialEntry: '/mu/archive', routePath: '/:boardIdentifier/archive' });

    const rows = container.querySelectorAll('#arc-list tbody tr');
    expect(rows.length).toBe(2);
    expect(rows[0]!.textContent).toContain('111');
    expect(rows[1]!.textContent).toContain('333');
    expect(rows[0]!.textContent).not.toContain('222');
  });

  it('shows the archived summary window using the oldest archived timestamp', async () => {
    vi.spyOn(Date, 'now').mockReturnValue(new Date('2026-03-13T00:00:00Z').getTime());
    testState.feed = [
      { cid: 'a', archived: true, threadCid: '111', title: 'Archived one', timestamp: Math.floor(new Date('2026-03-12T12:00:00Z').getTime() / 1000) },
      { cid: 'b', archived: true, threadCid: '222', title: 'Archived two', timestamp: Math.floor(new Date('2026-03-10T00:00:00Z').getTime() / 1000) },
    ];

    await renderArchiveRoute({ root, element: createElement(Archive), initialEntry: '/mu/archive', routePath: '/:boardIdentifier/archive' });

    expect(container.textContent).toContain('Displaying 2 archived threads from the past 3 days');
  });

  it('renders desktop controls and footer style selector', async () => {
    testState.feed = [{ cid: 'a', archived: true, threadCid: '111', title: 'Archived one', content: 'excerpt' }];
    await renderArchiveRoute({ root, element: createElement(Archive), initialEntry: '/mu/archive', routePath: '/:boardIdentifier/archive' });

    expect(container.querySelector('[data-testid="footer-desktop"]')).toBeTruthy();
    expect(container.textContent).toContain('return');
    expect(container.textContent).toContain('catalog');
    expect(container.textContent).toContain('bottom');
    expect(container.textContent).toContain('top');
    expect(container.textContent).toContain('style');
    expect(container.querySelector('[data-testid="style-selector"]')).toBeTruthy();
    expect(container.querySelector('tbody tr td')?.textContent).toContain('111');
    expect(container.querySelector('thead tr td:last-child')?.textContent).toBe('');
  });

  it('shows load more action and forwards user interaction', async () => {
    testState.feed = [
      { cid: 'a', archived: true, threadCid: '111', title: 'Archived one' },
      { cid: 'b', archived: true, threadCid: '222', title: 'Archived two' },
    ];
    testState.hasMore = true;

    await renderArchiveRoute({ root, element: createElement(Archive), initialEntry: '/mu/archive', routePath: '/:boardIdentifier/archive' });

    const loadMoreButton = Array.from(container.querySelectorAll('button')).find((button) => button.textContent === 'load_more');
    expect(loadMoreButton).toBeTruthy();

    act(() => {
      loadMoreButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    expect(testState.loadMoreMock).toHaveBeenCalledTimes(1);
  });

  it('uses the shared loading ellipsis for the empty archive loading state', async () => {
    testState.hasMore = true;

    await renderArchiveRoute({ root, element: createElement(Archive), initialEntry: '/mu/archive', routePath: '/:boardIdentifier/archive' });

    expect(container.querySelector('[data-testid="loading-ellipsis"]')?.textContent).toBe('loading_archive');
  });

  it('renders the shared archive table and mobile nav actions when mobile hook is set', async () => {
    testState.isMobile = true;
    testState.feed = [
      { cid: 'a', archived: true, threadCid: '111', title: 'Archived one', content: 'mobile excerpt' },
      { cid: 'b', archived: true, threadCid: '222', title: 'Archived two', content: 'other excerpt' },
    ];

    await renderArchiveRoute({ root, element: createElement(Archive), initialEntry: '/mu/archive', routePath: '/:boardIdentifier/archive' });

    expect(container.querySelectorAll('#arc-list tbody tr').length).toBe(2);
    expect(container.querySelector('[data-testid="footer-mobile"]')).toBeTruthy();
    expect(container.textContent).toContain('return');
    expect(container.textContent).toContain('catalog');
    expect(container.textContent).toContain('bottom');
    expect(container.textContent).toContain('top');
  });
});
