import { describe, expect, it } from 'vitest';
import { getCommentUserID, preservePublishedUserID } from '../comment-user-id-utils';

describe('getCommentUserID', () => {
  it('uses only the comment author short address for per-post user IDs', () => {
    expect(getCommentUserID({ cid: 'published-comment', author: { address: 'poster.bso', shortAddress: 'short-poster' } } as any)).toBe('short-poster');
    expect(getCommentUserID({ cid: 'published-comment', author: { shortAddress: 'short-poster' } } as any)).toBe('short-poster');
  });

  it('does not expose a local account author shortAddress before the comment is published', () => {
    expect(getCommentUserID({ state: 'publishing', author: { shortAddress: 'account.author.shortAddress' } } as any)).toBe('');
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
        cid: 'published-reply',
        accountId: 'viewer-account',
        author: { address: 'account-author.bso', shortAddress: 'account-author' },
      } as any,
      { cid: 'published-reply', author: { address: 'published-reply-address', shortAddress: 'ReplyKid9' } } as any,
    );

    expect(merged.author.address).toBe('account-author.bso');
    expect(getCommentUserID(merged)).toBe('ReplyKid9');
  });

  it('removes an overlaid shortAddress when the published author has no user ID', () => {
    const merged = preservePublishedUserID(
      {
        cid: 'published-reply',
        accountId: 'viewer-account',
        author: { address: 'account-author.bso', shortAddress: 'account-author' },
      } as any,
      { cid: 'published-reply', author: {} } as any,
    );

    expect(merged.author.address).toBe('account-author.bso');
    expect(getCommentUserID(merged)).toBe('');
  });

  it('mirrors the published user ID even when the overlaid comment is not an account comment', () => {
    const merged = preservePublishedUserID(
      { cid: 'published-reply', author: { address: 'account-author.bso', shortAddress: 'account-author' } } as any,
      { cid: 'published-reply', author: { shortAddress: 'ReplyKid9' } } as any,
    );

    expect(getCommentUserID(merged)).toBe('ReplyKid9');
  });

  it('returns the comment unchanged when the user ID already matches', () => {
    const comment = { cid: 'published-reply', author: { address: 'account-author.bso', shortAddress: 'ReplyKid9' } } as any;
    expect(preservePublishedUserID(comment, { cid: 'published-reply', author: { shortAddress: 'ReplyKid9' } } as any)).toBe(comment);
  });
});
