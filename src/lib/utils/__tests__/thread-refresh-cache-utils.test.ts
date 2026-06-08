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

vi.mock('@bitsocial/bitsocial-react-hooks/dist/lib/localforage-lru', () => ({
  default: {
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

vi.mock('@bitsocial/bitsocial-react-hooks/dist/stores/replies-pages', () => ({
  default: {
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
        unrelated: { cid: 'unrelated' },
      },
      repliesPages: {
        'page-old-1': { comments: [{ cid: 'reply-a' }], nextCid: 'page-old-2' },
        'page-old-2': { comments: [{ cid: 'reply-b' }] },
        'page-new-1': { comments: [{ cid: 'reply-c' }] },
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
          },
          pages: {
            new: {
              comments: [{ cid: 'inline-reply' }],
              nextCid: 'page-new-1',
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
    expect(testState.repliesPagesRemoveItemMock).toHaveBeenCalledTimes(3);
    expect(testState.repliesPagesRemoveItemMock.mock.calls.map(([pageCid]) => pageCid).sort()).toEqual(['page-new-1', 'page-old-1', 'page-old-2']);
    expect(testState.repliesPagesState.repliesPages).toEqual({
      unrelated: { comments: [{ cid: 'unrelated' }] },
    });
    expect(testState.repliesPagesState.comments).toEqual({
      unrelated: { cid: 'unrelated' },
    });
  });
});
