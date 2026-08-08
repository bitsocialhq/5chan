import { beforeEach, describe, expect, it, vi } from 'vitest';

const testState = vi.hoisted(() => ({
  commentsRemoveItemMock: vi.fn(),
  repliesPagesRemoveItemMock: vi.fn(),
  repliesPagesState: {
    comments: {} as Record<string, unknown>,
    repliesPages: {} as Record<string, { comments?: Array<{ cid?: string }>; nextCid?: string }>,
  },
  repliesPagesSetStateMock: vi.fn(),
}));

vi.mock('../../bitsocial-internals/utils', () => ({
  localForageLru: {
    createInstance: ({ name }: { name: string }) => {
      if (name === 'bitsocialReactHooks-comments') {
        return {
          removeItem: testState.commentsRemoveItemMock,
        };
      }
      return {
        removeItem: testState.repliesPagesRemoveItemMock,
      };
    },
  },
}));

vi.mock('../../bitsocial-internals/stores', () => ({
  repliesPagesStore: {
    getState: () => testState.repliesPagesState,
    setState: (updater: (state: typeof testState.repliesPagesState) => Partial<typeof testState.repliesPagesState>) => {
      testState.repliesPagesSetStateMock(updater);
      const nextState = updater(testState.repliesPagesState);
      testState.repliesPagesState = {
        ...testState.repliesPagesState,
        ...nextState,
      };
    },
  },
}));

import { evictThreadRefreshCaches } from '../thread-refresh-cache-utils';

describe('thread-refresh-cache-utils', () => {
  beforeEach(() => {
    testState.commentsRemoveItemMock.mockReset();
    testState.repliesPagesRemoveItemMock.mockReset();
    testState.repliesPagesSetStateMock.mockClear();
    testState.repliesPagesState = {
      comments: {
        'reply-a': { cid: 'reply-a' },
        'reply-b': { cid: 'reply-b' },
        'reply-c': { cid: 'reply-c' },
        'reply-d': { cid: 'reply-d' },
        unrelated: { cid: 'unrelated' },
      },
      repliesPages: {
        'page-old-1': { comments: [{ cid: 'reply-a' }], nextCid: 'page-old-2' },
        'page-old-2': { comments: [{ cid: 'reply-b' }] },
        'page-old-inline-next': { comments: [{ cid: 'reply-c' }] },
        'page-empty-1': { comments: [{ cid: 'reply-d' }] },
        unrelated: { comments: [{ cid: 'unrelated' }] },
      },
    };
  });

  it('evicts the current thread comment and its persisted reply page chain only', async () => {
    await evictThreadRefreshCaches([
      {
        cid: 'thread-cid',
        replies: {
          pageCids: {
            old: 'page-old-1',
            empty: 'page-empty-1',
          },
          pages: {
            old: {
              comments: [{ cid: 'inline-reply' }],
              nextCid: 'page-old-inline-next',
            },
            empty: {
              comments: [],
            },
          },
        },
      },
      undefined,
      {
        cid: 'thread-cid',
      },
    ]);

    expect(testState.commentsRemoveItemMock).toHaveBeenCalledOnce();
    expect(testState.commentsRemoveItemMock).toHaveBeenCalledWith('thread-cid');
    expect(testState.repliesPagesRemoveItemMock).toHaveBeenCalledTimes(4);
    expect(testState.repliesPagesRemoveItemMock.mock.calls.map(([pageCid]) => pageCid).sort()).toEqual([
      'page-empty-1',
      'page-old-1',
      'page-old-2',
      'page-old-inline-next',
    ]);
    expect(testState.repliesPagesState.repliesPages).toEqual({
      unrelated: { comments: [{ cid: 'unrelated' }] },
    });
    expect(testState.repliesPagesState.comments).toEqual({
      unrelated: { cid: 'unrelated' },
    });
  });
});
