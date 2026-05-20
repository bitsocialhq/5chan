import * as React from 'react';
import { createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useFeedStateString } from '../../../../hooks/use-state-string';
import PopularThreadsBox from '../popular-threads-box';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
const act = (React as { act?: (cb: () => void | Promise<void>) => void | Promise<void> }).act as (cb: () => void | Promise<void>) => void | Promise<void>;

const testState = vi.hoisted(() => ({
  communities: [] as unknown[],
  feedStateString: 'Downloading boards',
  isLoading: false,
  requestedCommunityIdentifiers: [] as string[][],
  requestedCommunities: [] as unknown[][],
  revealedPopularPosts: undefined as
    | Array<{
        cid: string;
        communityAddress: string;
        content: string;
        link: string;
        thumbnailUrl: string;
        title: string;
      }>
    | undefined,
  popularPosts: [] as Array<{
    cid: string;
    communityAddress: string;
    content: string;
    link: string;
    thumbnailUrl: string;
    title: string;
  }>,
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock('@bitsocial/bitsocial-react-hooks', () => ({
  useCommunities: ({ communities }: { communities: unknown[] }) => {
    testState.requestedCommunities.push(communities);
    return { communities: testState.communities };
  },
}));

vi.mock('../../../../hooks/use-community-identifiers', () => ({
  useCommunityIdentifiers: (addresses?: string[]) => {
    testState.requestedCommunityIdentifiers.push(addresses || []);
    return addresses || [];
  },
}));

vi.mock('../../../../hooks/use-state-string', () => ({
  useFeedStateString: vi.fn(() => testState.feedStateString),
}));

vi.mock('../../../../hooks/use-popular-posts', () => ({
  getRevealedPopularPosts: vi.fn(() => testState.revealedPopularPosts),
  default: vi.fn(() => ({
    error: null,
    isLoading: testState.isLoading,
    popularPosts: testState.popularPosts,
  })),
}));

vi.mock('../../../../components/catalog-row', () => ({
  CatalogPostMedia: ({ cid }: { cid: string }) => createElement('div', { 'data-testid': 'popular-thread-media' }, cid),
}));

vi.mock('../../box-modal', () => ({
  default: () => createElement('button', { 'aria-label': 'filters' }),
}));

const directories = [
  { address: 'music-posting.eth', title: '/mu/ - Music' },
  { address: 'tech-posting.eth', title: '/g/ - Technology' },
  { address: 'tv-posting.eth', title: '/tv/ - Television & Film Directory' },
];

let container: HTMLDivElement;
let root: Root;

const renderPopularThreadsBox = () => {
  act(() => {
    root.render(createElement(MemoryRouter, {}, createElement(PopularThreadsBox, { directories, directoryAddresses: directories.map((entry) => entry.address) })));
  });
};

describe('PopularThreadsBox', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    testState.communities = directories.map((entry) => ({ address: entry.address }));
    testState.feedStateString = 'Downloading boards';
    testState.isLoading = false;
    testState.requestedCommunityIdentifiers = [];
    testState.requestedCommunities = [];
    testState.revealedPopularPosts = undefined;
    testState.popularPosts = [
      {
        cid: 'thread-1',
        communityAddress: 'music-posting.eth',
        content: 'thread content',
        link: 'https://cdn.example/thread-1.jpg',
        thumbnailUrl: 'https://cdn.example/thread-1-thumb.jpg',
        title: 'thread title',
      },
    ];

    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  it('does not subscribe to feed state once popular threads are visible', () => {
    renderPopularThreadsBox();

    expect(container.textContent).toContain('Music');
    expect(container.textContent).toContain('thread title');
    expect(vi.mocked(useFeedStateString)).not.toHaveBeenCalled();
  });

  it('does not subscribe to board communities once the popular posts cache is revealed', () => {
    testState.revealedPopularPosts = testState.popularPosts;

    renderPopularThreadsBox();

    expect(testState.requestedCommunityIdentifiers).toEqual([[]]);
    expect(testState.requestedCommunities).toEqual([[]]);
    expect(container.textContent).toContain('thread title');
  });

  it('preserves literal preview markers without applying body markdown styles', () => {
    testState.popularPosts = [
      {
        cid: 'thread-markers',
        communityAddress: 'music-posting.eth',
        content: '>we got 5chan before Half Life 3\n*poisons u*',
        link: 'https://cdn.example/thread-markers.jpg',
        thumbnailUrl: 'https://cdn.example/thread-markers-thumb.jpg',
        title: '',
      },
    ];

    renderPopularThreadsBox();

    expect(container.textContent).toContain('>we got 5chan before Half Life 3');
    expect(container.textContent).toContain('*poisons u*');
    expect(container.querySelector('.greentext')).toBeNull();
    expect(container.querySelector('.spoilertext')).toBeNull();
  });

  it('does not show a stale directory suffix in board titles', () => {
    testState.popularPosts = [
      {
        cid: 'thread-tv',
        communityAddress: 'tv-posting.eth',
        content: 'thread content',
        link: 'https://cdn.example/thread-tv.jpg',
        thumbnailUrl: 'https://cdn.example/thread-tv-thumb.jpg',
        title: '',
      },
    ];

    renderPopularThreadsBox();

    expect(container.textContent).toContain('Television & Film');
    expect(container.textContent).not.toContain('Television & Film Directory');
  });

  it('subscribes to feed state only while popular threads are loading', () => {
    testState.isLoading = true;
    testState.popularPosts = [];

    renderPopularThreadsBox();

    expect(container.textContent).toContain('Downloading boards');
    expect(vi.mocked(useFeedStateString)).toHaveBeenCalledWith(['music-posting.eth', 'tech-posting.eth', 'tv-posting.eth']);
  });
});
