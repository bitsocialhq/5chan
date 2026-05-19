import * as React from 'react';
import { createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useResolvedCommunityAddress } from '../use-resolved-community-address';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
const act = (React as { act?: (cb: () => void | Promise<void>) => void | Promise<void> }).act as (cb: () => void | Promise<void>) => void | Promise<void>;

const testState = vi.hoisted(() => ({
  boardIdentifier: 'biz',
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
      { address: 'business-and-finance.bso', score: 100, managedByDevs: true },
      { address: 'backup-business.bso', score: 10, managedByDevs: false },
    ],
  },
  offlineStates: {} as Record<string, { updatedAt?: number; state?: string }>,
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

let latestValue: string | undefined;
let container: HTMLDivElement;
let root: Root;

const HookHarness = () => {
  latestValue = useResolvedCommunityAddress();
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
    testState.boardIdentifier = 'biz';
    testState.offlineStates = {};
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

    expect(latestValue).toBe('backup-business.bso');
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

  it('does not subscribe to offline state on non-directory board routes', async () => {
    testState.boardIdentifier = 'custom-board.bso';
    testState.offlineStates = {
      unrelated: {
        updatedAt: 1,
      },
    };

    await renderHook();

    expect(latestValue).toBe('custom-board.bso');
    expect(testState.offlineSelections).toEqual([undefined]);
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

    expect(latestValue).toBe('backup-business.bso');
  });
});
