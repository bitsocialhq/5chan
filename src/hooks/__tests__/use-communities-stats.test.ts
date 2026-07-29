import * as React from 'react';
import { createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { communitiesStore } from '../../lib/bitsocial-internals/stores';
import { CommunityStatsCollector, useCommunitiesStatsStore } from '../use-communities-stats';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
const act = (React as { act?: (cb: () => void | Promise<void>) => void | Promise<void> }).act as (cb: () => void | Promise<void>) => void | Promise<void>;

const statsHookState = vi.hoisted(() => ({
  calls: 0,
  listeners: new Set<() => void>(),
  snapshot: { state: 'uninitialized' } as Record<string, unknown>,
}));

vi.mock('@bitsocial/bitsocial-react-hooks', async () => {
  const ReactModule = await vi.importActual<typeof import('react')>('react');
  return {
    useCommunityStats: () => {
      statsHookState.calls++;
      return ReactModule.useSyncExternalStore(
        (listener) => {
          statsHookState.listeners.add(listener);
          return () => statsHookState.listeners.delete(listener);
        },
        () => statsHookState.snapshot,
        () => statsHookState.snapshot,
      );
    },
  };
});

vi.mock('../use-community-identifiers', () => ({
  useCommunityIdentifier: (communityAddress: string) => ({
    name: communityAddress,
    publicKey: `${communityAddress}-key`,
  }),
}));

let container: HTMLDivElement;
let root: Root;

const setStatsSnapshot = (snapshot: Record<string, unknown>) => {
  act(() => {
    statsHookState.snapshot = snapshot;
    for (const listener of statsHookState.listeners) {
      listener();
    }
  });
};

describe('useCommunitiesStatsStore', () => {
  beforeEach(() => {
    useCommunitiesStatsStore.setState({ communityStats: {} });
    communitiesStore.setState({ communities: {} });
    statsHookState.calls = 0;
    statsHookState.listeners.clear();
    statsHookState.snapshot = { state: 'uninitialized' };

    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
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

  it('notifies subscribers when the source stats CID changes', () => {
    const address = 'business-posting.bso';
    const initialStats = {
      allPostCount: 12,
      allReplyCount: 34,
      weekActiveUserCount: 5,
      state: 'succeeded',
      sourceStatsCid: 'stats-cid-1',
    };

    useCommunitiesStatsStore.getState().setCommunityStats(address, initialStats);
    const listener = vi.fn();
    const unsubscribe = useCommunitiesStatsStore.subscribe(listener);

    useCommunitiesStatsStore.getState().setCommunityStats(address, {
      ...initialStats,
      sourceStatsCid: 'stats-cid-2',
    });

    expect(listener).toHaveBeenCalledOnce();
    expect(useCommunitiesStatsStore.getState().communityStats[address].sourceStatsCid).toBe('stats-cid-2');
    unsubscribe();
  });

  it('unmounts resolved requests and remounts only when statsCid changes', () => {
    const address = 'business-posting.bso';
    const communityKey = `${address}-key`;
    communitiesStore.setState({
      communities: {
        [communityKey]: {
          address,
          statsCid: 'stats-cid-1',
          updatingState: 'fetching-ipns',
        },
      },
    });

    act(() => {
      root.render(createElement(CommunityStatsCollector, { communityAddress: address }));
    });

    expect(statsHookState.calls).toBeGreaterThan(0);

    setStatsSnapshot({
      allPostCount: 12,
      allReplyCount: 34,
      weekActiveUserCount: 5,
      state: 'succeeded',
    });

    expect(useCommunitiesStatsStore.getState().communityStats[address]).toMatchObject({
      allPostCount: 12,
      sourceStatsCid: 'stats-cid-1',
    });
    const callsAfterFirstResult = statsHookState.calls;

    act(() => {
      communitiesStore.setState({
        communities: {
          [communityKey]: {
            address,
            statsCid: 'stats-cid-1',
            updatingState: 'succeeded',
          },
        },
      });
    });

    expect(statsHookState.calls).toBe(callsAfterFirstResult);

    act(() => {
      communitiesStore.setState({
        communities: {
          [communityKey]: {
            address,
            statsCid: 'stats-cid-2',
            updatingState: 'fetching-ipfs',
          },
        },
      });
    });

    expect(statsHookState.calls).toBeGreaterThan(callsAfterFirstResult);
    expect(useCommunitiesStatsStore.getState().communityStats[address].sourceStatsCid).toBe('stats-cid-1');

    setStatsSnapshot({
      allPostCount: 12,
      allReplyCount: 34,
      weekActiveUserCount: 5,
      state: 'succeeded',
    });

    expect(useCommunitiesStatsStore.getState().communityStats[address].sourceStatsCid).toBe('stats-cid-2');
    const callsAfterSecondResult = statsHookState.calls;

    act(() => {
      communitiesStore.setState({
        communities: {
          [communityKey]: {
            address,
            statsCid: 'stats-cid-2',
            updatingState: 'succeeded',
          },
        },
      });
    });

    expect(statsHookState.calls).toBe(callsAfterSecondResult);
  });
});
