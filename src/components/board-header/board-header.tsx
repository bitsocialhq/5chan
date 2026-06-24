import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useParams, useNavigate } from 'react-router-dom';
import { useAccountComment, useCommunity } from '@bitsocial/bitsocial-react-hooks';
import { accountsStore as useAccountsStore } from '../../lib/bitsocial-internals/stores';
import getShortAddress from '../../lib/get-short-address';
import { useCommunityIdentifier } from '../../hooks/use-community-identifiers';
import { useStableCommunity } from '../../hooks/use-stable-community';
import { isAllView, isSubscriptionsView, isModView } from '../../lib/utils/view-utils';
import { isArchiveRoute, isDirectoryListRoute } from '../../lib/utils/route-utils';
import styles from './board-header.module.css';
import { useDirectories } from '../../hooks/use-directories';
import { useResolvedCommunityAddress } from '../../hooks/use-resolved-community-address';
import { normalizeAccountCommentIndex } from '../../lib/utils/account-comment-index-utils';
import useIsMobile from '../../hooks/use-is-mobile';
import useIsCommunityOffline from '../../hooks/use-is-community-offline';
import { shouldShowSnow } from '../../lib/snow';
import Tooltip from '../tooltip/tooltip';
import { BANNERS } from '../../generated/asset-manifest';

const ImageBanner = () => {
  const [banner] = useState(() => BANNERS[Math.floor(Math.random() * BANNERS.length)]);

  return <img src={banner} alt='' />;
};

// Separate component for offline indicator to isolate rerenders from updatingState
// Only this component will rerender when updatingState changes, not the whole BoardHeader
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

const BoardHeader = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const params = useParams();
  const navigate = useNavigate();
  const isInAllView = isAllView(location.pathname);
  const isInSubscriptionsView = isSubscriptionsView(location.pathname, useParams());
  const isInModView = isModView(location.pathname);
  const isInArchiveView = isArchiveRoute(location.pathname);
  const isInDirectoryListView = isDirectoryListRoute(location.pathname);
  const accountComment = useAccountComment({ commentIndex: normalizeAccountCommentIndex(params?.accountCommentIndex) });
  const resolvedAddress = useResolvedCommunityAddress();
  const communityAddress = resolvedAddress || accountComment?.communityAddress;

  // Use stable community for display fields to avoid rerenders from updatingState
  const stableCommunity = useStableCommunity(communityAddress);
  const { address, shortAddress } = stableCommunity || {};

  const directories = useDirectories();

  // Find matching community from default list to get its title
  const defaultCommunity = communityAddress ? directories.find((s) => s.address === communityAddress) : null;

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
        : defaultCommunity?.title || stableCommunity?.title;
  const subtitle = isInAllView
    ? t('all_subtitle')
    : isInSubscriptionsView
      ? subscriptionsSubtitle
      : isInModView
        ? ''
        : isInDirectoryListView
          ? t('directory_subtitle', { boardIdentifier: params.boardIdentifier })
          : `${address || communityAddress || ''}`;

  return (
    <div className={`${styles.content} ${shouldShowSnow() ? styles.garland : ''}`}>
      {!useIsMobile() && (
        <div className={styles.bannerCnt}>
          <ImageBanner key={isInAllView ? 'all' : isInSubscriptionsView ? 'subscriptions' : communityAddress} />
        </div>
      )}
      <div className={styles.boardTitle}>
        {title ||
          (shortAddress
            ? shortAddress.endsWith('.eth') || shortAddress.endsWith('.sol')
              ? shortAddress.slice(0, -4)
              : shortAddress
            : communityAddress && getShortAddress(communityAddress))}
        {!isInAllView && !isInSubscriptionsView && !isInModView && !isInDirectoryListView && <OfflineIndicator communityAddress={communityAddress} />}
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
                navigate('/subs/settings#subscriptions-settings');
              }
            }}
            onClick={() => navigate('/subs/settings#subscriptions-settings')}
          >
            {subtitle}
          </button>
        ) : isInDirectoryListView || isInAllView ? (
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
};

export default BoardHeader;
