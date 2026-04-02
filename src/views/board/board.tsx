import { useCallback, useEffect, useMemo, useRef } from 'react';
import { Link, useLocation, useNavigate, useNavigationType, useParams } from 'react-router-dom';
import { Comment, useAccount, useAccountComments, useCommunity, useFeed } from '@bitsocialnet/bitsocial-react-hooks';
import { useCommunityField } from '../../hooks/use-stable-community';
import { Virtuoso, VirtuosoHandle, StateSnapshot } from 'react-virtuoso';
import { useTranslation } from 'react-i18next';
import styles from './board.module.css';
import mobileFooterStyles from '../../components/footer/footer.module.css';
import { shouldShowSnow } from '../../lib/snow';
import { useAccountCommunityAddresses } from '../../hooks/use-account-community-addresses';
import { useDirectoryAddresses, useDirectories, useDirectoryByAddress } from '../../hooks/use-directories';
import { useFilteredDirectoryAddresses } from '../../hooks/use-filtered-directory-addresses';
import { useResolvedCommunityAddress } from '../../hooks/use-resolved-community-address';
import { useFeedStateString } from '../../hooks/use-state-string';
import useFeedResetStore from '../../stores/use-feed-reset-store';
import useFeedViewSettingsStore from '../../stores/use-feed-view-settings-store';
import usePostNumberStore from '../../stores/use-post-number-store';
import { useBoardFeedPageSize } from '../../hooks/use-board-feed-page-size';
import useIsMobile from '../../hooks/use-is-mobile';
import { getPageSlice } from '../../lib/utils/board-feed-pagination';
import { getPageFromFeedPath, getSubplebbitAddress, isDirectoryBoard, normalizeMultiboardFeedPath, stripPageFromFeedPath } from '../../lib/utils/route-utils';
import { isCommentArchived } from '../../lib/utils/comment-moderation-utils';
import { getPretextItemSizeFromElement, resolveFeedVirtualizationMode } from '../../lib/utils/pretext-height-estimates';
import ErrorDisplay from '../../components/error-display/error-display';
import LoadingEllipsis from '../../components/loading-ellipsis';
import BoardPagination from '../../components/board-pagination';
import { CatalogButton } from '../../components/board-buttons/board-buttons';
import { PageFooterDesktop, PageFooterMobile } from '../../components/footer';
import { Post } from '../post';

const lastVirtuosoStates: { [key: string]: StateSnapshot } = {};
const RECENT_ACCOUNT_COMMENT_WINDOW_SECONDS = 60 * 60;
// Keep the hook on its indexed fast path when this view should not inject local posts.
const EMPTY_ACCOUNT_COMMENT_LOOKUP = { commentIndices: [-1] };

/** Board feed always uses 'active' sort; catalog dropdown does not affect board ordering. */
const BOARD_SORT_TYPE = 'active' as const;

interface BoardFooterProps {
  communityAddresses: string[];
  hasMore: boolean;
  combinedFeedLength: number;
  isInAllView: boolean;
  isInSubscriptionsView: boolean;
  isInModView: boolean;
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
  combinedFeedLength,
  isInAllView,
  isInSubscriptionsView,
  isInModView,
  communityState,
  subscriptionsLength,
  accountCommunityAddressesLength,
  showLoadingEllipsis = true,
}: BoardFooterProps) => {
  const { t } = useTranslation();

  const loadingStateString = useFeedStateString(communityAddresses) || (combinedFeedLength === 0 ? t('loading_feed') : t('looking_for_more_posts'));

  let footerContent;
  if (combinedFeedLength === 0) {
    footerContent = t('no_threads');
  }
  if (hasMore || (communityAddresses && communityAddresses.length === 0)) {
    footerContent = null;
  }
  return (
    <div className={styles.footer}>
      {footerContent}
      <div>
        {communityState === 'failed' ? (
          <span className='red'>{communityState}</span>
        ) : isInSubscriptionsView && subscriptionsLength === 0 ? (
          <span className='red'>{t('not_subscribed_to_any_board')}</span>
        ) : isInModView && accountCommunityAddressesLength === 0 ? (
          <span className='red'>{t('not_mod_of_any_board')}</span>
        ) : (
          showLoadingEllipsis && hasMore && <LoadingEllipsis string={loadingStateString} />
        )}
      </div>
    </div>
  );
};

export interface BoardProps {
  feedCacheKey?: string;
  viewType?: 'all' | 'subs' | 'mod' | 'board';
  boardIdentifier?: string;
  isVisible?: boolean;
}

