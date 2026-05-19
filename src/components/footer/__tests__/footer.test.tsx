import * as React from 'react';
import { createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  CatalogFooterFirstRow,
  CatalogFooterStyleRow,
  PageFooterDesktop,
  PageFooterMobile,
  StyleOnlyFooterFirstRow,
  ThreadFooterFirstRow,
  ThreadFooterMobile,
  ThreadFooterStyleRow,
} from '../footer';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
const act = (React as { act?: (cb: () => void | Promise<void>) => void | Promise<void> }).act as (cb: () => void | Promise<void>) => void | Promise<void>;

const testState = vi.hoisted(() => ({
  directoryEntry: { features: {} } as { features?: Record<string, unknown> } | undefined,
  linkCount: 2,
  openReplyModalEmptyMock: vi.fn(),
  pageNumber: 4 as number | undefined,
  post: { replyCount: 7 } as { replyCount?: number } | undefined,
  useCommentCalls: [] as Array<{ commentCid?: string; community?: { name?: string; publicKey?: string } }>,
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock('@bitsocial/bitsocial-react-hooks', () => ({
  useComment: ({ commentCid, community }: { commentCid?: string; community?: { name?: string; publicKey?: string } }) => {
    testState.useCommentCalls.push({ commentCid, community });
    return testState.post;
  },
}));

vi.mock('../../boards-bar', () => ({
  default: () => createElement('div', { 'data-testid': 'boards-bar' }, 'boards-bar'),
}));

vi.mock('../../site-legal-meta', () => ({
  default: ({ order }: { order?: string }) => createElement('div', { 'data-order': order, 'data-testid': 'site-legal-meta' }, `site-legal-meta:${order}`),
}));

vi.mock('../../style-selector/style-selector', () => ({
  default: () => createElement('div', { 'data-testid': 'style-selector' }, 'style-selector'),
}));

vi.mock('../../board-buttons/board-buttons', () => ({
  CatalogSearchResultsLabel: () => null,
  AutoButton: () => createElement('button', { type: 'button' }, 'auto-button'),
  CatalogButton: ({
    address,
    isInAllView,
    isInModView,
    isInSubscriptionsView,
  }: {
    address?: string;
    isInAllView?: boolean;
    isInModView?: boolean;
    isInSubscriptionsView?: boolean;
  }) => createElement('button', { 'data-testid': 'catalog-button', type: 'button' }, `${address}|${isInAllView}|${isInSubscriptionsView}|${isInModView}`),
  PostPageStats: () => createElement('div', { 'data-testid': 'post-page-stats' }, 'post-page-stats'),
  RefreshButton: () => createElement('button', { type: 'button' }, 'refresh-button'),
  ReturnButton: ({
    address,
    isInAllView,
    isInModView,
    isInSubscriptionsView,
  }: {
    address?: string;
    isInAllView?: boolean;
    isInModView?: boolean;
    isInSubscriptionsView?: boolean;
  }) => createElement('button', { 'data-testid': 'return-button', type: 'button' }, `${address}|${isInAllView}|${isInSubscriptionsView}|${isInModView}`),
  TopButton: () => createElement('button', { type: 'button' }, 'top-button'),
  UpdateButton: () => createElement('button', { type: 'button' }, 'update-button'),
}));

vi.mock('../../../stores/use-reply-modal-store', () => ({
  default: () => ({
    openReplyModalEmpty: testState.openReplyModalEmptyMock,
  }),
}));

vi.mock('../../../hooks/use-count-links-in-replies', () => ({
  default: () => testState.linkCount,
}));

vi.mock('../../../hooks/use-post-page-number', () => ({
  usePostPageNumber: () => testState.pageNumber,
}));

vi.mock('../../../hooks/use-directories', () => ({
  useDirectoryByAddress: () => testState.directoryEntry,
}));

vi.mock('../../../hooks/use-community-identifiers', () => ({
  useCommunityIdentifier: (address?: string) => (address ? { name: address, publicKey: `${address}-public-key` } : undefined),
}));

let container: HTMLDivElement;
let root: Root;

const renderWithRouter = async (element: React.ReactNode, initialEntry = '/mu/thread/post-1') => {
  await act(async () => {
    root.render(createElement(MemoryRouter, { initialEntries: [initialEntry] }, element));
  });
};

describe('footer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    testState.directoryEntry = { features: {} };
    testState.linkCount = 2;
    testState.openReplyModalEmptyMock.mockReset();
    testState.pageNumber = 4;
    testState.post = { replyCount: 7 };
    testState.useCommentCalls = [];
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  it('renders the desktop footer shell with optional style row, boards bar, and legal metadata', async () => {
    await renderWithRouter(
      createElement(PageFooterDesktop, {
        firstRow: createElement('div', { 'data-testid': 'first-row' }, 'first-row'),
        styleRow: createElement('div', { 'data-testid': 'style-row' }, 'style-row'),
      }),
    );

    expect(container.querySelector('[data-testid="first-row"]')?.textContent).toBe('first-row');
    expect(container.querySelector('[data-testid="style-row"]')?.textContent).toBe('style-row');
    expect(container.querySelector('[data-testid="boards-bar"]')?.textContent).toBe('boards-bar');
    expect(container.querySelector('[data-testid="site-legal-meta"]')?.getAttribute('data-order')).toBe('license-first');
  });

  it('renders style-only, catalog, and mobile footer wrappers with shared controls', async () => {
    await renderWithRouter(
      createElement(
        React.Fragment,
        {},
        createElement(StyleOnlyFooterFirstRow),
        createElement(CatalogFooterFirstRow, {
          isInAllView: true,
          communityAddress: 'music-posting.eth',
        }),
        createElement(CatalogFooterStyleRow),
        createElement(ThreadFooterStyleRow),
        createElement(PageFooterMobile, {
          children: createElement('div', { 'data-testid': 'mobile-child' }, 'mobile-child'),
        }),
      ),
      '/all/catalog',
    );

    expect(container.textContent).toContain('style:');
    expect(container.querySelectorAll('[data-testid="style-selector"]')).toHaveLength(3);
    expect(container.querySelector('[data-testid="return-button"]')?.textContent).toBe('music-posting.eth|true|false|false');
    expect(container.querySelector('[data-testid="catalog-button"]')?.textContent).toBe('music-posting.eth|true|false|false');
    expect(container.textContent).toContain('refresh-button');
    expect(container.querySelector('[data-testid="mobile-child"]')?.textContent).toBe('mobile-child');
  });

  it('opens the reply modal from the desktop thread footer unless the thread is closed', async () => {
    await renderWithRouter(
      createElement(ThreadFooterFirstRow, {
        postCid: 'post-cid',
        communityAddress: 'music-posting.eth',
        threadNumber: 42,
      }),
      '/all/thread/post-cid',
    );

    const button = Array.from(container.querySelectorAll('button')).find((candidate) => candidate.getAttribute('aria-label') === 'post_a_reply');
    await act(async () => {
      button?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(testState.openReplyModalEmptyMock).toHaveBeenCalledWith('post-cid', 42, 'music-posting.eth');
    expect(container.querySelector('[data-testid="post-page-stats"]')?.textContent).toBe('post-page-stats');

    testState.openReplyModalEmptyMock.mockReset();
    await renderWithRouter(
      createElement(ThreadFooterFirstRow, {
        isThreadClosed: true,
        postCid: 'post-cid',
        communityAddress: 'music-posting.eth',
        threadNumber: 42,
      }),
      '/all/thread/post-cid',
    );

    const closedButton = Array.from(container.querySelectorAll('button')).find((candidate) => candidate.getAttribute('aria-label') === 'post_a_reply');
    expect(closedButton?.hasAttribute('disabled')).toBe(true);
    await act(async () => {
      closedButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    expect(testState.openReplyModalEmptyMock).not.toHaveBeenCalled();
  });

  it('renders mobile thread stats using directory media requirements and opens replies when available', async () => {
    testState.directoryEntry = { features: { requirePostLinkIsMedia: true } };

    await renderWithRouter(
      createElement(ThreadFooterMobile, {
        postCid: 'post-cid',
        communityAddress: 'music-posting.eth',
        threadNumber: 55,
      }),
    );

    expect(container.textContent).toContain('Replies: 7 / Images: 2 / pagination.pageLabel: 4');
    expect(testState.useCommentCalls).toEqual([
      {
        commentCid: 'post-cid',
        community: {
          name: 'music-posting.eth',
          publicKey: 'music-posting.eth-public-key',
        },
      },
    ]);

    const button = Array.from(container.querySelectorAll('button')).find((candidate) => candidate.textContent === 'post_a_reply');
    await act(async () => {
      button?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(testState.openReplyModalEmptyMock).toHaveBeenCalledWith('post-cid', 55, 'music-posting.eth');
  });

  it('falls back to link stats and unknown counts when thread data is unavailable or closed on mobile', async () => {
    testState.directoryEntry = { features: {} };
    testState.linkCount = undefined as unknown as number;
    testState.pageNumber = undefined;
    testState.post = undefined;

    await renderWithRouter(
      createElement(ThreadFooterMobile, {
        isThreadClosed: true,
        postCid: 'post-cid',
        communityAddress: 'music-posting.eth',
        threadNumber: 55,
      }),
    );

    expect(container.textContent).toContain('Replies: ? / Links: ? / pagination.pageLabel: ?');

    const button = Array.from(container.querySelectorAll('button')).find((candidate) => candidate.textContent === 'post_a_reply');
    expect(button?.hasAttribute('disabled')).toBe(true);
    await act(async () => {
      button?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    expect(testState.openReplyModalEmptyMock).not.toHaveBeenCalled();
  });
});
