import { describe, expect, it } from 'vitest';
import {
  canMoveCommentToTrash,
  canTransferComment,
  getTargetTransferModerationFlairs,
  getTransferPublishPayload,
  getTransferSourceBoardReference,
  getTransferSourceBoardRulesLink,
  getTransferSourceModeration,
  hasTransferredCommentMarker,
  TRANSFERRED_COMMENT_FLAIR,
} from '../comment-transfer';
import { TRASH_BOARD_ADDRESS, TRASH_BOARD_CODE, TRASH_BOARD_PUBLIC_KEY, TRASH_BOARD_TITLE } from '../special-boards';

describe('comment-transfer', () => {
  const selectedFields = {
    displayName: false,
    title: true,
    content: true,
    link: true,
    spoiler: true,
    flairs: true,
  };

  it('only allows available top-level posts to transfer', () => {
    expect(canTransferComment({ cid: 'source' } as never)).toBe(true);
    expect(canTransferComment({ cid: 'reply', parentCid: 'source' } as never)).toBe(false);
    expect(canTransferComment({ cid: '' } as never)).toBe(false);
    expect(canTransferComment({ cid: 'source', deleted: true } as never)).toBe(false);
    expect(canTransferComment({ cid: 'source', removed: true } as never)).toBe(false);
    expect(canTransferComment({ cid: 'source', commentModeration: { removed: true } } as never)).toBe(false);
    expect(canTransferComment({ cid: 'source', commentModeration: { purged: true } } as never)).toBe(false);
    expect(canTransferComment({ cid: 'source', archived: true } as never)).toBe(false);
    expect(canTransferComment({ cid: 'source', commentModeration: { archived: true } } as never)).toBe(false);
  });

  it('only allows movable posts outside the trash board to move to trash', () => {
    expect(canMoveCommentToTrash({ cid: 'source', communityAddress: 'music-posting.eth' } as never)).toBe(true);
    expect(canMoveCommentToTrash({ cid: 'source', communityAddress: TRASH_BOARD_ADDRESS } as never)).toBe(false);
    expect(canMoveCommentToTrash({ cid: 'source', communityAddress: TRASH_BOARD_PUBLIC_KEY } as never)).toBe(false);
    expect(canMoveCommentToTrash({ cid: 'reply', parentCid: 'source', communityAddress: 'music-posting.eth' } as never)).toBe(false);
  });

  it('copies selected post fields while excluding flag and transferred flairs', () => {
    const payload = getTransferPublishPayload(
      {
        cid: 'source',
        communityAddress: 'music-posting.eth',
        content: 'wrong board',
        flairs: [{ text: 'flag:country:auto', type: 'country' }, { text: 'flash:loop' }, TRANSFERRED_COMMENT_FLAIR],
        link: 'https://example.com/file.swf',
        spoiler: true,
        title: 'Flash',
      } as never,
      selectedFields,
      'flash-posting.eth',
    );

    expect(payload).toMatchObject({
      communityAddress: 'flash-posting.eth',
      content: 'wrong board',
      flairs: [{ text: 'flash:loop' }],
      link: 'https://example.com/file.swf',
      spoiler: true,
      title: 'Flash',
    });
  });

  it('copies selected comment body text verbatim while still ignoring blank bodies', () => {
    expect(
      getTransferPublishPayload(
        {
          cid: 'source',
          communityAddress: 'music-posting.eth',
          content: '\n  wrong board  \n',
        } as never,
        selectedFields,
        'tech-posting.eth',
      ),
    ).toMatchObject({
      communityAddress: 'tech-posting.eth',
      content: '\n  wrong board  \n',
    });

    expect(
      getTransferPublishPayload(
        {
          cid: 'source',
          communityAddress: 'music-posting.eth',
          content: '   ',
        } as never,
        selectedFields,
        'tech-posting.eth',
      ),
    ).not.toHaveProperty('content');
  });

  it('adds the transferred marker to target moderation flairs after safe copied tags', () => {
    const flairs = getTargetTransferModerationFlairs(
      {
        cid: 'source',
        flairs: [{ text: 'flag:country:US' }, { text: 'flash:loop' }],
      } as never,
      selectedFields,
    );

    expect(flairs).toEqual([{ text: 'flash:loop' }, { text: '5chan:transferred' }]);
  });

  it('marks pending source comments as rejected and published source comments as removed', () => {
    expect(getTransferSourceModeration({ pendingApproval: true } as never, '>>>/g/', '/mu/', '[rules](/rules#mu)')).toEqual({
      approved: false,
      reason: 'Moved to >>>/g/, this post did not belong to /mu/ ([rules](/rules#mu))',
    });
    expect(getTransferSourceModeration({ pendingApproval: false } as never, '>>>/g/', '/mu/', '[rules](/rules#mu)')).toEqual({
      removed: true,
      reason: 'Moved to >>>/g/, this post did not belong to /mu/ ([rules](/rules#mu))',
    });
  });

  it('formats source board references and rules links from directory metadata', () => {
    expect(getTransferSourceBoardReference({ address: 'japanese-culture.eth', directoryCode: 'jp', title: '/jp/ - Otaku Culture' }, 'fallback.eth')).toBe('/jp/');
    expect(getTransferSourceBoardRulesLink({ address: 'japanese-culture.eth', directoryCode: 'jp', title: '/jp/ - Otaku Culture' })).toBe('[rules](/rules#jp)');
    expect(getTransferSourceBoardReference({ address: TRASH_BOARD_ADDRESS, directoryCode: TRASH_BOARD_CODE, title: TRASH_BOARD_TITLE }, 'fallback.eth')).toBe('/trash/');
    expect(getTransferSourceBoardRulesLink({ address: TRASH_BOARD_ADDRESS, directoryCode: TRASH_BOARD_CODE, title: TRASH_BOARD_TITLE })).toBe('the rules');
    expect(getTransferSourceBoardReference(undefined, 'source-board.eth')).toBe('source-board.eth');
    expect(getTransferSourceBoardRulesLink(undefined)).toBe('the rules');
  });

  it('only treats moderation/update flairs as the transferred marker', () => {
    expect(hasTransferredCommentMarker({ flairs: [{ text: '5chan:transferred' }] })).toBe(false);
    expect(
      hasTransferredCommentMarker({
        raw: {
          commentUpdate: {
            flairs: [{ text: '5chan:transferred' }],
          },
        },
      }),
    ).toBe(true);
    expect(
      hasTransferredCommentMarker({
        commentModeration: {
          flairs: [{ text: '5chan:transferred' }],
        },
      }),
    ).toBe(true);
  });
});
