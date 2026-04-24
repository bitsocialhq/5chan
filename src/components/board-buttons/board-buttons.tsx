import { useTranslation } from 'react-i18next';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useComment, useSubscribe } from '@bitsocial/bitsocial-react-hooks';
import { isAllView, isCatalogView, isModView, isModQueueView, isPendingPostView, isPostPageView, isSubscriptionsView } from '../../lib/utils/view-utils';
import { usePostPageNumber } from '../../hooks/use-post-page-number';
import { useDirectories, useDirectoryByAddress } from '../../hooks/use-directories';
import { getBoardPath, isDirectoryBoard } from '../../lib/utils/route-utils';
import { useResolvedCommunityAddress } from '../../hooks/use-resolved-community-address';
import useSafeAccountComment from '../../hooks/use-safe-account-comment';
import useCatalogFiltersStore from '../../stores/use-catalog-filters-store';
import useCatalogStyleStore from '../../stores/use-catalog-style-store';
import useFeedResetStore from '../../stores/use-feed-reset-store';
import useSortingStore from '../../stores/use-sorting-store';
import useAllFeedFilterStore from '../../stores/use-all-feed-filter-store';
import useModQueueStore from '../../stores/use-mod-queue-store';
import useFeedViewSettingsStore from '../../stores/use-feed-view-settings-store';
import useThreadLiveUpdatesStore from '../../stores/use-thread-live-updates-store';
import useCountLinksInReplies from '../../hooks/use-count-links-in-replies';
import useIsMobile from '../../hooks/use-is-mobile';
import useTimeFilter from '../../hooks/use-time-filter';
import CatalogFilters from '../catalog-filters';
import CatalogSearch from '../catalog-search';
import Tooltip from '../tooltip';
import { ModQueueButton } from '../../views/mod-queue/mod-queue';
import { isCommentArchived } from '../../lib/utils/comment-moderation-utils';
import { getSearchWithTimeFilter, getTimeFilterOptionLabel } from '../../lib/utils/time-filter-utils';
import styles from './board-buttons.module.css';
import capitalize from 'lodash/capitalize';

interface BoardButtonsProps {
  address?: string | undefined;
  isInAllView?: boolean;
  isInCatalogView?: boolean;
  isInSubscriptionsView?: boolean;
  isInModView?: boolean;
  isInModQueueView?: boolean;
  isTopbar?: boolean;
}

const getMultiboardPath = ({
  isInAllView,
  isInCatalogView,
  isInSubscriptionsView,
  isInModView,
}: Pick<BoardButtonsProps, 'isInAllView' | 'isInCatalogView' | 'isInSubscriptionsView' | 'isInModView'>) => {
  if (isInAllView) {
    return isInCatalogView ? '/all/catalog' : '/all';
  }
  if (isInSubscriptionsView) {
    return isInCatalogView ? '/subs/catalog' : '/subs';
  }
  if (isInModView) {
    return isInCatalogView ? '/mod/catalog' : '/mod';
  }

  return null;
};

export const CatalogButton = ({ address, isInAllView, isInSubscriptionsView, isInModView }: BoardButtonsProps) => {
  const { t } = useTranslation();
  const location = useLocation();
  const directories = useDirectories();
  const { timeFilterValue } = useTimeFilter();

  const createCatalogLink = () => {
    const multiboardPath = getMultiboardPath({ isInAllView, isInCatalogView: true, isInSubscriptionsView, isInModView });
    if (multiboardPath) {
      return {
        pathname: multiboardPath,
        search: getSearchWithTimeFilter(location.search, timeFilterValue),
      };
    }
    let boardPath = '';
    if (address) {
      boardPath = getBoardPath(address, directories);
    } else if (Array.isArray(directories) && directories.length > 0 && directories[0]?.address) {
      boardPath = getBoardPath(directories[0].address, directories);
    }
    return `/${boardPath}/catalog`;
  };

  return (
    <Link className='button' to={createCatalogLink()}>
      {t('catalog')}
    </Link>
  );
};

