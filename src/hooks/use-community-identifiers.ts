import { useMemo } from 'react';
import type { CommunityIdentifier } from '@bitsocial/bitsocial-react-hooks';
import { findDirectoryByAddress, type DirectoryCommunity, useDirectories } from './use-directories';
import { getDirectoryCandidateBoardByAddress } from '../lib/utils/directory-list-lookup-utils';
import { getSpecialBoardByAddress } from '../lib/special-boards';

const isLikelyCommunityName = (value: string) => value.includes('.');

const getCommunityIdentifier = (communityAddress: string | undefined, directories: DirectoryCommunity[]): CommunityIdentifier | undefined => {
  if (!communityAddress) {
    return undefined;
  }

  const specialBoard = getSpecialBoardByAddress(communityAddress);
  if (specialBoard) {
    return specialBoard.publicKey
      ? {
          name: specialBoard.address,
          publicKey: specialBoard.publicKey,
        }
      : {
          name: specialBoard.address,
        };
  }

  const directory = findDirectoryByAddress(directories, communityAddress);
  const directoryCandidate = getDirectoryCandidateBoardByAddress(communityAddress);
  const name = directory?.name ?? directory?.address ?? directoryCandidate?.address;
  const publicKey = directory?.publicKey ?? directoryCandidate?.publicKey;

  if (name && publicKey) {
    return {
      name,
      publicKey,
    };
  }
  if (publicKey) {
    return {
      publicKey,
    };
  }
  if (name) {
    return {
      name,
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
