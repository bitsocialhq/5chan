import { describe, expect, it } from 'vitest';
import type { Comment, CommunitiesPages, Community } from '@bitsocial/bitsocial-react-hooks';
import { getRawBoardThreadState } from '../raw-board-thread-state';

const rootThread = (cid: string): Comment =>
  ({
    cid,
    postCid: cid,
  }) as Comment;

describe('getRawBoardThreadState', () => {
  it('keeps the preloaded fallback scoped to the requested sort type', () => {
    const community = {
      posts: {
        pageCids: {
          new: 'new-page-1',
        },
        pages: {
          active: {
            comments: [],
          },
          new: {
            comments: [rootThread('new-thread')],
            nextCid: 'new-page-2',
          },
        },
      },
    } as Community;

    expect(
      getRawBoardThreadState({
        accountId: undefined,
        communitiesPages: {} as CommunitiesPages,
        community,
        sortType: 'active',
      }),
    ).toMatchObject({
      isFullyLoaded: true,
      rootThreadCids: new Set<string>(),
    });
  });

  it('treats an empty preloaded requested-sort page as a fully loaded empty board', () => {
    const community = {
      posts: {
        pages: {
          active: {
            comments: [],
          },
        },
      },
    } as Community;

    expect(
      getRawBoardThreadState({
        accountId: undefined,
        communitiesPages: {} as CommunitiesPages,
        community,
        sortType: 'active',
      }).isFullyLoaded,
    ).toBe(true);
  });

  it('walks stored board pages without importing side-effectful stores', () => {
    const community = {
      posts: {
        pageCids: {
          active: 'page-1',
        },
      },
    } as Community;

    const communitiesPages = {
      'page-1': {
        comments: [rootThread('thread-1'), { cid: 'reply-1', parentCid: 'thread-1' } as Comment],
        nextCid: 'page-2',
      },
      'page-2': {
        comments: [rootThread('thread-2')],
      },
    } as CommunitiesPages;

    expect(
      getRawBoardThreadState({
        accountId: 'account-1',
        communitiesPages,
        community,
        sortType: 'active',
      }),
    ).toMatchObject({
      isFullyLoaded: true,
      rootThreadCids: new Set(['thread-1', 'thread-2']),
    });
  });
});
