import { describe, expect, it } from 'vitest';
import {
  getTargetTransferModerationFlairs,
  getTransferPublishPayload,
  getTransferSourceModeration,
  hasTransferredCommentMarker,
  TRANSFERRED_COMMENT_FLAIR,
} from '../comment-transfer';

describe('comment-transfer', () => {
  const selectedFields = {
    displayName: false,
    title: true,
    content: true,
    link: true,
    spoiler: true,
    flairs: true,
  };

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
    expect(getTransferSourceModeration({ pendingApproval: true } as never, '>>>/g/')).toEqual({
      approved: false,
      reason: 'Moved to >>>/g/. Please read the rules.',
    });
    expect(getTransferSourceModeration({ pendingApproval: false } as never, '>>>/g/')).toEqual({
      removed: true,
      reason: 'Moved to >>>/g/. Please read the rules.',
    });
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
