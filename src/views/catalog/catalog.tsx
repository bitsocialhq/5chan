import { useDeferredValue, useEffect, useMemo, useRef, useCallback, useLayoutEffect } from 'react';
import { Link, useLocation, useNavigate, useNavigationType, useParams } from 'react-router-dom';
import { Trans, useTranslation } from 'react-i18next';
import { Comment, useAccount, useCommunity, useFeed, useAccountComments } from '@bitsocial/bitsocial-react-hooks';
import { Virtuoso, VirtuosoHandle, StateSnapshot } from 'react-virtuoso';
import { useDirectories, useDirectoryByAddress } from '../../hooks/use-directories';
import { useCommunityIdentifier, useCommunityIdentifiers } from '../../hooks/use-community-identifiers';
import { useBoardFeedPageSize } from '../../hooks/use-board-feed-page-size';
import { useAccountCommunityAddresses } from '../../hooks/use-account-community-addresses';
import { useFilteredDirectoryAddresses } from '../../hooks/use-filtered-directory-addresses';
import { useResolvedCommunityAddress } from '../../hooks/use-resolved-community-address';
import { useFeedStateString } from '../../hooks/use-state-string';
import useExpandedTimeFilter from '../../hooks/use-expanded-time-filter';
import { useSuggestionFeedLoader } from '../../hooks/use-suggestion-feed-loader';
import useTimeFilter from '../../hooks/use-time-filter';
import useIsMobile from '../../hooks/use-is-mobile';
import useWindowWidth from '../../hooks/use-window-width';
import useCatalogStyleStore from '../../stores/use-catalog-style-store';
import useFeedResetStore from '../../stores/use-feed-reset-store';
import useSortingStore from '../../stores/use-sorting-store';
import useCatalogFiltersStore from '../../stores/use-catalog-filters-store';
import { getCommunityAddress, isDirectoryBoard, normalizeMultiboardFeedPath } from '../../lib/utils/route-utils';
import CatalogRow from '../../components/catalog-row';
import { CatalogFooterFirstRow, PageFooterDesktop, PageFooterMobile } from '../../components/footer';
import { ReturnButton, ArchiveButton, TopButton, RefreshButton } from '../../components/board-buttons/board-buttons';
import mobileFooterStyles from '../../components/footer/footer.module.css';
import LoadingEllipsis from '../../components/loading-ellipsis';
import ErrorDisplay from '../../components/error-display/error-display';
import styles from './catalog.module.css';
import { commentMatchesPattern } from '../../lib/utils/pattern-utils';
import { isCommentArchived } from '../../lib/utils/comment-moderation-utils';
import { sortCatalogFeedForDisplay } from '../../lib/utils/catalog-sort';
import { getCommentCommunityAddress } from '../../lib/utils/comment-utils';
import { getSearchWithTimeFilter, getTimeFilterSuggestion, type TimeFilterSuggestion } from '../../lib/utils/time-filter-utils';
import {
  getCatalogRowHeightEstimates,
  getPretextItemSizeFromElement,
  getTypicalCatalogRowHeight,
  readReplyTypographyMetrics,
  resolveCatalogVirtualizationMode,
} from '../../lib/utils/pretext-height-estimates';

const lastVirtuosoStates: { [key: string]: StateSnapshot } = {};
const RECENT_ACCOUNT_COMMENT_WINDOW_SECONDS = 60 * 60;
const WEEK_IN_SECONDS = 7 * 24 * 60 * 60;
const MONTH_IN_SECONDS = 30 * 24 * 60 * 60;
const YEAR_IN_SECONDS = 365 * 24 * 60 * 60;
// Keep the hook on its indexed fast path when this view should not inject local posts.
const EMPTY_ACCOUNT_COMMENT_LOOKUP = { commentIndices: [-1] };
export const getCatalogRenderFeed = <T,>(processedFeed: readonly T[], deferredProcessedFeed: readonly T[]): readonly T[] =>
  deferredProcessedFeed.length === 0 && processedFeed.length > 0 ? processedFeed : deferredProcessedFeed;

interface CatalogFooterProps {
  communityAddresses: string[];
  hasMore: boolean;
  combinedFeedLength: number;
  currentTimeFilterName: string;
  moreThreadsSuggestion: TimeFilterSuggestion | null;
  moreThreadsSuggestionPathname: string | null;
  moreThreadsSuggestionSearch: string;
  onExpandTimeWindow?: (suggestion: TimeFilterSuggestion) => void | Promise<void>;
  /** When false, suppress the loading ellipsis (e.g. non-infinite mode) */
  showLoadingEllipsis?: boolean;
}

