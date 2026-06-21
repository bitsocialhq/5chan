import { communitiesStore as useCommunitiesStore } from '../lib/bitsocial-internals/stores';
import type { Community } from '@bitsocial/bitsocial-react-hooks';
import { normalizeBoardAddress } from './use-directories';

type CommunityLike = Record<string, unknown> | Community | undefined;

const getCommunityByAddress = (communities: Record<string, unknown> | undefined, communityAddress: string | undefined) => {
  if (!communities || !communityAddress) {
    return undefined;
  }

  const exactMatch = communities[communityAddress];
  if (exactMatch) {
    return exactMatch;
  }

  const normalizedAddress = normalizeBoardAddress(communityAddress);
  return Object.entries(communities).find(([key, community]) => {
    const candidateAddress = typeof (community as CommunityLike)?.address === 'string' ? (community as CommunityLike)?.address : key;
    return normalizeBoardAddress(candidateAddress) === normalizedAddress;
  })?.[1];
};

const shallowEqual = (obj1: Record<string, any> | undefined, obj2: Record<string, any> | undefined): boolean => {
  if (obj1 === obj2) return true;
  if (!obj1 || !obj2) return obj1 === obj2;
  const keys1 = Object.keys(obj1);
  const keys2 = Object.keys(obj2);
  if (keys1.length !== keys2.length) return false;

  for (const key of keys1) {
    if (obj1[key] !== obj2[key]) return false;
  }

  return true;
};

/**
 * Ignore transient lifecycle props when deciding whether to update hook consumers.
 */
const isCommunityEqual = (prev: any, next: any): boolean => {
  if (prev === next) return true;
  if (!prev || !next) return prev === next;

  return (
    prev.address === next.address &&
    prev.title === next.title &&
    prev.shortAddress === next.shortAddress &&
    prev.createdAt === next.createdAt &&
    prev.updatedAt === next.updatedAt &&
    prev.description === next.description &&
    shallowEqual(prev.roles, next.roles)
  );
};

export const useStableCommunity = (communityAddress: string | undefined) => {
  const community = useCommunitiesStore((state) => {
    return getCommunityByAddress(state.communities, communityAddress) as Community | undefined;
  }, isCommunityEqual);

  return community;
};

export const useCommunityField = <T>(communityAddress: string | undefined, selector: (community: any) => T): T | undefined => {
  const field = useCommunitiesStore(
    (state) => {
      const community = getCommunityByAddress(state.communities, communityAddress);
      return community ? selector(community) : undefined;
    },
    (prev, next) => prev === next,
  );

  return field;
};
