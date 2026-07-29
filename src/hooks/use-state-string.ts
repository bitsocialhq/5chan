import { useMemo } from 'react';
import { useClientsStates, useCommunity, type Communities, type CommunityIdentifier } from '@bitsocial/bitsocial-react-hooks';
import getShortAddress from '../lib/get-short-address';
import { communitiesStore } from '../lib/bitsocial-internals/stores';
import { communityPostsCacheExpired } from '../lib/bitsocial-internals/utils';
import { isBrowserPureP2PEnabled } from '../lib/p2p-runtime';
import { useCommunityIdentifiers } from './use-community-identifiers';

interface CommentOrCommunity {
  state?: string;
  publishingState?: string;
  updatingState?: string;
}

interface States {
  [key: string]: string[];
}

type CommunityLoadingState = {
  communityAddresses: string[];
  clientUrls: string[];
};

type CommunityLoadingStates = Record<string, CommunityLoadingState>;

type MutableCommunityLoadingState = {
  communityAddresses: Set<string>;
  clientUrls: Set<string>;
};

type MutableCommunityLoadingStates = Record<string, MutableCommunityLoadingState>;

const isBrowserLibp2pClient = (clientUrl: string) => clientUrl === 'libp2pjs';

const getDownloadSourceSuffix = (clientUrls: string[], isBrowserPureP2P: boolean) =>
  (clientUrls.length > 0 ? clientUrls.every(isBrowserLibp2pClient) : isBrowserPureP2P) ? ' from peers' : ' via IPFS';

const friendlyStateNames: Record<string, string> = {
  'fetching-ipns': 'downloading board',
  'fetching-ipfs': 'downloading thread',
  'fetching-community-ipns': 'downloading board',
  'fetching-community-ipfs': 'downloading board',
  'fetching-update-ipfs': 'downloading update',
  'resolving-address': 'resolving address',
  'resolving-community-address': 'resolving board address',
  'resolving-author-address': 'resolving author address',
};

const getFriendlyStateName = (state: string): string =>
  friendlyStateNames[state] ||
  state
    .replaceAll('-', ' ')
    .replace('ipfs', 'thread')
    .replace('ipns', 'community')
    .replace('fetching', 'downloading')
    .replace('community community', 'board')
    .replace('downloading community', 'downloading board');

const inactiveLifecycleStates = new Set(['failed', 'ready', 'stopped', 'succeeded']);

const isActiveLifecycleState = (state?: string): state is string => Boolean(state && !inactiveLifecycleStates.has(state));

const getActiveLifecycleState = (commentOrCommunity: CommentOrCommunity | undefined): string | undefined => {
  if (!commentOrCommunity || commentOrCommunity.state === 'succeeded') {
    return;
  }

  return [commentOrCommunity.publishingState, commentOrCommunity.updatingState, commentOrCommunity.state].find(isActiveLifecycleState);
};

const sanitizeSingleFeedLoadingState = (stateString?: string): string | undefined => {
  if (!stateString) {
    return stateString;
  }

  return stateString
    .replace(/\bInitializing\b/g, 'Loading board')
    .replace(/\binitializing\b/g, 'loading board')
    .replace(/\bDownloading thread\b/g, 'Downloading board')
    .replace(/\bdownloading thread\b/g, 'downloading board')
    .replace(/\bLoading thread\b/g, 'Loading board')
    .replace(/\bloading thread\b/g, 'loading board');
};

const getOrCreateCommunityLoadingState = (states: MutableCommunityLoadingStates, state: string): MutableCommunityLoadingState => {
  states[state] ??= {
    communityAddresses: new Set(),
    clientUrls: new Set(),
  };
  return states[state];
};

