import * as React from 'react';
import { createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import useFreshReplies from '../use-fresh-replies';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
const act = (React as { act?: (cb: () => void | Promise<void>) => void | Promise<void> }).act as (cb: () => void | Promise<void>) => void | Promise<void>;

type TestComment = {
  cid?: string;
  content?: string;
  index?: number;
  number?: number;
  parentCid?: string;
  pendingApproval?: boolean;
  postCid?: string;
  communityAddress?: string;
};

const testState = vi.hoisted(() => ({
  accountComments: [] as TestComment[],
  accountCommentsCalls: [] as Array<{ commentIndices?: number[]; filter?: (comment: TestComment) => boolean } | undefined>,
  post: undefined as TestComment | undefined,
  replies: [] as TestComment[],
}));

vi.mock('@bitsocial/bitsocial-react-hooks', () => ({
  useAccountComments: (options?: { commentIndices?: number[]; filter?: (comment: TestComment) => boolean }) => {
    testState.accountCommentsCalls.push(options);

    if (!options?.commentIndices?.length) {
      const accountComments = options?.filter ? testState.accountComments.filter(options.filter) : testState.accountComments;
      return { accountComments };
    }

    const normalizedCommentIndices = options.commentIndices.filter((commentIndex) => Number.isInteger(commentIndex) && commentIndex >= 0);

    const accountComments = normalizedCommentIndices
      .map((commentIndex) => testState.accountComments.find((accountComment) => accountComment.index === commentIndex))
      .filter(Boolean);

    return { accountComments };
  },
}));

let container: HTMLDivElement;
let latestValue: ReturnType<typeof useFreshReplies>;
let root: Root;

const HookHarness = () => {
  latestValue = useFreshReplies(testState.replies as never, { post: testState.post as never });
  return null;
};

const renderHook = () => {
  act(() => {
    root.render(createElement(HookHarness));
  });
};

describe('useFreshReplies', () => {
  beforeEach(() => {
    testState.accountComments = [];
    testState.accountCommentsCalls = [];
    testState.post = undefined;
    testState.replies = [];

    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  it('replaces stale indexed replies with the latest account comment objects', () => {
    testState.replies = [
      {
        cid: 'reply-cid',
        content: 'stale reply',
        index: 3,
        number: undefined,
        communityAddress: 'music.eth',
      },
      {
        cid: 'network-reply-cid',
        content: 'network reply',
        communityAddress: 'music.eth',
      },
    ];
    testState.accountComments = [
      {
        cid: 'reply-cid',
        content: 'fresh reply',
        index: 3,
        number: 27,
        communityAddress: 'music.eth',
      },
    ];

    renderHook();

    expect(latestValue[0]).toBe(testState.accountComments[0] as never);
    expect(latestValue[0]?.number).toBe(27);
    expect(latestValue[1]).toBe(testState.replies[1] as never);
    expect(testState.accountCommentsCalls).toContainEqual({ commentIndices: [3] });

    testState.accountComments = [
      {
        ...testState.accountComments[0],
        number: 28,
      },
    ];

    renderHook();

    expect(latestValue[0]?.number).toBe(28);
  });

  it('dedupes retried local replies when a stale reply and fresh reply share index 0', () => {
    testState.replies = [
      {
        content: 'stale failed reply',
        index: 0,
        communityAddress: 'music.eth',
      },
      {
        content: 'duplicate stale failed reply',
        index: 0,
        communityAddress: 'music.eth',
      },
    ];
    testState.accountComments = [
      {
        content: 'retried pending reply',
        index: 0,
        number: 99,
        communityAddress: 'music.eth',
      },
    ];

    renderHook();

    expect(latestValue).toHaveLength(1);
    expect(latestValue[0]).toBe(testState.accountComments[0] as never);
    expect(testState.accountCommentsCalls).toContainEqual({ commentIndices: [0] });
  });

  it('replaces unindexed replies with account comments matched by cid', () => {
    testState.replies = [
      {
        cid: 'reply-cid',
        content: 'stale reply',
        communityAddress: 'music.eth',
      },
      {
        cid: 'network-reply-cid',
        content: 'network reply',
        communityAddress: 'music.eth',
      },
    ];
    testState.accountComments = [
      {
        cid: 'reply-cid',
        content: 'fresh reply',
        index: 5,
        number: 27,
        communityAddress: 'music.eth',
      },
    ];

    renderHook();

    expect(latestValue[0]).toBe(testState.accountComments[0] as never);
    expect(latestValue[0]?.number).toBe(27);
    expect(latestValue[1]).toBe(testState.replies[1] as never);
    expect(testState.accountCommentsCalls).toContainEqual({ commentIndices: [-1] });
    expect(testState.accountCommentsCalls).toContainEqual({ filter: expect.any(Function) });
  });

  it('orders replies by final post number after a pending reply is approved', () => {
    testState.replies = [
      {
        cid: 'reply-8',
        index: 8,
        number: 8,
        communityAddress: 'music.eth',
      },
      {
        cid: 'reply-12',
        index: 12,
        number: 12,
        communityAddress: 'music.eth',
      },
      {
        cid: 'pending-reply',
        index: 11,
        number: undefined,
        pendingApproval: true,
        communityAddress: 'music.eth',
      },
    ];
    testState.accountComments = [
      {
        cid: 'reply-11',
        index: 11,
        number: 11,
        communityAddress: 'music.eth',
      },
    ];

    renderHook();

    expect(latestValue.map((reply) => reply.cid)).toEqual(['reply-8', 'reply-11', 'reply-12']);
    expect(testState.accountCommentsCalls).toContainEqual({ commentIndices: [8, 12, 11] });
  });

  it('orders already-numbered replies when an approved queued reply was appended', () => {
    testState.replies = [
      {
        cid: 'reply-8',
        number: 8,
        communityAddress: 'music.eth',
      },
      {
        cid: 'reply-12',
        number: 12,
        communityAddress: 'music.eth',
      },
      {
        cid: 'reply-11',
        number: 11,
        communityAddress: 'music.eth',
      },
    ];

    renderHook();

    expect(latestValue.map((reply) => reply.cid)).toEqual(['reply-8', 'reply-11', 'reply-12']);
  });

  it('does not replace a failed reply placeholder with a same-index post from another thread', () => {
    testState.post = {
      cid: 'g-thread-cid',
      communityAddress: 'technology.eth',
    };
    testState.replies = [
      {
        content: 'failed g reply',
        index: 4,
        parentCid: 'g-thread-cid',
        postCid: 'g-thread-cid',
        communityAddress: 'technology.eth',
      },
    ];
    testState.accountComments = [
      {
        cid: 'mu-thread-cid',
        content: 'mu op',
        index: 4,
        postCid: 'mu-thread-cid',
        communityAddress: 'music.eth',
      },
    ];

    renderHook();

    expect(latestValue).toHaveLength(1);
    expect(latestValue[0]).toBe(testState.replies[0] as never);
    expect(latestValue[0]?.content).toBe('failed g reply');
    expect(testState.accountCommentsCalls).toContainEqual({ commentIndices: [4] });
  });

  it('replaces indexed replies when the account comment still belongs to the same thread', () => {
    testState.post = {
      cid: 'thread-cid',
      communityAddress: 'music.eth',
    };
    testState.replies = [
      {
        content: 'pending reply',
        index: 5,
        parentCid: 'thread-cid',
        postCid: 'thread-cid',
        communityAddress: 'music.eth',
      },
    ];
    testState.accountComments = [
      {
        cid: 'reply-cid',
        content: 'fresh reply',
        index: 5,
        number: 9,
        parentCid: 'thread-cid',
        postCid: 'thread-cid',
        communityAddress: 'music.bso',
      },
    ];

    renderHook();

    expect(latestValue[0]).toBe(testState.accountComments[0] as never);
    expect(latestValue[0]?.number).toBe(9);
  });
});
