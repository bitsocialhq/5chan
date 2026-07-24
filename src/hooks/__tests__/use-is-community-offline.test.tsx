import * as React from 'react';
import { createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { CommunitySyncState } from '@bitsocial/bitsocial-react-hooks';
import useIsCommunityOffline from '../use-is-community-offline';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
const act = (React as { act?: (cb: () => void | Promise<void>) => void | Promise<void> }).act as (cb: () => void | Promise<void>) => void | Promise<void>;

interface TestCommunity {
  address?: string;
  name?: string;
  publicKey?: string;
  state?: string;
  syncState?: CommunitySyncState;
  hasCachedData?: boolean;
  updatedAt?: number;
}

const testState = vi.hoisted(() => ({
  initializeMock: vi.fn(),
  loadingTimestamps: [0] as number[],
  requestedAddresses: undefined as string[] | undefined,
  setOfflineStateMock: vi.fn(),
  communityOfflineState: {} as Record<string, { initialLoad: boolean; state?: string; updatedAt?: number }>,
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) => {
      if (key === 'posts_last_synced_info') {
        return `posts_last_synced_info:${options?.time}`;
      }
      return key;
    },
  }),
}));

vi.mock('../../stores/use-community-offline-store', () => ({
  default: () => ({
    initializeCommunityOfflineState: testState.initializeMock,
    setCommunityOfflineState: testState.setOfflineStateMock,
    communityOfflineState: testState.communityOfflineState,
  }),
}));

vi.mock('../../stores/use-communities-loading-start-timestamps-store', () => ({
  default: (addresses?: string[]) => {
    testState.requestedAddresses = addresses;
    return testState.loadingTimestamps;
  },
}));

vi.mock('../../lib/utils/time-utils', () => ({
  getFormattedTimeAgo: (timestamp: number) => `ago:${timestamp}`,
}));

let latestValue: ReturnType<typeof useIsCommunityOffline>;
let container: HTMLDivElement;
let root: Root;

const HookHarness = ({ community, communityAddressHint }: { community?: TestCommunity; communityAddressHint?: string }) => {
  latestValue = useIsCommunityOffline(community as never, communityAddressHint);
  return null;
};

const flushEffects = async (count = 3) => {
  for (let i = 0; i < count; i += 1) {
    await act(async () => {
      await Promise.resolve();
    });
  }
};

const renderHook = async (community?: TestCommunity, communityAddressHint?: string) => {
  await act(async () => {
    root.render(createElement(HookHarness, { community, communityAddressHint }));
  });
  await flushEffects();
};

