import type { Comment } from '@bitsocial/bitsocial-react-hooks';
import useSearchSummaryStore from '../stores/use-search-summary-store';
import getShortAddress from './get-short-address';
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
  link?: string | null;
  parent_cid: string | null;
  post_cid: string;
  /** Serialized `{ comment, commentUpdate }` payload, when the provider preserved it. */
  raw?: string | null;
  removed: 0 | 1;
  reply_count: number;
  thumbnail_url?: string | null;
  timestamp: number;
  title: string | null;
}

export interface IndexerSearchResult {
  limit: number;
  page: number;
  posts: IndexedPost[];
  /** The indexer that answered, which is not the first one when a higher-ranked one was down. */
  providerId: string;
  query: string;
  /** Thread OPs of the matched replies, keyed by post cid. Missing when the provider could not serve them. */
  threadPosts: Record<string, IndexedPost>;
  total: number;
}

const MAX_CACHED_SEARCHES = 50;
/**
 * A rejected request stays cached only long enough for the render that awaits it to surface the
 * error; after that it is dropped so returning to the same search retries instead of replaying it.
 */
const FAILED_REQUEST_REUSE_MS = 10_000;
const searchCache = new Map<string, Promise<IndexerSearchResult>>();
const failedRequestTimes = new Map<string, number>();

const isNullableString = (value: unknown): value is string | null => value === null || typeof value === 'string';
const isOptionalNullableString = (value: unknown): value is string | null | undefined => value === undefined || isNullableString(value);
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
    isOptionalNullableString(post.link) &&
    isOptionalNullableString(post.raw) &&
    isOptionalNullableString(post.thumbnail_url) &&
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

type IndexerSearchResponse = Omit<IndexerSearchResult, 'providerId' | 'threadPosts'>;

const isSearchResult = (value: unknown): value is IndexerSearchResponse => {
  if (!value || typeof value !== 'object') return false;
  const result = value as Partial<IndexerSearchResponse>;
  return (
    typeof result.query === 'string' &&
    isPositiveInteger(result.page) &&
    isPositiveInteger(result.limit) &&
    isNonNegativeInteger(result.total) &&
    Array.isArray(result.posts) &&
    result.posts.every(isIndexedPost)
  );
};

const getApiUrl = (provider: SearchProvider, path: string): URL => {
  const apiBase = provider.apiUrl.endsWith('/') ? provider.apiUrl : `${provider.apiUrl}/`;
  return new URL(path, apiBase);
};

const getSearchUrl = (provider: SearchProvider, query: string, page: number): string => {
  const url = getApiUrl(provider, 'api/search');
  url.searchParams.set('q', query);
  url.searchParams.set('page', String(page));
  url.searchParams.set('limit', '25');
  return url.toString();
};

const fetchProviderJson = async (url: string): Promise<unknown> => {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 15_000);
  try {
    const response = await fetch(url, {
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`Search provider returned ${response.status}`);
    return await response.json();
  } finally {
    window.clearTimeout(timeout);
  }
};

const fetchIndexedPost = async (provider: SearchProvider, cid: string): Promise<IndexedPost | null> => {
  try {
    const result = await fetchProviderJson(getApiUrl(provider, `api/posts/${encodeURIComponent(cid)}`).toString());
    const post = (result as { post?: unknown } | null)?.post;
    return isIndexedPost(post) ? post : null;
  } catch {
    // A thread OP that cannot be loaded only costs the reply its thread context.
    return null;
  }
};

/** Reply matches are rendered under their thread OP, so every distinct thread of the page is fetched once. */
const fetchThreadPosts = async (provider: SearchProvider, posts: IndexedPost[]): Promise<Record<string, IndexedPost>> => {
  const threadCids = [...new Set(posts.filter((post) => post.depth > 0 && post.post_cid !== post.cid).map((post) => post.post_cid))];
  const threadPosts = await Promise.all(threadCids.map((cid) => fetchIndexedPost(provider, cid)));

  return Object.fromEntries(threadPosts.filter((post) => post !== null).map((post) => [post.cid, post]));
};

const fetchSearch = async (provider: SearchProvider, query: string, page: number): Promise<IndexerSearchResult> => {
  const result: unknown = await fetchProviderJson(getSearchUrl(provider, query, page));
  if (!isSearchResult(result)) throw new Error('Search provider returned an invalid response');

  return { ...result, providerId: provider.id, threadPosts: await fetchThreadPosts(provider, result.posts) };
};

