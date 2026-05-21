import * as React from 'react';
import { createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import usePublishReply from '../use-publish-reply';
import useChallengesStore from '../../stores/use-challenges-store';
import usePostNumberStore from '../../stores/use-post-number-store';
import usePublishReplyStore from '../../stores/use-publish-reply-store';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
const act = (React as { act?: (cb: () => void | Promise<void>) => void | Promise<void> }).act as (cb: () => void | Promise<void>) => void | Promise<void>;

const testState = vi.hoisted(() => ({
  account: { id: 'account-1' } as Record<string, any>,
  abandonPublishMock: vi.fn(async () => undefined),
  directories: [] as Array<Record<string, unknown>>,
  index: 7,
  lastPublishOptions: undefined as Record<string, any> | undefined,
  publishAuthorBlockedReason: undefined as 'resolving' | 'unresolved' | 'mismatch' | undefined,
  publishCommentMock: vi.fn(),
  resolveExternalQuoteTargetMock: vi.fn(),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) => (options ? `${key}:${JSON.stringify(options)}` : key),
  }),
}));

vi.mock('@bitsocial/bitsocial-react-hooks', () => ({
  useAccount: () => testState.account,
  usePublishComment: (options: Record<string, any>) => {
    testState.lastPublishOptions = options;
    return {
      abandonPublish: testState.abandonPublishMock,
      index: testState.index,
      publishComment: testState.publishCommentMock,
    };
  },
}));

vi.mock('../../hooks/use-directories', () => ({
  useDirectories: () => testState.directories,
  normalizeBoardAddress: (address?: string) => address?.replace(/(\.bso|\.eth)$/u, ''),
}));

vi.mock('../../lib/utils/external-quote-resolver', () => ({
  resolveExternalQuoteTarget: (...args: any[]) => testState.resolveExternalQuoteTargetMock(...args),
}));

vi.mock('../use-publish-author-domain-guard', () => ({
  __esModule: true,
  default: () => ({
    blockedReason: testState.publishAuthorBlockedReason,
  }),
  getPublishAuthorDomainErrorMessage: (reason: string) => `blocked:${reason}`,
}));

let container: HTMLDivElement;
let latestValue: ReturnType<typeof usePublishReply>;
let root: Root;

const HookHarness = () => {
  latestValue = usePublishReply({ cid: 'parent-cid', communityAddress: 'music.eth' });
  return null;
};

const renderHook = () => {
  act(() => {
    root.render(createElement(HookHarness));
  });
};

describe('usePublishReply', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    testState.account = { id: 'account-1' };
    testState.directories = [];
    testState.index = 7;
    testState.lastPublishOptions = undefined;
    testState.publishAuthorBlockedReason = undefined;
    useChallengesStore.setState({ challenges: [] });
    usePostNumberStore.setState({ cidToNumber: {}, numberToCid: { 'music.eth': { 12: 'quoted-cid' } } });
    usePublishReplyStore.setState({
      author: {},
      content: {},
      displayName: {},
      link: {},
      publishCommentOptions: {},
      spoiler: {},
    });

    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    renderHook();
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  it('builds reply publish options with derived quoted cids and exposes the publish action', async () => {
    await act(async () => {
      latestValue.setPublishReplyOptions({
        author: { displayName: 'Bob' },
        content: 'Replying to >>12',
        link: '',
        spoiler: true,
      } as never);
    });

    expect(latestValue.replyIndex).toBe(7);
    expect(typeof latestValue.publishReply).toBe('function');
    expect(testState.lastPublishOptions).toMatchObject({
      author: { displayName: 'Bob' },
      communityAddress: 'music.eth',
      content: 'Replying to >>12',
      link: undefined,
      parentCid: 'parent-cid',
      postCid: 'parent-cid',
      quotedCids: ['quoted-cid'],
      spoiler: true,
    });
  });

  it('resolves same-board external quote references before triggering publish', async () => {
    testState.resolveExternalQuoteTargetMock.mockResolvedValue({
      cid: 'external-cid',
      route: '/music/thread/external-cid',
      communityAddress: 'music.eth',
    });

    await act(async () => {
      latestValue.setPublishReplyOptions({
        content: 'Replying to >>44',
      } as never);
    });

    await act(async () => {
      await latestValue.publishReply();
      await Promise.resolve();
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(testState.resolveExternalQuoteTargetMock).toHaveBeenCalledTimes(1);
    expect(testState.lastPublishOptions?.quotedCids).toEqual(['external-cid']);
    expect(testState.publishCommentMock).toHaveBeenCalledTimes(1);
  });

  it('does not resolve cross-board numeric quotes before publish', async () => {
    await act(async () => {
      latestValue.setPublishReplyOptions({
        content: 'Replying to >>>/fit/44',
      } as never);
    });

    await act(async () => {
      await latestValue.publishReply();
      await Promise.resolve();
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(testState.resolveExternalQuoteTargetMock).not.toHaveBeenCalled();
    expect(testState.lastPublishOptions?.quotedCids).toBeUndefined();
    expect(testState.publishCommentMock).toHaveBeenCalledTimes(1);
  });

  it('publishes after synchronizing one-shot reply options', async () => {
    await act(async () => {
      latestValue.setPublishReplyOptions({
        content: 'Old reply',
      } as never);
    });

    await act(async () => {
      await latestValue.publishReply({
        content: 'Fresh reply',
      } as never);
      await Promise.resolve();
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(testState.lastPublishOptions?.content).toBe('Fresh reply');
    expect(testState.publishCommentMock).toHaveBeenCalledTimes(1);
  });

  it('blocks publish when a same-board external quote cannot be resolved', async () => {
    testState.resolveExternalQuoteTargetMock.mockResolvedValue(null);

    await act(async () => {
      latestValue.setPublishReplyOptions({
        content: 'Replying to >>44',
      } as never);
    });

    await act(async () => {
      await latestValue.publishReply();
      await Promise.resolve();
    });

    expect(latestValue.publishReplyError).toContain('external_quote_publish_missing');
    expect(testState.publishCommentMock).not.toHaveBeenCalled();
  });

  it('blocks publish when the active account address is a domain that is not verified yet', async () => {
    testState.publishAuthorBlockedReason = 'unresolved';
    renderHook();

    await act(async () => {
      await latestValue.publishReply();
    });

    expect(latestValue.publishReplyError).toBe('blocked:unresolved');
    expect(testState.publishCommentMock).not.toHaveBeenCalled();
  });

  it('queues reply challenges and clears the scoped reply store on reset', async () => {
    await act(async () => {
      latestValue.setPublishReplyOptions({
        content: 'Body',
      } as never);
    });

    expect(typeof testState.lastPublishOptions?.onChallenge).toBe('function');

    await act(async () => {
      await testState.lastPublishOptions?.onChallenge('captcha');
    });

    expect(useChallengesStore.getState().challenges).toHaveLength(1);

    await act(async () => {
      await useChallengesStore.getState().abandonCurrentChallenge();
    });

    expect(testState.abandonPublishMock).toHaveBeenCalledTimes(1);

    await act(async () => {
      latestValue.resetPublishReplyOptions();
    });

    expect(usePublishReplyStore.getState().publishCommentOptions['parent-cid']).toBeUndefined();
  });
});
