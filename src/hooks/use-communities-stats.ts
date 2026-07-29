import { memo, useEffect, useMemo } from 'react';
import { create } from 'zustand';
import { useCommunityStats } from '@bitsocial/bitsocial-react-hooks';
import { useCommunityIdentifier } from './use-community-identifiers';

type CommunityStatsState = {
  communityStats: { [communityAddress: string]: any };
  setCommunityStats: (communityAddress: string, stats: any) => void;
};

/**
 * The only fields any consumer reads off `communityStats` (see the aggregation in home.tsx).
 * pkc-js hands back a fresh stats object on every loading-state tick, so comparing identity is
 * useless here; comparing these values is what actually tells us whether a write is worth making.
 * If a consumer ever starts reading another field, add it here or it will silently read a stale value.
 */
const isSameStats = (a: any, b: any) =>
  !!a && !!b && a.allPostCount === b.allPostCount && a.allReplyCount === b.allReplyCount && a.weekActiveUserCount === b.weekActiveUserCount && a.state === b.state;

export const useCommunitiesStatsStore = create<CommunityStatsState>((set) => ({
  communityStats: {},
  setCommunityStats: (communityAddress, stats) =>
    set((state) => {
      // Returning the existing state object is a no-op in zustand: it skips notifying listeners
      // entirely. Without this, every tick produced one store write per board, and each write
      // rerendered Home and therefore every collector under it.
      if (isSameStats(state.communityStats[communityAddress], stats)) {
        return state;
      }
      return { communityStats: { ...state.communityStats, [communityAddress]: stats } };
    }),
}));

// Renders null and takes one stable string prop, so a parent rerender can never change its
// output. Home renders ~80 of these; unmemoized, every Home rerender rerendered all of them.
export const CommunityStatsCollector = memo(({ communityAddress }: { communityAddress: string }) => {
  const community = useCommunityIdentifier(communityAddress);
  // Stable options identity: the inline `{ community }` was rebuilt on every render.
  const statsOptions = useMemo(() => (community ? { community } : undefined), [community]);
  const stats = useCommunityStats(statsOptions);
  const setCommunityStats = useCommunitiesStatsStore((state) => state.setCommunityStats);

  useEffect(() => {
    if (stats && (stats.allPostCount !== undefined || stats.state === 'failed')) {
      setCommunityStats(communityAddress, stats);
    }
  }, [stats, communityAddress, setCommunityStats]);

  return null;
});
CommunityStatsCollector.displayName = 'CommunityStatsCollector';
