import { afterEach, describe, expect, it, vi } from 'vitest';
import { clearIndexerSearch, getIndexerSearch, getProviderPostUrl } from '../search-indexer';
import { getSearchProvider } from '../search-providers';

const provider = getSearchProvider('5archive');

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
    await expect(first).resolves.toEqual(response);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe(`https://api.5archive.org/api/search?q=${encodeURIComponent(query)}&page=2&limit=25`);
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

  it('builds canonical provider post links', () => {
    expect(getProviderPostUrl(provider, 'mu', 'cid/with slash')).toBe('https://5archive.org/mu/thread/cid%2Fwith%20slash');
  });
});
