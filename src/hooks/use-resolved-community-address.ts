import { useMemo } from 'react';
import { useParams } from 'react-router-dom';
import type { CommunitySyncState } from '@bitsocial/bitsocial-react-hooks';
import { normalizeBoardAddress, useDirectories } from './use-directories';
import { getDirectoryCodeForBoardAddress, pickDirectoryWinner, useDirectoryList, type DirectoryListBoard } from './use-directory-list';
import useCommunityOfflineStore from '../stores/use-community-offline-store';
import { areSameBoardAddress, getCommunityAddress, getBoardPath, isDirectoryRoute } from '../lib/utils/route-utils';
import { isCommunityKnownOffline } from '../lib/utils/community-freshness-utils';
import { communitiesStore as useCommunitiesStore } from '../lib/bitsocial-internals/stores';
import { useNowSeconds } from './use-now-seconds';

interface ResolvedDirectoryBoardPath {
  boardPath: string | undefined;
  isDirectoryCandidate: boolean;
}

type StoredCommunities = Record<string, { address?: string; name?: string; publicKey?: string } | undefined>;
type CommunitySyncStatuses = Record<string, { syncState: CommunitySyncState } | undefined>;

const getCommunitySyncState = (
  communities: StoredCommunities | undefined,
  syncStatuses: CommunitySyncStatuses | undefined,
  communityAddress: string,
  communityPublicKey?: string,
): CommunitySyncState | undefined => {
  const directSyncStatus = (communityPublicKey && syncStatuses?.[communityPublicKey]) || syncStatuses?.[communityAddress];
  if (directSyncStatus) {
    return directSyncStatus.syncState;
  }

  const normalizedAddress = normalizeBoardAddress(communityAddress);
  const matchingKey = Object.entries(communities || {}).find(([key, community]) => {
    const storedIdentifiers = [key, community?.address, community?.name, community?.publicKey];
    return storedIdentifiers.some((identifier) => identifier && normalizeBoardAddress(identifier) === normalizedAddress);
  })?.[0];

  return matchingKey ? syncStatuses?.[matchingKey]?.syncState : undefined;
};

/**
 * Resolve a board identifier to its canonical community address.
 *
 * For directory codes (e.g. /biz) with a per-directory list of candidates, picks the
 * highest-ranked candidate that is not currently flagged offline. Falls back to the
 * vendored directory list while the remote list is still loading.
 */
export const useResolvedCommunityAddress = (boardIdentifierOverride?: string): string | undefined => {
  const params = useParams<{ boardIdentifier?: string }>();
  const directories = useDirectories();
  const boardIdentifier = boardIdentifierOverride ?? params.boardIdentifier;
  const isCode = !!boardIdentifier && isDirectoryRoute(boardIdentifier, directories);
  const { list } = useDirectoryList(isCode ? boardIdentifier : undefined);
  const offlineStates = useCommunityOfflineStore((state) => (isCode ? state.communityOfflineState : undefined));
  const communities = useCommunitiesStore((state) => (isCode ? state.communities : undefined));
  const syncStatuses = useCommunitiesStore((state) => (isCode ? state.syncStatuses : undefined));
  const nowSeconds = useNowSeconds(isCode);

  return useMemo(() => {
    if (!boardIdentifier) return undefined;
    if (isCode && list && list.boards.length > 0) {
      const isOffline = (board: DirectoryListBoard) =>
        isCommunityKnownOffline(
          {
            ...offlineStates?.[board.address],
            syncState: getCommunitySyncState(communities, syncStatuses, board.address, board.publicKey),
          },
          nowSeconds,
        );
      const winner = pickDirectoryWinner(list.boards, isOffline);
      if (winner) return winner.address;
    }
    return getCommunityAddress(boardIdentifier, directories);
  }, [boardIdentifier, communities, directories, isCode, list, offlineStates, nowSeconds, syncStatuses]);
};

/**
 * Return the directory code only when a direct board-address route points at the
 * board currently winning that directory.
 */
export const useResolvedDirectoryBoardPath = (boardIdentifier: string | undefined): ResolvedDirectoryBoardPath => {
  const directories = useDirectories();
  const isCode = !!boardIdentifier && isDirectoryRoute(boardIdentifier, directories);
  const directoryCode = useMemo(() => (boardIdentifier && !isCode ? getDirectoryCodeForBoardAddress(boardIdentifier) : undefined), [boardIdentifier, isCode]);
  const { list } = useDirectoryList(directoryCode);
  const offlineStates = useCommunityOfflineStore((state) => (directoryCode ? state.communityOfflineState : undefined));
  const communities = useCommunitiesStore((state) => (directoryCode ? state.communities : undefined));
  const syncStatuses = useCommunitiesStore((state) => (directoryCode ? state.syncStatuses : undefined));
  const nowSeconds = useNowSeconds(!!directoryCode);

  return useMemo(() => {
    if (!boardIdentifier || !directoryCode) {
      return { boardPath: undefined, isDirectoryCandidate: false };
    }

    if (!list || list.boards.length === 0) {
      return { boardPath: undefined, isDirectoryCandidate: true };
    }

    const isOffline = (board: DirectoryListBoard) =>
      isCommunityKnownOffline(
        {
          ...offlineStates?.[board.address],
          syncState: getCommunitySyncState(communities, syncStatuses, board.address, board.publicKey),
        },
        nowSeconds,
      );
    const winner = pickDirectoryWinner(list.boards, isOffline);

    return {
      boardPath: winner && areSameBoardAddress(winner.address, boardIdentifier) ? directoryCode : undefined,
      isDirectoryCandidate: true,
    };
  }, [boardIdentifier, communities, directoryCode, list, offlineStates, nowSeconds, syncStatuses]);
};

/**
 * Resolve a community address to board path (directory code or address) for links.
 */
export const useBoardPath = (communityAddress: string | undefined): string | undefined => {
  const directories = useDirectories();

  return useMemo(() => {
    if (!communityAddress) {
      return undefined;
    }

    return getBoardPath(communityAddress, directories);
  }, [communityAddress, directories]);
};
