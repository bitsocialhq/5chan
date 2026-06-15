import * as React from 'react';
import { createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAccountCommunityAddresses } from '../use-account-community-addresses';
import { useAccountCommunitiesWithMetadata } from '../use-account-communities-with-metadata';
import useAuthorPrivileges from '../use-author-privileges';
import { useBoardFeedPageSize } from '../use-board-feed-page-size';
import { useBoardPseudonymityMode } from '../use-board-pseudonymity-mode';
import useCountLinksInReplies from '../use-count-links-in-replies';
import { useFilteredDirectoryAddresses } from '../use-filtered-directory-addresses';
import { useModeratedCommunityAddressInputs, useModeratedCommunityAddressesForInputs } from '../use-moderated-community-addresses';
import useAllFeedFilterStore from '../../stores/use-all-feed-filter-store';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
const act = (React as { act?: (cb: () => void | Promise<void>) => void | Promise<void> }).act as (cb: () => void | Promise<void>) => void | Promise<void>;

const testState = vi.hoisted(() => ({
  account: undefined as unknown,
  accountCommunities: {} as Record<string, unknown>,
  liveCommunities: {} as Record<string, unknown>,
  directories: [] as Array<{ address: string; nsfw?: boolean }>,
  directoryLookup: {} as Record<string, unknown>,
  flattenedReplies: [] as unknown[],
  communitySnapshot: undefined as unknown,
}));

const accountsStoreSelectorCache = vi.hoisted(() => ({
  hasValue: false,
  value: undefined as unknown,
}));

vi.mock('@bitsocial/bitsocial-react-hooks', () => ({
  useAccount: () => testState.account,
  useAccountCommunities: () => ({ accountCommunities: testState.accountCommunities }),
}));

vi.mock('@bitsocial/bitsocial-react-hooks/dist/stores/accounts/index.js', () => ({
  default: (
    selector: (state: { activeAccountId?: string; accounts: Record<string, Record<string, unknown> & { communities?: typeof testState.accountCommunities }> }) => unknown,
    equalityFn?: (previous: unknown, next: unknown) => boolean,
  ) => {
    const nextValue = selector({
      activeAccountId: 'active',
      accounts: {
        active: {
          ...(testState.account as Record<string, unknown> | undefined),
          communities: testState.accountCommunities,
        },
      },
    });

    if (accountsStoreSelectorCache.hasValue && equalityFn?.(accountsStoreSelectorCache.value, nextValue)) {
      return accountsStoreSelectorCache.value;
    }

    accountsStoreSelectorCache.hasValue = true;
    accountsStoreSelectorCache.value = nextValue;
    return nextValue;
  },
}));

const communitiesStoreSelectorCache = vi.hoisted(() => ({
  hasValue: false,
  value: undefined as unknown,
}));

vi.mock('@bitsocial/bitsocial-react-hooks/dist/stores/communities', () => ({
  default: (selector: (state: { communities: Record<string, unknown> }) => unknown, equalityFn?: (previous: unknown, next: unknown) => boolean) => {
    const nextValue = selector({
      communities: testState.liveCommunities,
    });

    if (communitiesStoreSelectorCache.hasValue && equalityFn?.(communitiesStoreSelectorCache.value, nextValue)) {
      return communitiesStoreSelectorCache.value;
    }

    communitiesStoreSelectorCache.hasValue = true;
    communitiesStoreSelectorCache.value = nextValue;
    return nextValue;
  },
}));

vi.mock('@bitsocial/bitsocial-react-hooks/dist/lib/community-address.js', () => ({
  getEquivalentCommunityAddressGroupKey: (address: string) => (address.endsWith('.eth') ? address.slice(0, -4) + '.bso' : address),
  pickPreferredEquivalentCommunityAddress: (addresses: string[]) => addresses.find((address) => address.endsWith('.bso')) || addresses[0],
}));

vi.mock('@bitsocial/bitsocial-react-hooks/dist/lib/utils', () => ({
  flattenCommentsPages: () => testState.flattenedReplies,
}));

vi.mock('../use-directories', () => ({
  normalizeBoardAddress: (address: string | undefined) => address?.toLowerCase() ?? '',
  useDirectories: () => testState.directories,
  useDirectoryByAddress: (address: string | undefined) => (address ? testState.directoryLookup[address] : undefined),
}));