/** Ask each indexer in rank order, so one that is down or broken hands over to the next. */
const fetchSearchFromChain = async (providers: SearchProvider[], query: string, page: number): Promise<IndexerSearchResult> => {
  let lastError: unknown = new Error('No search provider is available');

  for (const provider of providers) {
    try {
      return await fetchSearch(provider, query, page);
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError;
};

const getSearchCacheKey = (providers: SearchProvider[], query: string, page: number): string => `${providers.map((provider) => provider.id).join(',')}:${page}:${query}`;

/**
 * The board header titles the page with the query, the match count and who answered. Publishing
 * from the request instead of a component effect keeps a reload from showing the previous numbers.
 * The reset is queued because this runs while the results component renders.
 */
const publishSummary = (request: Promise<IndexerSearchResult>, query: string): void => {
  const { setSummary } = useSearchSummaryStore.getState();
  queueMicrotask(() => setSummary(query, null, null));
  request.then(
    (result) => setSummary(result.query, result.total, result.providerId),
    () => setSummary(query, null, null),
  );
};

const clearCachedRequest = (cacheKey: string): void => {
  searchCache.delete(cacheKey);
  failedRequestTimes.delete(cacheKey);
};

const isStaleFailedRequest = (cacheKey: string): boolean => {
  const failedAt = failedRequestTimes.get(cacheKey);
  return failedAt !== undefined && Date.now() - failedAt > FAILED_REQUEST_REUSE_MS;
};

export const getIndexerSearch = (providers: SearchProvider[], query: string, page: number): Promise<IndexerSearchResult> => {
  const cacheKey = getSearchCacheKey(providers, query, page);
  const cached = searchCache.get(cacheKey);
  if (cached && !isStaleFailedRequest(cacheKey)) {
    publishSummary(cached, query);
    return cached;
  }

  if (searchCache.size >= MAX_CACHED_SEARCHES) {
    const oldestKey = searchCache.keys().next().value;
    if (oldestKey) clearCachedRequest(oldestKey);
  }

  const request = fetchSearchFromChain(providers, query, page);
  // Drop the previous failure first, or the retry would look stale too and every render would refetch.
  failedRequestTimes.delete(cacheKey);
  request.catch(() => failedRequestTimes.set(cacheKey, Date.now()));
  searchCache.set(cacheKey, request);
  publishSummary(request, query);
  return request;
};

export const clearIndexerSearch = (providers: SearchProvider[], query: string, page: number): void => {
  clearCachedRequest(getSearchCacheKey(providers, query, page));
};

type RawCommentPayload = {
  comment?: Record<string, unknown>;
  commentUpdate?: Record<string, unknown>;
};

type IndexedPostAuthor = {
  address?: string;
  displayName?: string;
  shortAddress?: string;
};

const parseRawComment = (raw: string | null | undefined): RawCommentPayload => {
  if (!raw) return {};
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return {};
    const { comment, commentUpdate } = parsed as RawCommentPayload;
    return {
      comment: comment && typeof comment === 'object' ? comment : undefined,
      commentUpdate: commentUpdate && typeof commentUpdate === 'object' ? commentUpdate : undefined,
    };
  } catch {
    return {};
  }
};

/**
 * Search results are rendered with the regular post components, so an indexed result has to look
 * like a published comment. The provider's `raw` payload already is one (`{ comment, commentUpdate }`),
 * so it is used as the base, while the indexed columns stay authoritative for identity, board and
 * moderation state.
 */
export const getIndexedPostComment = (post: IndexedPost): Comment => {
  const { comment, commentUpdate } = parseRawComment(post.raw);
  const update = { ...commentUpdate };
  // Reply pages are large nested payloads the search view never renders.
  delete update.replies;
  const updateAuthor = update.author as IndexedPostAuthor | undefined;
  delete update.author;
  const rawAuthor = comment?.author as IndexedPostAuthor | undefined;
  const address = post.author_address ?? rawAuthor?.address;

  return {
    ...comment,
    ...update,
    archived: post.archived === 1,
    author: {
      ...updateAuthor,
      ...rawAuthor,
      // No address: the payload is not signature-checked here, and an address is what grants the
      // 5chan dev capcode and board role badges. Results must not be able to claim those.
      address: undefined,
      displayName: post.author_name ?? rawAuthor?.displayName,
      // Published comments carry the pseudonymous User ID; archived payloads only carry the address it derives from.
      shortAddress: rawAuthor?.shortAddress || (address ? getShortAddress(address) || undefined : undefined),
    },
    cid: post.cid,
    communityAddress: post.community_address,
    content: post.content ?? undefined,
    deleted: post.deleted === 1,
    depth: post.depth,
    link: post.link ?? (comment?.link as string | undefined),
    parentCid: post.parent_cid ?? undefined,
    postCid: post.post_cid,
    removed: post.removed === 1,
    replyCount: post.reply_count,
    state: 'succeeded',
    thumbnailUrl: post.thumbnail_url ?? (comment?.thumbnailUrl as string | undefined),
    timestamp: post.timestamp,
    title: post.title ?? undefined,
  } as Comment;
};
