import { describe, expect, it } from 'vitest';
import { getCommentUserID, preservePublishedUserID } from '../comment-user-id-utils';

describe('getCommentUserID', () => {
  it('uses only the comment author short address for per-post user IDs', () => {
    expect(getCommentUserID({ author: { address: 'poster.bso', shortAddress: 'short-poster' } } as any)).toBe('short-poster');
    expect(getCommentUserID({ author: { shortAddress: 'short-poster' } } as any)).toBe('short-poster');
  });

  it('does not derive a user ID from an author address', () => {
    expect(getCommentUserID({ author: { address: 'poster.bso' } } as any)).toBe('');
  });

  it('does not fall back to the comment cid while author metadata is missing', () => {
    expect(getCommentUserID({ cid: 'QmQU6BiPkB77b3rAkdj973ptTp5A6X77tfPrwTvCQDL9cq' } as any)).toBe('');
  });
});

describe('preservePublishedUserID', () => {
  it('keeps local account author data but preserves the published user ID', () => {
    const merged = preservePublishedUserID(
      {
        accountId: 'viewer-account',
        author: { address: 'account-author.bso', shortAddress: 'account-author' },
      } as any,
      { author: { address: 'published-reply-address', shortAddress: 'ReplyKid9' } } as any,
    );

    expect(merged.author.address).toBe('account-author.bso');
    expect(getCommentUserID(merged)).toBe('ReplyKid9');
  });

  it('removes an overlaid shortAddress when the published author has no user ID', () => {
    const merged = preservePublishedUserID(
      {
        accountId: 'viewer-account',
        author: { address: 'account-author.bso', shortAddress: 'account-author' },
      } as any,
      { author: {} } as any,
    );

    expect(merged.author.address).toBe('account-author.bso');
    expect(getCommentUserID(merged)).toBe('');
  });

  it('mirrors the published user ID even when the overlaid comment is not an account comment', () => {
    const merged = preservePublishedUserID(
      { author: { address: 'account-author.bso', shortAddress: 'account-author' } } as any,
      { author: { shortAddress: 'ReplyKid9' } } as any,
    );

    expect(getCommentUserID(merged)).toBe('ReplyKid9');
  });

  it('returns the comment unchanged when the user ID already matches', () => {
    const comment = { author: { address: 'account-author.bso', shortAddress: 'ReplyKid9' } } as any;
    expect(preservePublishedUserID(comment, { author: { shortAddress: 'ReplyKid9' } } as any)).toBe(comment);
  });
});