export const ArchiveButton = ({ address, isInAllView, isInSubscriptionsView, isInModView }: BoardButtonsProps) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const params = useParams();
  const directories = useDirectories();

  const isInvalidArchiveContext = isInAllView || isInSubscriptionsView || isInModView;
  const boardIdentifier = params.boardIdentifier;
  const archiveBoardIdentifier = address ? getBoardPath(address, directories) : boardIdentifier ? getBoardPath(boardIdentifier, directories) : '';
  const archivePath = archiveBoardIdentifier ? `/${archiveBoardIdentifier}/archive` : '';

  if (isInvalidArchiveContext || !archivePath) {
    return null;
  }

  return (
    <button className='button' onClick={() => navigate(archivePath)}>
      {t('archive')}
    </button>
  );
};

const SubscribeButton = ({ address }: BoardButtonsProps) => {
  const { t } = useTranslation();
  const { subscribed, subscribe, unsubscribe } = useSubscribe({ communityAddress: address });

  return (
    <button className='button' onClick={subscribed ? unsubscribe : subscribe}>
      {subscribed ? t('unsubscribe') : t('subscribe')}
    </button>
  );
};

export const ReturnButton = ({ address, isInAllView, isInSubscriptionsView, isInModView, isInModQueueView }: BoardButtonsProps) => {
  const { t } = useTranslation();
  const location = useLocation();
  const params = useParams();
  const directories = useDirectories();
  const { timeFilterValue } = useTimeFilter();

  const createReturnLink = () => {
    if (isInModQueueView) {
      // If in mod queue view, return to /mod or /:boardIdentifier
      if (params?.boardIdentifier) {
        return `/${params.boardIdentifier}`;
      }
      return `/mod`;
    }
    const multiboardPath = getMultiboardPath({ isInAllView, isInCatalogView: false, isInSubscriptionsView, isInModView });
    if (multiboardPath) {
      return {
        pathname: multiboardPath,
        search: getSearchWithTimeFilter(location.search, timeFilterValue, { removeKeys: ['q'] }),
      };
    }
    let boardPath = '';
    if (address) {
      boardPath = getBoardPath(address, directories);
    } else if (Array.isArray(directories) && directories.length > 0 && directories[0]?.address) {
      boardPath = getBoardPath(directories[0].address, directories);
    }
    return `/${boardPath}`;
  };

  return (
    <Link className='button' to={createReturnLink()}>
      {t('return')}
    </Link>
  );
};

const VoteButton = () => {
  const { t } = useTranslation();
  const params = useParams();
  const directories = useDirectories();

  // Get the boardIdentifier from params (try boardIdentifier first, then communityAddress for backward compatibility)
  const boardIdentifier = params.boardIdentifier;

  // Only render the vote button if we're on a directory board route
  if (!boardIdentifier || !isDirectoryBoard(boardIdentifier, directories)) {
    return null;
  }

  const values = { boardIdentifier };
  const message = `${t('vote_button_unavailable_intro', values)}\n\n${t('vote_button_unavailable_outro', values)}`;

  return (
    <button className={`button ${styles.disabledButton}`} onClick={() => window.alert(message)}>
      {t('vote')}
    </button>
  );
};

export const RefreshButton = () => {
  const { t } = useTranslation();
  const reset = useFeedResetStore((state) => state.reset);
  return (
    <button className='button' onClick={() => reset && reset()}>
      {t('refresh')}
    </button>
  );
};

export const UpdateButton = () => {
  const { t } = useTranslation();
  const requestUpdate = useThreadLiveUpdatesStore((state) => state.requestUpdate);
  return (
    <button className='button' onClick={() => requestUpdate()}>
      {t('update')}
    </button>
  );
};

export const AutoButton = () => {
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  const autoUpdateEnabled = useThreadLiveUpdatesStore((state) => state.enabled);
  const setAutoUpdateEnabled = useThreadLiveUpdatesStore((state) => state.setEnabled);
  return (
    <label className={isMobile ? 'button' : undefined}>
      <input
        type='checkbox'
        aria-label={t('Auto')}
        className={styles.autoCheckbox}
        checked={autoUpdateEnabled}
        onChange={(event) => setAutoUpdateEnabled(event.target.checked)}
      />{' '}
      {t('Auto')}
    </label>
  );
};

export const BottomButton = () => {
  const { t } = useTranslation();
  const handleClick = () => {
    window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' });
  };
  return (
    <button className='button' onClick={handleClick}>
      {t('bottom')}
    </button>
  );
};

