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
  approved?: boolean;
  accountId?: string;
  author?: {
    address?: string;
    shortAddress?: string;
    community?: unknown;
  };
  cid?: string;
  content?: string;
  error?: Error;
  commentModeration?: {
    archived?: boolean;
    flairs?: Array<{ text?: string }>;
    purged?: boolean;
  };
  locked?: boolean;
  number?: number;
  pendingApproval?: boolean;
  parentCid?: string;
  pinned?: boolean;
  postCid?: string;
  postNumber?: number;
  reason?: string;
  replyCount?: number;
  replies?: unknown[];
  refresh?: () => Promise<void>;
  state?: string;
  communityAddress?: string;
  timestamp?: number;
  title?: string;
};

const testState = vi.hoisted(() => ({
  accountCommentsByCid: {} as Record<string, TestComment | undefined>,
  cachedComments: {} as Record<string, TestComment>,
  cidCommunityAddress: undefined as string | undefined,
  communityFieldAddress: undefined as string | undefined,
  commentsByCid: {} as Record<string, TestComment>,
  directories: [{ address: 'music-posting.eth', name: 'music-posting.eth', publicKey: 'music-public-key', title: '/mu/ - Music' }] as Array<{
    address: string;
    name?: string;
    publicKey?: string;
    title?: string;
  }>,
  editedCommentsByCid: {} as Record<string, TestComment | undefined>,
  isMobile: false,
  navigateMock: vi.fn(),
  repliesByCommentCid: {} as Record<string, TestComment[]>,
  resolvedCommunityAddress: 'music-posting.eth' as string | undefined,
  resolvedDirectoryBoardPath: undefined as string | undefined,
  isDirectoryCandidate: false,
  community: {
    error: undefined as Error | undefined,
    shortAddress: 'music-posting.eth',
    title: '/mu/ - Music',
  },
  communitySnapshot: {
    roles: {
      '0xmod': { role: 'admin' },
    },
  } as { roles?: Record<string, unknown> } | undefined,
  useCommentCalls: [] as Array<{ commentCid?: string; autoUpdate?: boolean; community?: { name?: string; publicKey?: string } }>,
  evictThreadRefreshCachesMock: vi.fn(),
}));

const activeAccount = {
  author: { address: 'account-author' },
  id: 'active-account',
};

const enrichAccountCommentAuthor = (comment: TestComment | undefined): TestComment | undefined => {
  if (!comment || comment.author?.address || comment.accountId !== activeAccount.id) {
    return comment;
  }

  return {
    ...comment,
    author: {
      ...activeAccount.author,
      ...comment.author,
      address: activeAccount.author.address,
    },
  };
};

function hasTransferredMarker(post?: TestComment): boolean {
  return post?.commentModeration?.flairs?.some((flair) => flair.text === '5chan:transferred') ?? false;
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
  useAccount: () => activeAccount,
  useAccountComment: ({ commentCid }: { commentCid?: string }) => (commentCid ? enrichAccountCommentAuthor(testState.accountCommentsByCid[commentCid]) : undefined),
  useComment: ({ commentCid, autoUpdate, community }: { commentCid?: string; autoUpdate?: boolean; community?: { name?: string; publicKey?: string } }) => {
    testState.useCommentCalls.push({ commentCid, autoUpdate, community });
    return commentCid ? testState.commentsByCid[commentCid] : undefined;
  },
  useEditedComment: ({ comment }: { comment?: TestComment }) => ({
    editedComment: comment?.cid ? testState.editedCommentsByCid[comment.cid] : undefined,
  }),
  useReplies: ({ comment }: { comment?: TestComment }) => {
    const replies = comment?.cid ? testState.repliesByCommentCid[comment.cid] || [] : [];
    return {
      hasMore: false,
      loadMore: vi.fn(),
      replies,
      reset: vi.fn(),
      updatedReplies: replies,
    };
  },
  useCommunity: () => testState.community,
}));

vi.mock('@bitsocial/bitsocial-react-hooks/dist/stores/communities-pages', () => ({
  default: (selector: (state: { comments: typeof testState.cachedComments }) => unknown) =>
    selector({
      comments: testState.cachedComments,
    }),
}));

vi.mock('../../../hooks/use-stable-community', () => ({
  useCommunityField: (address: string | undefined, selector: (community: typeof testState.communitySnapshot) => unknown) => {
    testState.communityFieldAddress = address;
    return testState.communitySnapshot ? selector(testState.communitySnapshot) : undefined;
  },
}));

