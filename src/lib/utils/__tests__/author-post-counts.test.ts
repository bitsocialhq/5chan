import { describe, expect, it } from 'vitest';
import { getThreadPostCountsByAuthor } from '../author-post-counts';

describe('getThreadPostCountsByAuthor', () => {
  it('counts the OP and replies per author short address', () => {
    const post = { cid: 'post-1', author: { shortAddress: 'author-a' } } as any;
    const replies = [
      { cid: 'reply-1', author: { shortAddress: 'author-b' } },
      { cid: 'reply-2', author: { shortAddress: 'author-a' } },
      { cid: 'reply-3', author: { shortAddress: 'author-a' } },
    ] as any[];

    const counts = getThreadPostCountsByAuthor(post, replies);

    expect(counts.get('author-a')).toBe(3);
    expect(counts.get('author-b')).toBe(1);
  });

  it('deduplicates repeated CIDs so preview copies do not inflate the count', () => {
    const post = { cid: 'post-1', author: { shortAddress: 'author-a' } } as any;
    const duplicateReply = { cid: 'reply-1', author: { shortAddress: 'author-b' } } as any;
    const replies = [duplicateReply, duplicateReply, { cid: 'reply-2', author: { shortAddress: 'author-b' } }] as any[];

    const counts = getThreadPostCountsByAuthor(post, replies);

    expect(counts.get('author-a')).toBe(1);
    expect(counts.get('author-b')).toBe(2);
  });

  it('uses cid fallback for comments without author metadata', () => {
    const counts = getThreadPostCountsByAuthor(
      { cid: 'post-1', author: { shortAddress: 'author-a' } } as any,
      [{ cid: 'reply-1' }, { author: { shortAddress: 'author-b' } }] as any[],
    );

    expect(counts.get('author-a')).toBe(1);
    expect(counts.get('reply-1')).toBe(1);
    expect(counts.has('author-b')).toBe(false);
  });
});
