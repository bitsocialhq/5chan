import { useEffect } from 'react';
import { create } from 'zustand';
import { useCommunityStats } from '@bitsocial/bitsocial-react-hooks';
import { useCommunityIdentifier } from './use-community-identifiers';

type CommunityStatsState = {
  communityStats: { [communityAddress: string]: any };
  setCommunityStats: (communityAddress: string, stats: any) => void;
};

export const useCommunitiesStatsStore = create<CommunityStatsState>((set) => ({
  communityStats: {},
  setCommunityStats: (communityAddress, stats) =>
    set((state) => ({
      communityStats: { ...state.communityStats, [communityAddress]: stats },
    })),
}));

export const CommunityStatsCollector = ({ communityAddress }: { communityAddress: string }) => {
  const community = useCommunityIdentifier(communityAddress);
  const stats = useCommunityStats(community ? { community } : undefined);
  const setCommunityStats = useCommunitiesStatsStore((state) => state.setCommunityStats);

  useEffect(() => {
    if (stats && (stats.allPostCount !== undefined || stats.state === 'failed')) {
      setCommunityStats(communityAddress, stats);
    }
  }, [stats, communityAddress, setCommunityStats]);

  return null;
};
