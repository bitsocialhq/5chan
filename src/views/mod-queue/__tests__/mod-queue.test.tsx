import * as React from 'react';
import { createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { Link, MemoryRouter, Route, Routes, useNavigate } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ModQueueView from '../mod-queue';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
const act = (React as { act?: (callback: () => void | Promise<void>) => void | Promise<void> }).act as (callback: () => void | Promise<void>) => void | Promise<void>;

type TestComment = {
  approved?: boolean;
  author?: { displayName?: string };
  cid: string;
  content?: string;
  communityAddress?: string;
  flairs?: Array<Record<string, unknown>>;
  link?: string;
  number?: number;
  parentCid?: string;
  pendingApproval?: boolean;
  spoiler?: boolean;
  timestamp?: number;
  title?: string;
};

const testState = vi.hoisted(() => ({
  account: { author: { address: '0x123', shortAddress: '0x123' }, id: 'account', name: 'main' },
  accounts: [
    { author: { address: '0x123', shortAddress: '0x123' }, id: 'account', name: 'main' },
    { author: { address: '0x999', shortAddress: '0x999' }, id: 'throwaway-account', name: 'throwaway' },
  ],
  accountCommunityAddresses: ['music-posting.eth'],
  addChallengeMock: vi.fn(),
  communityError: null as Error | null,
  createAccountMock: vi.fn(),
  deleteAccountMock: vi.fn(),
  deleteCommentMock: vi.fn(),
  directories: [{ address: 'music-posting.eth', directoryCode: 'mu', title: '/mu/ - Music' }],
  dismissedCommentCids: [] as string[],
  feed: [] as TestComment[],
  hasMore: false,
  isMobile: false,
  loadMoreMock: vi.fn(),
  publishCommentMock: vi.fn(),
  publishCommentModerationActionMock: vi.fn(),
  publishCommentModerationMock: vi.fn(),
  queuedCommentHistory: [] as TestComment[],
  rememberCommentsInQueueMock: vi.fn(),
  resetMock: vi.fn(),
  setResetFunctionMock: vi.fn(),
  springStartMock: vi.fn(),
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
    t: (key: string, options?: Record<string, unknown>) => (key === 'modQueue.transferTitleWithNumber' ? `Transfer Post No.${options?.number}` : key),
  }),
}));

