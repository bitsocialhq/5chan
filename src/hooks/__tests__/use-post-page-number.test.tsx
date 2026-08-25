import * as React from 'react';
import { createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { usePostPageNumber } from '../use-post-page-number';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
const act = (React as { act?: (cb: () => void | Promise<void>) => void | Promise<void> }).act as (cb: () => void | Promise<void>) => void | Promise<void>;

const testState = vi.hoisted(() => ({
  community: { address: 'music.eth', features: {} },
  feedsOptions: {} as Record<string, unknown>,
  loadedFeeds: {} as Record<string, unknown>,
  preloadFeed: undefined as Array<{ cid: string }> | undefined,
  preloadOptions: undefined as Record<string, unknown> | undefined,
  compatiblePostSortType: 'preferred' as string | undefined,
  sizes: {
    guiPostsPerPage: 2,
    paginationFeedPostsPerPage: 20,
  },
}));

vi.mock('@bitsocial/bitsocial-react-hooks', () => ({
  useFeed: (options: Record<string, unknown> | undefined) => {
    testState.preloadOptions = options;
    return { feed: testState.preloadFeed };
  },
}));

vi.mock('@bitsocial/bitsocial-react-hooks/dist/stores/feeds', () => ({
  default: (selector: (state: { feedsOptions: Record<string, unknown>; loadedFeeds: Record<string, unknown> }) => unknown) =>
    selector({
      feedsOptions: testState.feedsOptions,
      loadedFeeds: testState.loadedFeeds,
    }),
}));

vi.mock('../use-compatible-post-sort-type', () => ({
  useCompatiblePostSortType: (_communities: unknown[], preferredSortType: string) =>
    testState.compatiblePostSortType === 'preferred' ? preferredSortType : testState.compatiblePostSortType,
}));

vi.mock('../use-directories', () => ({
  useDirectories: () => [],
  useDirectoryByAddress: () => testState.community,
  findDirectoryByAddress: () => undefined,
}));

vi.mock('../use-board-feed-page-size', () => ({
  useBoardFeedPageSize: () => testState.sizes,
}));

let latestValue: number | undefined;
let container: HTMLDivElement;
let root: Root;

const HookHarness = ({ enabled = true, postCid, communityAddress }: { enabled?: boolean; postCid?: string; communityAddress?: string }) => {
  latestValue = usePostPageNumber({ enabled, postCid, communityAddress });
  return null;
};

const renderHook = (props: { enabled?: boolean; postCid?: string; communityAddress?: string }) => {
  act(() => {
    root.render(createElement(HookHarness, props));
  });

  return latestValue;
};

describe('usePostPageNumber', () => {
  beforeEach(() => {
    latestValue = undefined;
    testState.community = { address: 'music.eth', features: {} };
    testState.feedsOptions = {};
    testState.loadedFeeds = {};
    testState.preloadFeed = undefined;
    testState.preloadOptions = undefined;
    testState.compatiblePostSortType = 'preferred';
    testState.sizes = {
      guiPostsPerPage: 2,
      paginationFeedPostsPerPage: 20,
    };

    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  it('returns the cached board page when the post already exists in loaded feeds', () => {
    testState.feedsOptions = {
      boardFeed: {
        sortType: 'active',
        communityAddresses: ['music.eth'],
      },
    };
    testState.loadedFeeds = {
      boardFeed: [{ cid: 'post-1' }, { cid: 'post-2' }, { cid: 'post-3' }],
    };

    expect(renderHook({ postCid: 'post-3', communityAddress: 'music.eth' })).toBe(2);
    expect(testState.preloadOptions).toEqual({
      communities: [{ name: 'music.eth' }],
      postsPerPage: 20,
      sortType: 'active',
    });
  });

  it('falls back to the preloaded feed when cached feeds do not contain the post yet', () => {
    testState.preloadFeed = [{ cid: 'post-1' }, { cid: 'post-2' }, { cid: 'post-3' }, { cid: 'post-4' }];

    expect(renderHook({ postCid: 'post-4', communityAddress: 'music.eth' })).toBe(2);
    expect(testState.preloadOptions).toEqual({
      communities: [{ name: 'music.eth' }],
      postsPerPage: 20,
      sortType: 'active',
    });
  });

  it('preloads the community default when active is not published', () => {
    testState.compatiblePostSortType = undefined;

    renderHook({ postCid: 'post-1', communityAddress: 'music.eth' });

    expect(testState.preloadOptions).toEqual({
      communities: [{ name: 'music.eth' }],
      postsPerPage: 20,
      sortType: undefined,
    });
  });

  it('skips resolution entirely when the hook is disabled or required inputs are missing', () => {
    testState.preloadFeed = [{ cid: 'post-1' }];

    expect(renderHook({ enabled: false, postCid: 'post-1', communityAddress: 'music.eth' })).toBeUndefined();
    expect(testState.preloadOptions).toBeUndefined();

    expect(renderHook({ enabled: true, postCid: undefined, communityAddress: 'music.eth' })).toBeUndefined();
    expect(testState.preloadOptions).toBeUndefined();
  });
});
