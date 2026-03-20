import * as React from 'react';
import { createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import useSafeAccountComment from '../use-safe-account-comment';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
const act = (React as { act?: (cb: () => void | Promise<void>) => void | Promise<void> }).act as (cb: () => void | Promise<void>) => void | Promise<void>;

const testState = vi.hoisted(() => ({
  account: undefined as { id?: string; name?: string } | undefined,
  accountCommentResult: { cid: 'account-comment' } as { cid?: string },
  calls: [] as Array<{ accountName?: string; commentCid?: string; commentIndex?: number }>,
  options: undefined as { accountName?: string; commentCid?: string; commentIndex?: number | string } | undefined,
}));

vi.mock('@bitsocialnet/bitsocial-react-hooks', () => ({
  useAccount: (options?: { accountName?: string }) => {
    if (!options?.accountName) {
      return testState.account;
    }

    return testState.account?.name === options.accountName ? testState.account : undefined;
  },
  useAccountComment: (options?: { accountName?: string; commentCid?: string; commentIndex?: number }) => {
    testState.calls.push(options || {});
    return testState.accountCommentResult;
  },
}));

let container: HTMLDivElement;
let latestValue: ReturnType<typeof useSafeAccountComment>;
let root: Root;

const HookHarness = () => {
  latestValue = useSafeAccountComment(testState.options);
  return null;
};

const renderHook = () => {
  act(() => {
    root.render(createElement(HookHarness));
  });
};

describe('useSafeAccountComment', () => {
  beforeEach(() => {
    testState.account = undefined;
    testState.accountCommentResult = { cid: 'account-comment' };
    testState.calls = [];
    testState.options = undefined;

    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  it('uses a sentinel lookup when there is no active account and no usable lookup input', () => {
    renderHook();

    expect(testState.calls).toEqual([{ commentIndex: -1 }]);
    expect(latestValue?.cid).toBe('account-comment');
  });

  it('normalizes numeric comment indices before delegating to useAccountComment', () => {
    testState.options = { commentIndex: '7' };

    renderHook();

    expect(testState.calls).toEqual([{ commentIndex: 7 }]);
  });

  it('falls back to the sentinel lookup for malformed string indices', () => {
    testState.options = { commentIndex: '7abc' };

    renderHook();

    expect(testState.calls).toEqual([{ commentIndex: -1 }]);
  });

  it('falls back to the sentinel lookup when cid lookup is requested before an account exists', () => {
    testState.options = { commentCid: 'reply-cid' };

    renderHook();

    expect(testState.calls).toEqual([{ commentIndex: -1 }]);
  });

  it('passes comment cid lookups through once the active account exists', () => {
    testState.account = { id: 'account-1', name: 'Account 1' };
    testState.options = { commentCid: 'reply-cid' };

    renderHook();

    expect(testState.calls).toEqual([{ commentCid: 'reply-cid' }]);
  });
});
