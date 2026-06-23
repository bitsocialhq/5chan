import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { Link, useLocation, useNavigate, useNavigationType, useParams } from 'react-router-dom';
import { Comment, useAccount, useAccountComments, useCommunity, useFeed } from '@bitsocial/bitsocial-react-hooks';
import { useCommunityField } from '../../hooks/use-stable-community';
import { communitiesPagesStore } from '../../lib/bitsocial-internals/stores';
import { Virtuoso, VirtuosoHandle, StateSnapshot } from 'react-virtuoso';
import { Trans, useTranslation } from 'react-i18next';
import styles from './board.module.css';
import mobileFooterStyles from '../../components/footer/footer.module.css';
import { shouldShowSnow } from '../../lib/snow';
import { useAccountCommunityAddresses } from '../../hooks/use-account-community-addresses';
import { useDirectories, useDirectoryByAddress } from '../../hooks/use-directories';
import { useCommunityIdentifier, useCommunityIdentifiers } from '../../hooks/use-community-identifiers';
import { useFilteredDirectoryAddresses } from '../../hooks/use-filtered-directory-addresses';
import { useResolvedCommunityAddress } from '../../hooks/use-resolved-community-address';
import { useFeedStateString } from '../../hooks/use-state-string';
import useFeedResetStore from '../../stores/use-feed-reset-store';
import useFeedViewSettingsStore from '../../stores/use-feed-view-settings-store';
import usePostNumberStore from '../../stores/use-post-number-store';
import { useBoardFeedPageSize } from '../../hooks/use-board-feed-page-size';
import useExpandedTimeFilter from '../../hooks/use-expanded-time-filter';
import useIsMobile from '../../hooks/use-is-mobile';
import { useNowSeconds } from '../../hooks/use-now-seconds';
import { useSuggestionFeedLoader } from '../../hooks/use-suggestion-feed-loader';
import useTimeFilter from '../../hooks/use-time-filter';
import { getPageSlice } from '../../lib/utils/board-feed-pagination';
import { getPageFromFeedPath, isDirectoryBoard, normalizeMultiboardFeedPath, stripPageFromFeedPath } from '../../lib/utils/route-utils';
import { isCommentArchived } from '../../lib/utils/comment-moderation-utils';
import { getCommentCommunityAddress } from '../../lib/utils/comment-utils';
import { restoreActiveAccountAuthor } from '../../lib/utils/account-comment-author-utils';
import { getNonokoPendingAccountCommentIndex } from '../../lib/utils/post-options-utils';
import { getRawBoardThreadState } from '../../lib/utils/raw-board-thread-state';
import { getSearchWithTimeFilter, getTimeFilterSuggestion, type TimeFilterSuggestion } from '../../lib/utils/time-filter-utils';
import { getPretextItemSizeFromElement, resolveFeedVirtualizationMode } from '../../lib/utils/pretext-height-estimates';
import { isFlashDirectory, isFlashDirectoryCode } from '../../lib/flash-tags';
import ErrorDisplay from '../../components/error-display/error-display';
import FlashBoardTable from '../../components/flash-board-table/flash-board-table';
import LoadingEllipsis from '../../components/loading-ellipsis/loading-ellipsis';
import BoardPagination from '../../components/board-pagination/board-pagination';
import { CatalogButton } from '../../components/board-buttons/board-buttons';
import { PageFooterDesktop, PageFooterMobile } from '../../components/footer/footer';
import ModEmptyState from '../../components/mod-empty-state/mod-empty-state';
import { Post } from '../post/post';

const lastVirtuosoStates: { [key: string]: StateSnapshot } = {};
const RECENT_ACCOUNT_COMMENT_WINDOW_SECONDS = 60 * 60;
const WEEK_IN_SECONDS = 7 * 24 * 60 * 60;
const MONTH_IN_SECONDS = 30 * 24 * 60 * 60;
const YEAR_IN_SECONDS = 365 * 24 * 60 * 60;
// Keep the hook on its indexed fast path when this view should not inject local posts.
const EMPTY_ACCOUNT_COMMENT_LOOKUP = { commentIndices: [-1] };
const EMPTY_COMMUNITIES_PAGES = {};

/** Board feed always uses 'active' sort; catalog dropdown does not affect board ordering. */
const BOARD_SORT_TYPE = 'active' as const;

const toFiniteNumber = (value: unknown) => (typeof value === 'number' && Number.isFinite(value) ? value : 0);