const getCommunitiesLoadingStates = (storedCommunities: Communities, communityIdentifiers: CommunityIdentifier[]): CommunityLoadingStates => {
  const states: MutableCommunityLoadingStates = {};

  for (const communityIdentifier of communityIdentifiers) {
    const communityKey = communityIdentifier.publicKey || communityIdentifier.name;
    if (!communityKey) {
      continue;
    }
    const community = storedCommunities[communityKey];
    if (!community?.updatingState) {
      continue;
    }

    const updatingState = community.updatingState as string;
    if ((!community.updatedAt || communityPostsCacheExpired(community)) && updatingState !== 'stopped' && updatingState !== 'succeeded') {
      const communityState = getOrCreateCommunityLoadingState(states, updatingState);
      communityState.communityAddresses.add(community.address as string);

      for (const clientType in community.clients ?? {}) {
        if (clientType === 'chainProviders') {
          for (const chainTicker in community.clients.chainProviders ?? {}) {
            for (const clientUrl in community.clients.chainProviders[chainTicker] ?? {}) {
              if (community.clients.chainProviders[chainTicker][clientUrl].state === updatingState) {
                communityState.clientUrls.add(clientUrl);
              }
            }
          }
          continue;
        }

        for (const clientUrl in community.clients[clientType] ?? {}) {
          if (community.clients[clientType][clientUrl].state === updatingState) {
            communityState.clientUrls.add(clientUrl);
          }
        }
      }
    }

    for (const clientType in community.posts?.clients ?? {}) {
      for (const sortType in community.posts.clients[clientType] ?? {}) {
        for (const clientUrl in community.posts.clients[clientType][sortType] ?? {}) {
          const clientState = community.posts.clients[clientType][sortType][clientUrl].state;
          if (clientState === 'stopped') {
            continue;
          }
          const pageState = getOrCreateCommunityLoadingState(states, `${clientState}-page-${sortType}`);
          pageState.communityAddresses.add(community.address as string);
          pageState.clientUrls.add(clientUrl);
        }
      }
    }
  }

  return Object.fromEntries(
    Object.entries(states).map(([state, value]) => [
      state,
      {
        communityAddresses: [...value.communityAddresses],
        clientUrls: [...value.clientUrls],
      },
    ]),
  );
};

const getMultipleCommunitiesFeedStateString = (
  states: CommunityLoadingStates,
  communityAddresses: string[] | undefined,
  isBrowserPureP2P: boolean,
): string | undefined => {
  let stateString = '';

  if (states['resolving-address']) {
    const resolvingState = states['resolving-address'];
    const count = resolvingState.communityAddresses.length;
    stateString += `resolving ${count} board ${count === 1 ? 'address' : 'addresses'}`;
  }

  const pagesStatesCommunityAddresses = new Set<string>();
  const downloadingClientUrls: string[] = [];
  for (const state in states) {
    if (state.match('page')) {
      states[state].communityAddresses.forEach((address) => pagesStatesCommunityAddresses.add(address));
      downloadingClientUrls.push(...states[state].clientUrls);
    }
  }

  if (states['fetching-ipns'] || states['fetching-ipfs'] || pagesStatesCommunityAddresses.size) {
    if (stateString) stateString += ', ';
    stateString += 'downloading ';
    if (states['fetching-ipns']) {
      const fetchingIpnsState = states['fetching-ipns'];
      downloadingClientUrls.push(...fetchingIpnsState.clientUrls);
      const count = fetchingIpnsState.communityAddresses.length;
      stateString += `${count} ${count === 1 ? 'board' : 'boards'}`;
      if (count <= 5) {
        stateString += ` (${fetchingIpnsState.communityAddresses.map((address) => getShortAddress(address) || address).join(', ')})`;
      }
    }

    if (states['fetching-ipfs']) {
      const fetchingIpfsState = states['fetching-ipfs'];
      downloadingClientUrls.push(...fetchingIpfsState.clientUrls);
      if (stateString[stateString.length - 1] !== ' ') {
        stateString += ', ';
      }
      const count = fetchingIpfsState.communityAddresses.length;
      stateString += `${count} ${count === 1 ? 'thread' : 'threads'}`;
    }

    if (pagesStatesCommunityAddresses.size) {
      if (states['fetching-ipns'] || states['fetching-ipfs']) stateString += ', ';
      const count = pagesStatesCommunityAddresses.size;
      stateString += `${count} ${count === 1 ? 'page' : 'pages'}`;
    }

    stateString += getDownloadSourceSuffix(downloadingClientUrls, isBrowserPureP2P);
  }

  if (!stateString && communityAddresses?.length) {
    const count = communityAddresses.length;
    stateString = `downloading ${count} ${count === 1 ? 'board' : 'boards'}`;
    if (count <= 5) {
      stateString += ` (${communityAddresses.map((address) => getShortAddress(address) || address).join(', ')})`;
    }
  }

  stateString = stateString.charAt(0).toUpperCase() + stateString.slice(1);
  return stateString === '' ? undefined : stateString;
};