describe('useIsCommunityOffline', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-01T00:00:10Z'));

    latestValue = {
      isOffline: false,
      isOnlineStatusLoading: false,
      offlineIconClass: '',
      offlineTitle: '',
    };
    testState.loadingTimestamps = [1_704_067_200];
    testState.requestedAddresses = undefined;
    testState.communityOfflineState = {};

    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    vi.useRealTimers();
  });

  it('initializes unseen boards and reports a loading state during the first sync window', async () => {
    await renderHook({ address: 'music.eth', state: 'initializing', syncState: 'loading', hasCachedData: false });

    expect(testState.requestedAddresses).toEqual(['music.eth']);
    expect(testState.initializeMock).toHaveBeenCalledWith('music.eth');
    expect(testState.setOfflineStateMock).toHaveBeenCalledWith('music.eth', {
      state: 'initializing',
      updatedAt: undefined,
    });
    expect(latestValue).toEqual({
      isOffline: false,
      isOnlineStatusLoading: true,
      offlineIconClass: 'yellowOfflineIcon',
      offlineTitle: 'downloading board...',
    });
  });

  it('reports boards with stale updates as offline and includes the last synced time', async () => {
    const staleUpdatedAt = 1_704_067_210 - 31 * 60;
    testState.communityOfflineState = {
      'music.eth': {
        initialLoad: false,
        updatedAt: staleUpdatedAt,
      },
    };
    testState.loadingTimestamps = [1_704_067_000];

    await renderHook({ address: 'music.eth', state: 'succeeded', syncState: 'stopped', hasCachedData: true, updatedAt: staleUpdatedAt });

    expect(testState.initializeMock).not.toHaveBeenCalled();
    expect(latestValue).toEqual({
      isOffline: true,
      isOnlineStatusLoading: false,
      offlineIconClass: 'redOfflineIcon',
      offlineTitle: `posts_last_synced_info:ago:${staleUpdatedAt}`,
    });
  });

  it('treats boards updated less than 30 minutes ago as online', async () => {
    const freshUpdatedAt = 1_704_067_210 - 29 * 60;
    testState.communityOfflineState = {
      'music.eth': {
        initialLoad: false,
        updatedAt: freshUpdatedAt,
      },
    };

    await renderHook({ address: 'music.eth', state: 'succeeded', syncState: 'loading', hasCachedData: true, updatedAt: freshUpdatedAt });

    expect(latestValue).toEqual({
      isOffline: false,
      isOnlineStatusLoading: false,
      offlineIconClass: '',
      offlineTitle: false,
    });
  });

  it('updates mounted boards when their last update crosses the offline threshold', async () => {
    const freshUpdatedAt = 1_704_067_210 - 29 * 60;
    testState.communityOfflineState = {
      'music.eth': {
        initialLoad: false,
        updatedAt: freshUpdatedAt,
      },
    };

    await renderHook({ address: 'music.eth', state: 'succeeded', syncState: 'succeeded', hasCachedData: true, updatedAt: freshUpdatedAt });

    expect(latestValue.isOffline).toBe(false);

    await act(async () => {
      vi.advanceTimersByTime(2 * 60 * 1000);
    });

    expect(latestValue).toEqual({
      isOffline: true,
      isOnlineStatusLoading: false,
      offlineIconClass: 'redOfflineIcon',
      offlineTitle: `posts_last_synced_info:ago:${freshUpdatedAt}`,
    });
  });

  it('marks boards without an update timestamp as offline once the loading timeout has elapsed', async () => {
    testState.communityOfflineState = {
      'music.eth': {
        initialLoad: false,
      },
    };
    testState.loadingTimestamps = [1_704_067_100];

    await renderHook({ address: 'music.eth', syncState: 'stopped', hasCachedData: false });

    expect(latestValue).toEqual({
      isOffline: true,
      isOnlineStatusLoading: false,
      offlineIconClass: 'redOfflineIcon',
      offlineTitle: 'community_offline_info',
    });
  });

  it('keeps boards loading while their first fetch remains active past the legacy timeout', async () => {
    testState.communityOfflineState = {
      'music.eth': {
        initialLoad: false,
      },
    };
    testState.loadingTimestamps = [1_704_067_100];

    await renderHook({ address: 'music.eth', syncState: 'loading', hasCachedData: false });

    expect(latestValue).toEqual({
      isOffline: false,
      isOnlineStatusLoading: true,
      offlineIconClass: 'yellowOfflineIcon',
      offlineTitle: 'downloading board...',
    });
  });

  it('keeps stale cached boards offline while synchronization is retrying', async () => {
    const staleUpdatedAt = 1_704_067_210 - 31 * 60;
    testState.communityOfflineState = {
      'music.eth': {
        initialLoad: false,
        updatedAt: staleUpdatedAt,
      },
    };

    await renderHook({ address: 'music.eth', state: 'succeeded', syncState: 'retrying', hasCachedData: true, updatedAt: staleUpdatedAt });

    expect(latestValue).toEqual({
      isOffline: true,
      isOnlineStatusLoading: false,
      offlineIconClass: 'redOfflineIcon',
      offlineTitle: `posts_last_synced_info:ago:${staleUpdatedAt}`,
    });
  });

  it('reports a definitive initial synchronization failure without waiting for the legacy timeout', async () => {
    await renderHook({ address: 'music.eth', syncState: 'failed', hasCachedData: false });

    expect(latestValue).toEqual({
      isOffline: true,
      isOnlineStatusLoading: false,
      offlineIconClass: 'redOfflineIcon',
      offlineTitle: 'community_offline_info',
    });
  });

  it('tracks strict-community objects with a canonical address hint instead of the undefined key', async () => {
    await renderHook({ name: 'music.eth', publicKey: '12D3KooWBoardKey', state: 'initializing', syncState: 'loading', hasCachedData: false }, 'music.eth');

    expect(testState.requestedAddresses).toEqual(['music.eth']);
    expect(testState.initializeMock).toHaveBeenCalledWith('music.eth');
    expect(testState.setOfflineStateMock).toHaveBeenCalledWith('music.eth', {
      state: 'initializing',
      updatedAt: undefined,
    });
    expect(latestValue).toEqual({
      isOffline: false,
      isOnlineStatusLoading: true,
      offlineIconClass: 'yellowOfflineIcon',
      offlineTitle: 'downloading board...',
    });
  });

  it('treats recently updated boards as online', async () => {
    const freshUpdatedAt = 1_704_067_205;
    testState.communityOfflineState = {
      'music.eth': {
        initialLoad: false,
        updatedAt: freshUpdatedAt,
      },
    };

    await renderHook({ address: 'music.eth', state: 'succeeded', syncState: 'failed', hasCachedData: true, updatedAt: freshUpdatedAt });

    expect(latestValue).toEqual({
      isOffline: false,
      isOnlineStatusLoading: false,
      offlineIconClass: '',
      offlineTitle: false,
    });
  });
});
