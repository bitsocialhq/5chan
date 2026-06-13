import { describe, expect, it } from 'vitest';
import { getCommentUserID } from '../comment-user-id-utils';

describe('getCommentUserID', () => {
  it('uses resolved author identity data for per-post user IDs', () => {
    expect(getCommentUserID({ author: { address: 'poster.bso', shortAddress: 'short-poster' } } as any)).toBe('poster.bso');
    expect(getCommentUserID({ author: { shortAddress: 'short-poster' } } as any)).toBe('short-poster');
  });

  it('does not fall back to the comment cid while author metadata is missing', () => {
    expect(getCommentUserID({ cid: 'QmQU6BiPkB77b3rAkdj973ptTp5A6X77tfPrwTvCQDL9cq' } as any)).toBe('');
  });
});