const Board = ({ feedCacheKey, viewType, boardIdentifier: boardIdentifierProp, isVisible = true }: BoardProps) => {
  const { t } = useTranslation();
  const location = useLocation();
  const params = useParams();
  const isInAllView = viewType ? viewType === 'all' : false;
  const isInSubscriptionsView = viewType ? viewType === 'subs' : false;
  const isInModView = viewType ? viewType === 'mod' : false;

  const directories = useDirectories();
  const resolvedAddressFromUrl = useResolvedCommunityAddress();
  const communityAddress = useMemo(() => {
    if (boardIdentifierProp) {
      return getSubplebbitAddress(boardIdentifierProp, directories);
    }
    return resolvedAddressFromUrl;
  }, [boardIdentifierProp, directories, resolvedAddressFromUrl]);

  const directoryAddresses = useDirectoryAddresses();
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
  }, [isInAllView, isInSubscriptionsView, isInModView, communityAddress, directoryAddresses, filteredDirectoryAddresses, subscriptions, accountCommunityAddresses]);

  const enableInfiniteScroll = useFeedViewSettingsStore((state) => state.enableInfiniteScroll);
  const setEnableInfiniteScroll = useFeedViewSettingsStore((state) => state.setEnableInfiniteScroll);
  const isMobile = useIsMobile();
  const isForcedInfiniteScroll = isInAllView || isInSubscriptionsView || isInModView;
  const effectiveInfiniteScroll = enableInfiniteScroll || isForcedInfiniteScroll;
  const communityDirectory = useDirectoryByAddress(isInAllView || isInSubscriptionsView || isInModView ? undefined : communityAddress);
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
      communityAddresses,
      sortType: BOARD_SORT_TYPE,
      postsPerPage: effectiveInfiniteScroll ? infiniteFeedPostsPerPage : paginationFeedPostsPerPage,
      filter: excludeArchivedFilter,
    }),
    [communityAddresses, effectiveInfiniteScroll, infiniteFeedPostsPerPage, paginationFeedPostsPerPage, excludeArchivedFilter],
  );

  const { feed, hasMore, loadMore, reset } = useFeed(feedOptions);
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

  const pathWithoutSettings = location.pathname.replace(/\/settings$/, '');
  const currentPage = getPageFromFeedPath(pathWithoutSettings);
  const paginationBasePath = stripPageFromFeedPath(pathWithoutSettings);

  const resetTriggeredRef = useRef(false);

  const setResetFunction = useFeedResetStore((state) => state.setResetFunction);
  useEffect(() => {
    if (isVisible) {
      setResetFunction(reset);
    }
  }, [reset, setResetFunction, feed, isVisible]);

  // show account comments instantly in the feed once published (cid defined), instead of waiting for the feed to update
  const feedCids = useMemo(() => new Set(feed.map((f) => f.cid)), [feed]);
  const filteredComments = useMemo(
    () =>
      recentAccountComments.filter((comment) => {
        const { cid, deleted, postCid, removed, state, timestamp } = comment || {};
        const commentCommunityAddress = comment?.communityAddress || comment?.subplebbitAddress;
        return (
          !deleted &&
          !removed &&
          timestamp > Date.now() / 1000 - RECENT_ACCOUNT_COMMENT_WINDOW_SECONDS &&
          state === 'succeeded' &&
          cid &&
          cid === postCid &&
          commentCommunityAddress === communityAddress &&
          !feedCids.has(cid)
        );
      }),
    [recentAccountComments, communityAddress, feedCids],
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
    () => (effectiveInfiniteScroll ? combinedFeed : combinedFeed.slice(0, guiPostsPerPage * maxGuiPages)),
    [effectiveInfiniteScroll, combinedFeed, guiPostsPerPage, maxGuiPages],
  );
  const registerComments = usePostNumberStore((state) => state.registerComments);
  const totalPages = useMemo(() => Math.min(maxGuiPages, Math.ceil(cappedFeed.length / guiPostsPerPage) || 1), [cappedFeed.length, guiPostsPerPage, maxGuiPages]);
  const currentPageFeed = useMemo(
    () => (effectiveInfiniteScroll ? [] : getPageSlice(cappedFeed, currentPage, guiPostsPerPage, maxGuiPages)),
    [effectiveInfiniteScroll, cappedFeed, currentPage, guiPostsPerPage, maxGuiPages],
  );

  const navigate = useNavigate();
  const isMultiboardView = isInAllView || isInSubscriptionsView || isInModView;
  const defaultFeedVirtualizationMode = isMobile && isMultiboardView ? 'off' : 'item-size';
  const feedVirtualizationMode = useMemo(
    () => resolveFeedVirtualizationMode(location.search, defaultFeedVirtualizationMode),
    [defaultFeedVirtualizationMode, location.search],
  );
  const defaultBoardItemHeight = feedVirtualizationMode === 'item-size' ? (isMobile ? 420 : 480) : isMobile ? 420 : 300;
  // Omit the prop entirely in fallback mode. Passing `itemSize={undefined}` overrides
  // Virtuoso's internal DOM measurer and leaves multiboard items stuck on the default height.
  const boardSizingProps = useMemo(() => (feedVirtualizationMode === 'item-size' ? { itemSize: getPretextItemSizeFromElement } : {}), [feedVirtualizationMode]);

  // Redirect multiboard paths with page-number segments to normalized path (infinite-scroll only)
  useEffect(() => {
    if (!isVisible || !isForcedInfiniteScroll) return;
    const normalized = normalizeMultiboardFeedPath(location.pathname);
    if (normalized !== location.pathname) {
      navigate({ pathname: normalized, search: location.search }, { replace: true });
    }
  }, [isVisible, isForcedInfiniteScroll, location.pathname, location.search, navigate]);

  useEffect(() => {
    if (!isVisible) return;
    if (!effectiveInfiniteScroll && currentPage > totalPages && totalPages > 0) {
      const targetPage = totalPages;
      const targetPath = targetPage === 1 ? paginationBasePath : `${paginationBasePath}/${targetPage}`;
      navigate({ pathname: targetPath, search: location.search }, { replace: true });
    }
  }, [isVisible, effectiveInfiniteScroll, currentPage, totalPages, paginationBasePath, location.search, navigate]);

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

  // Use stable community fields to avoid rerenders from updatingState
  const communityTitle = useCommunityField(communityAddress, (community) => community?.title);
  const shortAddress = useCommunityField(communityAddress, (community) => community?.shortAddress);
  // useCommunityField only reads from store, doesn't trigger fetching
  const communityData = useCommunity({ communityAddress });
  const { error: communityError, state: communityState } = communityData || {};
  const title = isInAllView ? t('all') : isInSubscriptionsView ? t('subscriptions') : isInModView ? t('mod') : communityTitle;

  // Memoize footer component to preserve identity across renders (Virtuoso optimization)
  // Note: useFeedStateString is called inside BoardFooter to isolate re-renders from backend state changes
  const footerComponents = useMemo(
    () => ({
      Footer: () => (
        <>
          <BoardFooter
            communityAddresses={communityAddresses}
            hasMore={hasMore}
            combinedFeedLength={combinedFeed.length}
            isInAllView={isInAllView}
            isInSubscriptionsView={isInSubscriptionsView}
            isInModView={isInModView}
            communityState={communityState}
            subscriptionsLength={subscriptions?.length || 0}
            accountCommunityAddressesLength={accountCommunityAddresses?.length || 0}
            showLoadingEllipsis={effectiveInfiniteScroll || combinedFeed.length === 0}
          />
          <PageFooterDesktop
            firstRow={
              <BoardPagination
                basePath={paginationBasePath}
                currentPage={currentPage}
                search={location.search}
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
                  <button className='button' onClick={() => window.scrollTo({ top: 0, left: 0, behavior: 'instant' })}>
                    {t('start_new_thread')}
                  </button>
                </div>
              )}
              <div className={mobileFooterStyles.mobileFooterButtons}>
                <button className='button' onClick={() => window.scrollTo({ top: 0, left: 0, behavior: 'instant' })}>
                  {t('top')}
                </button>
                <button className='button' onClick={() => reset && reset()}>
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
                          to={{ pathname: page === 1 ? paginationBasePath : `${paginationBasePath}/${page}`, search: location.search }}
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
              {hasMore && !effectiveInfiniteScroll && (
                <div className={mobileFooterStyles.mobileFooterButtons}>
                  <button className='button' onClick={() => setEnableInfiniteScroll(true)}>
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
      hasMore,
      combinedFeed.length,
      isInAllView,
      isInSubscriptionsView,
      isInModView,
      communityState,
      communityAddress,
      subscriptions?.length,
      accountCommunityAddresses?.length,
      effectiveInfiniteScroll,
      isForcedInfiniteScroll,
      paginationBasePath,
      currentPage,
      totalPages,
      setEnableInfiniteScroll,
      reset,
      location.search,
      t,
    ],
  );

  const virtuosoRef = useRef<VirtuosoHandle | null>(null);
  const virtuosoStateKey = feedCacheKey ? `${feedCacheKey}-${BOARD_SORT_TYPE}` : `${location.pathname}-${BOARD_SORT_TYPE}`;
  const navigationType = useNavigationType();
  const boardViewportBuffer = isMultiboardView ? (isMobile ? { bottom: 1400, top: 2400 } : { bottom: 600, top: 600 }) : { bottom: 1200, top: 1200 };
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
  const displayFeed = effectiveInfiniteScroll ? combinedFeed : currentPageFeed;

  return (
    <>
      {shouldShowSnow() && <hr />}
      <div className={`${styles.content} ${shouldShowSnow() ? styles.garland : ''}`}>
        {shouldShowErrorToUser && (
          <div className={styles.error}>
            <ErrorDisplay error={communityError} />
          </div>
        )}
        {effectiveInfiniteScroll ? (
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
            endReached={hasMore ? loadMore : undefined}
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
