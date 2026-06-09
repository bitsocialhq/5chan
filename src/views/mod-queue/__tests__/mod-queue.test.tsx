import * as React from 'react';
import { createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { Link, MemoryRouter, Route, Routes, useNavigate } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ModQueueView from '../mod-queue';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
const act = (React as { act?: (callback: () => void | Promise<void>) => void | Promise<void> }).act as (callback: () => void | Promise<void>) => void | Promise<void>;

type TestComment = {
  cid: string;
  content?: string;
  communityAddress?: string;
  number?: number;
  pendingApproval?: boolean;
  timestamp?: number;
};

const testState = vi.hoisted(() => ({
  account: { author: { address: '0x123' }, id: 'account' },
  accountCommunityAddresses: ['music-posting.eth'],
  addChallengeMock: vi.fn(),
  directories: [{ address: 'music-posting.eth', directoryCode: 'mu', title: '/mu/ - Music' }],
  dismissedCommentCids: [] as string[],
  feed: [] as TestComment[],
  hasMore: false,
  isMobile: false,
  loadMoreMock: vi.fn(),
  publishCommentModerationMock: vi.fn(),
  queuedCommentHistory: [] as TestComment[],
  rememberCommentsInQueueMock: vi.fn(),
  resetMock: vi.fn(),
  setResetFunctionMock: vi.fn(),
  viewMode: 'compact' as 'compact' | 'feed',
}));

const getModQueueState = () => ({
  dismissedCommentCids: testState.dismissedCommentCids,
  dismissCommentFromQueue: vi.fn(),
  getAlertThresholdSeconds: () => 6 * 60 * 60,
  queuedCommentHistory: testState.queuedCommentHistory,
  rememberCommentsInQueue: testState.rememberCommentsInQueueMock,
  setViewMode: vi.fn(),
  viewMode: testState.viewMode,
});

function useModQueueStoreMock<T>(selector?: (state: ReturnType<typeof getModQueueState>) => T) {
  const state = getModQueueState();
  return selector ? selector(state) : (state as T);
}
useModQueueStoreMock.getState = getModQueueState;

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock('@bitsocial/bitsocial-react-hooks', () => ({
  useAccount: () => testState.account,
  useCommunity: () => ({
    roles: {
      '0x123': { role: 'moderator' },
    },
    state: 'succeeded',
  }),
  useCommunities: ({ communities }: { communities?: Array<{ name: string }> } = {}) => ({
    communities: (communities ?? []).map(() => ({
      roles: {
        '0x123': { role: 'moderator' },
      },
    })),
  }),
  useEditedComment: ({ comment }: { comment?: TestComment }) => ({
    editedComment: comment,
    failedEdits: {},
    pendingEdits: {},
    succeededEdits: {},
  }),
  useFeed: () => ({
    feed: testState.feed,
    hasMore: testState.hasMore,
    loadMore: testState.loadMoreMock,
    reset: testState.resetMock,
    state: testState.hasMore ? 'fetching-ipns' : 'succeeded',
  }),
  usePublishCommentModeration: () => ({
    publishCommentModeration: testState.publishCommentModerationMock,
    state: 'initializing',
  }),
}));

vi.mock('@bitsocial/bitsocial-react-hooks/dist/stores/accounts/index.js', () => ({
  default: (selector: (state: { accountsEditsSummaries: Record<string, Record<string, unknown>>; activeAccountId: string }) => unknown) =>
    selector({ accountsEditsSummaries: { account: {} }, activeAccountId: 'account' }),
}));

vi.mock('@floating-ui/react', () => ({
  autoUpdate: vi.fn(),
  flip: vi.fn(),
  offset: vi.fn(),
  shift: vi.fn(),
  size: vi.fn(),
  useFloating: () => ({
    floatingStyles: { position: 'fixed' },
    refs: {
      setFloating: () => undefined,
      setReference: () => undefined,
    },
    update: vi.fn(),
  }),
}));

vi.mock('react-virtuoso', () => ({
  Virtuoso: ({
    components,
    data = [],
    itemContent,
  }: {
    components?: { Footer?: React.ComponentType };
    data?: TestComment[];
    itemContent: (index: number, item: TestComment) => React.ReactNode;
  }) =>
    createElement(
      'div',
      { 'data-testid': 'virtuoso' },
      data.map((item, index) => createElement(React.Fragment, { key: item.cid }, itemContent(index, item))),
      components?.Footer ? createElement(components.Footer) : null,
    ),
}));

vi.mock('../../../stores/use-mod-queue-store', () => ({
  default: useModQueueStoreMock,
}));

vi.mock('../../../stores/use-feed-reset-store', () => ({
  default: (selector: (state: { setResetFunction: typeof testState.setResetFunctionMock }) => unknown) => selector({ setResetFunction: testState.setResetFunctionMock }),
}));

vi.mock('../../../stores/use-challenges-store', () => {
  const useChallengesStore = () => ({});
  useChallengesStore.getState = () => ({ addChallenge: testState.addChallengeMock });
  return { default: useChallengesStore };
});

vi.mock('../../../hooks/use-account-community-addresses', () => ({
  useAccountCommunityAddresses: () => testState.accountCommunityAddresses,
}));

vi.mock('../../../hooks/use-community-identifiers', () => ({
  useCommunityIdentifier: (address: string | undefined) => (address ? { name: address } : undefined),
  useCommunityIdentifiers: (addresses: string[]) => addresses.map((address) => ({ name: address })),
}));

vi.mock('../../../hooks/use-current-time', () => ({
  useCurrentTime: () => 100_000,
}));

vi.mock('../../../hooks/use-directories', () => ({
  findDirectoryByAddress: (directories: typeof testState.directories, address: string) =>
    directories.find((directory) =>
      [directory.address, directory.directoryCode, directory.title].some(
        (value) => typeof value === 'string' && value.replace(/(\.bso|\.eth)$/, '') === address.replace(/(\.bso|\.eth)$/, ''),
      ),
    ),
  normalizeBoardAddress: (address: string) => address.replace(/(\.bso|\.eth)$/, ''),
  useDirectories: () => testState.directories,
}));

vi.mock('../../../hooks/use-is-mobile', () => ({
  default: () => testState.isMobile,
}));

vi.mock('../../../hooks/use-state-string', () => ({
  useFeedStateString: () => 'loading_mod_queue',
}));

vi.mock('../../../components/error-display/error-display', () => ({
  default: ({ error }: { error?: Error }) => createElement('div', { 'data-testid': 'error-display' }, error?.message || 'error'),
}));

vi.mock('../../../components/footer/footer', () => ({
  PageFooterDesktop: ({ firstRow }: { firstRow: React.ReactNode }) => createElement('div', { 'data-testid': 'footer-desktop' }, firstRow),
  PageFooterMobile: ({ children }: { children: React.ReactNode }) => createElement('div', { 'data-testid': 'footer-mobile' }, children),
  StyleOnlyFooterFirstRow: () => createElement('div', { 'data-testid': 'style-footer-row' }),
}));

vi.mock('../../../components/loading-ellipsis/loading-ellipsis', () => ({
  default: ({ string }: { string: string }) => createElement('div', { 'data-testid': 'loading-ellipsis' }, string),
}));

vi.mock('../../../components/tooltip/tooltip', () => ({
  default: ({ children }: { children: React.ReactNode }) => createElement(React.Fragment, {}, children),
}));

vi.mock('../../post/post', () => ({
  Post: ({ isModQueue, post, showReplies }: { isModQueue?: boolean; post?: TestComment; showReplies?: boolean }) =>
    createElement(
      'div',
      {
        'data-cid': post?.cid,
        'data-content': post?.content,
        'data-is-mod-queue': String(Boolean(isModQueue)),
        'data-show-replies': String(Boolean(showReplies)),
        'data-testid': 'mod-queue-feed-post',
      },
      post?.cid ?? 'missing',
    ),
}));

let container: HTMLDivElement;
let root: Root;

const ModQueueWithLeaveButton = () => {
  const navigate = useNavigate();
  return createElement(
    React.Fragment,
    {},
    createElement('button', { type: 'button', 'data-testid': 'leave-route', onClick: () => navigate('/other') }, 'leave'),
    createElement(ModQueueView),
  );
};

const renderModQueue = async () => {
  await act(async () => {
    root.render(
      createElement(
        MemoryRouter,
        { initialEntries: ['/mod/queue'] },
        createElement(Routes, {}, createElement(Route, { path: '/mod/queue', element: createElement(ModQueueView) })),
      ),
    );
  });
};

const renderModQueueWithOtherRoute = async () => {
  await act(async () => {
    root.render(
      createElement(
        MemoryRouter,
        { initialEntries: ['/mod/queue'] },
        createElement(
          Routes,
          {},
          createElement(Route, { path: '/mod/queue', element: createElement(ModQueueWithLeaveButton) }),
          createElement(Route, {
            path: '/other',
            element: createElement('div', {}, createElement(Link, { to: '/mod/queue' }, 'queue'), createElement('span', {}, 'other route')),
          }),
        ),
      ),
    );
  });
};

describe('ModQueueView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    testState.accountCommunityAddresses = ['music-posting.eth'];
    testState.directories = [{ address: 'music-posting.eth', directoryCode: 'mu', title: '/mu/ - Music' }];
    testState.dismissedCommentCids = [];
    testState.feed = [];
    testState.hasMore = false;
    testState.isMobile = false;
    testState.queuedCommentHistory = [];
    testState.viewMode = 'compact';

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

  it('keeps the compact table hidden while an empty mod queue is still loading', async () => {
    testState.hasMore = true;

    await renderModQueue();

    expect(container.querySelector('[data-testid="loading-ellipsis"]')?.textContent).toBe('loading_mod_queue');
    expect(container.textContent).not.toContain('No.');
    expect(container.textContent).not.toContain('queue_is_empty');
  });

  it('keeps the compact table visible and renders the empty state under its header after loading', async () => {
    testState.hasMore = false;

    await renderModQueue();

    const text = container.textContent ?? '';
    expect(text).toContain('No.');
    expect(text).toContain('excerpt');
    expect(text).toContain('queue_is_empty');
    expect(text.indexOf('No.')).toBeLessThan(text.indexOf('queue_is_empty'));
  });

  it('resets the board summary selection to all after leaving and returning to the route', async () => {
    testState.accountCommunityAddresses = ['music-posting.eth', 'sports-posting.eth'];
    testState.directories = [
      { address: 'music-posting.eth', directoryCode: 'mu', title: '/mu/ - Music' },
      { address: 'sports-posting.eth', directoryCode: 'sp', title: '/sp/ - Sports' },
    ];
    testState.feed = [
      {
        cid: 'music-pending',
        communityAddress: 'music-posting.eth',
        content: 'music pending body',
        pendingApproval: true,
        timestamp: 90_000,
      },
      {
        cid: 'sports-pending',
        communityAddress: 'sports-posting.eth',
        content: 'sports pending body',
        pendingApproval: true,
        timestamp: 90_000,
      },
    ];

    await renderModQueueWithOtherRoute();

    const musicButton = Array.from(container.querySelectorAll<HTMLButtonElement>('button')).find((button) => button.textContent?.includes('mu'));
    expect(musicButton).toBeTruthy();

    await act(async () => {
      musicButton?.click();
    });

    expect(Array.from(container.querySelectorAll<HTMLButtonElement>('button')).find((button) => button.textContent?.includes('mu'))?.className).toContain(
      'boardSummaryLinkSelected',
    );

    await act(async () => {
      container.querySelector<HTMLButtonElement>('[data-testid="leave-route"]')?.click();
    });
    expect(container.textContent).toContain('other route');

    await act(async () => {
      container.querySelector<HTMLAnchorElement>('a[href="/mod/queue"]')?.click();
    });

    const allButton = Array.from(container.querySelectorAll<HTMLButtonElement>('button')).find((button) => button.textContent?.includes('all'));
    expect(allButton?.className).toContain('boardSummaryLinkSelected');
    expect(Array.from(container.querySelectorAll<HTMLButtonElement>('button')).find((button) => button.textContent?.includes('mu'))?.className).not.toContain(
      'boardSummaryLinkSelected',
    );
  });

  it('opens a full floating post preview from a compact excerpt hover', async () => {
    testState.feed = [
      {
        cid: 'pending-reply',
        communityAddress: 'music-posting.eth',
        content: 'pending reply body',
        number: 7,
        pendingApproval: true,
        timestamp: 90_000,
      },
    ];

    await renderModQueue();

    const excerptLink = Array.from(container.querySelectorAll<HTMLAnchorElement>('a')).find((link) => link.textContent === 'pending reply body');
    expect(excerptLink).toBeTruthy();
    expect(document.body.querySelector('[data-mod-queue-excerpt-preview="true"]')).toBeNull();

    await act(async () => {
      excerptLink?.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
    });

    const previewPost = document.body.querySelector('[data-mod-queue-excerpt-preview="true"] [data-testid="mod-queue-feed-post"]');
    expect(previewPost?.getAttribute('data-cid')).toBe('pending-reply');
    // Rendered like a quote-link hover preview: a clean read-only Post, not the
    // mod-queue feed layout (no leading <hr>, no inline approve/reject buttons).
    expect(previewPost?.getAttribute('data-is-mod-queue')).toBe('false');
    expect(previewPost?.getAttribute('data-show-replies')).toBe('false');
  });

  it('caps long content in the floating preview so the hover card stays compact', async () => {
    testState.feed = [
      {
        cid: 'long-post',
        communityAddress: 'music-posting.eth',
        content: 'x'.repeat(500),
        number: 9,
        pendingApproval: true,
        timestamp: 90_000,
      },
    ];

    await renderModQueue();

    const excerptLink = Array.from(container.querySelectorAll<HTMLAnchorElement>('a')).find((link) => link.textContent?.startsWith('xxx'));
    expect(excerptLink).toBeTruthy();

    await act(async () => {
      excerptLink?.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
    });

    const previewPost = document.body.querySelector('[data-mod-queue-excerpt-preview="true"] [data-testid="mod-queue-feed-post"]');
    const previewContent = previewPost?.getAttribute('data-content') ?? '';
    // 350-char cap + a single ellipsis character (shorter than the feed's 1000).
    expect(previewContent.length).toBe(351);
    expect(previewContent.endsWith('…')).toBe(true);
  });
});