vi.mock('../../../hooks/use-comment-cid-payload', () => ({
  useCommentCidPayload: () => ({ communityAddress: testState.cidCommunityAddress, state: testState.cidCommunityAddress ? 'succeeded' : 'idle' }),
}));

vi.mock('../../../hooks/use-resolved-community-address', () => ({
  useResolvedCommunityAddress: () => testState.resolvedCommunityAddress,
  useResolvedDirectoryBoardPath: () => ({
    boardPath: testState.resolvedDirectoryBoardPath,
    isDirectoryCandidate: testState.isDirectoryCandidate,
  }),
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

vi.mock('../../../components/footer/footer', () => ({
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

vi.mock('../../../components/post-desktop/post-desktop', () => ({
  default: ({
    post,
    roles,
    targetReplyCid,
    replyPaginationOverride,
    onTransfer,
  }: {
    post?: TestComment;
    roles?: Record<string, unknown>;
    targetReplyCid?: string;
    replyPaginationOverride?: { replies?: TestComment[] };
    onTransfer?: () => void;
  }) =>
    createElement(
      'div',
      {
        'data-testid': 'post-desktop',
        'data-approved': post?.approved === undefined ? '' : String(post.approved),
        'data-author-address': post?.author?.address || '',
        'data-author-short-address': post?.author?.shortAddress || '',
        'data-number': post?.number === undefined ? '' : String(post.number),
        'data-pending-approval': post?.pendingApproval === undefined ? '' : String(post.pendingApproval),
        'data-reply-count': post?.replyCount === undefined ? '' : String(post.replyCount),
        'data-replies': replyPaginationOverride?.replies?.map((reply) => reply.cid).join(',') || '',
        'data-roles-present': String(roles !== undefined),
        'data-transfer-enabled': String(typeof onTransfer === 'function'),
        'data-transferred': String(hasTransferredMarker(post)),
      },
      createElement('div', { 'data-thread-container-cid': post?.cid }),
      createElement('div', { 'data-post-info-cid': post?.cid }),
      `${post?.cid || 'missing'}:${targetReplyCid || 'none'}:${Object.keys(roles || {}).length}`,
    ),
}));

vi.mock('../../../components/post-mobile/post-mobile', () => ({
  default: ({
    post,
    roles,
    targetReplyCid,
    replyPaginationOverride,
    onTransfer,
  }: {
    post?: TestComment;
    roles?: Record<string, unknown>;
    targetReplyCid?: string;
    replyPaginationOverride?: { replies?: TestComment[] };
    onTransfer?: () => void;
  }) =>
    createElement(
      'div',
      {
        'data-testid': 'post-mobile',
        'data-approved': post?.approved === undefined ? '' : String(post.approved),
        'data-author-address': post?.author?.address || '',
        'data-author-short-address': post?.author?.shortAddress || '',
        'data-number': post?.number === undefined ? '' : String(post.number),
        'data-pending-approval': post?.pendingApproval === undefined ? '' : String(post.pendingApproval),
        'data-reply-count': post?.replyCount === undefined ? '' : String(post.replyCount),
        'data-replies': replyPaginationOverride?.replies?.map((reply) => reply.cid).join(',') || '',
        'data-roles-present': String(roles !== undefined),
        'data-transfer-enabled': String(typeof onTransfer === 'function'),
        'data-transferred': String(hasTransferredMarker(post)),
      },
      createElement('div', { 'data-thread-container-cid': post?.cid }),
      createElement('div', { 'data-post-info-cid': post?.cid }),
      `${post?.cid || 'missing'}:${targetReplyCid || 'none'}:${Object.keys(roles || {}).length}`,
    ),
}));

vi.mock('../../../lib/utils/thread-refresh-cache-utils', () => ({
  evictThreadRefreshCaches: testState.evictThreadRefreshCachesMock,
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
    testState.accountCommentsByCid = {};
    testState.cachedComments = {};
    testState.cidCommunityAddress = undefined;
    testState.communityFieldAddress = undefined;
    testState.commentsByCid = {};
    testState.directories = [{ address: 'music-posting.eth', name: 'music-posting.eth', publicKey: 'music-public-key', title: '/mu/ - Music' }];
    testState.editedCommentsByCid = {};
    testState.isMobile = false;
    testState.resolvedCommunityAddress = 'music-posting.eth';
    testState.resolvedDirectoryBoardPath = undefined;
    testState.isDirectoryCandidate = false;
    testState.repliesByCommentCid = {};
    testState.useCommentCalls = [];
    testState.evictThreadRefreshCachesMock.mockReset();
    testState.evictThreadRefreshCachesMock.mockResolvedValue(undefined);
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
    window.history.replaceState(null, '', '/');

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

  it('restores the published user ID when an edited comment overlays local author identity', async () => {
    testState.editedCommentsByCid = {
      'post-edited-id': {
        cid: 'post-edited-id',
        communityAddress: 'music-posting.eth',
        content: 'edited body',
        author: { address: 'account-author.bso', shortAddress: 'account-author' },
      },
    };

    await act(async () => {
      root.render(
        createElement(Post, {
          post: {
            cid: 'post-edited-id',
            communityAddress: 'music-posting.eth',
            content: 'body',
            author: { address: 'published-address', shortAddress: 'PostKid9' },
          },
        }),
      );
    });

    const presenter = container.querySelector('[data-testid="post-desktop"]');
    expect(presenter?.getAttribute('data-author-address')).toBe('account-author.bso');
    expect(presenter?.getAttribute('data-author-short-address')).toBe('PostKid9');
  });

  it('keeps renderable post data when edited comments only resolve to a loading shell', async () => {
    testState.editedCommentsByCid = {
      'post-shell': {
        cid: 'post-shell',
        state: 'updating',
      },
    };

    await act(async () => {
      root.render(createElement(Post, { post: { cid: 'post-shell', communityAddress: 'music-posting.eth', content: 'body' } }));
    });

    expect(container.querySelector('[data-testid="post-desktop"]')?.textContent).toBe('post-shell:none:1');
    expect(testState.communityFieldAddress).toBe('music-posting.eth');
  });

  it('passes an empty role map after a community with no roles is loaded', async () => {
    testState.communitySnapshot = {};

    await act(async () => {
      root.render(createElement(Post, { post: { cid: 'post-no-roles', communityAddress: 'music-posting.eth', content: '[b]raw[/b]' } }));
    });

    const postDesktop = container.querySelector('[data-testid="post-desktop"]');
    expect(postDesktop?.getAttribute('data-roles-present')).toBe('true');
    expect(postDesktop?.textContent).toBe('post-no-roles:none:0');
  });

  it('keeps roles pending for matching board routes until the community loads', async () => {
    testState.communitySnapshot = undefined;
    testState.resolvedCommunityAddress = 'music-posting.eth';

    await act(async () => {
      root.render(createElement(Post, { post: { cid: 'post-pending-roles', communityAddress: 'music-posting.eth', content: '[color=red]raw[/color]' } }));
    });

    const postDesktop = container.querySelector('[data-testid="post-desktop"]');
    expect(postDesktop?.getAttribute('data-roles-present')).toBe('false');
    expect(postDesktop?.textContent).toBe('post-pending-roles:none:0');
  });

  it('uses an empty role map for posts outside a resolved board route when the community is unavailable', async () => {
    testState.communitySnapshot = undefined;
    testState.resolvedCommunityAddress = undefined;

    await act(async () => {
      root.render(createElement(Post, { post: { cid: 'post-multiboard', communityAddress: 'other-board.eth', content: '[color=red]raw[/color]' } }));
    });

    const postDesktop = container.querySelector('[data-testid="post-desktop"]');
    expect(postDesktop?.getAttribute('data-roles-present')).toBe('true');
    expect(postDesktop?.textContent).toBe('post-multiboard:none:0');
  });

  it('rerenders posts when pending approval turns into an approved numbered post', async () => {
    await act(async () => {
      root.render(
        createElement(Post, {
          post: {
            cid: 'post-approval',
            communityAddress: 'music-posting.eth',
            pendingApproval: true,
            replyCount: 0,
          },
        }),
      );
    });

    const desktopPresenter = container.querySelector('[data-testid="post-desktop"]');
    expect(desktopPresenter?.getAttribute('data-number')).toBe('');
    expect(desktopPresenter?.getAttribute('data-pending-approval')).toBe('true');
    expect(desktopPresenter?.getAttribute('data-approved')).toBe('');

    await act(async () => {
      root.render(
        createElement(Post, {
          post: {
            approved: true,
            cid: 'post-approval',
            communityAddress: 'music-posting.eth',
            number: 2,
            pendingApproval: false,
            postNumber: 2,
            replyCount: 0,
          },
        }),
      );
    });

    expect(desktopPresenter?.getAttribute('data-number')).toBe('2');
    expect(desktopPresenter?.getAttribute('data-pending-approval')).toBe('false');
    expect(desktopPresenter?.getAttribute('data-approved')).toBe('true');
  });

  it('rerenders posts when local author data becomes available after the remote post shell', async () => {
    await act(async () => {
      root.render(
        createElement(Post, {
          post: {
            cid: 'post-author',
            communityAddress: 'music-posting.eth',
            content: 'body',
            replyCount: 0,
          },
        }),
      );
    });

    expect(container.querySelector('[data-testid="post-desktop"]')?.getAttribute('data-author-address')).toBe('');

    await act(async () => {
      root.render(
        createElement(Post, {
          post: {
            author: {
              address: 'account-author',
            },
            cid: 'post-author',
            communityAddress: 'music-posting.eth',
            content: 'body',
            replyCount: 0,
          },
        }),
      );
    });

    expect(container.querySelector('[data-testid="post-desktop"]')?.getAttribute('data-author-address')).toBe('account-author');
  });

  it('rerenders posts when a transferred moderation marker appears', async () => {
    await act(async () => {
      root.render(
        createElement(Post, {
          post: {
            cid: 'post-transferred',
            communityAddress: 'music-posting.eth',
            content: 'body',
            replyCount: 0,
          },
        }),
      );
    });

    expect(container.querySelector('[data-testid="post-desktop"]')?.getAttribute('data-transferred')).toBe('false');

    await act(async () => {
      root.render(
        createElement(Post, {
          post: {
            cid: 'post-transferred',
            commentModeration: {
              flairs: [{ text: '5chan:transferred' }],
            },
            communityAddress: 'music-posting.eth',
            content: 'body',
            replyCount: 0,
          },
        }),
      );
    });

    expect(container.querySelector('[data-testid="post-desktop"]')?.getAttribute('data-transferred')).toBe('true');
  });

  it('only forwards transfer handlers for top-level posts', async () => {
    const handleTransfer = vi.fn();

    await act(async () => {
      root.render(
        createElement(Post, {
          onTransfer: handleTransfer,
          post: {
            cid: 'post-transfer-handler',
            communityAddress: 'music-posting.eth',
            content: 'body',
            replyCount: 0,
          },
        }),
      );
    });

    expect(container.querySelector('[data-testid="post-desktop"]')?.getAttribute('data-transfer-enabled')).toBe('true');

    await act(async () => {
      root.render(
        createElement(Post, {
          onTransfer: handleTransfer,
          post: {
            cid: 'post-transfer-handler',
            communityAddress: 'music-posting.eth',
            content: 'body',
            parentCid: 'thread-cid',
            replyCount: 0,
          },
        }),
      );
    });

    expect(container.querySelector('[data-testid="post-desktop"]')?.getAttribute('data-transfer-enabled')).toBe('false');
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

  it('keeps the local account comment while the canonical comment is only a loading shell', async () => {
    testState.commentsByCid = {
      'owned-loading-cid': {
        cid: 'owned-loading-cid',
        state: 'updating',
        replyCount: 0,
        communityAddress: 'music-posting.eth',
      },
    };
    testState.accountCommentsByCid = {
      'owned-loading-cid': {
        cid: 'owned-loading-cid',
        postCid: 'owned-loading-cid',
        author: {
          address: 'account-author',
        },
        content: 'local body',
        number: 13,
        replyCount: 0,
        communityAddress: 'music-posting.eth',
        title: 'Local thread',
      },
    };

    await renderPostPage('/mu/thread/owned-loading-cid');

    const desktopPresenter = container.querySelector('[data-testid="post-desktop"]');
    expect(desktopPresenter?.getAttribute('data-author-address')).toBe('account-author');
    expect(desktopPresenter?.getAttribute('data-number')).toBe('13');
    expect(desktopPresenter?.getAttribute('data-reply-count')).toBe('0');
    expect(document.title).toBe('/mu/ - Local thread... - 5chan');
  });

  it('keeps current thread data while restoring the local account author', async () => {
    testState.commentsByCid = {
      'owned-cid': {
        cid: 'owned-cid',
        author: {
          community: { displayName: 'Anonymous' },
        },
        content: 'remote body',
        number: 14,
        replyCount: 3,
        communityAddress: 'music-posting.eth',
        title: 'Remote thread',
      },
    };
    testState.accountCommentsByCid = {
      'owned-cid': {
        cid: 'owned-cid',
        postCid: 'owned-cid',
        author: {
          address: 'account-author',
        },
        content: 'local body',
        replyCount: 0,
        communityAddress: 'music-posting.eth',
        title: 'Local thread',
      },
    };

    await renderPostPage('/mu/thread/owned-cid');

    const desktopPresenter = container.querySelector('[data-testid="post-desktop"]');
    expect(desktopPresenter?.getAttribute('data-author-address')).toBe('account-author');
    expect(desktopPresenter?.getAttribute('data-number')).toBe('14');
    expect(desktopPresenter?.getAttribute('data-reply-count')).toBe('3');
    expect(container.querySelector('[data-testid="thread-footer-first-row"]')?.textContent).toBe('owned-cid:14:music-posting.eth:false');
    expect(document.title).toBe('/mu/ - Remote thread... - 5chan');
  });

  it('restores the active account author when a mapped account comment only has anonymous author metadata', async () => {
    testState.commentsByCid = {
      'mapped-owned-cid': {
        cid: 'mapped-owned-cid',
        author: {
          community: { displayName: 'Anonymous' },
        },
        content: 'remote body',
        number: 16,
        replyCount: 0,
        communityAddress: 'music-posting.eth',
        title: 'Remote thread',
      },
    };
    testState.accountCommentsByCid = {
      'mapped-owned-cid': {
        accountId: 'active-account',
        cid: 'mapped-owned-cid',
        postCid: 'mapped-owned-cid',
        author: {
          community: { displayName: 'Anonymous' },
        },
        content: 'local body',
        communityAddress: 'music-posting.eth',
        title: 'Local thread',
      },
    };

    await renderPostPage('/mu/thread/mapped-owned-cid');

    const desktopPresenter = container.querySelector('[data-testid="post-desktop"]');
    expect(desktopPresenter?.getAttribute('data-author-address')).toBe('account-author');
    expect(desktopPresenter?.getAttribute('data-number')).toBe('16');
  });

  it('keeps queued publish authors on thread pages when the remote OP is already renderable', async () => {
    testState.commentsByCid = {
      'queued-owned-cid': {
        cid: 'queued-owned-cid',
        author: {
          community: { displayName: 'Anonymous' },
        },
        content: 'remote body',
        number: 15,
        pendingApproval: false,
        replyCount: 0,
        communityAddress: 'music-posting.eth',
        title: 'Remote thread',
      },
    };

    await renderPostPage({
      pathname: '/mu/thread/queued-owned-cid',
      state: {
        queuedComment: {
          cid: 'queued-owned-cid',
          author: {
            address: 'account-author',
          },
          content: 'queued body',
          communityAddress: 'music-posting.eth',
          pendingApproval: true,
          title: 'Queued thread',
        },
      },
    });

    const desktopPresenter = container.querySelector('[data-testid="post-desktop"]');
    expect(desktopPresenter?.getAttribute('data-author-address')).toBe('account-author');
    expect(desktopPresenter?.getAttribute('data-number')).toBe('15');
    expect(desktopPresenter?.getAttribute('data-pending-approval')).toBe('false');
    expect(container.querySelector('[data-testid="thread-footer-first-row"]')?.textContent).toBe('queued-owned-cid:15:music-posting.eth:false');
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
        communityAddress: 'music-posting.eth',
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

  it('redirects stale directory thread routes to the loaded comment community address', async () => {
    testState.resolvedCommunityAddress = 'bizraelis.bso';
    testState.isDirectoryCandidate = true;
    testState.commentsByCid = {
      'comment-1': {
        cid: 'comment-1',
        postCid: 'comment-1',
        communityAddress: 'business-and-finance.bso',
        timestamp: 1,
        title: 'Business thread',
      },
    };

    await renderPostPage('/biz/thread/comment-1?focus=1#reply-2');

    expect(testState.navigateMock).toHaveBeenCalledWith('/business-and-finance.bso/thread/comment-1?focus=1#reply-2', { replace: true });
  });

  it('uses the CID community as the initial useComment hint without rendering the raw CID payload', async () => {
    testState.cidCommunityAddress = 'business-and-finance.bso';
    testState.resolvedCommunityAddress = 'bizraelis.bso';

    await renderPostPage('/biz/thread/comment-1');

    expect(testState.useCommentCalls).toContainEqual({
      autoUpdate: false,
      commentCid: 'comment-1',
      community: expect.objectContaining({ name: 'business-and-finance.bso' }),
    });
    expect(testState.navigateMock).not.toHaveBeenCalled();
  });

  it('does not trust a loading comment shell as the CID community source of truth', async () => {
    testState.resolvedCommunityAddress = 'bizraelis.bso';
    testState.commentsByCid = {
      'comment-shell': {
        cid: 'comment-shell',
        communityAddress: 'business-and-finance.bso',
        replyCount: 0,
        state: 'initializing',
      },
    };

    await renderPostPage('/biz/thread/comment-shell');

    expect(testState.navigateMock).not.toHaveBeenCalled();
  });

  it('uses the directory code when the loaded comment community is the current winner', async () => {
    testState.resolvedCommunityAddress = 'wrong-board.bso';
    testState.resolvedDirectoryBoardPath = 'biz';
    testState.isDirectoryCandidate = true;
    testState.commentsByCid = {
      'comment-1': {
        cid: 'comment-1',
        communityAddress: 'business-and-finance.bso',
        timestamp: 1,
      },
    };

    await renderPostPage('/wrong-board.bso/thread/comment-1');

    expect(testState.navigateMock).toHaveBeenCalledWith('/biz/thread/comment-1', { replace: true });
  });

  it('hydrates multiboard thread pages from a legacy-only comment address', async () => {
    testState.resolvedCommunityAddress = undefined;
    testState.commentsByCid = {
      'legacy-cid': {
        cid: 'legacy-cid',
        state: 'updating',
        communityAddress: 'music-posting.eth',
      },
    };
    testState.cachedComments = {
      'legacy-cid': {
        cid: 'legacy-cid',
        content: 'cached body',
        number: 7,
        replyCount: 0,
        communityAddress: 'music-posting.eth',
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

  it('renders pending reply routes from queued mod-queue state when the reply CID only resolves to a loading shell', async () => {
    testState.commentsByCid = {
      'pending-reply-cid': {
        cid: 'pending-reply-cid',
        state: 'updating',
        communityAddress: 'music-posting.eth',
      },
      'root-cid': {
        cid: 'root-cid',
        number: 33,
        replyCount: 1,
        communityAddress: 'music-posting.eth',
        title: 'Root thread',
      },
    };
    testState.repliesByCommentCid = {
      'root-cid': [
        {
          cid: 'approved-reply-cid',
          content: 'approved body',
          communityAddress: 'music-posting.eth',
          parentCid: 'root-cid',
          postCid: 'root-cid',
        },
      ],
    };

    await renderPostPage({
      pathname: '/mu/thread/pending-reply-cid',
      state: {
        queuedComment: {
          cid: 'pending-reply-cid',
          content: 'pending body',
          communityAddress: 'music-posting.eth',
          parentCid: 'root-cid',
          pendingApproval: true,
          postCid: 'root-cid',
          timestamp: 123,
        },
      },
    });

    expect(container.querySelector('[data-testid="post-desktop"]')?.textContent).toBe('root-cid:pending-reply-cid:1');
    expect(container.querySelector('[data-testid="post-desktop"]')?.getAttribute('data-replies')).toBe('approved-reply-cid,pending-reply-cid');
    expect(container.querySelector('[data-testid="thread-footer-first-row"]')?.textContent).toBe('root-cid:33:music-posting.eth:false');
  });

  it('renders pending thread routes from queued mod-queue state when the thread CID only resolves to a loading shell', async () => {
    testState.commentsByCid = {
      'pending-thread-cid': {
        cid: 'pending-thread-cid',
        state: 'updating',
        communityAddress: 'music-posting.eth',
      },
    };

    await renderPostPage({
      pathname: '/mu/thread/pending-thread-cid',
      state: {
        queuedComment: {
          cid: 'pending-thread-cid',
          communityAddress: 'music-posting.eth',
          content: 'pending thread body',
          number: 71,
          pendingApproval: true,
          replyCount: 0,
          timestamp: 321,
          title: 'Pending thread',
        },
      },
    });

    expect(container.querySelector('[data-testid="post-desktop"]')?.textContent).toBe('pending-thread-cid:none:1');
    expect(container.querySelector('[data-testid="thread-footer-first-row"]')?.textContent).toBe('pending-thread-cid:71:music-posting.eth:false');
    expect(document.title).toBe('/mu/ - Pending thread... - 5chan');
  });

  it('unwraps queued mod-queue route state from the router usr wrapper', async () => {
    testState.commentsByCid = {
      'wrapped-thread-cid': {
        cid: 'wrapped-thread-cid',
        state: 'updating',
        communityAddress: 'music-posting.eth',
      },
    };

    await renderPostPage({
      pathname: '/mu/thread/wrapped-thread-cid',
      state: {
        usr: {
          queuedComment: {
            cid: 'wrapped-thread-cid',
            communityAddress: 'music-posting.eth',
            content: 'wrapped pending body',
            number: 72,
            pendingApproval: true,
            replyCount: 0,
            timestamp: 654,
            title: 'Wrapped pending thread',
          },
        },
      },
    });

    expect(container.querySelector('[data-testid="post-desktop"]')?.textContent).toBe('wrapped-thread-cid:none:1');
    expect(container.querySelector('[data-testid="thread-footer-first-row"]')?.textContent).toBe('wrapped-thread-cid:72:music-posting.eth:false');
    expect(document.title).toBe('/mu/ - Wrapped pending thread... - 5chan');
  });

  it('falls back to browser history state when router location state is missing on first navigation', async () => {
    testState.commentsByCid = {
      'history-thread-cid': {
        cid: 'history-thread-cid',
        state: 'waiting retry',
        communityAddress: 'music-posting.eth',
      },
    };
    window.history.replaceState(
      {
        usr: {
          queuedComment: {
            cid: 'history-thread-cid',
            communityAddress: 'music-posting.eth',
            content: 'history pending body',
            number: 73,
            pendingApproval: true,
            replyCount: 0,
            timestamp: 987,
            title: 'History pending thread',
          },
        },
      },
      '',
      '/',
    );

    await renderPostPage('/mu/thread/history-thread-cid');

    expect(container.querySelector('[data-testid="post-desktop"]')?.textContent).toBe('history-thread-cid:none:1');
    expect(container.querySelector('[data-testid="thread-footer-first-row"]')?.textContent).toBe('history-thread-cid:73:music-posting.eth:false');
    expect(document.title).toBe('/mu/ - History pending thread... - 5chan');
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
        expect.objectContaining({
          autoUpdate: false,
          commentCid: 'reply-cid',
          community: { name: 'music-posting.eth', publicKey: 'music-public-key' },
        }),
        expect.objectContaining({
          autoUpdate: false,
          commentCid: 'root-cid',
          community: { name: 'music-posting.eth', publicKey: 'music-public-key' },
        }),
      ]),
    );
  });

  it('evicts stale thread caches before refreshing a manual thread update', async () => {
    const events: string[] = [];
    const refreshReply = vi.fn(async () => {
      events.push('refresh-reply');
    });
    const refreshPost = vi.fn(async () => {
      events.push('refresh-post');
    });
    testState.evictThreadRefreshCachesMock.mockImplementation(async () => {
      events.push('evict-cache');
    });
    testState.commentsByCid = {
      'reply-cid': {
        cid: 'reply-cid',
        communityAddress: 'music-posting.eth',
        parentCid: 'root-cid',
        postCid: 'root-cid',
        refresh: refreshReply,
      },
      'root-cid': {
        cid: 'root-cid',
        communityAddress: 'music-posting.eth',
        number: 31,
        postCid: 'root-cid',
        refresh: refreshPost,
        replyCount: 0,
        title: 'Root thread',
      },
    };

    await renderPostPage('/mu/thread/reply-cid');

    await act(async () => {
      useThreadLiveUpdatesStore.getState().requestUpdate();
    });
    await flushEffects();

    expect(testState.evictThreadRefreshCachesMock).toHaveBeenCalledWith([testState.commentsByCid['reply-cid'], testState.commentsByCid['root-cid']]);
    expect(events[0]).toBe('evict-cache');
    expect(refreshReply).toHaveBeenCalledTimes(1);
    expect(refreshPost).toHaveBeenCalledTimes(1);
    expect(useThreadLiveUpdatesStore.getState()).toMatchObject({
      isUpdating: false,
      repliesResetRequestId: 1,
      updateRequestId: 1,
    });
  });
});
