import type { CommunitySyncState } from '@bitsocial/bitsocial-react-hooks';

export const COMMUNITY_OFFLINE_THRESHOLD_SECONDS = 30 * 60;

export interface CommunityFreshnessState {
  state?: string;
  syncState?: CommunitySyncState;
  updatedAt?: number;
}

export const isCommunityUpdateStale = (updatedAt: number | undefined, nowSeconds: number): boolean =>
  updatedAt !== undefined && nowSeconds - updatedAt >= COMMUNITY_OFFLINE_THRESHOLD_SECONDS;

export const isCommunitySyncLoading = (syncState: CommunitySyncState | undefined): boolean =>
  syncState === 'initializing' || syncState === 'loading' || syncState === 'retrying';

export const isCommunitySyncTerminal = (syncState: CommunitySyncState | undefined): boolean => syncState !== undefined && !isCommunitySyncLoading(syncState);

export const isCommunityKnownOffline = (communityState: CommunityFreshnessState | undefined, nowSeconds: number): boolean => {
  if (!communityState) return false;

  const isStale = isCommunityUpdateStale(communityState.updatedAt, nowSeconds);
  if (communityState.updatedAt !== undefined && !isStale) return false;
  if (isStale) return true;
  if (isCommunitySyncLoading(communityState.syncState)) return false;
  if (isCommunitySyncTerminal(communityState.syncState) || communityState.state === 'failed') return true;
  return false;
};