const useStateString = (commentOrCommunity: CommentOrCommunity | undefined): string | undefined => {
  const { states: rawStates } = useClientsStates({ comment: commentOrCommunity }) as { states: States };
  const isBrowserPureP2P = isBrowserPureP2PEnabled();

  return useMemo(() => {
    let stateString: string | undefined = '';
    const resolvingParts: string[] = [];
    const downloadingParts: string[] = [];
    const downloadingClientUrls: string[] = [];

    for (const state in rawStates) {
      if (rawStates[state].length === 0) continue;
      const friendlyName = getFriendlyStateName(state);
      if (state.includes('resolving')) {
        resolvingParts.push(friendlyName);
      } else {
        downloadingParts.push(friendlyName);
        downloadingClientUrls.push(...rawStates[state]);
      }
    }

    if (resolvingParts.length) {
      stateString = resolvingParts.join(', ');
    }
    if (downloadingParts.length) {
      if (stateString) stateString += ', ';
      stateString += downloadingParts.join(', ') + getDownloadSourceSuffix(downloadingClientUrls, isBrowserPureP2P);
    }

    if (!stateString) {
      const activeLifecycleState = getActiveLifecycleState(commentOrCommunity);
      if (activeLifecycleState) {
        const isIpfsRelated = activeLifecycleState.includes('ipfs') || activeLifecycleState.includes('ipns');
        stateString = getFriendlyStateName(activeLifecycleState);
        if (isIpfsRelated) {
          stateString += getDownloadSourceSuffix([], isBrowserPureP2P);
        }
      }
    }

    if (stateString) {
      stateString = stateString.charAt(0).toUpperCase() + stateString.slice(1);
    }

    return stateString === '' ? undefined : stateString;
  }, [rawStates, commentOrCommunity, isBrowserPureP2P]);
};

export const useFeedStateString = (communityAddresses?: string[]): string | undefined => {
  const isBrowserPureP2P = isBrowserPureP2PEnabled();
  const communities = useCommunityIdentifiers(communityAddresses);

  // single community feed state string
  const communityAddress = communityAddresses?.length === 1 ? communityAddresses[0] : undefined;
  const communityIdentifier = communityAddress ? communities[0] : undefined;
  const community = useCommunity(communityIdentifier ? { community: communityIdentifier } : undefined);
  const rawSingleCommunityFeedStateString = useStateString(communityAddress ? community : undefined);
  const singleCommunityFeedStateString = communityAddress ? sanitizeSingleFeedLoadingState(rawSingleCommunityFeedStateString) : undefined;

  // Every caller already owns the data-loading hook. Observe only the derived text here so
  // high-frequency per-community lifecycle changes do not create no-op React commits.
  const multipleCommunitiesFeedStateString = communitiesStore((state) => {
    if (communityAddress) {
      return;
    }

    const states = getCommunitiesLoadingStates(state.communities, communities);
    return getMultipleCommunitiesFeedStateString(states, communityAddresses, isBrowserPureP2P);
  });

  if (singleCommunityFeedStateString) {
    return singleCommunityFeedStateString;
  }
  return multipleCommunitiesFeedStateString;
};

export default useStateString;