// Defined outside Catalog to preserve component identity across renders (Virtuoso optimization)
// The useFeedStateString hook is called here instead of in Catalog to isolate re-renders
// caused by backend IPFS state changes to just this footer component
const CatalogFooter = ({
  communityAddresses,
  hasMore,
  combinedFeedLength,
  currentTimeFilterName,
  moreThreadsSuggestion,
  moreThreadsSuggestionPathname,
  moreThreadsSuggestionSearch,
  onExpandTimeWindow,
  showLoadingEllipsis = true,
}: CatalogFooterProps) => {
  const { t } = useTranslation();

  const loadingStateString = useFeedStateString(communityAddresses) || (combinedFeedLength === 0 ? t('loading_feed') : t('looking_for_more_posts'));

  let footerContent;
  if (moreThreadsSuggestion && moreThreadsSuggestionPathname) {
    footerContent = (
      <div className={styles.morePostsSuggestion}>
        <Trans
          i18nKey={moreThreadsSuggestion.i18nKey}
          values={{ currentTimeFilterName, count: combinedFeedLength }}
          components={{
            1: onExpandTimeWindow ? (
              <button
                type='button'
                data-testid='expand-time-window-button'
                className={styles.morePostsSuggestionAction}
                onClick={() => {
                  void onExpandTimeWindow(moreThreadsSuggestion);
                }}
              />
            ) : (
              <Link
                to={{ pathname: moreThreadsSuggestionPathname, search: getSearchWithTimeFilter(moreThreadsSuggestionSearch, moreThreadsSuggestion.timeFilterName) }}
              />
            ),
          }}
        />
      </div>
    );
  } else if (combinedFeedLength === 0) {
    footerContent = t('no_threads');
  }
  if (hasMore || (communityAddresses && communityAddresses.length === 0)) {
    footerContent = (
      <>
        {footerContent}
        {showLoadingEllipsis && (
          <div className={styles.stateString}>
            <LoadingEllipsis string={loadingStateString} />
          </div>
        )}
      </>
    );
  }
  return <div className={styles.footer}>{footerContent}</div>;
};

// Separate component for the loading state when there's no feed
// This also calls useFeedStateString internally to isolate re-renders
interface CatalogLoadingProps {
  communityAddresses: string[];
  hasMore: boolean;
  combinedFeedLength: number;
  state: string | undefined;
  subscriptionsLength: number;
  error: Error | undefined;
}

const CatalogLoading = ({ communityAddresses, hasMore, combinedFeedLength, state, subscriptionsLength, error }: CatalogLoadingProps) => {
  const { t } = useTranslation();

  const rawFeedStateString = useFeedStateString(communityAddresses);
  const loadingStateString = rawFeedStateString || (combinedFeedLength === 0 ? t('loading_feed') : t('looking_for_more_posts'));

  return (
    <div className={styles.stateString}>
      {state === 'failed' ? (
        <span className='red'>{state}</span>
      ) : subscriptionsLength === 0 ? (
        <span className='red'>{t('not_subscribed_to_any_board')}</span>
      ) : !hasMore && combinedFeedLength === 0 ? (
        t('no_threads')
      ) : (
        hasMore && <LoadingEllipsis string={loadingStateString} />
      )}
      <ErrorDisplay error={error} />
    </div>
  );
};

const createContentFilter = (
  filterItems: { text: string; enabled: boolean; count: number; filteredCids: Set<string>; hide: boolean; top: boolean; color?: string }[],
  communityAddress: string,
  onFilterMatch?: (filterIndex: number, cid: string, communityAddress: string) => void,
  trackMatches = true,
) => {
  // Create a unique key based on the enabled filter items
  const enabledFilters = filterItems.filter((item) => item.enabled && item.text.trim() !== '');
  const filterKey =
    enabledFilters.length > 0
      ? `content-filter-${enabledFilters.map((item) => `${item.text}-${item.hide ? 'hide' : ''}-${item.top ? 'top' : ''}`).join('-')}`
      : 'no-content-filter';

  return {
    filter: (comment: Comment) => {
      if (!comment?.cid) return true;

      if (enabledFilters.length === 0) return true;

      // Check if any enabled filter matches the content
      for (let i = 0; i < enabledFilters.length; i++) {
        const item = enabledFilters[i];
        const pattern = item.text;

        if (commentMatchesPattern(comment, pattern)) {
          // Find the original filter index to increment count
          const filterIndex = filterItems.findIndex((f) => f.text === item.text && f.enabled);
          if (trackMatches && filterIndex !== -1) {
            if (onFilterMatch) {
              onFilterMatch(filterIndex, comment.cid, communityAddress);
            } else {
              // Fallback to the store method if no callback provided
              useCatalogFiltersStore.getState().incrementFilterCount(filterIndex, comment.cid, communityAddress);
            }
          }

          // If this filter is set to hide, filter out the comment
          if (item.hide) {
            return false;
          }

          // If this filter is set to top, we'll handle it separately in the component
          // (we don't filter it out here)
        }
      }

      return true;
    },
    key: filterKey,
  };
};

