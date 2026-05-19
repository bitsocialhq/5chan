export const COMMUNITY_OFFLINE_THRESHOLD_SECONDS = 30 * 60;

export interface CommunityFreshnessState {
  state?: string;
  updatedAt?: number;
}

export const isCommunityUpdateStale = (updatedAt: number | undefined, nowSeconds: number): boolean =>
  updatedAt !== undefined && nowSeconds - updatedAt >= COMMUNITY_OFFLINE_THRESHOLD_SECONDS;

export const isCommunityKnownOffline = (communityState: CommunityFreshnessState | undefined, nowSeconds: number): boolean => {
  if (!communityState) return false;
  if (communityState.state === 'failed') return true;
  return isCommunityUpdateStale(communityState.updatedAt, nowSeconds);
};
