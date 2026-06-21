import * as React from 'react';
import { createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import usePendingCommentModerationActions, { type UsePendingCommentModerationActionsOptions } from '../use-pending-comment-moderation-actions';
import { formatErrorForDisplay } from '../../lib/utils/error-utils';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
const act = (React as { act?: (cb: () => void | Promise<void>) => void | Promise<void> }).act as (cb: () => void | Promise<void>) => void | Promise<void>;

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

// One controllable fake per publisher. usePublishCommentModeration is called
// twice (approve + reject); we route by the commentModeration.approved flag.
const testState = vi.hoisted(() => ({
  approve: { publish: vi.fn(async () => undefined), state: 'initializing' as string, error: undefined as unknown, options: undefined as Record<string, any> | undefined },
  reject: { publish: vi.fn(async () => undefined), state: 'initializing' as string, error: undefined as unknown, options: undefined as Record<string, any> | undefined },
}));

vi.mock('@bitsocial/bitsocial-react-hooks', () => ({
  usePublishCommentModeration: (options: Record<string, any>) => {
    const target = options?.commentModeration?.approved === true ? testState.approve : testState.reject;
    target.options = options;
    return {
      publishCommentModeration: target.publish,
      state: target.state,
      error: target.error,
    };
  },
}));

let latestValue: ReturnType<typeof usePendingCommentModerationActions>;
let container: HTMLDivElement;
let root: Root;
let harnessProps: Partial<UsePendingCommentModerationActionsOptions>;

const baseComment = { cid: 'cid-1' } as unknown as UsePendingCommentModerationActionsOptions['comment'];

const HookHarness = () => {
  latestValue = usePendingCommentModerationActions({
    comment: baseComment,
    commentCid: 'cid-1',
    communityAddress: 'board.eth',
    ...harnessProps,
  });
  return null;
};

const renderHook = () => {
  act(() => {
    root.render(createElement(HookHarness));
  });
};

describe('usePendingCommentModerationActions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    testState.approve.state = 'initializing';
    testState.approve.error = undefined;
    testState.approve.options = undefined;
    testState.reject.state = 'initializing';
    testState.reject.error = undefined;
    testState.reject.options = undefined;
    harnessProps = {};
    window.confirm = vi.fn(() => true);

    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    renderHook();
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  it('publishes the approve moderation after confirmation', async () => {
    await act(async () => {
      await latestValue.handleApprove();
    });

    expect(window.confirm).toHaveBeenCalledTimes(1);
    expect(testState.approve.publish).toHaveBeenCalledTimes(1);
    expect(testState.reject.publish).not.toHaveBeenCalled();
    expect(testState.approve.options?.commentModeration).toEqual({ approved: true });
  });

  it('publishes the reject moderation after confirmation', async () => {
    await act(async () => {
      await latestValue.handleReject();
    });

    expect(testState.reject.publish).toHaveBeenCalledTimes(1);
    expect(testState.approve.publish).not.toHaveBeenCalled();
    expect(testState.reject.options?.commentModeration).toEqual({ approved: false });
  });

  it('does not publish when the confirmation is cancelled', async () => {
    window.confirm = vi.fn(() => false);

    await act(async () => {
      await latestValue.handleApprove();
    });

    expect(window.confirm).toHaveBeenCalledTimes(1);
    expect(testState.approve.publish).not.toHaveBeenCalled();
  });

  it('runs only the success callback for the action that was taken', async () => {
    const onApproveSuccess = vi.fn();
    const onRejectSuccess = vi.fn();
    harnessProps = { onApproveSuccess, onRejectSuccess };
    renderHook();

    await act(async () => {
      await latestValue.handleApprove();
    });

    expect(onApproveSuccess).toHaveBeenCalledTimes(1);
    expect(onRejectSuccess).not.toHaveBeenCalled();
  });

  it('withholds the community address from the publishers when disabled', () => {
    harnessProps = { enabled: false };
    renderHook();

    expect(testState.approve.options?.communityAddress).toBeUndefined();
    expect(testState.reject.options?.communityAddress).toBeUndefined();
  });

  it('exposes failed status and the formatted error message for the failed action', async () => {
    await act(async () => {
      await latestValue.handleApprove();
    });

    const error = new Error('boom');
    testState.approve.state = 'failed';
    testState.approve.error = error;
    renderHook();

    expect(latestValue.status).toBe('failed');
    expect(latestValue.error).toBe(error);
    expect(latestValue.errorMessage).toBeTruthy();
    expect(latestValue.errorMessage).toBe(formatErrorForDisplay(error));
  });
});
