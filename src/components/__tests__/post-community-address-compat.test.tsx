import * as React from 'react';
import { createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import PostDesktop from '../post-desktop';
import PostMobile from '../post-mobile';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
const act = (React as { act?: (cb: () => void | Promise<void>) => void | Promise<void> }).act as (cb: () => void | Promise<void>) => void | Promise<void>;

type TestComment = {
  author?: {
    address?: string;
    shortAddress?: string;
  };
  cid?: string;
  communityAddress?: string;
  content?: string;
  deleted?: boolean;
  index?: number;
  link?: string;
  linkHeight?: number;
  linkWidth?: number;
  number?: number;
  parentCid?: string;
  pinned?: boolean;
  postCid?: string;
  removed?: boolean;
  replyCount?: number;
  replies?: {
    pages?: Record<
      string,
      {
        comments?: TestComment[];
      }
    >;
  };
  state?: string;
  subplebbitAddress?: string;
  thumbnailUrl?: string;
  timestamp?: number;
  updatedAt?: number;
};

const testState = vi.hoisted(() => ({
  addChallengeMock: vi.fn(),
  openReplyModalMock: vi.fn(),
  replyComments: [] as Array<TestComment | undefined>,
  setResetFunctionMock: vi.fn(),
}));

const getMockPreloadedReplies = (comment?: TestComment, sortType?: string) => {
  if (!comment) {
    return [];
  }

  const preloadedReplies =
    comment.replies?.pages?.[sortType || 'best']?.comments ?? Object.values(comment.replies?.pages ?? {}).find((page) => page?.comments?.length)?.comments ?? [];

  const compatibleReplies: TestComment[] = [];
  for (const reply of preloadedReplies) {
    if (!reply?.communityAddress || reply.communityAddress !== comment.communityAddress) {
      break;
    }
    compatibleReplies.push(reply);
  }

  return compatibleReplies;
};

vi.mock('react-i18next', () => ({
  Trans: ({ i18nKey, values }: { i18nKey?: string; values?: Record<string, unknown> }) =>
    createElement('span', {}, `${i18nKey ?? 'trans'}:${JSON.stringify(values ?? {})}`),
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock('@bitsocialnet/bitsocial-react-hooks', () => ({
  useAccount: () => ({ author: { address: '0xviewer' } }),
  useAccountComment: () => undefined,
  useEditedComment: () => ({ editedComment: undefined }),
  usePublishCommentModeration: () => ({
    error: undefined,
    publishCommentModeration: vi.fn(),
    state: 'initializing',
  }),
  useReplies: ({ comment, sortType }: { comment?: TestComment; sortType?: string }) => {
    testState.replyComments.push(comment);
    return {
      hasMore: false,
      loadMore: vi.fn(),
      replies: getMockPreloadedReplies(comment, sortType),
    };
  },
}));

vi.mock('react-virtuoso', () => ({
  Virtuoso: React.forwardRef(
    (
      {
        components,
        data = [],
        itemContent,
      }: {
        components?: { Footer?: React.ComponentType };
        data?: TestComment[];
        itemContent: (index: number, item: TestComment) => React.ReactNode;
      },
      ref: React.ForwardedRef<{ getState: (cb: (snapshot: { ranges: number[]; scrollTop: number }) => void) => void }>,
    ) => {
      React.useImperativeHandle(ref, () => ({
        getState: (cb) => cb({ ranges: [0], scrollTop: 0 }),
      }));

      return createElement(
        'div',
        { 'data-testid': 'virtuoso' },
        data.map((item, index) => createElement('div', { key: item.cid ?? index }, itemContent(index, item))),
        components?.Footer ? createElement(components.Footer) : null,
      );
    },
  ),
}));

vi.mock('../../lib/get-short-address', () => ({
  default: (value?: string) => (value ? value.slice(0, 4) : ''),
}));

vi.mock('../../views/post/post.module.css', () => ({
  default: new Proxy(
    {},
    {
      get: (_target, property) => String(property),
    },
  ),
}));

vi.mock('../../lib/utils/media-utils', () => ({
  getDisplayMediaInfoType: (type?: string) => type ?? 'unknown',
  getHasThumbnail: () => true,
  getMediaDimensions: () => '100x100',
}));

vi.mock('../../lib/utils/post-utils', () => ({
  getTextColorForBackground: () => '#fff',
  hashStringToColor: () => '#000',
}));

vi.mock('../../lib/utils/time-utils', () => ({
  getFormattedDate: () => '2026-03-13',
  getFormattedTimeAgo: () => 'moments ago',
}));

vi.mock('../../lib/utils/pending-approval-moderation', () => ({
  approvePendingCommentModeration: {},
  isPendingApprovalRejected: () => false,
  rejectPendingCommentModeration: {},
}));

vi.mock('../../lib/utils/url-utils', () => ({
  isValidURL: () => true,
}));

vi.mock('../../lib/utils/view-utils', () => ({
  isAllView: (pathname: string) => pathname === '/all',
  isModQueueView: () => false,
  isModView: () => false,
  isPendingPostView: () => false,
  isPostPageView: (pathname: string) => pathname.includes('/thread/'),
  isSubscriptionsView: () => false,
}));

vi.mock('../../stores/use-mod-queue-store', () => ({
  default: (selector?: (state: { getAlertThresholdSeconds: () => number }) => unknown) => {
    const state = {
      getAlertThresholdSeconds: () => 0,
    };

    return selector ? selector(state) : state;
  },
}));

vi.mock('../../hooks/use-directories', () => ({
  findDirectoryByAddress: (_directories: unknown[], address?: string) => (address ? { address, features: {} } : undefined),
  useDirectories: () => [{ address: 'music-posting.eth', title: '/mu/ - Music' }],
}));

vi.mock('../../lib/utils/route-utils', () => ({
  getBoardPath: (address?: string) => (address ? 'mu' : undefined),
}));

vi.mock('../../hooks/use-author-address-click', () => ({
  default: () => vi.fn(),
}));

vi.mock('../../hooks/use-comment-media-info', () => ({
  useCommentMediaInfo: (link?: string) => (link ? { type: 'image', url: link } : undefined),
}));

vi.mock('../../hooks/use-count-links-in-replies', () => ({
  default: () => 0,
}));

vi.mock('../../hooks/use-fetch-gif-first-frame', () => ({
  default: () => ({
    status: 'idle',
  }),
}));

vi.mock('../../hooks/use-hide', () => ({
  default: () => ({
    hidden: false,
    hide: vi.fn(),
    unhide: vi.fn(),
  }),
}));

vi.mock('../../hooks/use-state-string', () => ({
  default: () => undefined,
}));

vi.mock('../../hooks/use-scroll-to-reply', () => ({
  default: () => undefined,
}));

vi.mock('../../hooks/use-current-time', () => ({
  useCurrentTime: () => 1_710_000_000,
}));

vi.mock('../../hooks/use-board-pseudonymity-mode', () => ({
  useBoardPseudonymityMode: () => 'none',
}));

vi.mock('../comment-content', () => ({
  default: ({ comment }: { comment?: TestComment }) => createElement('div', { 'data-testid': 'comment-content' }, comment?.cid ?? 'missing'),
}));

vi.mock('../comment-media', () => ({
  default: () => createElement('div', { 'data-testid': 'comment-media' }, 'media'),
}));

vi.mock('../edit-menu/edit-menu', () => ({
  default: () => createElement('div', { 'data-testid': 'edit-menu' }, 'edit'),
}));

vi.mock('../failed-publish-notice', () => ({
  default: () => createElement('div', { 'data-testid': 'failed-publish-notice' }, 'failed-publish-notice'),
}));

vi.mock('../embed', () => ({
  canEmbed: () => false,
}));

vi.mock('../loading-ellipsis', () => ({
  default: ({ string }: { string: string }) => createElement('div', { 'data-testid': 'loading-ellipsis' }, string),
}));

vi.mock('../post-desktop/post-menu-desktop', () => ({
  default: ({ postMenu }: { postMenu: { communityAddress?: string } }) =>
    createElement('div', { 'data-testid': 'post-menu-desktop' }, postMenu.communityAddress ?? 'missing'),
}));

vi.mock('../reply-quote-preview', () => ({
  default: ({ backlinkReply }: { backlinkReply?: TestComment }) => createElement('div', { 'data-testid': 'reply-quote-preview' }, backlinkReply?.cid ?? 'missing'),
}));

vi.mock('../tooltip', () => ({
  default: ({ children }: { children?: React.ReactNode }) => createElement(React.Fragment, {}, children),
}));

vi.mock('../../lib/snow', () => ({
  shouldShowSnow: () => false,
}));

vi.mock('../../stores/use-reply-modal-store', () => ({
  default: () => ({
    openReplyModal: testState.openReplyModalMock,
  }),
}));

vi.mock('../../stores/use-challenges-store', () => ({
  default: {
    getState: () => ({
      addChallenge: testState.addChallengeMock,
    }),
  },
}));

vi.mock('../../stores/use-feed-reset-store', () => ({
  default: (selector: (state: { setResetFunction: typeof testState.setResetFunctionMock }) => unknown) =>
    selector({
      setResetFunction: testState.setResetFunctionMock,
    }),
}));

vi.mock('../../hooks/use-register-fresh-replies', () => ({
  default: () => undefined,
}));

vi.mock('../../lib/utils/challenge-utils', () => ({
  alertChallengeVerificationFailed: vi.fn(),
}));

vi.mock('../../hooks/use-quoted-by-map', () => ({
  default: () => new Map(),
}));

vi.mock('../../hooks/use-progressive-render', () => ({
  default: (replies: TestComment[]) => replies,
}));

vi.mock('../../hooks/use-fresh-replies', () => ({
  default: (replies: TestComment[]) => replies,
}));

vi.mock('../../lib/constants', () => ({
  BOARD_REPLIES_PREVIEW_FETCH_SIZE: 5,
  BOARD_REPLIES_PREVIEW_VISIBLE_COUNT: 3,
  REPLIES_PER_PAGE: 20,
}));

vi.mock('../../lib/utils/replies-preview-utils', () => ({
  computeOmittedCount: () => 0,
  filterRepliesForDisplay: (replies: TestComment[]) => replies,
  getPreviewDisplayReplies: (replies: TestComment[]) => replies,
  getTotalReplyCount: ({ replyCount }: { replyCount?: number }) => replyCount ?? 0,
  hasEnoughPreviewReplies: ({ replyCount, loadedCount, visibleCount }: { replyCount?: number; loadedCount: number; visibleCount: number }) =>
    loadedCount >= Math.min(visibleCount, replyCount ?? visibleCount),
}));

vi.mock('../../lib/utils/thread-scroll-utils', () => ({
  getThreadTopNavigationState: () => undefined,
  scrollThreadContainerToTop: () => true,
}));

vi.mock('../../hooks/use-delete-failed-post', () => ({
  default: () => ({
    canDeleteFailedPost: false,
    isDeletingFailedPost: false,
    onDeleteFailedPost: vi.fn(),
  }),
}));

vi.mock('../post-mobile/post-menu-mobile', () => ({
  default: ({ postMenu }: { postMenu: { communityAddress?: string } }) =>
    createElement('div', { 'data-testid': 'post-menu-mobile' }, postMenu.communityAddress ?? 'missing'),
}));

vi.mock('../../lib/utils/reply-backlink-utils', () => ({
  getRenderableMobileBacklinks: () => ({
    directReplyBacklinks: [],
    opBacklinks: [],
    quotedReplyBacklinks: [],
  }),
}));

let container: HTMLDivElement;
let root: Root;

const flushEffects = async (count = 3) => {
  for (let i = 0; i < count; i += 1) {
    await act(async () => {
      await Promise.resolve();
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
  }
};

const renderWithRoute = async (element: React.ReactNode, initialEntry = '/all') => {
  await act(async () => {
    root.render(createElement(MemoryRouter, { initialEntries: [initialEntry] }, element));
  });
  await flushEffects();
};

const makeLegacyThread = (): TestComment => ({
  author: { address: '0xauthor', shortAddress: 'anon' },
  cid: 'post-1',
  content: 'Original post',
  link: 'https://example.com/file.png',
  linkHeight: 100,
  linkWidth: 100,
  number: 1,
  postCid: 'post-1',
  replyCount: 1,
  replies: {
    pages: {
      new: {
        comments: [
          {
            author: { address: '0xreply', shortAddress: 'reply' },
            cid: 'reply-1',
            content: 'Reply',
            number: 2,
            parentCid: 'post-1',
            postCid: 'post-1',
            subplebbitAddress: 'music-posting.eth',
          },
        ],
      },
    },
  },
  subplebbitAddress: 'music-posting.eth',
  timestamp: 1_710_000_000,
});

describe('post community address compatibility', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    testState.replyComments = [];

    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  it('renders desktop multiboard posts with only subplebbitAddress and still fetches replies', async () => {
    await renderWithRoute(createElement(PostDesktop, { post: makeLegacyThread() }));

    const primaryRepliesComment = testState.replyComments.find((comment) => comment?.cid === 'post-1');
    expect(primaryRepliesComment?.communityAddress).toBe('music-posting.eth');
    expect(primaryRepliesComment?.replies?.pages?.new?.comments?.[0]?.communityAddress).toBe('music-posting.eth');
    expect(container.querySelector('[data-testid="post-menu-desktop"]')?.textContent).toBe('music-posting.eth');
    expect(document.body.querySelector('a[href="/mu"]')?.textContent).toContain('mu');
    expect(container.querySelector('[data-testid="comment-media"]')).toBeTruthy();
    expect(container.textContent).toContain('reply-1');
  });

  it('renders mobile multiboard posts with only subplebbitAddress and still fetches replies', async () => {
    await renderWithRoute(createElement(PostMobile, { post: makeLegacyThread() }));

    const primaryRepliesComment = testState.replyComments.find((comment) => comment?.cid === 'post-1');
    expect(primaryRepliesComment?.communityAddress).toBe('music-posting.eth');
    expect(primaryRepliesComment?.replies?.pages?.new?.comments?.[0]?.communityAddress).toBe('music-posting.eth');
    expect(container.querySelector('[data-testid="post-menu-mobile"]')?.textContent).toBe('music-posting.eth');
    expect(document.body.querySelector('a[href="/mu"]')?.textContent).toContain('Board: mu');
    expect(container.querySelector('[data-testid="comment-media"]')).toBeTruthy();
    expect(container.textContent).toContain('reply-1');
  });
});
