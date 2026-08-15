import type { SearchProvider } from './search-providers';

export interface IndexedPost {
  archived: 0 | 1;
  author_address: string | null;
  author_name: string | null;
  cid: string;
  community_address: string;
  content: string | null;
  deleted: 0 | 1;
  depth: number;
  indexed_at: number;
  parent_cid: string | null;
  post_cid: string;
  removed: 0 | 1;
  reply_count: number;
  timestamp: number;
  title: string | null;
}

export interface IndexerSearchResult {
  limit: number;
  page: number;
  posts: IndexedPost[];
  query: string;
  total: number;
}

const MAX_CACHED_SEARCHES = 50;
const searchCache = new Map<string, Promise<IndexerSearchResult>>();

const isNullableString = (value: unknown): value is string | null => value === null || typeof value === 'string';
const isFlag = (value: unknown): value is 0 | 1 => value === 0 || value === 1;
const isNonNegativeInteger = (value: unknown): value is number => typeof value === 'number' && Number.isInteger(value) && value >= 0;
const isPositiveInteger = (value: unknown): value is number => isNonNegativeInteger(value) && value > 0;

const isIndexedPost = (value: unknown): value is IndexedPost => {
  if (!value || typeof value !== 'object') return false;
  const post = value as Partial<IndexedPost>;
  return (
    isFlag(post.archived) &&
    isNullableString(post.author_address) &&
    isNullableString(post.author_name) &&
    typeof post.cid === 'string' &&
    typeof post.community_address === 'string' &&
    isNullableString(post.content) &&
    isFlag(post.deleted) &&
    typeof post.post_cid === 'string' &&
    isNonNegativeInteger(post.depth) &&
    typeof post.indexed_at === 'number' &&
    Number.isFinite(post.indexed_at) &&
    isNullableString(post.parent_cid) &&
    isFlag(post.removed) &&
    isNonNegativeInteger(post.reply_count) &&
    typeof post.timestamp === 'number' &&
    Number.isFinite(post.timestamp) &&
    isNullableString(post.title)
  );
};

const isSearchResult = (value: unknown): value is IndexerSearchResult => {
  if (!value || typeof value !== 'object') return false;
  const result = value as Partial<IndexerSearchResult>;
  return (
    typeof result.query === 'string' &&
    isPositiveInteger(result.page) &&
    isPositiveInteger(result.limit) &&
    isNonNegativeInteger(result.total) &&
    Array.isArray(result.posts) &&
    result.posts.every(isIndexedPost)
  );
};

const getSearchUrl = (provider: SearchProvider, query: string, page: number): string => {
  const apiBase = provider.apiUrl.endsWith('/') ? provider.apiUrl : `${provider.apiUrl}/`;
  const url = new URL('api/search', apiBase);
  url.searchParams.set('q', query);
  url.searchParams.set('page', String(page));
  url.searchParams.set('limit', '25');
  return url.toString();
};

const fetchSearch = async (provider: SearchProvider, query: string, page: number): Promise<IndexerSearchResult> => {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 15_000);
  try {
    const response = await fetch(getSearchUrl(provider, query, page), {
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`Search provider returned ${response.status}`);

    const result: unknown = await response.json();
    if (!isSearchResult(result)) throw new Error('Search provider returned an invalid response');
    return result;
  } finally {
    window.clearTimeout(timeout);
  }
};

export const getIndexerSearch = (provider: SearchProvider, query: string, page: number): Promise<IndexerSearchResult> => {
  const cacheKey = `${provider.id}:${page}:${query}`;
  const cached = searchCache.get(cacheKey);
  if (cached) return cached;

  if (searchCache.size >= MAX_CACHED_SEARCHES) {
    const oldestKey = searchCache.keys().next().value;
    if (oldestKey) searchCache.delete(oldestKey);
  }

  const request = fetchSearch(provider, query, page);
  searchCache.set(cacheKey, request);
  return request;
};

export const clearIndexerSearch = (provider: SearchProvider, query: string, page: number): void => {
  searchCache.delete(`${provider.id}:${page}:${query}`);
};

export const getProviderPostUrl = (provider: SearchProvider, boardPath: string, cid: string): string => {
  const siteBase = provider.siteUrl.endsWith('/') ? provider.siteUrl : `${provider.siteUrl}/`;
  return new URL(`${encodeURIComponent(boardPath)}/thread/${encodeURIComponent(cid)}`, siteBase).toString();
};
