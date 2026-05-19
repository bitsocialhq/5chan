import { useTranslation } from 'react-i18next';
import { useEffect } from 'react';
import { Community } from '@bitsocial/bitsocial-react-hooks';
import { getFormattedTimeAgo } from '../lib/utils/time-utils';
import useCommunityOfflineStore from '../stores/use-community-offline-store';
import useCommunitiesLoadingStartTimestamps from '../stores/use-communities-loading-start-timestamps-store';
import { isCommunityUpdateStale } from '../lib/utils/community-freshness-utils';
import { useNowSeconds } from './use-now-seconds';

const getCommunityOfflineKey = (community?: Community, communityAddressHint?: string) =>
  communityAddressHint || community?.address || community?.name || community?.publicKey;

const useIsCommunityOffline = (community?: Community | undefined, communityAddressHint?: string) => {
  const { t } = useTranslation();
  const { state, updatedAt, updatingState } = community || {};
  const communityKey = getCommunityOfflineKey(community, communityAddressHint);
  const nowSeconds = useNowSeconds(!!communityKey);
  const { communityOfflineState, setCommunityOfflineState, initializeCommunityOfflineState } = useCommunityOfflineStore();
  const communitiesLoadingStartTimestamps = useCommunitiesLoadingStartTimestamps(communityKey ? [communityKey] : undefined);

  useEffect(() => {
    if (communityKey && !communityOfflineState[communityKey]) {
      initializeCommunityOfflineState(communityKey);
    }
  }, [communityKey, communityOfflineState, initializeCommunityOfflineState]);

  useEffect(() => {
    if (communityKey) {
      setCommunityOfflineState(communityKey, { state, updatedAt, updatingState });
    }
  }, [communityKey, state, updatedAt, updatingState, setCommunityOfflineState]);

  if (!communityKey) {
    return { isOffline: false, isOnlineStatusLoading: false, offlineIconClass: '', offlineTitle: false };
  }

  const offlineState = communityOfflineState[communityKey] || { initialLoad: true };
  const loadingStartTimestamp = communitiesLoadingStartTimestamps[0] || 0;
  const isStale = isCommunityUpdateStale(updatedAt, nowSeconds);
  const isLoading = offlineState.initialLoad && (!updatedAt || isStale) && nowSeconds - loadingStartTimestamp < 30;
  const isOffline = !isLoading && (isStale || (!updatedAt && nowSeconds - loadingStartTimestamp >= 30));

  const isOnline = updatedAt && !isStale;
  const offlineIconClass = isLoading ? 'yellowOfflineIcon' : isOffline ? 'redOfflineIcon' : '';

  const offlineTitle = isLoading
    ? 'downloading board...'
    : updatedAt
      ? isOffline && t('posts_last_synced_info', { time: getFormattedTimeAgo(updatedAt), interpolation: { escapeValue: false } })
      : t('community_offline_info');

  return { isOffline: !isOnline && isOffline, isOnlineStatusLoading: !isOnline && isLoading, offlineIconClass, offlineTitle };
};

export default useIsCommunityOffline;
