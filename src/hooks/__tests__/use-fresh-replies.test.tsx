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
  subplebbitAddress?: string;
};

const testState = vi.hoisted(() => ({
  accountComments: [] as TestComment[],
  accountCommentsCalls: [] as Array<{ commentIndices?: number[] } | undefined>,
  replies: [] as TestComment[],
}));

vi.mock('@bitsocialnet/bitsocial-react-hooks', () => ({
  useAccountComments: (options?: { commentIndices?: number[] }) => {
    testState.accountCommentsCalls.push(options);

    if (!options?.commentIndices?.length) {
      return {
        accountComments: testState.accountComments,
      };
    }

    const normalizedCommentIndices = options.commentIndices.filter((commentIndex) => Number.isInteger(commentIndex) && commentIndex >= 0);

    return {
      accountComments: normalizedCommentIndices
        .map((commentIndex) => testState.accountComments.find((accountComment) => accountComment.index === commentIndex))
        .filter(Boolean),
    };
  },
}));

let container: HTMLDivElement;
let latestValue: ReturnType<typeof useFreshReplies>;
let root: Root;

const HookHarness = () => {
  latestValue = useFreshReplies(testState.replies as never);
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
        subplebbitAddress: 'music.eth',
      },
      {
        cid: 'network-reply-cid',
        content: 'network reply',
        subplebbitAddress: 'music.eth',
      },
    ];
    testState.accountComments = [
      {
        cid: 'reply-cid',
        content: 'fresh reply',
        index: 3,
        number: 27,
        subplebbitAddress: 'music.eth',
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
});
