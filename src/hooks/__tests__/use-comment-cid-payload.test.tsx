import * as React from 'react';
import { createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { decodeCommentCidCommunityAddress, useCommentCidPayload } from '../use-comment-cid-payload';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
const act = (React as { act?: (cb: () => void | Promise<void>) => void | Promise<void> }).act as (cb: () => void | Promise<void>) => void | Promise<void>;

const testState = vi.hoisted(() => ({
  account: undefined as { pkc?: { fetchCid: ReturnType<typeof vi.fn> } } | undefined,
}));

vi.mock('@bitsocial/bitsocial-react-hooks', () => ({
  useAccount: () => testState.account,
}));

let container: HTMLDivElement;
let latestSnapshot: ReturnType<typeof useCommentCidPayload> | undefined;
let root: Root;

const HookHarness = ({ cid }: { cid: string }) => {
  latestSnapshot = useCommentCidPayload(cid);
  return null;
};

describe('useCommentCidPayload', () => {
  beforeEach(() => {
    latestSnapshot = undefined;
    testState.account = undefined;
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  it('decodes the community name from a fetched CID wrapper', () => {
    expect(
      decodeCommentCidCommunityAddress('comment-cid', {
        content: JSON.stringify({
          communityName: 'business-and-finance.bso',
          communityPublicKey: 'community-key',
          content: 'thread body',
        }),
      }),
    ).toBe('business-and-finance.bso');
  });

  it('falls back to the community public key for unnamed communities', () => {
    const encoded = new TextEncoder().encode(JSON.stringify({ communityPublicKey: 'community-key', content: 'thread body' }));

    expect(decodeCommentCidCommunityAddress('comment-cid', { content: encoded })).toBe('community-key');
  });

  it('accepts an already decoded comment payload', () => {
    expect(decodeCommentCidCommunityAddress('comment-cid', { communityName: 'outdoors.bso', content: 'thread body' })).toBe('outdoors.bso');
  });

  it('rejects CID payloads without a community identifier', () => {
    expect(() => decodeCommentCidCommunityAddress('comment-cid', { content: JSON.stringify({ content: 'thread body' }) })).toThrow(
      "CID 'comment-cid' did not contain a community identifier",
    );
  });

  it('fetches the immutable CID once and publishes its community address', async () => {
    const fetchCid = vi.fn().mockResolvedValue({
      content: JSON.stringify({ communityName: 'videogames-strategy.bso', content: 'thread body' }),
    });
    testState.account = { pkc: { fetchCid } };

    await act(async () => {
      root.render(createElement(React.Fragment, null, createElement(HookHarness, { cid: 'comment-cid' }), createElement(HookHarness, { cid: 'comment-cid' })));
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(fetchCid).toHaveBeenCalledOnce();
    expect(fetchCid).toHaveBeenCalledWith({ cid: 'comment-cid' });
    expect(latestSnapshot).toEqual({ communityAddress: 'videogames-strategy.bso', state: 'succeeded' });
  });
});
