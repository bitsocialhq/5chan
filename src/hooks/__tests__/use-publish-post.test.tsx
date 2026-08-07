import * as React from 'react';
import { createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import usePublishPost from '../use-publish-post';
import useChallengesStore from '../../stores/use-challenges-store';
import usePublishPostStore from '../../stores/use-publish-post-store';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
const act = (React as { act?: (cb: () => void | Promise<void>) => void | Promise<void> }).act as (cb: () => void | Promise<void>) => void | Promise<void>;

const testState = vi.hoisted(() => ({
  abandonNavigationMock: vi.fn(),
  abandonPublishMock: vi.fn(async () => undefined),
  index: 12,
  lastPublishOptions: undefined as Record<string, any> | undefined,
  publishAuthorBlockedReason: undefined as 'resolving' | 'unresolved' | 'mismatch' | undefined,
  publishCommentMock: vi.fn(),
  publishErrorNavigationMock: vi.fn(),
  pendingPostNavigationMock: vi.fn(),
}));

vi.mock('@bitsocial/bitsocial-react-hooks', () => ({
  usePublishComment: (options: Record<string, any>) => {
    testState.lastPublishOptions = options;
    return {
      abandonPublish: testState.abandonPublishMock,
      index: testState.index,
      publishComment: testState.publishCommentMock,
    };
  },
}));

vi.mock('../use-publish-author-domain-guard', () => ({
  __esModule: true,
  default: () => ({
    blockedReason: testState.publishAuthorBlockedReason,
  }),
  getPublishAuthorDomainErrorMessage: (reason: string) => `blocked:${reason}`,
}));

let container: HTMLDivElement;
let latestValue: ReturnType<typeof usePublishPost>;
let root: Root;

const HookHarness = () => {
  latestValue = usePublishPost({
    communityAddress: 'music.eth',
    onAbandonPost: testState.abandonNavigationMock,
    onPublishError: testState.publishErrorNavigationMock,
    onPendingPost: testState.pendingPostNavigationMock,
  });
  return null;
};

const renderHook = () => {
  act(() => {
    root.render(createElement(HookHarness));
  });
};

describe('usePublishPost', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    testState.index = 12;
    testState.lastPublishOptions = undefined;
    testState.publishAuthorBlockedReason = undefined;
    useChallengesStore.setState({ challenges: [] });
    usePublishPostStore.getState().resetPublishPostStore();

    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    renderHook();
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  it('sanitizes publish options into portable store state and exposes the publish action', async () => {
    await act(async () => {
      latestValue.setPublishPostOptions({
        author: { displayName: 'Alice' },
        content: '',
        link: '',
        spoiler: true,
        title: 'Hello world',
      } as never);
    });

    expect(latestValue.postIndex).toBe(12);
    expect(typeof latestValue.publishPost).toBe('function');
    expect(latestValue.publishPostOptions).toMatchObject({
      author: { displayName: 'Alice' },
      communityAddress: 'music.eth',
      content: undefined,
      link: undefined,
      spoiler: true,
      title: 'Hello world',
    });
    expect(typeof latestValue.publishPostOptions.onChallengeVerification).toBe('function');
    expect(typeof latestValue.publishPostOptions.onError).toBe('function');
  });

  it('routes publish challenges through the challenge store and abandons the current publish when requested', async () => {
    await act(async () => {
      latestValue.setPublishPostOptions({
        content: 'Thread body',
      } as never);
    });

    expect(typeof testState.lastPublishOptions?.onChallenge).toBe('function');

    await act(async () => {
      await testState.lastPublishOptions?.onChallenge('captcha', 'nonce');
    });

    const challenges = useChallengesStore.getState().challenges;
    expect(challenges).toHaveLength(1);
    expect(challenges[0]?.challenge).toEqual(['captcha', 'nonce']);

    await act(async () => {
      await useChallengesStore.getState().abandonCurrentChallenge();
    });

    expect(testState.abandonNavigationMock).toHaveBeenCalledTimes(1);
    expect(testState.abandonPublishMock).toHaveBeenCalledTimes(1);
    expect(testState.abandonNavigationMock.mock.invocationCallOrder[0]).toBeLessThan(testState.abandonPublishMock.mock.invocationCallOrder[0]);

    await act(async () => {
      latestValue.resetPublishPostOptions();
    });

    expect(latestValue.publishPostOptions).toEqual({});
  });

  it('forwards pending comments before the index state update is rendered', async () => {
    const pendingPost = { communityAddress: 'music.eth', content: 'Thread body', index: 12 };

    await act(async () => {
      await testState.lastPublishOptions?.onPendingComment?.(12, pendingPost);
    });

    expect(testState.pendingPostNavigationMock).toHaveBeenCalledWith(12, pendingPost);
  });

  it('handles optimistic navigation before forwarding publish errors', async () => {
    const existingOnError = vi.fn();
    const error = new Error('publish failed');
    usePublishPostStore.setState({ publishCommentOptions: { onError: existingOnError } });
    renderHook();

    await act(async () => {
      testState.lastPublishOptions?.onError?.(error);
    });

    expect(testState.publishErrorNavigationMock).toHaveBeenCalledWith(error);
    expect(existingOnError).toHaveBeenCalledWith(error);
    expect(testState.publishErrorNavigationMock.mock.invocationCallOrder[0]).toBeLessThan(existingOnError.mock.invocationCallOrder[0]);
  });

  it('blocks publish when the active account address is a domain that is not verified yet', async () => {
    testState.publishAuthorBlockedReason = 'unresolved';
    renderHook();

    await act(async () => {
      latestValue.publishPost();
    });

    expect(latestValue.publishPostError).toBe('blocked:unresolved');
    expect(testState.publishCommentMock).not.toHaveBeenCalled();
  });

  it('publishes after synchronizing one-shot publish options', async () => {
    await act(async () => {
      latestValue.setPublishPostOptions({
        content: 'Old body',
      } as never);
    });

    await act(async () => {
      latestValue.publishPost({
        content: 'Fresh body',
      } as never);
      await Promise.resolve();
    });

    expect(testState.lastPublishOptions?.content).toBe('Fresh body');
    expect(testState.publishCommentMock).toHaveBeenCalledTimes(1);
  });

  it('keeps a one-shot publish pending and ignores duplicate publish calls until it settles', async () => {
    let resolvePublish: () => void = () => {};
    const publishPromise = new Promise<void>((resolve) => {
      resolvePublish = resolve;
    });
    testState.publishCommentMock.mockReturnValue(publishPromise);

    let firstPublish: Promise<void> | undefined;
    let secondPublish: Promise<void> | undefined;

    await act(async () => {
      firstPublish = latestValue.publishPost({
        content: 'Fresh body',
      } as never);
      secondPublish = latestValue.publishPost({
        content: 'Duplicate body',
      } as never);
      await Promise.resolve();
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(firstPublish).toBe(secondPublish);
    expect(testState.lastPublishOptions?.content).toBe('Fresh body');
    expect(testState.publishCommentMock).toHaveBeenCalledTimes(1);

    let isSettled = false;
    firstPublish?.then(() => {
      isSettled = true;
    });
    await act(async () => {
      await Promise.resolve();
    });

    expect(isSettled).toBe(false);

    await act(async () => {
      resolvePublish();
      await publishPromise;
      await firstPublish;
    });

    expect(isSettled).toBe(true);
  });

  it('clears stale flag data from one-shot publish options', async () => {
    await act(async () => {
      latestValue.setPublishPostOptions({
        content: 'Flag body',
        challengeRequest: {
          challengeAnswers: ['bitsocial-flags:5chan:flag:country:auto'],
        },
        flairs: [{ text: 'flag:country:auto', type: 'country', code: 'auto' }],
      } as never);
    });

    await act(async () => {
      latestValue.publishPost({
        content: 'Plain body',
        challengeRequest: undefined,
        flairs: undefined,
      } as never);
      await Promise.resolve();
    });

    expect(testState.lastPublishOptions?.content).toBe('Plain body');
    expect(testState.lastPublishOptions?.challengeRequest).toBeUndefined();
    expect(testState.lastPublishOptions?.flairs).toBeUndefined();
    expect(testState.publishCommentMock).toHaveBeenCalledTimes(1);
  });
});