const compareBoardActivePosts = (firstPost: Comment, secondPost: Comment) => {
  const activeDifference =
    toFiniteNumber(secondPost?.lastReplyTimestamp ?? secondPost?.timestamp) - toFiniteNumber(firstPost?.lastReplyTimestamp ?? firstPost?.timestamp);
  if (activeDifference !== 0) return activeDifference;

  const upvoteDifference = toFiniteNumber(secondPost?.upvoteCount) - toFiniteNumber(firstPost?.upvoteCount);
  if (upvoteDifference !== 0) return upvoteDifference;

  return toFiniteNumber(secondPost?.timestamp) - toFiniteNumber(firstPost?.timestamp);
};

const sortBoardActiveFeed = (posts: Comment[]) => {
  const pinnedPosts: Comment[] = [];
  const regularPosts: Comment[] = [];

  for (const post of posts) {
    if (post?.pinned) {
      pinnedPosts.push(post);
    } else {
      regularPosts.push(post);
    }
  }

  return [...pinnedPosts, ...regularPosts.toSorted(compareBoardActivePosts)];
};

type RefreshHoldState = {
  hasSettledResetCall: boolean;
  hasSeenEmptyFeed: boolean;
  isReleased: boolean;
  startedFeedLength: number;
  startedAt: number;
};

interface BoardFooterProps {
  communityAddresses: string[];
  hasMore: boolean;
  feedState: string | undefined;
  combinedFeedLength: number;
  isSingleCommunityBoard: boolean;
  isKnownEmptySingleCommunityBoard: boolean;
  isInSubscriptionsView: boolean;
  isInModView: boolean;
  isManualRefreshPending: boolean;
  currentTimeFilterName: string;
  moreThreadsSuggestion: TimeFilterSuggestion | null;
  moreThreadsSuggestionPathname: string | null;
  moreThreadsSuggestionSearch: string;
  onExpandTimeWindow?: (suggestion: TimeFilterSuggestion) => void | Promise<void>;
  communityState: string | undefined;
  subscriptionsLength: number;
  accountCommunityAddressesLength: number;
  /** Show loading ellipsis. True when infinite scroll, or when pagination + empty feed (initial load). */
  showLoadingEllipsis?: boolean;
}

// Defined outside Board to preserve component identity across renders (Virtuoso optimization)
// The useFeedStateString hook is called here instead of in Board to isolate re-renders
// caused by backend IPFS state changes to just this footer component
const BoardFooter = ({
  communityAddresses,
  hasMore,
  feedState,
  combinedFeedLength,
  isSingleCommunityBoard,
  isKnownEmptySingleCommunityBoard,
  isInSubscriptionsView,
  isInModView,
  isManualRefreshPending,
  currentTimeFilterName,
  moreThreadsSuggestion,
  moreThreadsSuggestionPathname,
  moreThreadsSuggestionSearch,
  onExpandTimeWindow,
  communityState,
  subscriptionsLength,
  accountCommunityAddressesLength,
  showLoadingEllipsis = true,
}: BoardFooterProps) => {
  const { t } = useTranslation();

  const feedStateString = useFeedStateString(communityAddresses);
  const loadingStateString = isManualRefreshPending
    ? t('loading_feed')
    : feedStateString || (combinedFeedLength === 0 ? t('downloading_board') : t('looking_for_more_posts'));
  const isFeedSucceeded = feedState === 'succeeded';
  const isFeedFailed = feedState === 'failed';
  const canShowNoThreads = !isManualRefreshPending && (isSingleCommunityBoard ? isKnownEmptySingleCommunityBoard : isFeedSucceeded && !hasMore);
  const isEmptyFeedLoading = combinedFeedLength === 0 && !canShowNoThreads && (isSingleCommunityBoard ? communityState !== 'failed' : !isFeedFailed);
  const showFooterLoading = showLoadingEllipsis && (hasMore || isEmptyFeedLoading);

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
                aria-label={t('load_more')}
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
  } else if (combinedFeedLength === 0 && canShowNoThreads) {
    footerContent = t('no_threads');
  }
  if (communityAddresses && communityAddresses.length === 0) {
    footerContent = null;
  }
  return (
    <div className={styles.footer}>
      {footerContent}
      <div>
        {communityState === 'failed' ? (
          <span className='red'>{communityState}</span>
        ) : isInSubscriptionsView && subscriptionsLength === 0 ? (
          <output className={styles.searchNothingFound}>{t('not_subscribed_to_any_board')}</output>
        ) : isInModView && accountCommunityAddressesLength === 0 ? (
          <ModEmptyState />
        ) : (
          showFooterLoading && <LoadingEllipsis string={loadingStateString} />
        )}
      </div>
    </div>
  );
};

export interface BoardProps {
  feedCacheKey?: string;
  viewType?: 'all' | 'subs' | 'mod' | 'board';
  boardIdentifier?: string;
  timeFilterNameFromCache?: string;
  isVisible?: boolean;
}

