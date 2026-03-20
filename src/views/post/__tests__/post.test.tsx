import * as React from 'react';
import { createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import PostPage, { Post } from '../post';
import useThreadLiveUpdatesStore from '../../../stores/use-thread-live-updates-store';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
const act = (React as { act?: (cb: () => void | Promise<void>) => void | Promise<void> }).act as (cb: () => void | Promise<void>) => void | Promise<void>;

type TestComment = {
  cid?: string;
  content?: string;
  error?: Error;
  commentModeration?: {
    archived?: boolean;
  };
  locked?: boolean;
  number?: number;
  parentCid?: string;
  pinned?: boolean;
  postCid?: string;
  replyCount?: number;
  replies?: unknown[];
  state?: string;
  communityAddress?: string;
  subplebbitAddress?: string;
  timestamp?: number;
  title?: string;
};

const testState = vi.hoisted(() => ({
  cachedComments: {} as Record<string, TestComment>,
  communityFieldAddress: undefined as string | undefined,
  commentsByCid: {} as Record<string, TestComment>,
  directories: [{ address: 'music-posting.eth', title: '/mu/ - Music' }] as Array<{ address: string; title?: string }>,
  editedCommentsByCid: {} as Record<string, TestComment | undefined>,
  isMobile: false,
  navigateMock: vi.fn(),
  resolvedCommunityAddress: 'music-posting.eth' as string | undefined,
  community: {
    error: undefined as Error | undefined,
    shortAddress: 'music-posting.eth',
    title: '/mu/ - Music',
  },
  communitySnapshot: {
    roles: {
      '0xmod': { role: 'admin' },
    },
  } as { roles?: Record<string, unknown> },
  useCommentCalls: [] as Array<{ commentCid?: string; autoUpdate?: boolean }>,
}));

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

vi.mock('@bitsocialnet/bitsocial-react-hooks', () => ({
  useComment: ({ commentCid, autoUpdate }: { commentCid?: string; autoUpdate?: boolean }) => {
    testState.useCommentCalls.push({ commentCid, autoUpdate });
    return commentCid ? testState.commentsByCid[commentCid] : undefined;
  },
  useEditedComment: ({ comment }: { comment?: TestComment }) => ({
    editedComment: comment?.cid ? testState.editedCommentsByCid[comment.cid] : undefined,
  }),
  useCommunity: () => testState.community,
}));

vi.mock('@bitsocialnet/bitsocial-react-hooks/dist/stores/communities-pages', () => ({
  default: (selector: (state: { comments: typeof testState.cachedComments }) => unknown) =>
    selector({
      comments: testState.cachedComments,
    }),
}));

vi.mock('../../../hooks/use-stable-community', () => ({
  useCommunityField: (address: string | undefined, selector: (community: typeof testState.communitySnapshot) => unknown) => {
    testState.communityFieldAddress = address;
    return selector(testState.communitySnapshot);
  },
}));

vi.mock('../../../hooks/use-resolved-community-address', () => ({
  useResolvedCommunityAddress: () => testState.resolvedCommunityAddress,
}));

vi.mock('../../../hooks/use-directories', async () => {
  const actual = await vi.importActual<typeof import('../../../hooks/use-directories')>('../../../hooks/use-directories');
  return {
    ...actual,
    useDirectories: () => testState.directories,
  };
});

vi.mock('../../../hooks/use-is-mobile', () => ({
  default: () => testState.isMobile,
}));

vi.mock('../../../components/error-display/error-display', () => ({
  default: ({ error }: { error?: Error }) => createElement('div', { 'data-testid': 'error-display' }, error?.message || 'no-error'),
}));

vi.mock('../../../components/footer', () => ({
  PageFooterDesktop: ({ firstRow, styleRow }: { firstRow: React.ReactNode; styleRow: React.ReactNode }) =>
    createElement('div', { 'data-testid': 'page-footer-desktop' }, firstRow, styleRow),
  ThreadFooterFirstRow: ({
    isThreadClosed,
    postCid,
    communityAddress,
    threadNumber,
  }: {
    isThreadClosed: boolean;
    postCid: string;
    communityAddress: string;
    threadNumber?: number;
  }) => createElement('div', { 'data-testid': 'thread-footer-first-row' }, `${postCid}:${threadNumber}:${communityAddress}:${String(isThreadClosed)}`),
  ThreadFooterMobile: ({
    isThreadClosed,
    postCid,
    communityAddress,
    threadNumber,
  }: {
    isThreadClosed: boolean;
    postCid: string;
    communityAddress: string;
    threadNumber?: number;
  }) => createElement('div', { 'data-testid': 'thread-footer-mobile' }, `${postCid}:${threadNumber}:${communityAddress}:${String(isThreadClosed)}`),
  ThreadFooterStyleRow: () => createElement('div', { 'data-testid': 'thread-footer-style-row' }, 'thread-footer-style-row'),
}));

vi.mock('../../../components/post-desktop', () => ({
  default: ({ post, roles, targetReplyCid }: { post?: TestComment; roles?: Record<string, unknown>; targetReplyCid?: string }) =>
    createElement(
      'div',
      { 'data-testid': 'post-desktop' },
      createElement('div', { 'data-thread-container-cid': post?.cid }),
      createElement('div', { 'data-post-info-cid': post?.cid }),
      `${post?.cid || 'missing'}:${targetReplyCid || 'none'}:${Object.keys(roles || {}).length}`,
    ),
}));

vi.mock('../../../components/post-mobile', () => ({
  default: ({ post, roles, targetReplyCid }: { post?: TestComment; roles?: Record<string, unknown>; targetReplyCid?: string }) =>
    createElement(
      'div',
      { 'data-testid': 'post-mobile' },
      createElement('div', { 'data-thread-container-cid': post?.cid }),
      createElement('div', { 'data-post-info-cid': post?.cid }),
      `${post?.cid || 'missing'}:${targetReplyCid || 'none'}:${Object.keys(roles || {}).length}`,
    ),
}));

let container: HTMLDivElement;
let root: Root;

const flushEffects = async (count = 5) => {
  for (let i = 0; i < count; i += 1) {
    await act(async () => {
      await Promise.resolve();
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
  }
};

const renderPostPage = async (initialEntry: string | { pathname: string; state?: unknown }) => {
  await act(async () => {
    root.render(
      createElement(
        MemoryRouter,
        { initialEntries: [initialEntry as any] },
        createElement(
          Routes,
          {},
          createElement(Route, { path: '/all/thread/:commentCid', element: createElement(PostPage) }),
          createElement(Route, { path: '/:boardIdentifier/thread/:commentCid', element: createElement(PostPage) }),
        ),
      ),
    );
  });
  await flushEffects();
};

describe('Post', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    testState.cachedComments = {};
    testState.communityFieldAddress = undefined;
    testState.commentsByCid = {};
    testState.directories = [{ address: 'music-posting.eth', title: '/mu/ - Music' }];
    testState.editedCommentsByCid = {};
    testState.isMobile = false;
    testState.resolvedCommunityAddress = 'music-posting.eth';
    testState.useCommentCalls = [];
    useThreadLiveUpdatesStore.getState().resetState();
    testState.community = {
      error: undefined,
      shortAddress: 'music-posting.eth',
      title: '/mu/ - Music',
    };
    testState.communitySnapshot = {
      roles: {
        '0xmod': { role: 'admin' },
      },
    };
    Object.defineProperty(window, 'scrollTo', {
      configurable: true,
      value: vi.fn(),
      writable: true,
    });
    Object.defineProperty(window, 'scrollY', {
      configurable: true,
      value: 0,
      writable: true,
    });
    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
      configurable: true,
      value: vi.fn(),
      writable: true,
    });
    Object.defineProperty(HTMLElement.prototype, 'getBoundingClientRect', {
      configurable: true,
      value: function () {
        if ((this as HTMLElement).dataset.threadContainerCid) {
          return {
            bottom: 220,
            height: 100,
            left: 0,
            right: 100,
            top: 120,
            width: 100,
          } as DOMRect;
        }

        return {
          bottom: 0,
          height: 0,
          left: 0,
          right: 0,
          top: 0,
          width: 0,
        } as DOMRect;
      },
      writable: true,
    });
    document.title = 'before';

    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  it('renders edited posts through the desktop and mobile presenters with stable role data', async () => {
    testState.editedCommentsByCid = {
      'post-1': { cid: 'edited-post', communityAddress: 'music-posting.eth' },
    };

    await act(async () => {
      root.render(createElement(Post, { post: { cid: 'post-1', communityAddress: 'music-posting.eth' } }));
    });
    expect(container.querySelector('[data-testid="post-desktop"]')?.textContent).toBe('edited-post:none:1');

    testState.isMobile = true;
    await act(async () => {
      root.render(createElement(Post, { post: { cid: 'post-2', communityAddress: 'music-posting.eth' } }));
    });
    expect(container.querySelector('[data-testid="post-mobile"]')?.textContent).toBe('post-2:none:1');
  });

  it('hydrates thread pages from cached feed data, sets the document title, and renders thread footers', async () => {
    testState.commentsByCid = {
      'cached-cid': {
        cid: 'cached-cid',
        state: 'updating',
        communityAddress: 'music-posting.eth',
      },
    };
    testState.cachedComments = {
      'cached-cid': {
        cid: 'cached-cid',
        content: 'cached body',
        number: 42,
        replyCount: 0,
        communityAddress: 'music-posting.eth',
        title: 'Cached thread',
      },
    };

    await renderPostPage('/mu/thread/cached-cid');

    expect(container.querySelector('[data-testid="post-desktop"]')?.textContent).toBe('cached-cid:none:1');
    expect(container.querySelector('[data-testid="thread-footer-first-row"]')?.textContent).toBe('cached-cid:42:music-posting.eth:false');
    expect(container.querySelector('[data-testid="thread-footer-mobile"]')?.textContent).toBe('cached-cid:42:music-posting.eth:false');
    expect(testState.communityFieldAddress).toBe('music-posting.eth');
    expect(document.title).toBe('/mu/ - Cached thread... - 5chan');
    expect(window.scrollTo).toHaveBeenCalledWith(0, 0);
    expect(HTMLElement.prototype.scrollIntoView).not.toHaveBeenCalled();
  });

  it('passes archived OP state through to thread footers as closed', async () => {
    testState.commentsByCid = {
      'archived-thread': {
        cid: 'archived-thread',
        content: 'thread',
        commentModeration: {
          archived: true,
        },
        number: 777,
        replyCount: 0,
        subplebbitAddress: 'music-posting.eth',
        title: 'Archived thread',
      },
    };

    await renderPostPage('/mu/thread/archived-thread');

    expect(container.querySelector('[data-testid="thread-footer-first-row"]')?.textContent).toBe('archived-thread:777:music-posting.eth:true');
    expect(container.querySelector('[data-testid="thread-footer-mobile"]')?.textContent).toBe('archived-thread:777:music-posting.eth:true');
  });

  it('only aligns the OP container when navigation explicitly requests it', async () => {
    testState.commentsByCid = {
      'thread-cid': {
        cid: 'thread-cid',
        number: 8,
        replyCount: 0,
        communityAddress: 'music-posting.eth',
        title: 'Thread title',
      },
    };

    await renderPostPage({
      pathname: '/mu/thread/thread-cid',
      state: {
        scrollThreadContainerCid: 'thread-cid',
      },
    });

    expect(window.scrollTo).toHaveBeenCalledWith({
      behavior: 'auto',
      left: 0,
      top: 120,
    });
    expect(window.scrollTo).not.toHaveBeenCalledWith(0, 0);
  });

  it('redirects thread routes whose fetched comment belongs to a different board', async () => {
    testState.commentsByCid = {
      'comment-1': {
        cid: 'comment-1',
        postCid: 'comment-1',
        communityAddress: 'other.eth',
        title: 'Other board thread',
      },
    };

    await renderPostPage('/mu/thread/comment-1');

    expect(testState.navigateMock).toHaveBeenCalledWith('/not-found', { replace: true });
  });

  it('hydrates multiboard thread pages from a legacy-only comment address', async () => {
    testState.resolvedCommunityAddress = undefined;
    testState.commentsByCid = {
      'legacy-cid': {
        cid: 'legacy-cid',
        state: 'updating',
        subplebbitAddress: 'music-posting.eth',
      },
    };
    testState.cachedComments = {
      'legacy-cid': {
        cid: 'legacy-cid',
        content: 'cached body',
        number: 7,
        replyCount: 0,
        subplebbitAddress: 'music-posting.eth',
        title: 'Legacy thread',
      },
    };

    await renderPostPage('/all/thread/legacy-cid');

    expect(container.querySelector('[data-testid="post-desktop"]')?.textContent).toBe('legacy-cid:none:1');
    expect(container.querySelector('[data-testid="thread-footer-first-row"]')?.textContent).toBe('legacy-cid:7:music-posting.eth:false');
    expect(testState.communityFieldAddress).toBe('music-posting.eth');
    expect(document.title).toBe('all - Legacy thread... - 5chan');
    expect(testState.navigateMock).not.toHaveBeenCalled();
  });

  it('renders reply pages using the root post, highlights the reply target, and shows thread errors', async () => {
    testState.commentsByCid = {
      'reply-cid': {
        cid: 'reply-cid',
        parentCid: 'root-cid',
        postCid: 'root-cid',
        communityAddress: 'music-posting.eth',
      },
      'root-cid': {
        cid: 'root-cid',
        error: new Error('thread failed'),
        locked: true,
        number: 99,
        replies: [],
        replyCount: 4,
        communityAddress: 'music-posting.eth',
        title: 'Root thread',
      },
    };

    await renderPostPage('/mu/thread/reply-cid');

    expect(container.querySelector('[data-testid="post-desktop"]')?.textContent).toBe('root-cid:reply-cid:1');
    expect(container.querySelector('[data-testid="thread-footer-first-row"]')?.textContent).toBe('root-cid:99:music-posting.eth:true');
    expect(container.textContent).toContain('thread failed');
  });

  it('shows missing-comment and board-load errors when no thread can be resolved', async () => {
    testState.commentsByCid = {
      'missing-cid': {
        error: new Error('missing comment'),
      },
    };
    testState.community = {
      error: new Error('board failed'),
      shortAddress: 'music-posting.eth',
      title: '/mu/ - Music',
    };

    await renderPostPage('/mu/thread/missing-cid');

    expect(Array.from(container.querySelectorAll('[data-testid="error-display"]')).map((node) => node.textContent)).toEqual(['board failed', 'missing comment']);
    expect(container.querySelector('[data-testid="thread-footer-first-row"]')).toBeNull();
  });

  it('uses frozen useComment subscriptions when thread auto updates are disabled', async () => {
    testState.commentsByCid = {
      'reply-cid': {
        cid: 'reply-cid',
        communityAddress: 'music-posting.eth',
        parentCid: 'root-cid',
        postCid: 'root-cid',
        replyCount: 0,
        timestamp: 2,
      },
      'root-cid': {
        cid: 'root-cid',
        communityAddress: 'music-posting.eth',
        postCid: 'root-cid',
        replyCount: 4,
        timestamp: 1,
      },
    };
    useThreadLiveUpdatesStore.getState().setEnabled(false);

    await renderPostPage('/mu/thread/reply-cid');

    expect(testState.useCommentCalls).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ commentCid: 'reply-cid', autoUpdate: false }),
        expect.objectContaining({ commentCid: 'root-cid', autoUpdate: false }),
      ]),
    );
  });
});