vi.mock('../use-stable-community', () => ({
  useCommunityField: (_address: string | undefined, selector: (community: unknown) => unknown) => selector(testState.communitySnapshot),
}));

let latestValue: unknown;
let root: Root;
let container: HTMLDivElement;
let renderCount = 0;

const HookHarness = ({ useValue }: { useValue: () => unknown }) => {
  const value = useValue();
  latestValue = value;
  return null;
};

const renderHookValue = (useValue: () => unknown) => {
  act(() => {
    root.render(createElement(HookHarness, { key: renderCount++, useValue }));
  });

  return latestValue;
};

const rerenderHookValue = (useValue: () => unknown) => {
  act(() => {
    root.render(createElement(HookHarness, { useValue }));
  });

  return latestValue;
};

describe('selector hooks', () => {
  beforeEach(() => {
    latestValue = undefined;
    renderCount = 0;
    localStorage.clear();
    vi.clearAllMocks();
    testState.account = undefined;
    testState.accountCommunities = {};
    testState.liveCommunities = {};
    testState.directories = [];
    testState.directoryLookup = {};
    testState.flattenedReplies = [];
    testState.communitySnapshot = undefined;
    accountsStoreSelectorCache.hasValue = false;
    accountsStoreSelectorCache.value = undefined;
    communitiesStoreSelectorCache.hasValue = false;
    communitiesStoreSelectorCache.value = undefined;
    useAllFeedFilterStore.getState().setFilter('all');

    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  it('derives account board addresses and metadata from cached account communities', () => {
    testState.accountCommunities = {
      'music.eth': { address: 'music.eth', title: '/mu/ - Music' },
      'tech.eth': { address: 'tech.eth', title: '/g/ - Technology' },
    };

    expect(renderHookValue(() => useAccountCommunityAddresses())).toEqual(['music.eth', 'tech.eth']);
    expect(renderHookValue(() => useAccountCommunitiesWithMetadata())).toEqual([
      { address: 'music.eth', title: '/mu/ - Music' },
      { address: 'tech.eth', title: '/g/ - Technology' },
    ]);
  });

  it('keeps account board address identity stable when cached community objects change', () => {
    testState.accountCommunities = {
      'music.eth': { address: 'music.eth', state: 'updating' },
      'tech.eth': { address: 'tech.eth', state: 'updating' },
    };

    const initialAddresses = rerenderHookValue(() => useAccountCommunityAddresses());

    testState.accountCommunities = {
      'music.eth': { address: 'music.eth', state: 'succeeded' },
      'tech.eth': { address: 'tech.eth', state: 'updating' },
    };

    expect(rerenderHookValue(() => useAccountCommunityAddresses())).toBe(initialAddresses);

    testState.accountCommunities = {
      ...testState.accountCommunities,
      'biz.eth': { address: 'biz.eth', state: 'updating' },
    };

    const addressesWithNewBoard = rerenderHookValue(() => useAccountCommunityAddresses());
    expect(addressesWithNewBoard).not.toBe(initialAddresses);
    expect(addressesWithNewBoard).toEqual(['biz.eth', 'music.eth', 'tech.eth']);
  });

  it('keeps moderated board address identity stable when transient community state changes', () => {
    testState.account = {
      author: { address: '0xme' },
      subscriptions: ['sub.eth'],
    };
    testState.accountCommunities = {
      'owned.eth': { address: 'owned.eth', state: 'updating' },
    };
    testState.directories = [{ address: 'dir.eth' }, { address: 'sub.eth' }];
    testState.liveCommunities = {
      'dir.eth': {
        address: 'dir.eth',
        state: 'fetching-ipns',
        roles: { '0xme': { role: 'moderator' } },
      },
      'sub.eth': {
        address: 'sub.eth',
        state: 'fetching-ipns',
        roles: { '0xme': { role: 'member' } },
      },
    };

    const useModeratedAddresses = () => {
      const inputs = useModeratedCommunityAddressInputs();
      return useModeratedCommunityAddressesForInputs(inputs);
    };

    const initialAddresses = rerenderHookValue(useModeratedAddresses);
    expect(initialAddresses).toEqual(['owned.eth', 'dir.eth']);

    testState.liveCommunities = {
      'dir.eth': {
        address: 'dir.eth',
        state: 'succeeded',
        roles: { '0xme': { role: 'moderator' } },
      },
      'sub.eth': {
        address: 'sub.eth',
        state: 'succeeded',
        roles: { '0xme': { role: 'member' } },
      },
    };

    expect(rerenderHookValue(useModeratedAddresses)).toBe(initialAddresses);

    testState.liveCommunities = {
      ...testState.liveCommunities,
      'sub.eth': {
        address: 'sub.eth',
        state: 'succeeded',
        roles: { '0xme': { role: 'admin' } },
      },
    };

    const addressesWithNewRole = rerenderHookValue(useModeratedAddresses);
    expect(addressesWithNewRole).not.toBe(initialAddresses);
    expect(addressesWithNewRole).toEqual(['owned.eth', 'dir.eth', 'sub.eth']);
  });

  it('computes moderator privileges and whether the current account authored the comment', () => {
    testState.account = { author: { address: '0xme' } };
    testState.communitySnapshot = {
      roles: {
        '0xauthor': { role: 'moderator' },
        '0xme': { role: 'admin' },
      },
    };

    expect(renderHookValue(() => useAuthorPrivileges({ commentAuthorAddress: '0xauthor', communityAddress: 'music.eth' }))).toEqual({
      isCommentAuthorMod: true,
      isAccountMod: true,
      isAccountCommentAuthor: false,
      commentAuthorRole: 'moderator',
      accountAuthorRole: 'admin',
    });

    expect(renderHookValue(() => useAuthorPrivileges({ commentAuthorAddress: '0xme', communityAddress: 'music.eth' }))).toEqual({
      isCommentAuthorMod: true,
      isAccountMod: true,
      isAccountCommentAuthor: true,
      commentAuthorRole: 'admin',
      accountAuthorRole: 'admin',
    });
  });

  it('derives board page sizes from directory metadata and falls back when unavailable', () => {
    expect(renderHookValue(() => useBoardFeedPageSize({ features: { postsPerPage: 22 } } as never))).toEqual({
      guiPostsPerPage: 22,
      maxGuiPages: 10,
      paginationFeedPostsPerPage: 220,
      infiniteFeedPostsPerPage: 22,
    });

    expect(renderHookValue(() => useBoardFeedPageSize(undefined))).toEqual({
      guiPostsPerPage: 15,
      maxGuiPages: 10,
      paginationFeedPostsPerPage: 150,
      infiniteFeedPostsPerPage: 15,
    });
  });

  it('prefers live pseudonymity metadata and falls back to directory entries', () => {
    testState.directoryLookup = {
      'music.eth': {
        address: 'music.eth',
        features: { pseudonymityMode: 'directory-mode' },
      },
    };
    testState.communitySnapshot = {
      features: { pseudonymityMode: 'live-mode' },
    };

    expect(renderHookValue(() => useBoardPseudonymityMode('music.eth'))).toBe('live-mode');

    testState.communitySnapshot = {
      features: {},
    };

    expect(renderHookValue(() => useBoardPseudonymityMode('music.eth'))).toBe('directory-mode');
  });

  it('counts link-bearing replies and supports a reply preview limit', () => {
    testState.flattenedReplies = [{ link: 'https://a.test' }, { link: undefined }, { link: 'https://b.test' }];

    expect(renderHookValue(() => useCountLinksInReplies({ replies: {} } as never))).toBe(2);
    expect(renderHookValue(() => useCountLinksInReplies({ replies: {} } as never, 2))).toBe(1);
  });

  it('filters directory addresses according to the all-feed mode', () => {
    testState.directories = [{ address: 'music.eth', nsfw: false }, { address: 'flash.eth', nsfw: true }, { address: 'tech.eth' }];

    expect(renderHookValue(() => useFilteredDirectoryAddresses())).toEqual(['music.eth', 'flash.eth', 'tech.eth']);

    act(() => {
      useAllFeedFilterStore.getState().setFilter('nsfw');
    });
    expect(renderHookValue(() => useFilteredDirectoryAddresses())).toEqual(['flash.eth']);

    act(() => {
      useAllFeedFilterStore.getState().setFilter('sfw');
    });
    expect(renderHookValue(() => useFilteredDirectoryAddresses())).toEqual(['music.eth', 'tech.eth']);
  });
});
