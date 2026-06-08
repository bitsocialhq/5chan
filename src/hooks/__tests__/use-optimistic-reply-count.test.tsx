import * as React from 'react';
import { createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import useOptimisticReplyCount from '../use-optimistic-reply-count';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
const act = (React as { act?: (cb: () => void | Promise<void>) => void | Promise<void> }).act as (cb: () => void | Promise<void>) => void | Promise<void>;

type TestAccountComment = {
  cid?: string;
  parentCid?: string;
  postCid?: string;
  state?: string;
  timestamp?: number;
  deleted?: boolean;
  removed?: boolean;
  communityAddress?: string;
};

const testState = vi.hoisted(() => ({
  accountComments: [] as TestAccountComment[],
  accountCommentsCalls: [] as Array<unknown>,
  post: undefined as Record<string, unknown> | undefined,
}));

vi.mock('@bitsocial/bitsocial-react-hooks', () => ({
  useAccountComments: (options?: unknown) => {
    testState.accountCommentsCalls.push(options);
    return { accountComments: testState.accountComments };
  },
}));

const THREAD_CID = 'thread-cid';
const COMMUNITY = 'music.eth';

const makeThread = (overrides: Record<string, unknown> = {}) => ({
  cid: THREAD_CID,
  communityAddress: COMMUNITY,
  replyCount: 1,
  updatedAt: 1000,
  ...overrides,
});

const makeReply = (overrides: TestAccountComment = {}): TestAccountComment => ({
  cid: 'reply-cid',
  parentCid: THREAD_CID,
  postCid: THREAD_CID,
  state: 'succeeded',
  timestamp: 1500,
  communityAddress: COMMUNITY,
  ...overrides,
});

let container: HTMLDivElement;
let latestValue: ReturnType<typeof useOptimisticReplyCount>;
let root: Root;

const HookHarness = () => {
  latestValue = useOptimisticReplyCount(testState.post as never);
  return null;
};

const renderHook = () => {
  act(() => {
    root.render(createElement(HookHarness));
  });
};

describe('useOptimisticReplyCount', () => {
  beforeEach(() => {
    testState.accountComments = [];
    testState.accountCommentsCalls = [];
    testState.post = makeThread();

    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  it('returns undefined while replyCount is still loading', () => {
    testState.post = makeThread({ replyCount: undefined });
    renderHook();
    expect(latestValue).toBeUndefined();
  });

  it('returns the protocol replyCount unchanged when there are no account replies', () => {
    renderHook();
    expect(latestValue).toBe(1);
  });

  it('optimistically adds a freshly published reply not yet folded into replyCount', () => {
    // Thread refreshed at 1000, the reply was published at 1500, so the propagated copy is not counted yet.
    testState.accountComments = [makeReply()];
    renderHook();
    expect(latestValue).toBe(2);
  });

  it('drops the optimistic bump once the post has refreshed past the reply', () => {
    // The community has since republished the post (updatedAt 2000 > 1500) with replyCount already at 2.
    testState.post = makeThread({ replyCount: 2, updatedAt: 2000 });
    testState.accountComments = [makeReply()];
    renderHook();
    expect(latestValue).toBe(2);
  });

  it('counts nested replies in the same thread but excludes the OP and other threads', () => {
    testState.accountComments = [
      makeReply({ cid: 'nested', parentCid: 'some-reply-cid', timestamp: 1500 }),
      makeReply({ cid: THREAD_CID, parentCid: undefined, postCid: THREAD_CID }), // OP itself
      makeReply({ cid: 'other-thread-reply', postCid: 'other-thread', parentCid: 'other-thread' }),
    ];
    renderHook();
    expect(latestValue).toBe(2); // 1 protocol + 1 nested reply
  });

  it('ignores replies that are pending, failed, deleted, or removed', () => {
    testState.accountComments = [
      makeReply({ cid: 'pending', state: 'pending' }),
      makeReply({ cid: undefined, state: 'succeeded' }), // no cid yet
      makeReply({ cid: 'failed', state: 'failed' }),
      makeReply({ cid: 'deleted', deleted: true }),
      makeReply({ cid: 'removed', removed: true }),
    ];
    renderHook();
    expect(latestValue).toBe(1);
  });

  it('counts multiple distinct fresh replies in the thread', () => {
    testState.accountComments = [makeReply({ cid: 'r1', timestamp: 1500 }), makeReply({ cid: 'r2', timestamp: 1600 })];
    renderHook();
    expect(latestValue).toBe(3);
  });
});
