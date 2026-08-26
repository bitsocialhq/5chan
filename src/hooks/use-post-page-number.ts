import { useMemo } from 'react';
import { useFeed } from '@bitsocial/bitsocial-react-hooks';
import { feedsStore as useFeedsStore } from '../lib/bitsocial-internals/stores';
import { useDirectoryByAddress } from './use-directories';
import { useBoardFeedPageSize } from './use-board-feed-page-size';
import { useCommunityIdentifier } from './use-community-identifiers';
import { useCompatiblePostSortType } from './use-compatible-post-sort-type';
import { findPostPageInFeed, findPostPageInLoadedBoardFeeds, type FeedsOptionsLike, type LoadedFeedsLike } from '../lib/utils/post-page-resolution';

interface UsePostPageNumberOptions {
  communityAddress?: string;
  postCid: string | undefined;
  /** When false, page segment is excluded (e.g. pending-post view). When true, resolve and show page. */
  enabled?: boolean;
}

/**
 * Resolve the board pagination page (1-based) for a post in a thread view.
 * Uses cache-first lookup from feeds store, then preloads via useFeed if miss.
 * Preload depth is capped to board pagination window (10 pages via paginationFeedPostsPerPage).
 *
 * @returns 1-based page number, or undefined when unresolved (render as "?")
 */
export function usePostPageNumber({ communityAddress, postCid, enabled = true }: UsePostPageNumberOptions): number | undefined {
  const communityIdentifier = useCommunityIdentifier(communityAddress);
  const communityIdentifiers = useMemo(() => (communityIdentifier ? [communityIdentifier] : []), [communityIdentifier]);
  const feedSortType = useCompatiblePostSortType(communityIdentifiers, 'active');

  const community = useDirectoryByAddress(communityAddress);
  const { guiPostsPerPage, paginationFeedPostsPerPage } = useBoardFeedPageSize(community);

  const canResolve = Boolean(enabled && communityAddress && postCid && guiPostsPerPage > 0);

  // Cache-first: selector returns only computed page to minimize rerenders
  const cachedPage = useFeedsStore((state) => {
    if (!canResolve) return undefined;
    return findPostPageInLoadedBoardFeeds(
      state.feedsOptions as unknown as FeedsOptionsLike,
      state.loadedFeeds as unknown as LoadedFeedsLike,
      communityAddress!,
      postCid!,
      guiPostsPerPage,
    );
  });

  // Preload when cache miss and enabled (10 GUI pages)
  const preloadOptions = useMemo(
    () =>
      canResolve
        ? {
            communities: communityIdentifiers,
            sortType: feedSortType,
            postsPerPage: paginationFeedPostsPerPage,
          }
        : undefined,
    [canResolve, communityIdentifiers, feedSortType, paginationFeedPostsPerPage],
  );

  const { feed: preloadFeed } = useFeed(preloadOptions);

  const preloadedPage = useMemo(() => {
    if (!canResolve || !preloadFeed?.length) return undefined;
    return findPostPageInFeed(preloadFeed, postCid!, guiPostsPerPage);
  }, [canResolve, postCid, preloadFeed, guiPostsPerPage]);

  return cachedPage ?? preloadedPage;
}
