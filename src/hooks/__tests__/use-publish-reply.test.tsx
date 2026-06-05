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
    // 'quoted-cid' (post #12) lives under the reply's own thread (postCid falls back to 'parent-cid').
    usePostNumberStore.setState({ cidToNumber: {}, numberToCid: { 'music.eth': { 12: 'quoted-cid' } }, cidToPostCid: { 'quoted-cid': 'parent-cid' } });
    usePublishReplyStore.setState({
      author: {},
      challengeRequest: {},
      content: {},
      displayName: {},
      flairs: {},
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

  it('drops cross-thread quoted cids so the protocol does not reject the publish', async () => {
    // Post #12 resolves to a comment that lives under a different thread; quoting it must not be
    // published as a quotedCid (ERR_QUOTED_CID_NOT_UNDER_POST), even though the >>12 text stays.
    usePostNumberStore.setState({ cidToPostCid: { 'quoted-cid': 'another-thread-cid' } });

    await act(async () => {
      latestValue.setPublishReplyOptions({
        content: 'Replying to >>12',
      } as never);
    });

    expect(testState.lastPublishOptions).toMatchObject({
      content: 'Replying to >>12',
      parentCid: 'parent-cid',
      postCid: 'parent-cid',
    });
    expect(testState.lastPublishOptions?.quotedCids).toBeUndefined();
  });

  it('drops cross-thread cids that arrive via stored publish options, keeping same-thread ones', async () => {
    // Defense in depth: even quotedCids carried on the stored publish options must be filtered to
    // the reply's own thread before publishing, never bypassing the same-thread guard.
    await act(async () => {
      usePostNumberStore.setState({ cidToPostCid: { 'quoted-cid': 'parent-cid', 'foreign-cid': 'other-thread-cid' } });
      usePublishReplyStore.setState({
        publishCommentOptions: {
          'parent-cid': { content: 'body', parentCid: 'parent-cid', postCid: 'parent-cid', quotedCids: ['quoted-cid', 'foreign-cid'] },
        },
      });
    });

    expect(testState.lastPublishOptions?.quotedCids).toEqual(['quoted-cid']);
  });

  it('resolves same-board external quote references before triggering publish', async () => {
    testState.resolveExternalQuoteTargetMock.mockResolvedValue({
      cid: 'external-cid',
      route: '/music/thread/external-cid',
      communityAddress: 'music.eth',
    });
    // The resolver registers whatever it finds; here #44 turns out to be an unloaded reply under
    // this same thread, so its cid is allowed in the published quotedCids.
    usePostNumberStore.setState({ cidToPostCid: { 'quoted-cid': 'parent-cid', 'external-cid': 'parent-cid' } });

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

  it('clears stale flag data from one-shot reply options', async () => {
    await act(async () => {
      latestValue.setPublishReplyOptions({
        content: 'Flag reply',
        challengeRequest: {
          challengeAnswers: ['bitsocial-flags:5chan:flag:pol:AC'],
        },
        flairs: [{ text: 'flag:pol:AC', type: 'pol', code: 'AC' }],
      } as never);
    });

    await act(async () => {
      await latestValue.publishReply({
        content: 'Plain reply',
        challengeRequest: undefined,
        flairs: undefined,
      } as never);
      await Promise.resolve();
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(testState.lastPublishOptions?.content).toBe('Plain reply');
    expect(testState.lastPublishOptions?.challengeRequest).toBeUndefined();
    expect(testState.lastPublishOptions?.flairs).toBeUndefined();
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
