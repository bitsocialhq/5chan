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
});
