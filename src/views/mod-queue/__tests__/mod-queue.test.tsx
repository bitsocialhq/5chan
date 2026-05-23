import * as React from 'react';
import { createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ModQueueView from '../mod-queue';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
const act = (React as { act?: (callback: () => void | Promise<void>) => void | Promise<void> }).act as (callback: () => void | Promise<void>) => void | Promise<void>;

type TestComment = {
  cid: string;
  communityAddress?: string;
  pendingApproval?: boolean;
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
  selectedBoardFilter: null as string | null,
  setResetFunctionMock: vi.fn(),
  viewMode: 'compact' as 'compact' | 'feed',
}));

const getModQueueState = () => ({
  dismissedCommentCids: testState.dismissedCommentCids,
  dismissCommentFromQueue: vi.fn(),
  getAlertThresholdSeconds: () => 6 * 60 * 60,
  queuedCommentHistory: testState.queuedCommentHistory,
  rememberCommentsInQueue: testState.rememberCommentsInQueueMock,
  selectedBoardFilter: testState.selectedBoardFilter,
  setSelectedBoardFilter: vi.fn(),
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

vi.mock('../../../components/footer', () => ({
  PageFooterDesktop: ({ firstRow }: { firstRow: React.ReactNode }) => createElement('div', { 'data-testid': 'footer-desktop' }, firstRow),
  PageFooterMobile: ({ children }: { children: React.ReactNode }) => createElement('div', { 'data-testid': 'footer-mobile' }, children),
  StyleOnlyFooterFirstRow: () => createElement('div', { 'data-testid': 'style-footer-row' }),
}));

vi.mock('../../../components/loading-ellipsis', () => ({
  default: ({ string }: { string: string }) => createElement('div', { 'data-testid': 'loading-ellipsis' }, string),
}));

vi.mock('../../../components/tooltip', () => ({
  default: ({ children }: { children: React.ReactNode }) => createElement(React.Fragment, {}, children),
}));

vi.mock('../../post/post', () => ({
  Post: () => createElement('div', { 'data-testid': 'mod-queue-feed-post' }),
}));

let container: HTMLDivElement;
let root: Root;

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

describe('ModQueueView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    testState.dismissedCommentCids = [];
    testState.feed = [];
    testState.hasMore = false;
    testState.isMobile = false;
    testState.queuedCommentHistory = [];
    testState.selectedBoardFilter = null;
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
});
