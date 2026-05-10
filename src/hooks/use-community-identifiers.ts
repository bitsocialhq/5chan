import { useMemo } from 'react';
import type { CommunityIdentifier } from '@bitsocial/bitsocial-react-hooks';
import { findDirectoryByAddress, type DirectoryCommunity, useDirectories } from './use-directories';

const isLikelyCommunityName = (value: string) => value.includes('.');

const getCommunityIdentifier = (communityAddress: string | undefined, directories: DirectoryCommunity[]): CommunityIdentifier | undefined => {
  if (!communityAddress) {
    return undefined;
  }

  const directory = findDirectoryByAddress(directories, communityAddress);
  if (directory?.name && directory.publicKey) {
    return {
      name: directory.name,
      publicKey: directory.publicKey,
    };
  }
  if (directory?.publicKey) {
    return {
      publicKey: directory.publicKey,
    };
  }
  if (directory?.name) {
    return {
      name: directory.name,
    };
  }

  return isLikelyCommunityName(communityAddress)
    ? {
        name: communityAddress,
      }
    : {
        publicKey: communityAddress,
      };
};

const getCommunityIdentifiers = (communityAddresses: Array<string | undefined>, directories: DirectoryCommunity[]): CommunityIdentifier[] =>
  communityAddresses.flatMap((communityAddress) => {
    const community = getCommunityIdentifier(communityAddress, directories);
    return community ? [community] : [];
  });

export const useCommunityIdentifier = (communityAddress: string | undefined): CommunityIdentifier | undefined => {
  const directories = useDirectories();

  return useMemo(() => getCommunityIdentifier(communityAddress, directories), [communityAddress, directories]);
};

export const useCommunityIdentifiers = (communityAddresses?: Array<string | undefined>): CommunityIdentifier[] => {
  const directories = useDirectories();

  return useMemo(() => getCommunityIdentifiers(communityAddresses ?? [], directories), [communityAddresses, directories]);
};