const createCombinedFilter = (
  filterItems: { text: string; enabled: boolean; count: number; filteredCids: Set<string>; hide: boolean; top: boolean; color?: string }[],
  searchText: string,
  communityAddress: string,
  onFilterMatch?: (filterIndex: number, cid: string, communityAddress: string) => void,
  trackMatches = true,
) => {
  const contentFilter = createContentFilter(filterItems, communityAddress, onFilterMatch, trackMatches);

  const searchFilter = {
    filter: (comment: Comment) => {
      if (!searchText.trim()) return true;
      return commentMatchesPattern(comment, searchText);
    },
    key: searchText ? `search-filter-${searchText}` : 'no-search-filter',
  };

  return {
    filter: (comment: Comment) => {
      if (isCommentArchived(comment)) return false;
      if (!contentFilter.filter(comment)) return false;
      if (!searchFilter.filter(comment)) return false;

      return true;
    },
    key: `${contentFilter.key}-${searchFilter.key}-exclude-archived`,
  };
};

export interface CatalogProps {
  feedCacheKey?: string;
  viewType?: 'all' | 'subs' | 'mod' | 'board';
  boardIdentifier?: string;
  timeFilterNameFromCache?: string;
  isVisible?: boolean;
}

const Catalog = ({ feedCacheKey, viewType, boardIdentifier: boardIdentifierProp, timeFilterNameFromCache, isVisible = true }: CatalogProps) => {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const params = useParams();

  const isInAllView = viewType ? viewType === 'all' : false;
  const isInSubscriptionsView = viewType ? viewType === 'subs' : false;
  const isInModView = viewType ? viewType === 'mod' : false;

  const isMultiboard = isInAllView || isInSubscriptionsView || isInModView;
  const { timeFilterName, timeFilterSeconds } = useTimeFilter(timeFilterNameFromCache);
  const multiboardTimeFilterSeconds = isMultiboard ? timeFilterSeconds : undefined;
  // Single-board catalogs always cap at maxGuiPages (no infinite scroll beyond the board's page limit)
  const effectiveInfiniteScroll = isMultiboard;

  const directories = useDirectories();
  const resolvedAddressFromUrl = useResolvedCommunityAddress();
  const communityAddress = useMemo(() => {
    if (boardIdentifierProp) {
      return getCommunityAddress(boardIdentifierProp, directories);
    }
    return resolvedAddressFromUrl;
  }, [boardIdentifierProp, directories, resolvedAddressFromUrl]);

  const filterItems = useCatalogFiltersStore((state) => state.filterItems);
  const searchText = useCatalogFiltersStore((state) => state.searchText);

  const account = useAccount();
  const subscriptions = account?.subscriptions;
  const accountCommunityAddresses = useAccountCommunityAddresses();
  const filteredDirectoryAddresses = useFilteredDirectoryAddresses();
  const excludeArchivedFilter = useMemo(
    () => ({
      filter: (comment: Comment) => !isCommentArchived(comment),
      key: 'exclude-archived',
    }),
    [],
  );
  const hasActiveCatalogFiltering = useMemo(
    () => searchText.trim().length > 0 || filterItems.some((item) => item.enabled && item.text.trim() !== ''),
    [filterItems, searchText],
  );

  const communityAddresses = useMemo(() => {
    if (isInAllView) {
      return filteredDirectoryAddresses;
    }
    if (isInSubscriptionsView) {
      return (subscriptions || []).filter(Boolean); // Filter out any undefined/null values
    }
    if (isInModView) {
      return accountCommunityAddresses;
    }
    // Only include communityAddress if it's defined
    return communityAddress ? [communityAddress] : [];
  }, [accountCommunityAddresses, isInAllView, isInSubscriptionsView, isInModView, communityAddress, filteredDirectoryAddresses, subscriptions]);
  const communities = useCommunityIdentifiers(communityAddresses);
  const communityIdentifier = useCommunityIdentifier(communityAddress);

  const imageSize = useCatalogStyleStore((state) => state.imageSize);
  const showOPComment = useCatalogStyleStore((state) => state.showOPComment);
  const columnWidth = imageSize === 'Large' ? 270 : 180;
  const windowWidth = useWindowWidth();
  const isMobile = useIsMobile();
  const columnCount = Math.floor(windowWidth / columnWidth);
  const multiboardCatalogPostsPerPage = Math.max(18, Math.min(24, Math.max(columnCount, 1) * 5));

  const communityDirectory = useDirectoryByAddress(isInAllView || isInSubscriptionsView || isInModView ? undefined : communityAddress);
  const { guiPostsPerPage: boardPostsPerPage, maxGuiPages, paginationFeedPostsPerPage } = useBoardFeedPageSize(communityDirectory);

  // Canonical redirect for multiboard catalog paths with numeric page segment (e.g. /all/catalog/1w/5 -> /all/catalog/1w)
  useEffect(() => {
    if (!(isInAllView || isInSubscriptionsView || isInModView)) return;
    const canonical = normalizeMultiboardFeedPath(location.pathname);
    if (location.pathname !== canonical) {
      navigate({ pathname: canonical, search: location.search }, { replace: true });
    }
  }, [isInAllView, isInSubscriptionsView, isInModView, location.pathname, location.search, navigate]);

  const sortType = useSortingStore((state) => state.sortType);
  const feedSortType = sortType === 'new' ? 'new' : 'active';
  const catalogVirtualizationMode = useMemo(() => resolveCatalogVirtualizationMode(location.search, 'item-size'), [location.search]);
  const themeKey = typeof document !== 'undefined' ? document.body.className : '';

  // Create a stable callback for filter matching
  const handleFilterMatch = useCallback((filterIndex: number, cid: string, communityAddress: string) => {
    useCatalogFiltersStore.getState().incrementFilterCount(filterIndex, cid, communityAddress);
  }, []);

  // Set the current community address
  useEffect(() => {
    useCatalogFiltersStore.getState().setCurrentCommunityAddress(communityAddress || null);
    return () => {
      useCatalogFiltersStore.getState().setCurrentCommunityAddress(null);
    };
  }, [communityAddress]);

  const feedOptions = useMemo(() => {
    return {
      communities,
      sortType: feedSortType,
      postsPerPage: isMultiboard ? multiboardCatalogPostsPerPage : paginationFeedPostsPerPage,
      filter: hasActiveCatalogFiltering ? createCombinedFilter(filterItems, searchText, communityAddress || 'all', handleFilterMatch) : excludeArchivedFilter,
      newerThan: multiboardTimeFilterSeconds,
    };
  }, [
    communities,
    feedSortType,
    hasActiveCatalogFiltering,
    isMultiboard,
    paginationFeedPostsPerPage,
    multiboardCatalogPostsPerPage,
    filterItems,
    searchText,
    communityAddress,
    handleFilterMatch,
    multiboardTimeFilterSeconds,
    excludeArchivedFilter,
  ]);

  const { feed, hasMore, loadMore, reset, expandTimeWindow } = useFeed(feedOptions);
  const { currentTimeFilterName, currentTimeFilterSeconds, expandSuggestionTimeWindow } = useExpandedTimeFilter({
    timeFilterName,
    timeFilterSeconds: multiboardTimeFilterSeconds,
    expandTimeWindow,
  });
  const shouldProbeSuggestionFeeds = isVisible && isMultiboard && typeof currentTimeFilterSeconds === 'number';
  const shouldProbeWeeklyFeed = shouldProbeSuggestionFeeds && currentTimeFilterSeconds < WEEK_IN_SECONDS;
  const shouldProbeMonthlyFeed = shouldProbeSuggestionFeeds && currentTimeFilterSeconds < MONTH_IN_SECONDS;
  const shouldProbeYearlyFeed = shouldProbeSuggestionFeeds && currentTimeFilterSeconds < YEAR_IN_SECONDS;
  const suggestionFilter = useMemo(
    () => (hasActiveCatalogFiltering ? createCombinedFilter(filterItems, searchText, communityAddress || 'all', undefined, false) : excludeArchivedFilter),
    [communityAddress, excludeArchivedFilter, filterItems, hasActiveCatalogFiltering, searchText],
  );
  // Keep suggestion feeds on a stable hook identity; the loader widens them by paging, not by recreating the feed.
  const suggestionPostsPerPage = multiboardCatalogPostsPerPage;
  const suggestionRequestKeyBase = `${location.pathname}${location.search}`;
  const {
    feed: weeklyFeed,
    hasMore: weeklyFeedHasMore,
    loadMore: loadMoreWeeklyFeed,
  } = useFeed({
    communities: shouldProbeWeeklyFeed ? communities : [],
    sortType: feedSortType,
    postsPerPage: suggestionPostsPerPage,
    filter: suggestionFilter,
    newerThan: WEEK_IN_SECONDS,
  });
  const {
    feed: monthlyFeed,
    hasMore: monthlyFeedHasMore,
    loadMore: loadMoreMonthlyFeed,
  } = useFeed({
    communities: shouldProbeMonthlyFeed ? communities : [],
    sortType: feedSortType,
    postsPerPage: suggestionPostsPerPage,
    filter: suggestionFilter,
    newerThan: MONTH_IN_SECONDS,
  });
  const {
    feed: yearlyFeed,
    hasMore: yearlyFeedHasMore,
    loadMore: loadMoreYearlyFeed,
  } = useFeed({
    communities: shouldProbeYearlyFeed ? communities : [],
    sortType: feedSortType,
    postsPerPage: suggestionPostsPerPage,
    filter: suggestionFilter,
    newerThan: YEAR_IN_SECONDS,
  });
  useSuggestionFeedLoader({
    currentFeedLength: feed.length,
    feedLength: weeklyFeed.length,
    hasMore: weeklyFeedHasMore,
    loadMore: loadMoreWeeklyFeed,
    requestKey: `${suggestionRequestKeyBase}:1w`,
    shouldLoad: shouldProbeWeeklyFeed,
  });
  useSuggestionFeedLoader({
    currentFeedLength: feed.length,
    feedLength: monthlyFeed.length,
    hasMore: monthlyFeedHasMore,
    loadMore: loadMoreMonthlyFeed,
    requestKey: `${suggestionRequestKeyBase}:1m`,
    shouldLoad: shouldProbeMonthlyFeed,
  });
  useSuggestionFeedLoader({
    currentFeedLength: feed.length,
    feedLength: yearlyFeed.length,
    hasMore: yearlyFeedHasMore,
    loadMore: loadMoreYearlyFeed,
    requestKey: `${suggestionRequestKeyBase}:1y`,
    shouldLoad: shouldProbeYearlyFeed,
  });
  const accountCommentLookupOptions = useMemo(
    () =>
      communityAddress
        ? {
            communityAddress,
            newerThan: RECENT_ACCOUNT_COMMENT_WINDOW_SECONDS,
            sortType: 'old' as const,
          }
        : EMPTY_ACCOUNT_COMMENT_LOOKUP,
    [communityAddress],
  );
  const { accountComments: recentAccountComments } = useAccountComments(accountCommentLookupOptions);

  const resetTriggeredRef = useRef(false);

  // show account comments instantly in the feed once published (cid defined), instead of waiting for the feed to update
  const feedCids = useMemo(() => new Set(feed.map((f) => f.cid)), [feed]);
  const filteredComments = useMemo(
    () =>
      recentAccountComments.filter((comment) => {
        const { cid, deleted, postCid, removed, state, timestamp } = comment || {};
        const commentCommunityAddress = getCommentCommunityAddress(comment);

        // Basic filtering conditions
        const basicConditions =
          !deleted &&
          !removed &&
          timestamp > Date.now() / 1000 - RECENT_ACCOUNT_COMMENT_WINDOW_SECONDS &&
          state === 'succeeded' &&
          cid &&
          cid === postCid &&
          commentCommunityAddress === communityAddress &&
          !feedCids.has(cid);

        // If search is active, also check search conditions
        if (basicConditions && searchText.trim()) {
          const titleLower = comment?.title?.toLowerCase() || '';
          const contentLower = comment?.content?.toLowerCase() || '';
          const searchPattern = searchText.toLowerCase();

          return titleLower.includes(searchPattern) || contentLower.includes(searchPattern);
        }

        return basicConditions;
      }),
    [recentAccountComments, communityAddress, feedCids, searchText],
  );

  // show newest account comment at the top of the feed but after pinned posts
  const combinedFeed = useMemo(() => {
    const newFeed = [...feed];
    const lastPinnedIndex = newFeed.map((post) => post.pinned).lastIndexOf(true);
    if (filteredComments.length > 0) {
      newFeed.splice(lastPinnedIndex + 1, 0, ...filteredComments);
    }
    return newFeed;
  }, [feed, filteredComments]);

  const cappedFeed = useMemo(
    () => (effectiveInfiniteScroll ? combinedFeed : combinedFeed.slice(0, boardPostsPerPage * maxGuiPages)),
    [effectiveInfiniteScroll, combinedFeed, boardPostsPerPage, maxGuiPages],
  );
  const moreThreadsSuggestion = useMemo(
    () => (isMultiboard ? getTimeFilterSuggestion(feed.length, weeklyFeed.length, monthlyFeed.length, yearlyFeed.length, currentTimeFilterSeconds) : null),
    [currentTimeFilterSeconds, feed.length, isMultiboard, monthlyFeed.length, weeklyFeed.length, yearlyFeed.length],
  );
  const moreThreadsSuggestionPathname = isInAllView ? '/all/catalog' : isInSubscriptionsView ? '/subs/catalog' : isInModView ? '/mod/catalog' : null;

  const sortedFeed = useMemo(() => sortCatalogFeedForDisplay(cappedFeed, sortType), [cappedFeed, sortType]);

  useEffect(() => {
    if (filteredComments.length > 0 && !resetTriggeredRef.current) {
      reset();
      resetTriggeredRef.current = true;
    }
  }, [filteredComments, reset]);

  // suggest the user to change time filter if there aren't enough posts
  const setResetFunction = useFeedResetStore((state) => state.setResetFunction);
  useEffect(() => {
    if (isVisible) {
      setResetFunction(reset);
    }
  }, [reset, setResetFunction, isVisible]);

  const community = useCommunity(communityIdentifier ? { community: communityIdentifier } : undefined);
  const { error, shortAddress, state, title } = community || {};

  // Memoize footer component to preserve identity across renders (Virtuoso optimization)
  // Note: useFeedStateString is called inside CatalogFooter to isolate re-renders from backend state changes
  const footerComponents = useMemo(
    () => ({
      Footer: () => (
        <>
          <CatalogFooter
            communityAddresses={communityAddresses}
            hasMore={hasMore}
            combinedFeedLength={cappedFeed.length}
            currentTimeFilterName={currentTimeFilterName}
            moreThreadsSuggestion={moreThreadsSuggestion}
            moreThreadsSuggestionPathname={moreThreadsSuggestionPathname}
            moreThreadsSuggestionSearch={location.search}
            onExpandTimeWindow={expandSuggestionTimeWindow}
            showLoadingEllipsis={effectiveInfiniteScroll}
          />
          <PageFooterDesktop
            firstRow={
              <CatalogFooterFirstRow
                communityAddress={communityAddress}
                isInAllView={isInAllView}
                isInSubscriptionsView={isInSubscriptionsView}
                isInModView={isInModView}
              />
            }
          />
          <PageFooterMobile>
            <div className={mobileFooterStyles.mobileFooterButtons}>
              <ReturnButton address={communityAddress} isInAllView={isInAllView} isInSubscriptionsView={isInSubscriptionsView} isInModView={isInModView} />
              <ArchiveButton address={communityAddress} isInAllView={isInAllView} isInSubscriptionsView={isInSubscriptionsView} isInModView={isInModView} />
              <TopButton />
              <RefreshButton />
            </div>
          </PageFooterMobile>
        </>
      ),
    }),
    [
      communityAddresses,
      hasMore,
      cappedFeed.length,
      currentTimeFilterName,
      moreThreadsSuggestion,
      moreThreadsSuggestionPathname,
      expandSuggestionTimeWindow,
      communityAddress,
      isInAllView,
      isInSubscriptionsView,
      isInModView,
      location.search,
      effectiveInfiniteScroll,
    ],
  );
  const catalogFooter = useMemo(
    () => (
      <>
        <CatalogFooter
          communityAddresses={communityAddresses}
          hasMore={hasMore}
          combinedFeedLength={cappedFeed.length}
          currentTimeFilterName={currentTimeFilterName}
          moreThreadsSuggestion={moreThreadsSuggestion}
          moreThreadsSuggestionPathname={moreThreadsSuggestionPathname}
          moreThreadsSuggestionSearch={location.search}
          onExpandTimeWindow={expandSuggestionTimeWindow}
          showLoadingEllipsis={effectiveInfiniteScroll}
        />
        <PageFooterDesktop
          firstRow={
            <CatalogFooterFirstRow
              communityAddress={communityAddress}
              isInAllView={isInAllView}
              isInSubscriptionsView={isInSubscriptionsView}
              isInModView={isInModView}
            />
          }
        />
        <PageFooterMobile>
          <div className={mobileFooterStyles.mobileFooterButtons}>
            <ReturnButton address={communityAddress} isInAllView={isInAllView} isInSubscriptionsView={isInSubscriptionsView} isInModView={isInModView} />
            <ArchiveButton address={communityAddress} isInAllView={isInAllView} isInSubscriptionsView={isInSubscriptionsView} isInModView={isInModView} />
            <TopButton />
            <RefreshButton />
          </div>
        </PageFooterMobile>
      </>
    ),
    [
      communityAddresses,
      hasMore,
      cappedFeed.length,
      currentTimeFilterName,
      moreThreadsSuggestion,
      moreThreadsSuggestionPathname,
      expandSuggestionTimeWindow,
      communityAddress,
      isInAllView,
      isInSubscriptionsView,
      isInModView,
      location.search,
      effectiveInfiniteScroll,
    ],
  );
  const isFeedLoaded = feed.length > 0 || state === 'failed';

  // Process the feed to move "top" posts to the top (applied after display sort)
  const processedFeed = useMemo(() => {
    if (!sortedFeed || sortedFeed.length === 0) return sortedFeed;

    const enabledTopFilters = filterItems.filter((item) => item.enabled && item.text.trim() !== '' && item.top);
    if (enabledTopFilters.length === 0) return sortedFeed;

    // Separate posts that match "top" filters
    const topPosts: Comment[] = [];
    const regularPosts: Comment[] = [];

    sortedFeed.forEach((comment) => {
      if (!comment) return;

      let isTop = false;
      for (const filter of enabledTopFilters) {
        if (commentMatchesPattern(comment, filter.text)) {
          isTop = true;
          break;
        }
      }

      if (isTop) {
        topPosts.push(comment);
      } else {
        regularPosts.push(comment);
      }
    });

    // Return top posts followed by regular posts
    return [...topPosts, ...regularPosts];
  }, [sortedFeed, filterItems]);

  const deferredProcessedFeed = useDeferredValue(processedFeed);
  const catalogRenderFeed = getCatalogRenderFeed(processedFeed, deferredProcessedFeed);

  const matchedFilterColors = useMemo(() => {
    const nextMatchedFilterColors = new Map<string, string>();
    const activeColoredFilters = filterItems.filter((item) => item.enabled && item.text.trim() !== '' && item.color);

    if (activeColoredFilters.length === 0) {
      return nextMatchedFilterColors;
    }

    for (const comment of catalogRenderFeed) {
      const cid = comment?.cid;
      if (!cid) {
        continue;
      }

      const firstMatch = activeColoredFilters.find((item) => commentMatchesPattern(comment, item.text));
      if (firstMatch?.color) {
        nextMatchedFilterColors.set(cid, firstMatch.color);
      }
    }

    return nextMatchedFilterColors;
  }, [catalogRenderFeed, filterItems]);

  const rowCacheRef = useRef(new Map<string, Comment[]>());
  const rows = useMemo(() => {
    if (!isFeedLoaded) {
      rowCacheRef.current.clear();
      return [];
    }

    const effectiveColumnCount = Math.max(columnCount, 1);
    const nextRows: Comment[][] = [];
    const nextRowCache = new Map<string, Comment[]>();
    for (let i = 0; i < catalogRenderFeed.length; i += effectiveColumnCount) {
      const nextRow = catalogRenderFeed.slice(i, i + effectiveColumnCount);
      const rowKey = nextRow.map((post) => post?.cid || '').join('\u0000');
      const cachedRow = rowCacheRef.current.get(rowKey);
      const stableRow = cachedRow && cachedRow.length === nextRow.length && cachedRow.every((post, index) => post === nextRow[index]) ? cachedRow : nextRow;
      nextRowCache.set(rowKey, stableRow);
      nextRows.push(stableRow);
    }
    rowCacheRef.current = nextRowCache;
    return nextRows;
  }, [catalogRenderFeed, columnCount, isFeedLoaded]);

  const catalogMetrics = useMemo(() => readReplyTypographyMetrics(), [themeKey, windowWidth]);
  const rowHeightEstimates = useMemo(
    () =>
      catalogVirtualizationMode === 'off'
        ? []
        : getCatalogRowHeightEstimates({
            imageSize,
            metrics: catalogMetrics,
            rows,
            showOPComment,
          }),
    [catalogMetrics, catalogVirtualizationMode, imageSize, rows, showOPComment],
  );
  const defaultCatalogRowHeight = useMemo(() => getTypicalCatalogRowHeight(rowHeightEstimates, imageSize), [imageSize, rowHeightEstimates]);
  // Omit the prop entirely in fallback mode. Passing `itemSize={undefined}` overrides
  // Virtuoso's default DOM measurement path and leaves rows on the fallback height.
  const catalogSizingProps = useMemo(() => (catalogVirtualizationMode === 'item-size' ? { itemSize: getPretextItemSizeFromElement } : {}), [catalogVirtualizationMode]);
  const isMultiboardView = isInAllView || isInSubscriptionsView || isInModView;
  const shouldVirtualizeCatalog = isMultiboardView;
  const catalogViewportBuffer = isMultiboardView ? (isMobile ? { bottom: 2400, top: 1200 } : { bottom: 900, top: 600 }) : { bottom: 1200, top: 1200 };

  const virtuosoRef = useRef<VirtuosoHandle | null>(null);
  const virtuosoStateKey = feedCacheKey ? `${feedCacheKey}-${sortType}` : `${location.pathname}${location.search}-${sortType}-catalog`;
  const navigationType = useNavigationType();

  const hasBeenVisibleRef = useRef(false);
  useEffect(() => {
    if (isVisible && !hasBeenVisibleRef.current) {
      hasBeenVisibleRef.current = true;
      if (navigationType !== 'POP') {
        window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
      }
    }
  }, [isVisible, navigationType]);

  useLayoutEffect(() => {
    if (!isVisible || !shouldVirtualizeCatalog) return;

    const currentKey = virtuosoStateKey;
    // Avoid pulling Virtuoso state on every scroll tick in the catalog hot path.
    const saveVirtuosoState = () =>
      virtuosoRef.current?.getState((snapshot: StateSnapshot) => {
        if (snapshot?.ranges?.length) {
          lastVirtuosoStates[currentKey] = snapshot;
        }
      });
    window.addEventListener('pagehide', saveVirtuosoState);
    return () => {
      saveVirtuosoState();
      window.removeEventListener('pagehide', saveVirtuosoState);
    };
  }, [virtuosoStateKey, isVisible, shouldVirtualizeCatalog]);

  const lastVirtuosoState = shouldVirtualizeCatalog && navigationType === 'POP' ? lastVirtuosoStates?.[virtuosoStateKey] : undefined;

  const renderCatalogRow = useCallback(
    (index: number, row: Comment[]) => <CatalogRow estimatedHeight={rowHeightEstimates[index]} index={index} matchedFilterColors={matchedFilterColors} row={row} />,
    [matchedFilterColors, rowHeightEstimates],
  );

  useEffect(() => {
    if (!isVisible) return;
    const boardIdentifier = params.boardIdentifier || boardIdentifierProp;
    const isDirectory = boardIdentifier ? isDirectoryBoard(boardIdentifier, directories) : false;

    let documentTitle: string;
    if (isInAllView) {
      documentTitle = t('all');
    } else if (isInSubscriptionsView) {
      documentTitle = t('subscriptions');
    } else if (isDirectory) {
      documentTitle = `/${boardIdentifier}/`;
    } else {
      documentTitle = title ? title : shortAddress || communityAddress || '';
    }
    document.title = documentTitle + ` - ${t('catalog')} - 5chan`;
  }, [title, shortAddress, communityAddress, isInAllView, isInSubscriptionsView, t, isVisible, params.boardIdentifier, boardIdentifierProp, directories]);

  return (
    <div className={styles.content}>
      <hr />
      <div className={styles.catalog}>
        {catalogRenderFeed.length !== 0 ? (
          <>
            {shouldVirtualizeCatalog ? (
              <Virtuoso
                defaultItemHeight={defaultCatalogRowHeight}
                heightEstimates={catalogVirtualizationMode === 'off' ? undefined : rowHeightEstimates}
                increaseViewportBy={catalogViewportBuffer}
                {...catalogSizingProps}
                totalCount={rows?.length || 0}
                data={rows}
                itemContent={renderCatalogRow}
                useWindowScroll={true}
                components={footerComponents}
                endReached={effectiveInfiniteScroll && hasMore ? loadMore : undefined}
                ref={virtuosoRef}
                restoreStateFrom={lastVirtuosoState}
                initialScrollTop={lastVirtuosoState?.scrollTop}
              />
            ) : (
              <>
                {rows.map((row, index) => (
                  <CatalogRow
                    key={row.map((post) => post?.cid || '').join('\u0000') || `row-${index}`}
                    estimatedHeight={rowHeightEstimates[index]}
                    index={index}
                    matchedFilterColors={matchedFilterColors}
                    row={row}
                  />
                ))}
                {catalogFooter}
              </>
            )}
          </>
        ) : (
          <>
            <div className={styles.footer}>
              <CatalogLoading
                communityAddresses={communityAddresses}
                hasMore={hasMore}
                combinedFeedLength={cappedFeed.length}
                state={state}
                subscriptionsLength={isInSubscriptionsView ? subscriptions?.length || 0 : 1}
                error={error}
              />
            </div>
            <PageFooterDesktop
              firstRow={
                <CatalogFooterFirstRow
                  communityAddress={communityAddress}
                  isInAllView={isInAllView}
                  isInSubscriptionsView={isInSubscriptionsView}
                  isInModView={isInModView}
                />
              }
            />
            <PageFooterMobile>
              <div className={mobileFooterStyles.mobileFooterButtons}>
                <ReturnButton address={communityAddress} isInAllView={isInAllView} isInSubscriptionsView={isInSubscriptionsView} isInModView={isInModView} />
                <ArchiveButton address={communityAddress} isInAllView={isInAllView} isInSubscriptionsView={isInSubscriptionsView} isInModView={isInModView} />
                <TopButton />
                <RefreshButton />
              </div>
            </PageFooterMobile>
          </>
        )}
      </div>
    </div>
  );
};

export default Catalog;
