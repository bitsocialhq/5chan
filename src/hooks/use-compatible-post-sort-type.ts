import { useMemo } from 'react';
import { getAvailablePostSortTypes, type Community, type CommunityIdentifier, useCommunities } from '@bitsocial/bitsocial-react-hooks';

export const getCompatiblePostSortType = (communities: Array<Community | undefined>, preferredSortType: string): string | undefined => {
  if (communities.length === 0 || communities.some((community) => !community)) {
    return undefined;
  }

  return communities.every((community) => getAvailablePostSortTypes(community).includes(preferredSortType)) ? preferredSortType : undefined;
};

export const useCompatiblePostSortType = (communityIdentifiers: CommunityIdentifier[], preferredSortType: string): string | undefined => {
  const { communities } = useCommunities({ communities: communityIdentifiers });

  return useMemo(() => getCompatiblePostSortType(communities, preferredSortType), [communities, preferredSortType]);
};
