import { memo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useAccountComment, useCommunity } from '@bitsocial/bitsocial-react-hooks';
import { accountsStore as useAccountsStore } from '../../lib/bitsocial-internals/stores';
import getShortAddress from '../../lib/get-short-address';
import { useCommunityIdentifier } from '../../hooks/use-community-identifiers';
import { useStableCommunity } from '../../hooks/use-stable-community';
import { isAllView, isSubscriptionsView, isModView } from '../../lib/utils/view-utils';
import { isArchiveRoute, isDirectoryListRoute, isSearchDirectoryRoute, isSearchRoute } from '../../lib/utils/route-utils';
import { getSpecialBoardByAddress } from '../../lib/special-boards';
import { MAX_SEARCH_QUERY_LENGTH } from '../../lib/search-navigation';
import { getSearchProvider } from '../../lib/search-providers';
import useSearchProviderStore from '../../stores/use-search-provider-store';
import useSearchSummaryStore from '../../stores/use-search-summary-store';
import styles from './board-header.module.css';
import { useDirectories } from '../../hooks/use-directories';
import { useResolvedCommunityAddress } from '../../hooks/use-resolved-community-address';
import { normalizeAccountCommentIndex } from '../../lib/utils/account-comment-index-utils';
import { getCommentCommunityAddress } from '../../lib/utils/comment-utils';
import { getPendingPostRoutePost } from '../../lib/utils/pending-post-route-state';
import useIsMobile from '../../hooks/use-is-mobile';
import useIsCommunityOffline from '../../hooks/use-is-community-offline';
import { shouldShowSnow } from '../../lib/snow';
import Tooltip from '../tooltip/tooltip';
import { BANNERS } from '../../generated/asset-manifest';

const ImageBanner = () => {
  const [banner] = useState(() => BANNERS[Math.floor(Math.random() * BANNERS.length)]);

  return <img src={banner} alt='' />;
};

// Separate component for offline indicator to isolate rerenders from sync lifecycle changes.
const OfflineIndicator = ({ communityAddress }: { communityAddress: string | undefined }) => {
  const communityIdentifier = useCommunityIdentifier(communityAddress);
  const community = useCommunity(communityIdentifier ? { community: communityIdentifier } : undefined);
  const { isOffline, isOnlineStatusLoading, offlineIconClass, offlineTitle } = useIsCommunityOffline(community, communityAddress);

  if (!isOffline && !isOnlineStatusLoading) {
    return null;
  }

  return (
    <span className={styles.offlineIconWrapper}>
      <Tooltip content={offlineTitle}>
        <span className={`${styles.offlineIcon} ${offlineIconClass}`} />
      </Tooltip>
    </span>
  );
};

/** ``5chan Search `query` N comments``, mirroring the hardcoded titles of the other multiboard views. */
const getSearchTitle = (query: string, total: number | null): string => {
  if (!query) return '5chan Search';
  if (total === null) return `5chan Search \`${query}\``;
  return `5chan Search \`${query}\` ${total} comments`;
};

const SearchProviderSubtitle = ({ query }: { query: string }) => {
  const { t } = useTranslation();
  const selectedProviderId = useSearchProviderStore((state) => state.selectedProviderId);
  // Credit whoever answered: a failed indexer hands the query to the next one in the directory.
  const answeringProviderId = useSearchSummaryStore((state) => (state.query === query ? state.providerId : null));
  const provider = getSearchProvider(answeringProviderId ?? selectedProviderId);

  // Plain text like the board address subtitle: the directory button is how you change indexer.
  return <span>{`${t('results_provided_by')} ${provider.name}`}</span>;
};

