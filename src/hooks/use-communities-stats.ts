import { createElement, memo, useEffect, useMemo, useRef } from 'react';
import { create } from 'zustand';
import { useCommunityStats, type CommunityIdentifier } from '@bitsocial/bitsocial-react-hooks';
import { useCommunityIdentifier } from './use-community-identifiers';
import { communitiesStore } from '../lib/bitsocial-internals/stores';

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
  !!a &&
  !!b &&
  a.allPostCount === b.allPostCount &&
  a.allReplyCount === b.allReplyCount &&
  a.weekActiveUserCount === b.weekActiveUserCount &&
  a.state === b.state &&
  a.sourceStatsCid === b.sourceStatsCid;

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

const CommunityStatsRequest = ({
  communityAddress,
  community,
  sourceStatsCid,
}: {
  communityAddress: string;
  community: CommunityIdentifier | undefined;
  sourceStatsCid: string | undefined;
}) => {
  const statsOptions = useMemo(() => (community ? { community } : undefined), [community]);
  const stats = useCommunityStats(statsOptions);
  const initialStats = useRef(stats);
  const setCommunityStats = useCommunitiesStatsStore((state) => state.setCommunityStats);

  useEffect(() => {
    // useCommunityStats can synchronously return the previous CID's cached value while it
    // starts the request for a new statsCid. Wait for its result object to change before
    // recording the CID, otherwise the collector could mark stale values as current.
    if (stats !== initialStats.current && (stats.allPostCount !== undefined || stats.state === 'failed')) {
      setCommunityStats(communityAddress, { ...stats, sourceStatsCid });
    }
  }, [communityAddress, setCommunityStats, sourceStatsCid, stats]);

  return null;
};

// Keep the expensive upstream hook mounted only while resolving the current statsCid.
// Once resolved, this wrapper subscribes to the primitive CID instead of the full live
// community object, so routine lifecycle ticks cannot rerender ~80 homepage collectors.
export const CommunityStatsCollector = memo(({ communityAddress }: { communityAddress: string }) => {
  const community = useCommunityIdentifier(communityAddress);
  const communityKey = community?.publicKey ?? community?.name;
  const sourceStatsCid = communitiesStore((state) => (communityKey ? state.communities[communityKey]?.statsCid : undefined));
  const collectedStatsCid = useCommunitiesStatsStore((state) => state.communityStats[communityAddress]?.sourceStatsCid);

  if (sourceStatsCid && collectedStatsCid === sourceStatsCid) {
    return null;
  }

  return createElement(CommunityStatsRequest, {
    key: sourceStatsCid ?? 'unresolved',
    communityAddress,
    community,
    sourceStatsCid,
  });
});
CommunityStatsCollector.displayName = 'CommunityStatsCollector';
