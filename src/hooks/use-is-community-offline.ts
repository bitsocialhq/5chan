import { useTranslation } from 'react-i18next';
import { useEffect } from 'react';
import type { Community, UseCommunityResult } from '@bitsocial/bitsocial-react-hooks';
import { getFormattedTimeAgo } from '../lib/utils/time-utils';
import useCommunityOfflineStore from '../stores/use-community-offline-store';
import useCommunitiesLoadingStartTimestamps from '../stores/use-communities-loading-start-timestamps-store';
import { isCommunitySyncLoading, isCommunitySyncTerminal, isCommunityUpdateStale } from '../lib/utils/community-freshness-utils';
import { useNowSeconds } from './use-now-seconds';

type CommunityWithSyncLifecycle = Community & Partial<Pick<UseCommunityResult, 'syncState' | 'hasCachedData'>>;

const getCommunityOfflineKey = (community?: CommunityWithSyncLifecycle, communityAddressHint?: string) =>
  communityAddressHint || community?.address || community?.name || community?.publicKey;

const useIsCommunityOffline = (community?: CommunityWithSyncLifecycle | undefined, communityAddressHint?: string) => {
  const { t } = useTranslation();
  const { state, syncState, hasCachedData, updatedAt } = community || {};
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
      setCommunityOfflineState(communityKey, { state, updatedAt });
    }
  }, [communityKey, state, updatedAt, setCommunityOfflineState]);

  if (!communityKey) {
    return { isOffline: false, isOnlineStatusLoading: false, offlineIconClass: '', offlineTitle: false };
  }

  const offlineState = communityOfflineState[communityKey] || { initialLoad: true };
  const loadingStartTimestamp = communitiesLoadingStartTimestamps[0] || 0;
  const isStale = isCommunityUpdateStale(updatedAt, nowSeconds);
  const hasUsableCachedData = (hasCachedData ?? typeof updatedAt === 'number') && updatedAt !== undefined;
  const isOnline = hasUsableCachedData && !isStale;
  const hasFailed = syncState === 'failed' || (!syncState && state === 'failed');
  const isSyncLoading = isCommunitySyncLoading(syncState);
  const hasTerminalSyncState = isCommunitySyncTerminal(syncState);
  const isFallbackLoading = !syncState && offlineState.initialLoad && nowSeconds - loadingStartTimestamp < 30;
  const isLoading = !isOnline && !isStale && !hasFailed && (isSyncLoading || isFallbackLoading);
  const isOffline = !isOnline && !isLoading && (hasFailed || isStale || (!hasUsableCachedData && (hasTerminalSyncState || nowSeconds - loadingStartTimestamp >= 30)));

  const offlineIconClass = isLoading ? 'yellowOfflineIcon' : isOffline ? 'redOfflineIcon' : '';

  const offlineTitle = isLoading
    ? 'downloading board...'
    : updatedAt
      ? isOffline && t('posts_last_synced_info', { time: getFormattedTimeAgo(updatedAt), interpolation: { escapeValue: false } })
      : t('community_offline_info');

  return { isOffline, isOnlineStatusLoading: isLoading, offlineIconClass, offlineTitle };
};

export default useIsCommunityOffline;