// No props, so parent rerenders never change its output.
const BoardHeader = memo(() => {
  const { t } = useTranslation();
  const location = useLocation();
  const params = useParams();
  const navigate = useNavigate();
  const isInAllView = isAllView(location.pathname);
  const isInSubscriptionsView = isSubscriptionsView(location.pathname, useParams());
  const isInModView = isModView(location.pathname);
  const isInArchiveView = isArchiveRoute(location.pathname);
  const isInDirectoryListView = isDirectoryListRoute(location.pathname);
  const isInSearchView = isSearchRoute(location.pathname);
  const isInSearchDirectoryView = isSearchDirectoryRoute(location.pathname);
  const [searchParams] = useSearchParams();
  const searchQuery = (searchParams.get('q') ?? '').trim().slice(0, MAX_SEARCH_QUERY_LENGTH);
  const searchSummary = useSearchSummaryStore((state) => (state.query === searchQuery ? state.total : null));
  const bannerKey = isInAllView ? 'all' : isInSubscriptionsView ? 'subscriptions' : isInModView ? 'mod' : isInSearchView ? 'search' : params.boardIdentifier || 'board';
  const accountComment = useAccountComment({ commentIndex: normalizeAccountCommentIndex(params?.accountCommentIndex) });
  const resolvedAddress = useResolvedCommunityAddress();
  const communityAddress = resolvedAddress || getCommentCommunityAddress(accountComment) || getCommentCommunityAddress(getPendingPostRoutePost(location.state));

  // Use stable community for display fields to avoid rerenders from updatingState
  const stableCommunity = useStableCommunity(communityAddress);
  const { address, shortAddress } = stableCommunity || {};

  const directories = useDirectories();

  // Find matching community from default list to get its title
  const defaultCommunity = communityAddress ? directories.find((s) => s.address === communityAddress) : null;
  const specialBoard = getSpecialBoardByAddress(communityAddress);

  // Use accounts store with selector to only subscribe to subscriptions count
  const subscriptionsCount = useAccountsStore((state) => {
    const activeAccountId = state.activeAccountId;
    const activeAccount = activeAccountId ? state.accounts[activeAccountId] : undefined;
    return activeAccount?.subscriptions?.length || 0;
  });
  const subscriptionsSubtitle = t('subscriptions_subtitle', { count: subscriptionsCount });

  const title = isInAllView
    ? '/all/ - All 5chan Directories'
    : isInSubscriptionsView
      ? '/subs/ - Subscriptions'
      : isInModView
        ? '/mod/ - Boards You Moderate'
        : isInSearchDirectoryView
          ? '/search/ - 5chan Search'
          : isInSearchView
            ? getSearchTitle(searchQuery, searchSummary)
            : defaultCommunity?.title || specialBoard?.title || stableCommunity?.title;
  const subtitle = isInAllView ? (
    t('all_subtitle')
  ) : isInSubscriptionsView ? (
    subscriptionsSubtitle
  ) : isInModView ? (
    ''
  ) : isInSearchDirectoryView ? (
    t('search_provider_directory_subtitle')
  ) : isInSearchView ? (
    <SearchProviderSubtitle query={searchQuery} />
  ) : isInDirectoryListView ? (
    t('directory_subtitle', { boardIdentifier: params.boardIdentifier })
  ) : (
    `${specialBoard?.address || address || communityAddress || ''}`
  );

  return (
    <div className={`${styles.content} ${shouldShowSnow() ? styles.garland : ''}`}>
      {!useIsMobile() && (
        <div className={styles.bannerCnt}>
          <ImageBanner key={bannerKey} />
        </div>
      )}
      <div className={styles.boardTitle}>
        {title ||
          (shortAddress
            ? shortAddress.endsWith('.eth') || shortAddress.endsWith('.sol')
              ? shortAddress.slice(0, -4)
              : shortAddress
            : communityAddress && getShortAddress(communityAddress))}
        {!isInAllView && !isInSubscriptionsView && !isInModView && !isInSearchView && !isInDirectoryListView && <OfflineIndicator communityAddress={communityAddress} />}
      </div>
      <div className={styles.boardSubtitle}>
        {isInSubscriptionsView ? (
          <button
            type='button'
            className={styles.clickableSubtitle}
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                navigate('/subs/settings?section=subscriptions-settings');
              }
            }}
            onClick={() => navigate('/subs/settings?section=subscriptions-settings')}
          >
            {subtitle}
          </button>
        ) : isInDirectoryListView || isInAllView || isInSearchView ? (
          <span>{subtitle}</span>
        ) : !isInModView && subtitle ? (
          <span title={t('board_address_tooltip')}>{subtitle}</span>
        ) : (
          subtitle
        )}
      </div>
      {!isInArchiveView && <hr />}
    </div>
  );
});
BoardHeader.displayName = 'BoardHeader';

export default BoardHeader;
