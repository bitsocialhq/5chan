import * as React from 'react';
import { createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import PendingPost from '../pending-post';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
const act = (React as { act?: (cb: () => void | Promise<void>) => void | Promise<void> }).act as (cb: () => void | Promise<void>) => void | Promise<void>;

type TestComment = {
  cid?: string;
  communityAddress?: string;
  index?: number;
};

const testState = vi.hoisted(() => ({
  accountCommentIndex: undefined as string | undefined,
  accountCommentLookupOptions: undefined as { commentIndex?: number } | undefined,
  accountComments: [] as TestComment[],
  challengeCount: 0,
  directories: [] as Array<{ address: string; title?: string }>,
  getBoardPathMock: vi.fn<(address: string) => string>(),
  locationState: null as { boardPath?: string } | null,
  navigateMock: vi.fn(),
  post: undefined as TestComment | undefined,
  retryingAccountCommentIndex: null as number | null,
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useLocation: () => ({
      state: testState.locationState,
    }),
    useNavigate: () => testState.navigateMock,
    useParams: () => ({
      accountCommentIndex: testState.accountCommentIndex,
    }),
  };
});

vi.mock('@bitsocial/bitsocial-react-hooks', () => ({
  useAccount: () => undefined,
  useAccountComment: (options?: { commentIndex?: number }) => {
    testState.accountCommentLookupOptions = options;
    return testState.post;
  },
  useAccountComments: () => ({
    accountComments: testState.accountComments,
  }),
}));

vi.mock('../../../hooks/use-directories', () => ({
  useDirectories: () => testState.directories,
}));

vi.mock('../../../lib/utils/route-utils', () => ({
  getBoardPath: (address: string) => testState.getBoardPathMock(address),
}));

vi.mock('../../../stores/use-challenges-store', () => ({
  default: (selector: (state: { challenges: unknown[] }) => unknown) => selector({ challenges: Array.from({ length: testState.challengeCount }) }),
}));

vi.mock('../../../stores/use-failed-post-retry-store', () => ({
  default: (selector: (state: { retryingAccountCommentIndex: number | null }) => unknown) =>
    selector({ retryingAccountCommentIndex: testState.retryingAccountCommentIndex }),
}));

vi.mock('../../post/post', () => ({
  Post: ({ post }: { post?: TestComment }) => createElement('div', { 'data-testid': 'post-view' }, post?.cid ?? 'no-post'),
}));

let container: HTMLDivElement;
let root: Root;
const scrollToMock = vi.fn();
const originalScrollTo = window.scrollTo;

const flushEffects = async (count = 4) => {
  for (let i = 0; i < count; i += 1) {
    await act(async () => {
      await Promise.resolve();
    });
  }
};

const renderPendingPost = async () => {
  await act(async () => {
    root.render(createElement(PendingPost));
  });
  await flushEffects();
};

describe('PendingPost', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    testState.accountCommentIndex = undefined;
    testState.accountCommentLookupOptions = undefined;
    testState.accountComments = [];
    testState.challengeCount = 0;
    testState.directories = [];
    testState.getBoardPathMock.mockReset();
    testState.locationState = null;
    testState.navigateMock.mockReset();
    testState.post = undefined;
    testState.retryingAccountCommentIndex = null;

    window.scrollTo = scrollToMock;

    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    window.scrollTo = originalScrollTo;
  });

  it('renders the pending post and scrolls to the top for valid indices', async () => {
    testState.accountCommentIndex = '0';
    testState.accountComments = [{}];
    testState.post = {
      communityAddress: 'music-posting.eth',
    };

    await renderPendingPost();

    expect(scrollToMock).toHaveBeenCalledWith(0, 0);
    expect(container.querySelector('[data-testid="post-view"]')?.textContent).toBe('no-post');
    expect(testState.navigateMock).not.toHaveBeenCalledWith('/not-found', { replace: true });
  });

  it('passes normalized numeric-string pending indices to the account comment lookup', async () => {
    testState.accountCommentIndex = '01';
    testState.accountComments = [{}, {}];

    await renderPendingPost();

    expect(testState.accountCommentLookupOptions).toEqual({ commentIndex: 1 });
    expect(testState.navigateMock).not.toHaveBeenCalledWith('/not-found', { replace: true });
  });

  it('redirects invalid pending indices to not found', async () => {
    testState.accountCommentIndex = '-1';
    testState.accountComments = [{}, {}];

    await renderPendingPost();

    expect(testState.navigateMock).toHaveBeenCalledWith('/not-found', { replace: true });
  });

  it('redirects malformed pending indices to not found', async () => {
    testState.accountCommentIndex = '1abc';
    testState.accountComments = [{}, {}];

    await renderPendingPost();

    expect(testState.navigateMock).toHaveBeenCalledWith('/not-found', { replace: true });
  });

  it('redirects out-of-range pending indices to not found', async () => {
    testState.accountCommentIndex = '2';
    testState.accountComments = [{}, {}];

    await renderPendingPost();

    expect(testState.navigateMock).toHaveBeenCalledWith('/not-found', { replace: true });
  });

  it('keeps sparse pending account comment indices addressable', async () => {
    testState.accountCommentIndex = '1';
    testState.accountComments = [{ index: 1 }];
    testState.post = {
      communityAddress: 'music-posting.eth',
      index: 1,
    };

    await renderPendingPost();

    expect(container.querySelector('[data-testid="post-view"]')?.textContent).toBe('no-post');
    expect(testState.navigateMock).not.toHaveBeenCalledWith('/not-found', { replace: true });
  });

  it('redirects abandoned pending posts back to their board after the challenge closes', async () => {
    testState.accountCommentIndex = '0';
    testState.accountComments = [];
    testState.challengeCount = 1;
    testState.locationState = { boardPath: 'mu' };
    testState.post = { index: 0 };

    await renderPendingPost();

    expect(testState.navigateMock).not.toHaveBeenCalled();

    testState.challengeCount = 0;
    testState.navigateMock.mockClear();

    await renderPendingPost();

    expect(testState.navigateMock).toHaveBeenCalledWith('/mu', { replace: true });
  });

  it('keeps a mid-retry pending post in place while the failed row is deleted and republished', async () => {
    testState.accountCommentIndex = '0';
    testState.accountComments = [];
    testState.challengeCount = 0;
    testState.locationState = { boardPath: 'mu' };
    testState.post = undefined;
    testState.retryingAccountCommentIndex = 0;

    await renderPendingPost();

    expect(testState.navigateMock).not.toHaveBeenCalled();
  });

  it('redirects missing sparse pending account comment indices to not found', async () => {
    testState.accountCommentIndex = '0';
    testState.accountComments = [{ index: 1 }];

    await renderPendingPost();

    expect(testState.navigateMock).toHaveBeenCalledWith('/not-found', { replace: true });
  });

  it('redirects resolved pending posts to the canonical thread route', async () => {
    testState.accountCommentIndex = '1';
    testState.accountComments = [{}, {}];
    testState.directories = [{ address: 'music-posting.eth', title: '/mu/ - Music' }];
    testState.getBoardPathMock.mockReturnValue('mu');
    testState.post = {
      cid: 'post-cid',
      communityAddress: 'music-posting.eth',
    };

    await renderPendingPost();

    expect(testState.getBoardPathMock).toHaveBeenCalledWith('music-posting.eth');
    expect(testState.navigateMock).toHaveBeenCalledWith('/mu/thread/post-cid', { replace: true });
  });
});