export const TopButton = () => {
  const { t } = useTranslation();
  const handleClick = () => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  };
  return (
    <button className='button' onClick={handleClick}>
      {t('top')}
    </button>
  );
};

const SortOptions = () => {
  const { t } = useTranslation();
  const { sortType, setSortType } = useSortingStore();

  const handleSortChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const type = event.target.value as 'active' | 'new' | 'replyCount';
    setSortType(type);
  };
  return (
    <>
      <span>{t('sort_by')}</span>:&nbsp;
      <select className='capitalize' value={sortType} onChange={handleSortChange}>
        <option value='active'>{t('bump_order')}</option>
        <option value='new'>{t('creation_date')}</option>
        <option value='replyCount'>{t('reply_count')}</option>
      </select>
    </>
  );
};

const ImageSizeOptions = () => {
  const { t } = useTranslation();
  const { imageSize, setImageSize } = useCatalogStyleStore();

  return (
    <>
      <span>{t('image_size')}:</span>&nbsp;
      <select className='capitalize' value={imageSize} onChange={(e) => setImageSize(e.target.value as 'Small' | 'Large')}>
        <option value='Small'>{t('small')}</option>
        <option value='Large'>{t('large')}</option>
      </select>
    </>
  );
};

const MAX_ALERT_THRESHOLD = 10000; // Maximum threshold value in minutes (~166 hours)

const ModQueueAlertThreshold = () => {
  const { t } = useTranslation();
  const { alertThresholdValue, alertThresholdUnit, setAlertThreshold } = useModQueueStore();

  const handleThresholdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value.trim();

    // Handle empty input - allow it temporarily for better UX
    if (inputValue === '') {
      return;
    }

    // Parse safely
    const parsedValue = parseInt(inputValue, 10);

    // Default to 1 if invalid or NaN
    if (isNaN(parsedValue) || parsedValue < 1) {
      setAlertThreshold(1, alertThresholdUnit);
      return;
    }

    // Convert to minutes for clamping, then convert back to current unit
    const valueInMinutes = alertThresholdUnit === 'hours' ? parsedValue * 60 : parsedValue;
    const clampedMinutes = Math.min(valueInMinutes, MAX_ALERT_THRESHOLD);
    const finalValue = alertThresholdUnit === 'hours' ? Math.round(clampedMinutes / 60) : clampedMinutes;

    setAlertThreshold(finalValue, alertThresholdUnit);
  };

  const handleThresholdBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const inputValue = e.target.value.trim();

    // If empty or invalid, restore to current value or default to 1
    if (inputValue === '' || isNaN(parseInt(inputValue, 10))) {
      const safeValue = alertThresholdValue >= 1 ? alertThresholdValue : 1;
      setAlertThreshold(safeValue, alertThresholdUnit);
    }
  };

  return (
    <div className={styles.modQueueControls}>
      <label>
        {t('alert_threshold')}:
        <input
          type='number'
          min='1'
          step='1'
          value={alertThresholdValue}
          onChange={handleThresholdChange}
          onBlur={handleThresholdBlur}
          className={styles.alertThresholdInput}
        />
        <select
          value={alertThresholdUnit}
          onChange={(e) => {
            const newUnit = e.target.value as 'hours' | 'minutes';
            const newValue =
              alertThresholdUnit === 'hours' && newUnit === 'minutes'
                ? alertThresholdValue * 60
                : alertThresholdUnit === 'minutes' && newUnit === 'hours'
                  ? Math.round(alertThresholdValue / 60)
                  : alertThresholdValue;
            setAlertThreshold(Math.max(1, newValue), newUnit);
          }}
        >
          <option value='minutes'>{t('minutes')}</option>
          <option value='hours'>{t('hours')}</option>
        </select>
      </label>
    </div>
  );
};

const ModQueueViewSelector = () => {
  const { t } = useTranslation();
  const { viewMode, setViewMode } = useModQueueStore();
  return (
    <div className={styles.modQueueControls}>
      <label>
        {t('modQueue.viewLabel')}:
        <select value={viewMode} onChange={(e) => setViewMode(e.target.value as 'compact' | 'feed')}>
          <option value='compact'>{t('modQueue.compact')}</option>
          <option value='feed'>{t('modQueue.feed')}</option>
        </select>
      </label>
    </div>
  );
};