const Board = ({ feedCacheKey, viewType, boardIdentifier: boardIdentifierProp, timeFilterNameFromCache, isVisible = true }: BoardProps) => {
  const { t } = useTranslation();
  const routerLocation = useLocation();
  const params = useParams();
  const isInAllView = viewType ? viewType === 'all' : false;
  const isInSubscriptionsView = viewType ? viewType === 'subs' : false;
  const isInModView = viewType ? viewType === 'mod' : false;
  const { timeFilterName, timeFilterSeconds } = useTimeFilter(timeFilterNameFromCache);
  const isMultiboardView = isInAllView || isInSubscriptionsView || isInModView;
  const multiboardTimeFilterSeconds = isMultiboardView ? timeFilterSeconds : undefined;

  const directories = useDirectories();
  const communityAddress = useResolvedCommunityAddress(boardIdentifierProp);

  const filteredDirectoryAddresses = useFilteredDirectoryAddresses();

  const account = useAccount();
  const subscriptions = account?.subscriptions;

  const accountCommunityAddresses = useAccountCommunityAddresses();

  const communityAddresses = useMemo(() => {
    if (isInAllView) {
      return filteredDirectoryAddresses;
    }
    if (isInSubscriptionsView) {
      return subscriptions || [];
    }
    if (isInModView) {
      return accountCommunityAddresses;
    }
    return [communityAddress];
  }, [isInAllView, isInSubscriptionsView, isInModView, communityAddress, filteredDirectoryAddresses, subscriptions, accountCommunityAddresses]);
  const communities = useCommunityIdentifiers(communityAddresses);
  const communityIdentifier = useCommunityIdentifier(communityAddress);

  const communityDirectory = useDirectoryByAddress(isInAllView || isInSubscriptionsView || isInModView ? undefined : communityAddress);
  const requestedBoardIdentifier = boardIdentifierProp || params.boardIdentifier;
  const shouldUseFlashTable = !isMultiboardView && (isFlashDirectoryCode(requestedBoardIdentifier) || isFlashDirectory(communityDirectory));
  const enableInfiniteScroll = useFeedViewSettingsStore((state) => state.enableInfiniteScroll);
  const setEnableInfiniteScroll = useFeedViewSettingsStore((state) => state.setEnableInfiniteScroll);
  const isMobile = useIsMobile();
  const isForcedInfiniteScroll = isInAllView || isInSubscriptionsView || isInModView;
  const effectiveInfiniteScroll = !shouldUseFlashTable && (enableInfiniteScroll || isForcedInfiniteScroll);
  const { guiPostsPerPage, maxGuiPages, paginationFeedPostsPerPage, infiniteFeedPostsPerPage } = useBoardFeedPageSize(communityDirectory);

  const excludeArchivedFilter = useMemo(
    () => ({
      filter: (comment: Comment) => !isCommentArchived(comment),
      key: 'exclude-archived',
    }),
    [],
  );

  const feedOptions = useMemo(
    () => ({
      communities,
      sortType: BOARD_SORT_TYPE,
      postsPerPage: effectiveInfiniteScroll ? infiniteFeedPostsPerPage : paginationFeedPostsPerPage,
      filter: excludeArchivedFilter,
      newerThan: multiboardTimeFilterSeconds,
    }),
    [communities, effectiveInfiniteScroll, infiniteFeedPostsPerPage, paginationFeedPostsPerPage, excludeArchivedFilter, multiboardTimeFilterSeconds],
  );

  const { feed, hasMore, loadMore, reset, expandTimeWindow, state: feedState } = useFeed(feedOptions);
  const { currentTimeFilterName, currentTimeFilterSeconds, expandSuggestionTimeWindow } = useExpandedTimeFilter({
    timeFilterName,
    timeFilterSeconds: multiboardTimeFilterSeconds,
    expandTimeWindow,
  });
  const shouldProbeSuggestionFeeds = isVisible && isMultiboardView && typeof currentTimeFilterSeconds === 'number' && feedState === 'succeeded' && !hasMore;
  const shouldProbeWeeklyFeed = shouldProbeSuggestionFeeds && currentTimeFilterSeconds < WEEK_IN_SECONDS;
  const shouldProbeMonthlyFeed = shouldProbeSuggestionFeeds && currentTimeFilterSeconds < MONTH_IN_SECONDS;
  const shouldProbeYearlyFeed = shouldProbeSuggestionFeeds && currentTimeFilterSeconds < YEAR_IN_SECONDS;
  // Keep suggestion feeds on a stable hook identity; the loader widens them by paging, not by recreating the feed.
  const suggestionPostsPerPage = infiniteFeedPostsPerPage;
  const suggestionRequestKeyBase = `${routerLocation.pathname}${routerLocation.search}`;
  const {
    feed: weeklyFeed,
    hasMore: weeklyFeedHasMore,
    loadMore: loadMoreWeeklyFeed,
  } = useFeed({
    communities: shouldProbeWeeklyFeed ? communities : [],
    sortType: BOARD_SORT_TYPE,
    postsPerPage: suggestionPostsPerPage,
    filter: excludeArchivedFilter,
    newerThan: WEEK_IN_SECONDS,
  });
  const {
    feed: monthlyFeed,
    hasMore: monthlyFeedHasMore,
    loadMore: loadMoreMonthlyFeed,
  } = useFeed({
    communities: shouldProbeMonthlyFeed ? communities : [],
    sortType: BOARD_SORT_TYPE,
    postsPerPage: suggestionPostsPerPage,
    filter: excludeArchivedFilter,
    newerThan: MONTH_IN_SECONDS,
  });
  const {
    feed: yearlyFeed,
    hasMore: yearlyFeedHasMore,
    loadMore: loadMoreYearlyFeed,
  } = useFeed({
    communities: shouldProbeYearlyFeed ? communities : [],
    sortType: BOARD_SORT_TYPE,
    postsPerPage: suggestionPostsPerPage,
    filter: excludeArchivedFilter,
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
  const nowSeconds = useNowSeconds(recentAccountComments.length > 0);
  const nonokoPendingAccountCommentIndex = getNonokoPendingAccountCommentIndex(routerLocation.state);
  const nonokoPendingAccountCommentLookupOptions = useMemo(
    () =>
      typeof nonokoPendingAccountCommentIndex === 'number'
        ? {
            commentIndices: [nonokoPendingAccountCommentIndex],
          }
        : EMPTY_ACCOUNT_COMMENT_LOOKUP,
    [nonokoPendingAccountCommentIndex],
  );
  const { accountComments: nonokoPendingAccountComments } = useAccountComments(nonokoPendingAccountCommentLookupOptions);

  const pathWithoutSettings = routerLocation.pathname.replace(/\/settings$/, '');
  const currentPage = getPageFromFeedPath(pathWithoutSettings);
  const paginationBasePath = stripPageFromFeedPath(pathWithoutSettings);

  const resetTriggeredRef = useRef(false);
  const refreshHoldRef = useRef<RefreshHoldState | null>(null);
  const feedLengthRef = useRef(feed.length);
  feedLengthRef.current = feed.length;
  const [, bumpRefreshHoldVersion] = useState(0);
  const [isManualRefreshPending, startManualRefreshTransition] = useTransition();
  const refreshBoardFeed = useCallback(() => {
    const startedAt = Date.now();
    refreshHoldRef.current = { hasSettledResetCall: false, hasSeenEmptyFeed: false, isReleased: false, startedFeedLength: feedLengthRef.current, startedAt };
    bumpRefreshHoldVersion((version) => version + 1);
    startManualRefreshTransition(async () => {
      try {
        await reset();
      } catch (error) {
        console.error('Failed to refresh board feed:', error);
      } finally {
        const currentRefreshHold = refreshHoldRef.current;
        if (currentRefreshHold?.startedAt === startedAt && !currentRefreshHold.isReleased) {
          currentRefreshHold.hasSettledResetCall = true;
          bumpRefreshHoldVersion((version) => version + 1);
        }
      }
    });
  }, [reset, startManualRefreshTransition]);

  const setResetFunction = useFeedResetStore((state) => state.setResetFunction);
  useEffect(() => {
    if (isVisible) {
      setResetFunction(refreshBoardFeed);
    }
  }, [refreshBoardFeed, setResetFunction, isVisible]);

  // Use stable community fields to avoid rerenders from updatingState
  const communityTitle = useCommunityField(communityAddress, (community) => community?.title);
  const shortAddress = useCommunityField(communityAddress, (community) => community?.shortAddress);
  // useCommunityField only reads from store, doesn't trigger fetching
  const communityData = useCommunity(communityIdentifier ? { community: communityIdentifier } : undefined);
  const { error: communityError, state: communityState } = communityData || {};
  const communitiesPages = communitiesPagesStore((state) => (isMultiboardView ? EMPTY_COMMUNITIES_PAGES : state.communitiesPages));
  const rawBoardThreadState = useMemo(
    () =>
      isMultiboardView
        ? undefined
        : getRawBoardThreadState({
            accountId: account?.id,
            communitiesPages,
            community: communityData,
            sortType: BOARD_SORT_TYPE,
          }),
    [account?.id, communitiesPages, communityData, isMultiboardView],
  );
  const isRawBoardThreadStateFullyLoaded = rawBoardThreadState?.isFullyLoaded ?? false;
  const isRawBoardThreadStateEmpty = isRawBoardThreadStateFullyLoaded && (rawBoardThreadState?.rootThreadCids.size ?? 0) === 0;
  const isSingleCommunityBoard = !isInAllView && !isInSubscriptionsView && !isInModView;
  const isLoadedCommunityState = communityState === 'succeeded' || communityState === 'ready';
  const isFeedSucceeded = feedState === 'succeeded';
  const refreshHold = refreshHoldRef.current;
  if (refreshHold && !refreshHold.isReleased && !refreshHold.hasSeenEmptyFeed && feed.length === 0) {
    refreshHold.hasSeenEmptyFeed = true;
  }
  const canReleaseRefreshHoldToEmptyBoard =
    refreshHold?.startedFeedLength === 0 && isSingleCommunityBoard && isLoadedCommunityState && isRawBoardThreadStateEmpty && isFeedSucceeded;
  const refreshHoldHasSeenEmptyFeed = Boolean(refreshHold?.hasSeenEmptyFeed || (refreshHold && feed.length === 0));
  const canReleaseRefreshHold = Boolean(
    refreshHold &&
    !refreshHold.isReleased &&
    (feed.length > 0 ||
      communityState === 'failed' ||
      feedState === 'failed' ||
      canReleaseRefreshHoldToEmptyBoard ||
      (!refreshHoldHasSeenEmptyFeed && refreshHold.hasSettledResetCall)) &&
    (refreshHoldHasSeenEmptyFeed || refreshHold.hasSettledResetCall),
  );
  if (refreshHold && canReleaseRefreshHold) {
    refreshHold.isReleased = true;
  }
  const isRefreshHoldPending = Boolean(refreshHold && !refreshHold.isReleased);
  const isBoardRefreshPending = isManualRefreshPending || isRefreshHoldPending;

  // Show local posts without letting them become the whole board during feed hydration.
  const feedCids = useMemo(() => new Set(feed.map((f) => f.cid)), [feed]);
  const nonokoPendingAccountComment = useMemo(() => {
    const comment = nonokoPendingAccountComments.find(Boolean);
    if (!comment) return undefined;

    const { cid, deleted, parentCid, postCid, removed } = comment;
    const commentCommunityAddress = getCommentCommunityAddress(comment);
    if (deleted || removed || parentCid || commentCommunityAddress !== communityAddress) return undefined;
    if (cid && postCid && cid !== postCid) return undefined;
    if (cid && feedCids.has(cid)) return undefined;

    return comment;
  }, [nonokoPendingAccountComments, communityAddress, feedCids]);
  const filteredComments = useMemo(
    () =>
      recentAccountComments.filter((comment) => {
        const { cid, deleted, postCid, removed, state, timestamp } = comment || {};
        const commentCommunityAddress = getCommentCommunityAddress(comment);
        return (
          !deleted &&
          !removed &&
          timestamp > nowSeconds - RECENT_ACCOUNT_COMMENT_WINDOW_SECONDS &&
          state === 'succeeded' &&
          cid &&
          cid === postCid &&
          commentCommunityAddress === communityAddress &&
          !feedCids.has(cid)
        );
      }),
    [recentAccountComments, communityAddress, feedCids, nowSeconds],
  );
  const localAccountComments = useMemo(() => {
    const comments = (() => {
      if (!nonokoPendingAccountComment) return filteredComments;
      if (!nonokoPendingAccountComment.cid) return [nonokoPendingAccountComment, ...filteredComments];

      return [nonokoPendingAccountComment, ...filteredComments.filter((comment) => comment.cid !== nonokoPendingAccountComment.cid)];
    })();

    return comments.map((comment) => restoreActiveAccountAuthor(comment, account));
  }, [nonokoPendingAccountComment, filteredComments, account]);

  const sortedFeed = useMemo(() => sortBoardActiveFeed(feed), [feed]);
  const canShowRecentLocalAccountComments = !isSingleCommunityBoard || sortedFeed.length > 0 || isRawBoardThreadStateFullyLoaded;
  const feedWithLocalAccountComments = useMemo(() => {
    if (isBoardRefreshPending) {
      return sortedFeed;
    }

    const visibleLocalAccountComments = canShowRecentLocalAccountComments ? localAccountComments : nonokoPendingAccountComment ? localAccountComments.slice(0, 1) : [];

    if (visibleLocalAccountComments.length === 0) {
      return sortedFeed;
    }

    return sortBoardActiveFeed([...feed, ...visibleLocalAccountComments]);
  }, [canShowRecentLocalAccountComments, feed, isBoardRefreshPending, localAccountComments, nonokoPendingAccountComment, sortedFeed]);
  const combinedFeed = feedWithLocalAccountComments;

  const cappedFeed = useMemo(
    () => (effectiveInfiniteScroll ? combinedFeed : combinedFeed.slice(0, guiPostsPerPage * maxGuiPages)),
    [effectiveInfiniteScroll, combinedFeed, guiPostsPerPage, maxGuiPages],
  );
  const moreThreadsSuggestion = useMemo(
    () => (shouldProbeSuggestionFeeds ? getTimeFilterSuggestion(feed.length, weeklyFeed.length, monthlyFeed.length, yearlyFeed.length, currentTimeFilterSeconds) : null),
    [currentTimeFilterSeconds, feed.length, monthlyFeed.length, shouldProbeSuggestionFeeds, weeklyFeed.length, yearlyFeed.length],
  );
  const moreThreadsSuggestionPathname = isInAllView ? '/all' : isInSubscriptionsView ? '/subs' : isInModView ? '/mod' : null;
  const registerComments = usePostNumberStore((state) => state.registerComments);
  const totalPages = useMemo(() => Math.min(maxGuiPages, Math.ceil(cappedFeed.length / guiPostsPerPage) || 1), [cappedFeed.length, guiPostsPerPage, maxGuiPages]);
  const currentPageFeed = useMemo(
    () => (effectiveInfiniteScroll ? [] : getPageSlice(cappedFeed, currentPage, guiPostsPerPage, maxGuiPages)),
    [effectiveInfiniteScroll, cappedFeed, currentPage, guiPostsPerPage, maxGuiPages],
  );

  const navigate = useNavigate();
  const defaultFeedVirtualizationMode = isMobile && isMultiboardView ? 'off' : 'item-size';
  const feedVirtualizationMode = useMemo(
    () => resolveFeedVirtualizationMode(routerLocation.search, defaultFeedVirtualizationMode),
    [defaultFeedVirtualizationMode, routerLocation.search],
  );
  const defaultBoardItemHeight = feedVirtualizationMode === 'item-size' ? (isMobile ? 420 : 480) : isMobile ? 420 : 300;
  // Omit the prop entirely in fallback mode. Passing `itemSize={undefined}` overrides
  // Virtuoso's internal DOM measurer and leaves multiboard items stuck on the default height.
  const boardSizingProps = useMemo(() => (feedVirtualizationMode === 'item-size' ? { itemSize: getPretextItemSizeFromElement } : {}), [feedVirtualizationMode]);

  // Redirect multiboard paths with page-number segments to normalized path (infinite-scroll only)
  useEffect(() => {
    if (!isVisible || !isForcedInfiniteScroll) return;
    const normalized = normalizeMultiboardFeedPath(routerLocation.pathname);
    if (normalized !== routerLocation.pathname) {
      navigate({ pathname: normalized, search: routerLocation.search }, { replace: true });
    }
  }, [isVisible, isForcedInfiniteScroll, routerLocation.pathname, routerLocation.search, navigate]);

  useEffect(() => {
    if (!isVisible) return;
    if (!effectiveInfiniteScroll && currentPage > totalPages && totalPages > 0) {
      const targetPage = totalPages;
      const targetPath = targetPage === 1 ? paginationBasePath : `${paginationBasePath}/${targetPage}`;
      navigate({ pathname: targetPath, search: routerLocation.search }, { replace: true });
    }
  }, [isVisible, effectiveInfiniteScroll, currentPage, totalPages, paginationBasePath, routerLocation.search, navigate]);

  // Scroll to top instantly when page changes in pagination mode
  useEffect(() => {
    if (!effectiveInfiniteScroll) {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    }
  }, [effectiveInfiniteScroll, currentPage]);

  useEffect(() => {
    if (filteredComments.length > 0 && !resetTriggeredRef.current) {
      reset();
      resetTriggeredRef.current = true;
    }
  }, [filteredComments, reset]);

  useEffect(() => {
    if (combinedFeed.length > 0) {
      registerComments(combinedFeed);
    }
  }, [combinedFeed, registerComments]);

  const isKnownEmptySingleCommunityBoard = isSingleCommunityBoard && combinedFeed.length === 0 && isLoadedCommunityState && isRawBoardThreadStateEmpty && isFeedSucceeded;
  const effectiveHasMore = isKnownEmptySingleCommunityBoard ? false : hasMore;
  const title = isInAllView ? t('all') : isInSubscriptionsView ? t('subscriptions') : isInModView ? t('mod') : communityTitle;

  // Memoize footer component to preserve identity across renders (Virtuoso optimization)
  // Note: useFeedStateString is called inside BoardFooter to isolate re-renders from backend state changes
  const footerComponents = useMemo(
    () => ({
      Footer: () => (
        <>
          {shouldUseFlashTable ? null : (
            <BoardFooter
              communityAddresses={communityAddresses}
              hasMore={effectiveHasMore}
              feedState={feedState}
              combinedFeedLength={combinedFeed.length}
              isSingleCommunityBoard={isSingleCommunityBoard}
              isKnownEmptySingleCommunityBoard={isKnownEmptySingleCommunityBoard}
              isInSubscriptionsView={isInSubscriptionsView}
              isInModView={isInModView}
              isManualRefreshPending={isBoardRefreshPending}
              currentTimeFilterName={currentTimeFilterName}
              moreThreadsSuggestion={moreThreadsSuggestion}
              moreThreadsSuggestionPathname={moreThreadsSuggestionPathname}
              moreThreadsSuggestionSearch={routerLocation.search}
              onExpandTimeWindow={expandSuggestionTimeWindow}
              communityState={communityState}
              subscriptionsLength={subscriptions?.length || 0}
              accountCommunityAddressesLength={accountCommunityAddresses?.length || 0}
              showLoadingEllipsis={effectiveInfiniteScroll || combinedFeed.length === 0}
            />
          )}
          <PageFooterDesktop
            firstRow={
              <BoardPagination
                basePath={paginationBasePath}
                currentPage={currentPage}
                search={routerLocation.search}
                totalPages={totalPages}
                footerStyle
                isMultiboard={isForcedInfiniteScroll}
              />
            }
          />
          <PageFooterMobile>
            <div>
              {!isForcedInfiniteScroll && (
                <div className={mobileFooterStyles.mobileFooterButtons}>
                  <button type='button' className='button' onClick={() => window.scrollTo({ top: 0, left: 0, behavior: 'instant' })}>
                    {t('start_new_thread')}
                  </button>
                </div>
              )}
              <div className={mobileFooterStyles.mobileFooterButtons}>
                <button type='button' className='button' onClick={() => window.scrollTo({ top: 0, left: 0, behavior: 'instant' })}>
                  {t('top')}
                </button>
                <button type='button' className='button' onClick={refreshBoardFeed}>
                  {t('refresh')}
                </button>
              </div>
              <hr />
              {!isForcedInfiniteScroll && !effectiveInfiniteScroll && (
                <>
                  <div className={mobileFooterStyles.mobileFooterPagination}>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                      <span key={page}>
                        [
                        <Link
                          to={{ pathname: page === 1 ? paginationBasePath : `${paginationBasePath}/${page}`, search: routerLocation.search }}
                          className={page === currentPage ? mobileFooterStyles.mobileFooterPaginationCurrent : undefined}
                        >
                          {page}
                        </Link>
                        ]
                      </span>
                    ))}
                  </div>
                  <div className={mobileFooterStyles.mobileFooterButtons}>
                    <CatalogButton address={communityAddress} isInAllView={isInAllView} isInSubscriptionsView={isInSubscriptionsView} isInModView={isInModView} />
                  </div>
                </>
              )}
              {effectiveHasMore && !effectiveInfiniteScroll && !shouldUseFlashTable && (
                <div className={mobileFooterStyles.mobileFooterButtons}>
                  <button type='button' className='button' onClick={() => setEnableInfiniteScroll(true)}>
                    {t('load_more')}
                  </button>
                </div>
              )}
            </div>
          </PageFooterMobile>
        </>
      ),
    }),
    [
      communityAddresses,
      effectiveHasMore,
      combinedFeed.length,
      isKnownEmptySingleCommunityBoard,
      isSingleCommunityBoard,
      isInAllView,
      isInSubscriptionsView,
      isInModView,
      isBoardRefreshPending,
      currentTimeFilterName,
      moreThreadsSuggestion,
      moreThreadsSuggestionPathname,
      expandSuggestionTimeWindow,
      communityState,
      feedState,
      communityAddress,
      subscriptions?.length,
      accountCommunityAddresses?.length,
      effectiveInfiniteScroll,
      shouldUseFlashTable,
      isForcedInfiniteScroll,
      paginationBasePath,
      currentPage,
      totalPages,
      setEnableInfiniteScroll,
      refreshBoardFeed,
      routerLocation.search,
      t,
    ],
  );

  const virtuosoRef = useRef<VirtuosoHandle | null>(null);
  const virtuosoStateKey = feedCacheKey ? `${feedCacheKey}-${BOARD_SORT_TYPE}` : `${routerLocation.pathname}${routerLocation.search}-${BOARD_SORT_TYPE}`;
  const navigationType = useNavigationType();
  const boardViewportBuffer = isMultiboardView ? (isMobile ? { bottom: 1400, top: 2400 } : { bottom: 1200, top: 2400 }) : { bottom: 1200, top: 1200 };
  const boardMinOverscanItemCount = isMultiboardView && isMobile ? { bottom: 4, top: 8 } : undefined;

  const boardItemContent = useCallback(
    (index: number, post: Comment | undefined) => <Post feedVirtualizationModeOverride={feedVirtualizationMode} index={index} post={post} />,
    [feedVirtualizationMode],
  );

  const hasBeenVisibleRef = useRef(false);
  useEffect(() => {
    if (isVisible && !hasBeenVisibleRef.current) {
      hasBeenVisibleRef.current = true;
      if (navigationType !== 'POP') {
        window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
      }
    }
  }, [isVisible, navigationType]);

  useEffect(() => {
    if (!isVisible) return;

    const currentKey = virtuosoStateKey;
    // Avoid state snapshot work on every scroll tick in the hottest board path.
    const saveVirtuosoState = () => {
      virtuosoRef.current?.getState((snapshot: StateSnapshot) => {
        if (snapshot?.ranges?.length) {
          lastVirtuosoStates[currentKey] = snapshot;
        }
      });
    };
    window.addEventListener('pagehide', saveVirtuosoState);
    return () => {
      saveVirtuosoState();
      window.removeEventListener('pagehide', saveVirtuosoState);
    };
  }, [virtuosoStateKey, isVisible]);

  const lastVirtuosoState = navigationType === 'POP' ? lastVirtuosoStates?.[virtuosoStateKey] : undefined;

  useEffect(() => {
    if (!isVisible) return;
    const boardIdentifier = params.boardIdentifier || boardIdentifierProp;
    const isDirectory = boardIdentifier ? isDirectoryBoard(boardIdentifier, directories) : false;

    let boardTitle: string;
    if (isInAllView) {
      boardTitle = t('all');
    } else if (isInSubscriptionsView) {
      boardTitle = t('subscriptions');
    } else if (isInModView) {
      boardTitle = t('mod');
    } else if (isDirectory) {
      boardTitle = `/${boardIdentifier}/`;
    } else {
      boardTitle = title ? title : shortAddress || communityAddress || '';
    }
    document.title = boardTitle + ' - 5chan';
  }, [title, shortAddress, communityAddress, isVisible, params.boardIdentifier, boardIdentifierProp, directories, isInAllView, isInSubscriptionsView, isInModView, t]);

  const shouldShowErrorToUser = communityError?.message && feed.length === 0;
  const shouldShowUnverifiedAddressWarning =
    !isMultiboardView &&
    typeof communityIdentifier?.name === 'string' &&
    communityIdentifier.name.includes('.') &&
    typeof communityIdentifier.publicKey === 'string' &&
    communityIdentifier.publicKey.length > 0 &&
    communityData?.nameResolved === false;
  const displayFeed = effectiveInfiniteScroll ? combinedFeed : currentPageFeed;
  const canShowEmptyFlashTable = isLoadedCommunityState && isFeedSucceeded && isRawBoardThreadStateEmpty;
  const shouldShowFlashTableLoading = shouldUseFlashTable && displayFeed.length === 0 && !canShowEmptyFlashTable && communityState !== 'failed' && feedState !== 'failed';

  return (
    <>
      {shouldShowSnow() && <hr />}
      <div className={`${styles.content} ${shouldShowSnow() ? styles.garland : ''}`}>
        {shouldShowErrorToUser && (
          <div className={styles.error}>
            <ErrorDisplay error={communityError} />
          </div>
        )}
        {shouldShowUnverifiedAddressWarning && <output className={styles.addressWarning}>{t('board_address_unverified_warning')}</output>}
        {shouldUseFlashTable ? (
          <>
            <FlashBoardTable boardBasePath={paginationBasePath} isLoading={shouldShowFlashTableLoading} posts={displayFeed} />
            <footerComponents.Footer />
          </>
        ) : effectiveInfiniteScroll ? (
          <Virtuoso
            defaultItemHeight={defaultBoardItemHeight}
            {...boardSizingProps}
            increaseViewportBy={boardViewportBuffer}
            minOverscanItemCount={boardMinOverscanItemCount}
            totalCount={displayFeed.length}
            data={displayFeed}
            computeItemKey={(index, post) => post?.cid || `post-${index}`}
            itemContent={boardItemContent}
            useWindowScroll={true}
            components={footerComponents}
            endReached={effectiveHasMore ? loadMore : undefined}
            ref={virtuosoRef}
            restoreStateFrom={lastVirtuosoState}
            initialScrollTop={lastVirtuosoState?.scrollTop}
          />
        ) : (
          <>
            {displayFeed.map((post, index) => (
              <Post key={post?.cid || `post-${index}`} index={index} post={post} />
            ))}
            <footerComponents.Footer />
          </>
        )}
      </div>
    </>
  );
};

export default Board;