vi.mock('@bitsocial/bitsocial-react-hooks', () => ({
  useAccount: () => testState.account,
  useAccounts: () => ({ accounts: testState.accounts }),
  useCommunity: () => ({
    error: testState.communityError,
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
  default: (
    selector: (state: {
      accounts: Record<string, typeof testState.account>;
      accountsActions: {
        createAccount: typeof testState.createAccountMock;
        deleteAccount: typeof testState.deleteAccountMock;
        deleteComment: typeof testState.deleteCommentMock;
        publishComment: typeof testState.publishCommentMock;
        publishCommentModeration: typeof testState.publishCommentModerationActionMock;
      };
      accountsEditsSummaries: Record<string, Record<string, unknown>>;
      activeAccountId: string;
    }) => unknown,
  ) =>
    selector({
      accounts: { account: testState.account },
      accountsActions: {
        createAccount: testState.createAccountMock,
        deleteAccount: testState.deleteAccountMock,
        deleteComment: testState.deleteCommentMock,
        publishComment: testState.publishCommentMock,
        publishCommentModeration: testState.publishCommentModerationActionMock,
      },
      accountsEditsSummaries: { account: {} },
      activeAccountId: 'account',
    }),
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

vi.mock('@react-spring/web', async () => {
  const React = await vi.importActual<typeof import('react')>('react');
  const normalizeStyle = (style: Record<string, unknown> | undefined) =>
    style
      ? Object.fromEntries(
          Object.entries(style).map(([key, value]) => [
            key,
            typeof value === 'object' && value !== null && 'get' in value && typeof (value as { get: unknown }).get === 'function'
              ? (value as { get: () => unknown }).get()
              : value,
          ]),
        )
      : undefined;

  return {
    animated: {
      div: React.forwardRef(({ style, ...props }: any, ref) => React.createElement('div', { ...props, ref, style: normalizeStyle(style) })),
    },
    useSpring: () => [
      {
        left: { get: () => 120 },
        top: { get: () => 50 },
      },
      {
        start: testState.springStartMock,
      },
    ],
  };
});

vi.mock('@use-gesture/react', () => ({
  useDrag: () => () => ({}),
}));

vi.mock('react-virtuoso', () => ({
  Virtuoso: ({
    components,
    context,
    data = [],
    itemContent,
  }: {
    components?: { Footer?: React.ComponentType<{ context?: unknown }> };
    context?: unknown;
    data?: TestComment[];
    itemContent: (index: number, item: TestComment) => React.ReactNode;
  }) =>
    createElement(
      'div',
      { 'data-testid': 'virtuoso' },
      data.map((item, index) => createElement(React.Fragment, { key: item.cid }, itemContent(index, item))),
      components?.Footer ? createElement(components.Footer, { context }) : null,
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
  areStringArraysEqual: (previous: readonly string[] | undefined, next: readonly string[] | undefined) =>
    previous === next || (!!previous && !!next && previous.length === next.length && previous.every((value, index) => value === next[index])),
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
  getFallbackDirectoriesData: () => ({ communities: testState.directories }),
  normalizeBoardAddress: (address: string) => address.replace(/(\.bso|\.eth)$/, ''),
  useDirectories: () => testState.directories,
}));

vi.mock('../../../hooks/use-is-mobile', () => ({
  default: () => testState.isMobile,
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
    testState.account = { author: { address: '0x123', shortAddress: '0x123' }, id: 'account', name: 'main' };
    testState.accounts = [
      { author: { address: '0x123', shortAddress: '0x123' }, id: 'account', name: 'main' },
      { author: { address: '0x999', shortAddress: '0x999' }, id: 'throwaway-account', name: 'throwaway' },
    ];
    testState.accountCommunityAddresses = ['music-posting.eth'];
    testState.communityError = null;
    testState.directories = [{ address: 'music-posting.eth', directoryCode: 'mu', title: '/mu/ - Music' }];
    testState.dismissedCommentCids = [];
    testState.feed = [];
    testState.hasMore = false;
    testState.isMobile = false;
    testState.createAccountMock.mockResolvedValue(undefined);
    testState.deleteAccountMock.mockResolvedValue(undefined);
    testState.publishCommentMock.mockResolvedValue({ index: 12 });
    testState.publishCommentModerationActionMock.mockResolvedValue(undefined);
    testState.queuedCommentHistory = [];
    testState.springStartMock.mockReset();
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

  it('keeps the compact table visible with the empty state while an empty mod queue continues loading', async () => {
    testState.hasMore = true;

    await renderModQueue();

    const text = container.textContent ?? '';
    expect(text).toContain('No.');
    expect(text).toContain('excerpt');
    expect(text).toContain('queue_is_empty');
    expect(text.indexOf('No.')).toBeLessThan(text.indexOf('queue_is_empty'));
    expect(container.querySelector('[data-testid="loading-ellipsis"]')).toBeNull();
  });

  it('does not render a loading footer for an empty all-boards mod queue', async () => {
    testState.accountCommunityAddresses = ['music-posting.eth', 'tech-posting.eth'];
    testState.directories = [
      { address: 'music-posting.eth', directoryCode: 'mu', title: '/mu/ - Music' },
      { address: 'tech-posting.eth', directoryCode: 'g', title: '/g/ - Technology' },
    ];
    testState.hasMore = true;

    await renderModQueue();

    expect(container.textContent).toContain('queue_is_empty');
    expect(container.querySelector('[data-testid="loading-ellipsis"]')).toBeNull();
  });

  it('keeps the empty queue state quiet when background community metadata fails', async () => {
    testState.communityError = new Error('community unavailable');
    testState.hasMore = true;

    await renderModQueue();

    expect(container.textContent).toContain('queue_is_empty');
    expect(container.querySelector('[data-testid="error-display"]')).toBeNull();
    expect(container.querySelector('[data-testid="loading-ellipsis"]')).toBeNull();
  });

  it('shows a generic continuing load state after a queue item appears', async () => {
    testState.hasMore = true;
    testState.feed = [
      {
        cid: 'pending-reply',
        communityAddress: 'music-posting.eth',
        content: 'pending reply body',
        pendingApproval: true,
        timestamp: 90_000,
      },
    ];

    await renderModQueue();

    const loadingTexts = Array.from(container.querySelectorAll('[data-testid="loading-ellipsis"]')).map((element) => element.textContent);
    expect(container.textContent).toContain('pending reply body');
    expect(loadingTexts).toContain('looking_for_more_posts');
  });

  it('keeps the footer error visible when local queue history is shown while the live feed is empty', async () => {
    testState.communityError = new Error('community unavailable');
    testState.hasMore = true;
    testState.queuedCommentHistory = [
      {
        approved: true,
        cid: 'approved-history',
        communityAddress: 'music-posting.eth',
        content: 'recently approved body',
        pendingApproval: false,
        timestamp: 90_000,
      },
    ];

    await renderModQueue();

    const loadingTexts = Array.from(container.querySelectorAll('[data-testid="loading-ellipsis"]')).map((element) => element.textContent);
    expect(container.textContent).toContain('recently approved body');
    expect(container.querySelector('[data-testid="error-display"]')?.textContent).toBe('community unavailable');
    expect(loadingTexts).toContain('looking_for_more_posts');
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

  it('transfers a queued post to another board with a temporary account', async () => {
    testState.directories = [
      { address: 'music-posting.eth', directoryCode: 'mu', title: '/mu/ - Music' },
      { address: 'tech-posting.eth', directoryCode: 'g', title: '/g/ - Technology' },
      { address: 'anime-posting.eth', directoryCode: 'a', title: '/a/ - Anime & Manga' },
    ];
    testState.feed = [
      {
        author: { displayName: 'Original name' },
        cid: 'wrong-board-post',
        communityAddress: 'music-posting.eth',
        content: 'belongs on tech',
        flairs: [{ text: 'flag:country:auto', type: 'country' }, { text: 'flash:loop' }],
        link: 'https://example.com/image.png',
        number: 8,
        pendingApproval: true,
        spoiler: true,
        timestamp: 90_000,
        title: 'Wrong board',
      },
    ];

    await renderModQueue();

    const transferButton = Array.from(container.querySelectorAll<HTMLButtonElement>('button')).find((button) => button.textContent === 'transfer');
    expect(transferButton).toBeTruthy();

    await act(async () => {
      transferButton?.click();
    });

    const dialog = document.body.querySelector<HTMLElement>('[role="dialog"][aria-labelledby="post-transfer-title"]');
    expect(dialog?.textContent).toContain('Transfer Post No.8');
    expect(dialog?.textContent).toContain('/g/ - Technology');
    expect(dialog?.textContent).toContain('modQueue.transferRecreateNotice');
    expect(dialog?.textContent).toContain('modQueue.transferRepliesNotice');
    expect(dialog?.textContent).toContain('modQueue.transferTemporaryAccountNotice');
    expect(dialog?.textContent).not.toContain('modQueue.transferAccount');
    const targetSelect = dialog?.querySelector<HTMLSelectElement>('select');
    expect(Array.from(targetSelect?.options ?? []).map((option) => option.value)).toEqual(['', 'anime-posting.eth', 'tech-posting.eth']);

    await act(async () => {
      if (targetSelect) {
        targetSelect.value = 'tech-posting.eth';
        targetSelect.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });

    const submitButton = Array.from(dialog?.querySelectorAll<HTMLButtonElement>('button') ?? []).find((button) => button.type === 'submit');
    await act(async () => {
      submitButton?.click();
      await Promise.resolve();
    });

    expect(testState.createAccountMock).toHaveBeenCalledTimes(1);
    const temporaryAccountName = testState.createAccountMock.mock.calls[0][0];
    expect(temporaryAccountName).toEqual(expect.stringMatching(/^5chan-transfer-wrong-bo-/));
    expect(testState.publishCommentMock).toHaveBeenCalledTimes(1);
    const [payload, accountName] = testState.publishCommentMock.mock.calls[0];
    expect(accountName).toBe(temporaryAccountName);
    expect(payload).toMatchObject({
      communityAddress: 'tech-posting.eth',
      content: 'belongs on tech',
      flairs: [{ text: 'flash:loop' }],
      link: 'https://example.com/image.png',
      spoiler: true,
      title: 'Wrong board',
    });
    expect(payload.author).toBeUndefined();
    expect(typeof payload.onChallengeVerification).toBe('function');

    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => undefined);
    await act(async () => {
      await payload.onChallengeVerification({ challengeSuccess: false, reason: 'try again' }, { cid: 'retry-post', communityAddress: 'tech-posting.eth' });
      await Promise.resolve();
    });

    expect(alertSpy).toHaveBeenCalledTimes(1);
    expect(testState.publishCommentModerationActionMock).not.toHaveBeenCalled();
    expect(testState.deleteAccountMock).not.toHaveBeenCalled();
    expect(dialog?.textContent).toContain('publishing');
    alertSpy.mockRestore();

    await act(async () => {
      await payload.onChallengeVerification({ challengeSuccess: true, commentUpdate: { cid: 'transferred-post' } }, { cid: 'transferred-post' });
      await Promise.resolve();
    });

    expect(testState.publishCommentModerationActionMock).toHaveBeenCalledTimes(2);
    expect(testState.publishCommentModerationActionMock.mock.calls[0][0]).toMatchObject({
      commentCid: 'transferred-post',
      communityAddress: 'tech-posting.eth',
      commentModeration: {
        flairs: [{ text: 'flash:loop' }, { text: '5chan:transferred' }],
      },
    });
    expect(testState.publishCommentModerationActionMock.mock.calls[1][0]).toMatchObject({
      commentCid: 'wrong-board-post',
      communityAddress: 'music-posting.eth',
      commentModeration: {
        approved: false,
        reason: 'Moved to >>>/g/. Please read the rules.',
      },
    });
    expect(testState.deleteAccountMock).toHaveBeenCalledWith(temporaryAccountName);
    expect(dialog?.textContent).toContain('modQueue.transferSuccess');
  });

  it('does not show transfer for queued replies', async () => {
    testState.feed = [
      {
        cid: 'pending-reply',
        communityAddress: 'music-posting.eth',
        content: 'pending reply body',
        number: 7,
        parentCid: 'thread-cid',
        pendingApproval: true,
        timestamp: 90_000,
      },
    ];

    await renderModQueue();

    expect(Array.from(container.querySelectorAll<HTMLButtonElement>('button')).some((button) => button.textContent === 'transfer')).toBe(false);
  });

  it('keeps the transfer modal non-blocking and closes it with Escape', async () => {
    testState.directories = [
      { address: 'music-posting.eth', directoryCode: 'mu', title: '/mu/ - Music' },
      { address: 'tech-posting.eth', directoryCode: 'g', title: '/g/ - Technology' },
    ];
    testState.feed = [
      {
        cid: 'wrong-board-post',
        communityAddress: 'music-posting.eth',
        content: 'belongs on tech',
        number: 8,
        pendingApproval: true,
        timestamp: 90_000,
      },
    ];

    await renderModQueue();

    const transferButton = Array.from(container.querySelectorAll<HTMLButtonElement>('button')).find((button) => button.textContent === 'transfer');
    await act(async () => {
      transferButton?.click();
    });

    const dialog = document.body.querySelector<HTMLElement>('[role="dialog"][aria-labelledby="post-transfer-title"]');
    expect(dialog?.textContent).toContain('Transfer Post No.8');

    await act(async () => {
      dialog?.querySelector('form')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    expect(document.body.querySelector('[role="dialog"][aria-labelledby="post-transfer-title"]')).toBe(dialog);

    await act(async () => {
      document.body.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    expect(document.body.querySelector('[role="dialog"][aria-labelledby="post-transfer-title"]')).toBe(dialog);

    await act(async () => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    });
    expect(document.body.querySelector('[role="dialog"][aria-labelledby="post-transfer-title"]')).toBeNull();
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
