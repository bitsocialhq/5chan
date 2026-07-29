import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useCommunitiesStatsStore } from '../use-communities-stats';

describe('useCommunitiesStatsStore', () => {
  beforeEach(() => {
    useCommunitiesStatsStore.setState({ communityStats: {} });
  });

  it('does not notify subscribers when the displayed stats are unchanged', () => {
    const address = 'business-posting.bso';
    const firstStats = {
      allPostCount: 12,
      allReplyCount: 34,
      weekActiveUserCount: 5,
      state: 'succeeded',
    };

    useCommunitiesStatsStore.getState().setCommunityStats(address, firstStats);
    const statsBeforeDuplicateWrite = useCommunitiesStatsStore.getState().communityStats;
    const listener = vi.fn();
    const unsubscribe = useCommunitiesStatsStore.subscribe(listener);

    useCommunitiesStatsStore.getState().setCommunityStats(address, { ...firstStats });

    expect(listener).not.toHaveBeenCalled();
    expect(useCommunitiesStatsStore.getState().communityStats).toBe(statsBeforeDuplicateWrite);
    unsubscribe();
  });

  it('notifies subscribers when a displayed stat changes', () => {
    const address = 'business-posting.bso';
    const initialStats = {
      allPostCount: 12,
      allReplyCount: 34,
      weekActiveUserCount: 5,
      state: 'succeeded',
    };

    useCommunitiesStatsStore.getState().setCommunityStats(address, initialStats);
    const listener = vi.fn();
    const unsubscribe = useCommunitiesStatsStore.subscribe(listener);

    useCommunitiesStatsStore.getState().setCommunityStats(address, {
      ...initialStats,
      allReplyCount: 35,
    });

    expect(listener).toHaveBeenCalledOnce();
    expect(useCommunitiesStatsStore.getState().communityStats[address].allReplyCount).toBe(35);
    unsubscribe();
  });
});
