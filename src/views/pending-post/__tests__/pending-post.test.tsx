import * as React from 'react';
import { createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import usePendingPostNavigationStore from '../../../stores/use-pending-post-navigation-store';
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
  accountCommentsState: 'succeeded',
  challengeCount: 0,
  directories: [] as Array<{ address: string; title?: string }>,
  getBoardPathMock: vi.fn<(address: string) => string>(),
  locationState: null as { boardPath?: string; pendingPost?: TestComment } | null,
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
    state: testState.accountCommentsState,
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
    testState.accountCommentsState = 'succeeded';
    testState.challengeCount = 0;
    testState.directories = [];
    testState.getBoardPathMock.mockReset();
    testState.locationState = null;
    testState.navigateMock.mockReset();
    testState.post = undefined;
    testState.retryingAccountCommentIndex = null;
    usePendingPostNavigationStore.getState().clearPendingPostNavigation();

    window.scrollTo = scrollToMock;

    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    usePendingPostNavigationStore.getState().clearPendingPostNavigation();
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

  it('does not register the scroll helper return value as an effect cleanup', async () => {
    scrollToMock.mockReturnValueOnce({});
    testState.accountCommentIndex = '0';
    testState.accountComments = [{}];
    testState.post = {
      communityAddress: 'music-posting.eth',
    };

    await renderPendingPost();

    expect(() => {
      act(() => root.unmount());
    }).not.toThrow();
    root = createRoot(container);
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
    testState.locationState = { boardPath: 'mu' };

    await renderPendingPost();

    expect(testState.navigateMock).toHaveBeenCalledWith('/not-found', { replace: true });
    expect(testState.navigateMock).not.toHaveBeenCalledWith('/mu', { replace: true });
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

  it('renders the route pending post before the account store update arrives', async () => {
    testState.accountCommentIndex = '2';
    testState.accountComments = [{ index: 0 }, { index: 1 }];
    testState.locationState = {
      boardPath: 'mu',
      pendingPost: {
        communityAddress: 'music-posting.eth',
        index: 2,
      },
    };
    testState.post = { index: 2 };
    usePendingPostNavigationStore.getState().beginPendingPostNavigation(2);

    await renderPendingPost();

    expect(container.querySelector('[data-testid="post-view"]')).not.toBeNull();
    expect(testState.navigateMock).not.toHaveBeenCalledWith('/not-found', { replace: true });
  });

  it('does not revive the route fallback after the stored post is abandoned', async () => {
    testState.accountCommentIndex = '2';
    testState.locationState = {
      boardPath: 'mu',
      pendingPost: { communityAddress: 'music-posting.eth', index: 2 },
    };
    usePendingPostNavigationStore.getState().beginPendingPostNavigation(2);

    await renderPendingPost();
    expect(container.querySelector('[data-testid="post-view"]')).not.toBeNull();

    testState.post = { communityAddress: 'music-posting.eth', index: 2 };
    await renderPendingPost();

    testState.post = undefined;
    testState.navigateMock.mockClear();
    await renderPendingPost();

    expect(container.querySelector('[data-testid="post-view"]')).toBeNull();
    expect(testState.navigateMock).toHaveBeenCalledWith('/mu', { replace: true });
  });

  it('uses a fresh optimistic handoff when the pending route index changes without remounting', async () => {
    testState.accountCommentIndex = '0';
    testState.accountComments = [{ index: 0 }];
    testState.locationState = {
      boardPath: 'mu',
      pendingPost: { communityAddress: 'music-posting.eth', index: 0 },
    };
    testState.post = { communityAddress: 'music-posting.eth', index: 0 };
    usePendingPostNavigationStore.getState().beginPendingPostNavigation(0);

    await renderPendingPost();

    testState.accountCommentIndex = '1';
    testState.locationState = {
      boardPath: 'mu',
      pendingPost: { communityAddress: 'music-posting.eth', index: 1 },
    };
    testState.post = undefined;
    testState.navigateMock.mockClear();
    usePendingPostNavigationStore.getState().beginPendingPostNavigation(1);

    await renderPendingPost();

    expect(container.querySelector('[data-testid="post-view"]')).not.toBeNull();
    expect(testState.navigateMock).not.toHaveBeenCalledWith('/not-found', { replace: true });
  });

  it('does not keep stale optimistic route state after a reload clears the live handoff', async () => {
    testState.accountCommentIndex = '2';
    testState.accountComments = [{ index: 0 }, { index: 1 }];
    testState.locationState = {
      boardPath: 'mu',
      pendingPost: { communityAddress: 'music-posting.eth', index: 2 },
    };
    testState.post = undefined;

    await renderPendingPost();

    expect(container.querySelector('[data-testid="post-view"]')).toBeNull();
    expect(testState.navigateMock).toHaveBeenCalledWith('/mu', { replace: true });
  });

  it('keeps a persisted failed post visible after its optimistic handoff is cleared', async () => {
    testState.accountCommentIndex = '2';
    testState.accountComments = [{ index: 0 }, { index: 1 }, { index: 2 }];
    testState.locationState = {
      boardPath: 'mu',
      pendingPost: { communityAddress: 'music-posting.eth', index: 2 },
    };
    testState.post = { communityAddress: 'music-posting.eth', index: 2 };

    await renderPendingPost();

    expect(container.querySelector('[data-testid="post-view"]')).not.toBeNull();
    expect(testState.navigateMock).not.toHaveBeenCalledWith('/mu', { replace: true });
    expect(testState.navigateMock).not.toHaveBeenCalledWith('/not-found', { replace: true });
  });

  it('restores cached feed rendering only after the pending post has painted', async () => {
    const frameCallbacks: FrameRequestCallback[] = [];
    const requestAnimationFrameSpy = vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
      frameCallbacks.push(callback);
      return frameCallbacks.length;
    });
    const cancelAnimationFrameSpy = vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => undefined);
    testState.accountCommentIndex = '0';
    testState.accountComments = [{}];
    testState.post = { communityAddress: 'music-posting.eth', index: 0 };
    usePendingPostNavigationStore.getState().beginPendingPostNavigation(0);

    await renderPendingPost();

    expect(container.querySelector('[data-testid="post-view"]')).not.toBeNull();
    expect(usePendingPostNavigationStore.getState().isNavigatingToPendingPost).toBe(true);
    expect(frameCallbacks).toHaveLength(1);

    act(() => frameCallbacks.shift()?.(0));
    expect(usePendingPostNavigationStore.getState().isNavigatingToPendingPost).toBe(true);
    expect(frameCallbacks).toHaveLength(1);

    await act(async () => frameCallbacks.shift()?.(0));
    expect(usePendingPostNavigationStore.getState().isNavigatingToPendingPost).toBe(false);

    requestAnimationFrameSpy.mockRestore();
    cancelAnimationFrameSpy.mockRestore();
  });

  it('does not complete a newer pending handoff when the previous route cleans up', async () => {
    let frameId = 0;
    const requestAnimationFrameSpy = vi.spyOn(window, 'requestAnimationFrame').mockImplementation(() => ++frameId);
    const cancelAnimationFrameSpy = vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => undefined);

    try {
      testState.accountCommentIndex = '0';
      testState.accountComments = [{ index: 0 }];
      testState.locationState = { boardPath: 'mu', pendingPost: { communityAddress: 'music-posting.eth', index: 0 } };
      usePendingPostNavigationStore.getState().beginPendingPostNavigation(0);

      await renderPendingPost();

      testState.accountCommentIndex = '1';
      testState.accountComments = [{ index: 0 }, { index: 1 }];
      testState.locationState = { boardPath: 'mu', pendingPost: { communityAddress: 'music-posting.eth', index: 1 } };
      act(() => usePendingPostNavigationStore.getState().beginPendingPostNavigation(1));

      await renderPendingPost();

      expect(usePendingPostNavigationStore.getState()).toMatchObject({
        isNavigatingToPendingPost: true,
        pendingPostNavigationIndex: 1,
      });
    } finally {
      requestAnimationFrameSpy.mockRestore();
      cancelAnimationFrameSpy.mockRestore();
    }
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
    expect(container.querySelector('[data-testid="post-view"]')).toBeNull();
  });

  it('redirects addressless pending placeholders after their live handoff is cleared', async () => {
    testState.accountCommentIndex = '0';
    testState.accountComments = [{ index: 0 }];
    testState.locationState = { boardPath: 'mu' };
    testState.post = { index: 0 };
    usePendingPostNavigationStore.getState().beginPendingPostNavigation(0);

    await renderPendingPost();

    expect(testState.navigateMock).not.toHaveBeenCalled();

    usePendingPostNavigationStore.getState().clearPendingPostNavigation(0);
    testState.navigateMock.mockClear();

    await renderPendingPost();

    expect(testState.navigateMock).toHaveBeenCalledWith('/mu', { replace: true });
    expect(container.querySelector('[data-testid="post-view"]')).toBeNull();
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
