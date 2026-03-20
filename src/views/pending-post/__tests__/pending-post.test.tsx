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
};

const testState = vi.hoisted(() => ({
  accountCommentIndex: undefined as string | undefined,
  accountComments: [] as TestComment[],
  directories: [] as Array<{ address: string; title?: string }>,
  getBoardPathMock: vi.fn<(address: string) => string>(),
  navigateMock: vi.fn(),
  post: undefined as TestComment | undefined,
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => testState.navigateMock,
    useParams: () => ({
      accountCommentIndex: testState.accountCommentIndex,
    }),
  };
});

vi.mock('@bitsocialnet/bitsocial-react-hooks', () => ({
  useAccount: () => undefined,
  useAccountComment: () => testState.post,
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

vi.mock('../../post', () => ({
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
    testState.accountComments = [];
    testState.directories = [];
    testState.getBoardPathMock.mockReset();
    testState.navigateMock.mockReset();
    testState.post = undefined;

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
