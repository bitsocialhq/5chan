import { afterEach, describe, expect, it, vi } from 'vitest';
import { clearIndexerSearch, getIndexedPostComment, getIndexerSearch, type IndexedPost } from '../search-indexer';
import { getSearchProvider } from '../search-providers';

const provider = getSearchProvider('5archive');

const getIndexedPost = (overrides: Partial<IndexedPost> = {}): IndexedPost => ({
  archived: 1,
  author_address: '12D3KooWBDNnYLKvEYeo39TpcyJmNrpQTGgfW466L3V6MNhq2jPf',
  author_name: 'Esteban',
  cid: 'reply-cid',
  community_address: 'business-and-finance.bso',
  content: 'archived reply',
  deleted: 0,
  depth: 1,
  indexed_at: 1_700_000_100,
  parent_cid: 'post-cid',
  post_cid: 'post-cid',
  removed: 0,
  reply_count: 2,
  timestamp: 1_700_000_000,
  title: null,
  ...overrides,
});

describe('search indexer client', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('requests the provider search API and caches identical searches', async () => {
    const query = `cache-${Date.now()}`;
    const response = { query, posts: [], page: 2, limit: 25, total: 0 };
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => response });
    vi.stubGlobal('fetch', fetchMock);

    const first = getIndexerSearch(provider, query, 2);
    const second = getIndexerSearch(provider, query, 2);

    expect(first).toBe(second);
    await expect(first).resolves.toEqual({ ...response, threadPosts: {} });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe(`https://api.5archive.org/api/search?q=${encodeURIComponent(query)}&page=2&limit=25`);
  });

  it('loads the thread OP of each matched reply once', async () => {
    const query = `threads-${Date.now()}`;
    const reply = { ...getIndexedPost(), cid: 'reply-cid' };
    const secondReply = { ...getIndexedPost(), cid: 'other-reply-cid' };
    const threadPost = { ...getIndexedPost(), cid: 'post-cid', depth: 0, parent_cid: null, content: 'the thread' };
    const fetchMock = vi.fn().mockImplementation((url: string) =>
      Promise.resolve({
        ok: true,
        json: async () => (url.includes('/api/posts/') ? { post: threadPost } : { query, page: 1, limit: 25, total: 2, posts: [reply, secondReply, threadPost] }),
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const result = await getIndexerSearch(provider, query, 1);

    expect(result.threadPosts).toEqual({ 'post-cid': threadPost });
    // One search request plus a single request for the thread both replies belong to.
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[1][0]).toBe('https://api.5archive.org/api/posts/post-cid');
  });

  it('keeps the results when a thread OP cannot be loaded', async () => {
    const query = `missing-thread-${Date.now()}`;
    const fetchMock = vi
      .fn()
      .mockImplementation((url: string) =>
        url.includes('/api/posts/')
          ? Promise.resolve({ ok: false, status: 404 })
          : Promise.resolve({ ok: true, json: async () => ({ query, page: 1, limit: 25, total: 1, posts: [getIndexedPost()] }) }),
      );
    vi.stubGlobal('fetch', fetchMock);

    const result = await getIndexerSearch(provider, query, 1);

    expect(result.posts).toHaveLength(1);
    expect(result.threadPosts).toEqual({});
  });

  it('rejects invalid provider responses and supports cache invalidation', async () => {
    const query = `invalid-${Date.now()}`;
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ nope: true }) });
    vi.stubGlobal('fetch', fetchMock);

    await expect(getIndexerSearch(provider, query, 1)).rejects.toThrow('invalid response');
    clearIndexerSearch(provider, query, 1);
    void getIndexerSearch(provider, query, 1).catch(() => undefined);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('rejects provider posts with unsafe render fields', async () => {
    const query = `unsafe-${Date.now()}`;
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        query,
        page: 1,
        limit: 25,
        total: 1,
        posts: [
          {
            archived: 0,
            author_address: null,
            author_name: null,
            cid: 'cid',
            community_address: 'board.bso',
            content: { html: '<script>' },
            deleted: 0,
            depth: 0,
            indexed_at: 1,
            parent_cid: null,
            post_cid: 'cid',
            removed: 0,
            reply_count: 0,
            timestamp: 1,
            title: null,
          },
        ],
      }),
    });
    vi.stubGlobal('fetch', fetchMock);

    await expect(getIndexerSearch(provider, query, 1)).rejects.toThrow('invalid response');
  });
});

describe('getIndexedPostComment', () => {
  it('maps an indexed result onto the comment shape the post components render', () => {
    const comment = getIndexedPostComment(getIndexedPost());

    expect(comment.cid).toBe('reply-cid');
    expect(comment.postCid).toBe('post-cid');
    expect(comment.parentCid).toBe('post-cid');
    expect(comment.communityAddress).toBe('business-and-finance.bso');
    expect(comment.content).toBe('archived reply');
    expect(comment.replyCount).toBe(2);
    expect(comment.timestamp).toBe(1_700_000_000);
    expect(comment.archived).toBe(true);
    expect(comment.deleted).toBe(false);
    expect(comment.removed).toBe(false);
    expect(comment.author?.displayName).toBe('Esteban');
    // The User ID pill needs the pseudonym a published comment carries.
    expect(comment.author?.shortAddress).toBe('BDNnYLKvEYeo');
  });

  it('restores the published payload from the provider raw comment', () => {
    const raw = JSON.stringify({
      comment: {
        author: { address: 'author.eth', displayName: 'stale name' },
        link: 'https://example.com/image.png',
        linkHeight: 200,
        linkWidth: 300,
        spoiler: true,
        subplebbitAddress: 'business-and-finance.eth',
      },
      commentUpdate: {
        author: { community: { firstCommentTimestamp: 1_600_000_000 } },
        number: 1597,
        replies: { pages: { new: { comments: [{ cid: 'nested' }] } } },
        upvoteCount: 3,
      },
    });

    const comment = getIndexedPostComment(getIndexedPost({ raw, thumbnail_url: 'https://example.com/thumb.png' }));

    expect(comment.number).toBe(1597);
    expect(comment.upvoteCount).toBe(3);
    expect(comment.link).toBe('https://example.com/image.png');
    expect(comment.linkWidth).toBe(300);
    expect(comment.spoiler).toBe(true);
    expect(comment.thumbnailUrl).toBe('https://example.com/thumb.png');
    // Indexed columns stay authoritative over the raw payload.
    expect(comment.communityAddress).toBe('business-and-finance.bso');
    expect(comment.author?.displayName).toBe('Esteban');
    expect((comment.author as { community?: { firstCommentTimestamp?: number } })?.community?.firstCommentTimestamp).toBe(1_600_000_000);
    // Reply pages are dropped so search results do not carry nested feeds around.
    expect(comment.replies).toBeUndefined();
  });

  it('falls back to the indexed columns when the raw payload is missing or invalid', () => {
    const comment = getIndexedPostComment(getIndexedPost({ raw: 'not json', deleted: 1, link: 'https://example.com/fallback.png' }));

    expect(comment.number).toBeUndefined();
    expect(comment.deleted).toBe(true);
    expect(comment.link).toBe('https://example.com/fallback.png');
    expect(comment.content).toBe('archived reply');
  });
});