const ShowOPCommentOption = () => {
  const { t } = useTranslation();
  const { showOPComment, setShowOPComment } = useCatalogStyleStore();

  return (
    <>
      <span>{t('show_op_comment')}:</span>&nbsp;
      <select className='capitalize' value={showOPComment ? 'On' : 'Off'} onChange={(e) => setShowOPComment(e.target.value === 'On')}>
        <option value='Off'>{t('off')}</option>
        <option value='On'>{t('on')}</option>
      </select>
    </>
  );
};

const TimeFilter = ({ isInAllView, isInCatalogView, isInSubscriptionsView, isInModView, isTopbar = false }: BoardButtonsProps) => {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const { lastVisitTimeFilterName, timeFilterValue, timeFilterValues } = useTimeFilter();
  const multiboardPath = getMultiboardPath({ isInAllView, isInCatalogView, isInSubscriptionsView, isInModView });

  if (!multiboardPath) {
    return null;
  }

  const changeTimeFilter = (event: React.ChangeEvent<HTMLSelectElement>) => {
    navigate({
      pathname: multiboardPath,
      search: getSearchWithTimeFilter(location.search, event.target.value),
    });
  };

  return (
    <>
      {!isTopbar && (
        <>
          <span>{t('filter')}</span>:&nbsp;
        </>
      )}
      <select onChange={changeTimeFilter} className={[styles.feedName, styles.menuItem, 'capitalize'].join(' ')} value={timeFilterValue}>
        {timeFilterValues.map((value) => (
          <option key={value} value={value}>
            {getTimeFilterOptionLabel(value, lastVisitTimeFilterName)}
          </option>
        ))}
      </select>
    </>
  );
};

const AllFeedFilter = () => {
  const { t } = useTranslation();
  const { filter, setFilter } = useAllFeedFilterStore();

  return (
    <>
      <span>{t('show')}</span>:&nbsp;
      <select className='capitalize' value={filter} onChange={(e) => setFilter(e.target.value as 'all' | 'nsfw' | 'sfw')}>
        <option value='all'>{t('all_boards')}</option>
        <option value='nsfw'>{t('nsfw_boards_only')}</option>
        <option value='sfw'>{t('worksafe_boards_only')}</option>
      </select>
    </>
  );
};

export const MobileAllFeedFilter = () => (
  <div className={styles.mobileBoardButtons}>
    <hr />
    <div className={`${styles.options} ${styles.mobileAllFeedFilterPadding}`}>
      <AllFeedFilter />
    </div>
  </div>
);

