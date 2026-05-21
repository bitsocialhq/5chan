import { useMemo } from 'react';
import { useClientsStates, useCommunity, useCommunitiesStates } from '@bitsocial/bitsocial-react-hooks';
import debounce from 'lodash/debounce';
import getShortAddress from '../lib/get-short-address';
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

const isCommunityLoadingState = (state: string[] | CommunityLoadingState | undefined): state is CommunityLoadingState =>
  Boolean(state && !Array.isArray(state) && 'communityAddresses' in state && 'clientUrls' in state);

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
    .replace(/\bDownloading thread\b/g, 'Downloading board')
    .replace(/\bdownloading thread\b/g, 'downloading board')
    .replace(/\bLoading thread\b/g, 'Loading board')
    .replace(/\bloading thread\b/g, 'loading board');
};

const useStateString = (commentOrCommunity: CommentOrCommunity | undefined): string | undefined => {
  const { states: rawStates } = useClientsStates({ comment: commentOrCommunity }) as { states: States };
  const isBrowserPureP2P = isBrowserPureP2PEnabled();

  const debouncedStates = useMemo(() => {
    const debouncedValue = debounce((value: States) => value, 300);
    return debouncedValue(rawStates);
  }, [rawStates]);

  return useMemo(() => {
    let stateString: string | undefined = '';
    const resolvingParts: string[] = [];
    const downloadingParts: string[] = [];
    const downloadingClientUrls: string[] = [];

    for (const state in debouncedStates) {
      if (debouncedStates[state].length === 0) continue;
      const friendlyName = getFriendlyStateName(state);
      if (state.includes('resolving')) {
        resolvingParts.push(friendlyName);
      } else {
        downloadingParts.push(friendlyName);
        downloadingClientUrls.push(...debouncedStates[state]);
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
  }, [debouncedStates, commentOrCommunity, isBrowserPureP2P]);
};

export const useFeedStateString = (communityAddresses?: string[]): string | undefined => {
  const isBrowserPureP2P = isBrowserPureP2PEnabled();
  const communities = useCommunityIdentifiers(communityAddresses);

  // single community feed state string
  const communityAddress = communityAddresses?.length === 1 ? communityAddresses[0] : undefined;
  const communityIdentifier = communityAddress ? communities[0] : undefined;
  const community = useCommunity(communityIdentifier ? { community: communityIdentifier } : undefined);
  const singleCommunityFeedStateString = sanitizeSingleFeedLoadingState(useStateString(community));

  // multiple community feed state string
  const { states } = useCommunitiesStates({ communities });

  const multipleCommunitiesFeedStateString = useMemo(() => {
    if (communityAddress) {
      return;
    }

    let stateString = '';

    if (states['resolving-address']) {
      const resolvingState = states['resolving-address'];
      if (isCommunityLoadingState(resolvingState)) {
        const { communityAddresses } = resolvingState;
        const count = communityAddresses.length;
        stateString += `resolving ${count} board ${count === 1 ? 'address' : 'addresses'}`;
      }
    }

    const pagesStatesCommunityAddresses = new Set<string>();
    const downloadingClientUrls: string[] = [];
    for (const state in states) {
      if (state.match('page')) {
        const communityState = states[state];
        if (isCommunityLoadingState(communityState)) {
          communityState.communityAddresses.forEach((address: string) => pagesStatesCommunityAddresses.add(address));
          downloadingClientUrls.push(...communityState.clientUrls);
        }
      }
    }

    if (states['fetching-ipns'] || states['fetching-ipfs'] || pagesStatesCommunityAddresses.size) {
      if (stateString) stateString += ', ';
      stateString += 'downloading ';
      if (states['fetching-ipns']) {
        const fetchingIpnsState = states['fetching-ipns'];
        if (isCommunityLoadingState(fetchingIpnsState)) {
          downloadingClientUrls.push(...fetchingIpnsState.clientUrls);
          const count = fetchingIpnsState.communityAddresses.length;
          stateString += `${count} ${count === 1 ? 'board' : 'boards'}`;
          if (count <= 5) {
            stateString += ` (${fetchingIpnsState.communityAddresses.map((a: string) => getShortAddress(a) || a).join(', ')})`;
          }
        }
      }

      if (states['fetching-ipfs']) {
        const fetchingIpfsState = states['fetching-ipfs'];
        if (isCommunityLoadingState(fetchingIpfsState)) {
          downloadingClientUrls.push(...fetchingIpfsState.clientUrls);
          if (stateString[stateString.length - 1] !== ' ') {
            stateString += ', ';
          }
          const count = fetchingIpfsState.communityAddresses.length;
          stateString += `${count} ${count === 1 ? 'thread' : 'threads'}`;
        }
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
        stateString += ` (${communityAddresses.map((a) => getShortAddress(a) || a).join(', ')})`;
      }
    }

    // capitalize first letter
    stateString = stateString.charAt(0).toUpperCase() + stateString.slice(1);

    // if string is empty, return undefined instead
    return stateString === '' ? undefined : stateString;
  }, [states, communityAddress, communityAddresses, isBrowserPureP2P]);

  if (singleCommunityFeedStateString) {
    return singleCommunityFeedStateString;
  }
  return multipleCommunitiesFeedStateString;
};

export default useStateString;
