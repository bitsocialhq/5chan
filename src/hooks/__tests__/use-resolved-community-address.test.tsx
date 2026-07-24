import * as React from 'react';
import { createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { CommunitySyncState } from '@bitsocial/bitsocial-react-hooks';
import { useResolvedCommunityAddress, useResolvedDirectoryBoardPath } from '../use-resolved-community-address';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
const act = (React as { act?: (cb: () => void | Promise<void>) => void | Promise<void> }).act as (cb: () => void | Promise<void>) => void | Promise<void>;

const testState = vi.hoisted(() => ({
  boardIdentifier: 'biz',
  boardIdentifierOverride: undefined as string | undefined,
  directories: [
    {
      address: 'business-and-finance.bso',
      directoryCode: 'biz',
      title: '/biz/ - Business & Finance',
    },
  ],
  list: {
    directoryCode: 'biz',
    boards: [
      { address: 'business-and-finance.bso', publicKey: '12D3KooWBusiness', score: 100 },
      { address: 'bizraelis.bso', score: 10 },
    ],
  },
  offlineStates: {} as Record<string, { updatedAt?: number; state?: string }>,
  communities: {} as Record<string, { address?: string; name?: string; publicKey?: string }>,
  syncStatuses: {} as Record<string, { syncState: CommunitySyncState }>,
  offlineSelections: [] as unknown[],
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useParams: () => ({ boardIdentifier: testState.boardIdentifier }),
  };
});

vi.mock('../use-directories', () => ({
  useDirectories: () => testState.directories,
  normalizeBoardAddress: (address: string) => address.replace(/\.(bso|eth)$/, ''),
}));

vi.mock('../use-directory-list', async () => {
  const actual = await vi.importActual<typeof import('../use-directory-list')>('../use-directory-list');
  return {
    ...actual,
    useDirectoryList: () => ({ list: testState.list, loading: false, error: null }),
  };
});

vi.mock('../../stores/use-community-offline-store', () => ({
  default: <T,>(selector: (state: { communityOfflineState: typeof testState.offlineStates }) => T) => {
    const selected = selector({ communityOfflineState: testState.offlineStates });
    testState.offlineSelections.push(selected);
    return selected;
  },
}));

vi.mock('../../lib/bitsocial-internals/stores', () => ({
  communitiesStore: <T,>(selector: (state: { communities: typeof testState.communities; syncStatuses: typeof testState.syncStatuses }) => T) =>
    selector({
      communities: testState.communities,
      syncStatuses: testState.syncStatuses,
    }),
}));

let latestValue: string | undefined;
let latestDirectoryBoardPath: { boardPath: string | undefined; isDirectoryCandidate: boolean };
let container: HTMLDivElement;
let root: Root;

const HookHarness = () => {
  latestValue = useResolvedCommunityAddress(testState.boardIdentifierOverride);
  latestDirectoryBoardPath = useResolvedDirectoryBoardPath(testState.boardIdentifier);
  return null;
};

const renderHook = async () => {
  await act(async () => {
    root.render(createElement(HookHarness));
  });
};

describe('useResolvedCommunityAddress', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-01T00:00:10Z'));
    latestValue = undefined;
    latestDirectoryBoardPath = { boardPath: undefined, isDirectoryCandidate: false };
    testState.boardIdentifier = 'biz';
    testState.boardIdentifierOverride = undefined;
    testState.offlineStates = {};
    testState.communities = {};
    testState.syncStatuses = {};
    testState.offlineSelections = [];

    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    vi.useRealTimers();
  });

  it('skips a higher-ranked directory board when its last update is 30 minutes stale', async () => {
    testState.offlineStates = {
      'business-and-finance.bso': {
        updatedAt: 1_704_067_210 - 31 * 60,
      },
    };

    await renderHook();

    expect(latestValue).toBe('bizraelis.bso');
  });

  it('keeps a higher-ranked directory board when its last update is newer than 30 minutes', async () => {
    testState.offlineStates = {
      'business-and-finance.bso': {
        updatedAt: 1_704_067_210 - 29 * 60,
      },
    };

    await renderHook();

    expect(latestValue).toBe('business-and-finance.bso');
  });

  it('skips a stale higher-ranked directory board while its synchronization retries', async () => {
    testState.offlineStates = {
      'business-and-finance.bso': {
        updatedAt: 1_704_067_210 - 31 * 60,
      },
    };
    testState.syncStatuses = {
      '12D3KooWBusiness': {
        syncState: 'loading',
      },
    };

    await renderHook();

    expect(latestValue).toBe('bizraelis.bso');
  });

  it('skips a higher-ranked directory board when its first synchronization fails by public key', async () => {
    testState.syncStatuses = {
      '12D3KooWBusiness': {
        syncState: 'failed',
      },
    };

    await renderHook();

    expect(latestValue).toBe('bizraelis.bso');
  });

  it('does not subscribe to offline state on non-directory board routes', async () => {
    testState.boardIdentifier = 'custom-board.bso';
    testState.offlineStates = {
      unrelated: {
        updatedAt: 1,
      },
    };

    await renderHook();

    expect(latestValue).toBe('custom-board.bso');
    expect(testState.offlineSelections.every((selection) => selection === undefined)).toBe(true);
  });

  it('switches away from a directory board when it crosses the offline threshold while mounted', async () => {
    testState.offlineStates = {
      'business-and-finance.bso': {
        updatedAt: 1_704_067_210 - 29 * 60,
      },
    };

    await renderHook();

    expect(latestValue).toBe('business-and-finance.bso');

    await act(async () => {
      vi.advanceTimersByTime(2 * 60 * 1000);
    });

    expect(latestValue).toBe('bizraelis.bso');
  });

  it('uses an explicit directory identifier for cached board feeds', async () => {
    testState.boardIdentifier = 'all';
    testState.boardIdentifierOverride = 'biz';
    testState.offlineStates = {
      'business-and-finance.bso': {
        updatedAt: 1_704_067_210 - 31 * 60,
      },
    };

    await renderHook();

    expect(latestValue).toBe('bizraelis.bso');
  });

  it('canonicalizes the direct address for the current directory winner', async () => {
    testState.boardIdentifier = 'bizraelis.bso';
    testState.offlineStates = {
      'business-and-finance.bso': {
        updatedAt: 1_704_067_210 - 31 * 60,
      },
    };

    await renderHook();

    expect(latestDirectoryBoardPath).toEqual({
      boardPath: 'biz',
      isDirectoryCandidate: true,
    });
  });

  it('does not canonicalize a directory candidate address when it is not the current winner', async () => {
    testState.boardIdentifier = 'business-and-finance.bso';
    testState.offlineStates = {
      'business-and-finance.bso': {
        updatedAt: 1_704_067_210 - 31 * 60,
      },
    };

    await renderHook();

    expect(latestDirectoryBoardPath).toEqual({
      boardPath: undefined,
      isDirectoryCandidate: true,
    });
  });
});