export const MobileBoardButtons = () => {
  const { t } = useTranslation();
  const params = useParams();
  const location = useLocation();
  const isInAllView = isAllView(location.pathname);
  const isInCatalogView = isCatalogView(location.pathname, params);
  const isInPendingPostPage = isPendingPostView(location.pathname, params);
  const isInPostView = isPostPageView(location.pathname, params);
  const isInSubscriptionsView = isSubscriptionsView(location.pathname, useParams());
  const isInModView = isModView(location.pathname);
  const isInModQueueView = isModQueueView(location.pathname);

  const accountComment = useSafeAccountComment({ commentIndex: params?.accountCommentIndex });
  const resolvedAddress = useResolvedCommunityAddress();
  const communityAddress = resolvedAddress || accountComment?.communityAddress;

  const { filteredCount, searchText } = useCatalogFiltersStore();
  const enableInfiniteScroll = useFeedViewSettingsStore((state) => state.enableInfiniteScroll);
  const isMultiboard = isInAllView || isInSubscriptionsView || isInModView;
  const showTimeFilter = isMultiboard;
  const effectiveInfiniteScroll = isMultiboard || enableInfiniteScroll;
  const showBottomButton = !effectiveInfiniteScroll;

  // Check if we should show the vote button (only for directory boards)
  const directories = useDirectories();
  const boardIdentifier = params.boardIdentifier;
  const showVoteButton = boardIdentifier && isDirectoryBoard(boardIdentifier, directories);

  return (
    <div className={`${styles.mobileBoardButtons} ${!isInCatalogView ? styles.addMargin : ''}`}>
      {isInPostView || isInPendingPostPage ? (
        <>
          <ReturnButton address={communityAddress} isInAllView={isInAllView} isInSubscriptionsView={isInSubscriptionsView} isInModView={isInModView} />
          <CatalogButton address={communityAddress} isInAllView={isInAllView} isInSubscriptionsView={isInSubscriptionsView} isInModView={isInModView} />
          {showBottomButton && <BottomButton />}
          <div className={styles.secondRow}>
            <UpdateButton />
            <AutoButton />
          </div>
        </>
      ) : isInModQueueView ? (
        <>
          <ReturnButton
            address={communityAddress}
            isInAllView={isInAllView}
            isInSubscriptionsView={isInSubscriptionsView}
            isInModView={isInModView}
            isInModQueueView={isInModQueueView}
          />
          <RefreshButton />
          <ModQueueAlertThreshold />
          <ModQueueViewSelector />
        </>
      ) : isInCatalogView ? (
        <>
          <ReturnButton address={communityAddress} isInAllView={isInAllView} isInSubscriptionsView={isInSubscriptionsView} isInModView={isInModView} />
          <ArchiveButton address={communityAddress} isInAllView={isInAllView} isInSubscriptionsView={isInSubscriptionsView} isInModView={isInModView} />
          {showBottomButton && <BottomButton />}
          <RefreshButton />
          {searchText ? (
            <span className={styles.filteredThreadsCount}>
              {' '}
              — {t('search_results_for')}: <strong>{searchText}</strong>
            </span>
          ) : (
            filteredCount > 0 && (
              <span className={styles.filteredThreadsCount}>
                {' '}
                — {t('filtered_threads')}: <strong>{filteredCount}</strong>
              </span>
            )
          )}
          {(isInAllView || showTimeFilter || isInCatalogView) && (
            <>
              <hr />
              <div className={styles.options}>
                {(isInAllView || showTimeFilter) && (
                  <div>
                    {isInAllView && <AllFeedFilter />}{' '}
                    {showTimeFilter && (
                      <TimeFilter isInAllView={isInAllView} isInCatalogView={isInCatalogView} isInSubscriptionsView={isInSubscriptionsView} isInModView={isInModView} />
                    )}
                  </div>
                )}
                {isInCatalogView && (
                  <div className={styles.mobileCatalogOptionsPadding}>
                    <SortOptions /> <ImageSizeOptions />
                    <ShowOPCommentOption /> <CatalogFilters /> <CatalogSearch />
                  </div>
                )}
              </div>
            </>
          )}
        </>
      ) : (
        <>
          {showBottomButton && <BottomButton />}
          <CatalogButton address={communityAddress} isInAllView={isInAllView} isInSubscriptionsView={isInSubscriptionsView} isInModView={isInModView} />
          <RefreshButton />
          <div className={styles.secondRow}>
            {showVoteButton && <VoteButton />}
            {!(isInAllView || isInSubscriptionsView || isInModView) && <SubscribeButton address={communityAddress} />}
            {!(isInAllView || isInSubscriptionsView) && <ModQueueButton boardIdentifier={boardIdentifier} isMobile={true} />}
          </div>
          {showTimeFilter && (
            <>
              <hr />
              <div className={styles.options}>
                <div>
                  <TimeFilter isInAllView={isInAllView} isInCatalogView={isInCatalogView} isInSubscriptionsView={isInSubscriptionsView} isInModView={isInModView} />
                </div>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
};

export const PostPageStats = () => {
  const { t } = useTranslation();
  const params = useParams();
  const location = useLocation();
  const autoUpdateEnabled = useThreadLiveUpdatesStore((state) => state.enabled);
  const commentCid = params?.commentCid as string | undefined;
  const resolvedAddress = useResolvedCommunityAddress();
  const accountComment = useSafeAccountComment({ commentIndex: params?.accountCommentIndex });
  const communityAddress = resolvedAddress || accountComment?.communityAddress;

  const comment = useComment({ commentCid, autoUpdate: autoUpdateEnabled });
  const postCid = comment?.postCid ?? commentCid;
  const post = useComment({ commentCid: postCid, autoUpdate: autoUpdateEnabled });

  const archived = isCommentArchived(post);
  const { closed, pinned, replyCount } = post || {};
  const linkCount = useCountLinksInReplies(post);
  const directoryEntry = useDirectoryByAddress(communityAddress);
  const requirePostLinkIsMedia = directoryEntry?.features?.requirePostLinkIsMedia === true;

  const isThreadView = isPostPageView(location.pathname, params);
  const pageNumber = usePostPageNumber({
    communityAddress,
    postCid,
    enabled: isThreadView,
  });

  const displayReplyCount = replyCount !== undefined ? replyCount.toString() : '?';
  const replyCountTooltip = replyCount !== undefined ? capitalize(t('replies')) : t('loading');

  return (
    <span>
      {pinned && `${capitalize(t('sticky'))} / `}
      {archived && `${capitalize(t('archived'))} / `}
      {closed && `${capitalize(t('closed'))} / `}
      <Tooltip content={replyCountTooltip}>{displayReplyCount}</Tooltip> /{' '}
      <Tooltip content={capitalize(requirePostLinkIsMedia ? t('images') : t('links'))}>{linkCount?.toString()}</Tooltip>
      {isThreadView && (
        <>
          {' '}
          / <Tooltip content={pageNumber != null ? t('pagination.pageLabel') : t('loading')}>{pageNumber?.toString() ?? '?'}</Tooltip>
        </>
      )}
    </span>
  );
};

export const DesktopBoardButtons = () => {
  const { t } = useTranslation();
  const params = useParams();
  const location = useLocation();
  const accountComment = useSafeAccountComment({ commentIndex: params?.accountCommentIndex });
  const resolvedAddress = useResolvedCommunityAddress();
  const communityAddress = resolvedAddress || accountComment?.communityAddress;
  const isInCatalogView = isCatalogView(location.pathname, params);
  const isInAllView = isAllView(location.pathname);
  const isInPendingPostPage = isPendingPostView(location.pathname, params);
  const isInPostView = isPostPageView(location.pathname, params);
  const isInSubscriptionsView = isSubscriptionsView(location.pathname, useParams());
  const isInModView = isModView(location.pathname);
  const isInModQueueView = isModQueueView(location.pathname);

  const { filteredCount, searchText } = useCatalogFiltersStore();
  const enableInfiniteScroll = useFeedViewSettingsStore((state) => state.enableInfiniteScroll);
  const isMultiboard = isInAllView || isInSubscriptionsView || isInModView;
  const showTimeFilter = isMultiboard;
  const effectiveInfiniteScroll = isMultiboard || enableInfiniteScroll;
  const showBottomButton = (isInCatalogView || isInPostView || isInPendingPostPage) && !effectiveInfiniteScroll;

  // Check if we should show the vote button (only for directory boards)
  const directories = useDirectories();
  const boardIdentifier = params.boardIdentifier;
  const showVoteButton = boardIdentifier && isDirectoryBoard(boardIdentifier, directories);

  return (
    <>
      <hr />
      <div className={styles.desktopBoardButtons}>
        {isInPostView || isInPendingPostPage ? (
          <>
            [<ReturnButton address={communityAddress} isInAllView={isInAllView} isInSubscriptionsView={isInSubscriptionsView} isInModView={isInModView} />] [
            <CatalogButton address={communityAddress} isInAllView={isInAllView} isInSubscriptionsView={isInSubscriptionsView} isInModView={isInModView} />]
            {showBottomButton && (
              <>
                {' '}
                [<BottomButton />]
              </>
            )}{' '}
            [<UpdateButton />] [<AutoButton />]
            <span className={styles.rightSideButtons}>
              <PostPageStats />
            </span>
          </>
        ) : isInModQueueView ? (
          <>
            [
            <ReturnButton
              address={communityAddress}
              isInAllView={isInAllView}
              isInSubscriptionsView={isInSubscriptionsView}
              isInModView={isInModView}
              isInModQueueView={isInModQueueView}
            />
            ] [<RefreshButton />]
            <span className={styles.rightSideButtons}>
              <ModQueueAlertThreshold />
              <ModQueueViewSelector />
            </span>
          </>
        ) : (
          <>
            {isInCatalogView ? (
              <>
                [<ReturnButton address={communityAddress} isInAllView={isInAllView} isInSubscriptionsView={isInSubscriptionsView} isInModView={isInModView} />]
                {!(isInAllView || isInSubscriptionsView || isInModView) && (
                  <>
                    {' '}
                    [<ArchiveButton address={communityAddress} isInAllView={isInAllView} isInSubscriptionsView={isInSubscriptionsView} isInModView={isInModView} />]
                  </>
                )}{' '}
              </>
            ) : (
              <>
                <SearchOPsBar />
                [<CatalogButton address={communityAddress} isInAllView={isInAllView} isInSubscriptionsView={isInSubscriptionsView} isInModView={isInModView} />]
                {!(isInAllView || isInSubscriptionsView || isInModView) && (
                  <>
                    {' '}
                    [<ArchiveButton address={communityAddress} isInAllView={isInAllView} isInSubscriptionsView={isInSubscriptionsView} isInModView={isInModView} />]
                  </>
                )}{' '}
              </>
            )}
            {showBottomButton && (
              <>
                {' '}
                [<BottomButton />]
              </>
            )}{' '}
            [<RefreshButton />]
            {!(isInAllView || isInSubscriptionsView) && (
              <>
                {' '}
                <ModQueueButton boardIdentifier={boardIdentifier} isMobile={false} />
              </>
            )}
            {isInCatalogView && searchText ? (
              <span className={styles.filteredThreadsCount}>
                {' '}
                — {t('search_results_for')}: <strong>{searchText}</strong>
              </span>
            ) : (
              isInCatalogView &&
              filteredCount > 0 && (
                <span className={styles.filteredThreadsCount}>
                  {' '}
                  — {t('filtered_threads')}: <strong>{filteredCount}</strong>
                </span>
              )
            )}
            <span className={styles.rightSideButtons}>
              {isInCatalogView && (
                <>
                  <SortOptions />
                  <ImageSizeOptions />
                  <ShowOPCommentOption />
                </>
              )}
              {isInAllView && <AllFeedFilter />}
              {showTimeFilter && (
                <TimeFilter isInAllView={isInAllView} isInCatalogView={isInCatalogView} isInSubscriptionsView={isInSubscriptionsView} isInModView={isInModView} />
              )}
              {showVoteButton && (
                <>
                  [<VoteButton />]
                </>
              )}
              {showVoteButton && !(isInAllView || isInSubscriptionsView || isInModView) && ' '}
              {!(isInAllView || isInSubscriptionsView || isInModView) && (
                <>
                  [<SubscribeButton address={communityAddress} />]
                </>
              )}{' '}
              {isInCatalogView && (
                <>
                  [<CatalogFilters />] <CatalogSearch />
                </>
              )}
            </span>
          </>
        )}
      </div>
    </>
  );
};

const SearchOPsBar = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const params = useParams();
  const location = useLocation();
  const isInAllView = isAllView(location.pathname);
  const isInSubscriptionsView = isSubscriptionsView(location.pathname, useParams());
  const isInModView = isModView(location.pathname);
  const directories = useDirectories();
  const resolvedAddress = useResolvedCommunityAddress();
  const boardPath = resolvedAddress ? getBoardPath(resolvedAddress, directories) : params?.boardIdentifier || params?.communityAddress;

  const handleSearch = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      const searchQuery = (event.target as HTMLInputElement).value.trim();
      if (searchQuery) {
        const params = new URLSearchParams(location.search);
        params.set('q', searchQuery);
        const search = `?${params.toString()}`;

        if (isInAllView) {
          navigate({ pathname: '/all/catalog', search });
        } else if (isInSubscriptionsView) {
          navigate({ pathname: '/subs/catalog', search });
        } else if (isInModView) {
          navigate({ pathname: '/mod/catalog', search });
        } else {
          navigate(`/${boardPath}/catalog?q=${encodeURIComponent(searchQuery)}`);
        }
      }
    }
  };

  return <input type='text' placeholder={t('search_ops_placeholder', 'Search OPs...')} onKeyDown={handleSearch} className={styles.searchOPsInput} />;
};
