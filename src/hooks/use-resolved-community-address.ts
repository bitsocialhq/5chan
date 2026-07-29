import { useCallback, useMemo, useSyncExternalStore } from 'react';
import { useParams } from 'react-router-dom';
import type { CommunitySyncState } from '@bitsocial/bitsocial-react-hooks';
import { normalizeBoardAddress, useDirectories } from './use-directories';
import { getDirectoryCodeForBoardAddress, pickDirectoryWinner, useDirectoryList, type DirectoryListBoard } from './use-directory-list';
import useCommunityOfflineStore from '../stores/use-community-offline-store';
import { areSameBoardAddress, getCommunityAddress, getBoardPath, isDirectoryRoute } from '../lib/utils/route-utils';
import { isCommunityKnownOffline, type CommunityFreshnessState } from '../lib/utils/community-freshness-utils';
import { communitiesStore as useCommunitiesStore } from '../lib/bitsocial-internals/stores';
import { getDirectoryCandidateBoardByAddress } from '../lib/utils/directory-list-lookup-utils';
import { useNowSeconds } from './use-now-seconds';

interface ResolvedDirectoryBoardPath {
  boardPath: string | undefined;
  isDirectoryCandidate: boolean;
}

interface StoredCommunity {
  address?: string;
  name?: string;
  publicKey?: string;
  state?: string;
  updatedAt?: number;
}

type StoredCommunities = Record<string, StoredCommunity | undefined>;
type CommunitySyncStatuses = Record<string, { syncState: CommunitySyncState } | undefined>;

interface CommunityLifecycleState {
  state?: string;
  syncState?: CommunitySyncState;
  updatedAt?: number;
}

const getCommunityLifecycleState = (
  communities: StoredCommunities | undefined,
  syncStatuses: CommunitySyncStatuses | undefined,
  communityAddress: string,
  communityPublicKey?: string,
): CommunityLifecycleState => {
  const directSyncStatus = (communityPublicKey && syncStatuses?.[communityPublicKey]) || syncStatuses?.[communityAddress];
  let syncState = directSyncStatus?.syncState;
  let matchedCommunity: StoredCommunity | undefined;
  const normalizedAddress = normalizeBoardAddress(communityAddress);

  for (const [key, community] of Object.entries(communities || {})) {
    const storedIdentifiers = [key, community?.address, community?.name, community?.publicKey];
    const matchesCommunity =
      (communityPublicKey && storedIdentifiers.includes(communityPublicKey)) ||
      storedIdentifiers.some((identifier) => identifier && normalizeBoardAddress(identifier) === normalizedAddress);
    if (!matchesCommunity) continue;

    if (
      community &&
      (!matchedCommunity || (community.updatedAt !== undefined && (matchedCommunity.updatedAt === undefined || community.updatedAt > matchedCommunity.updatedAt)))
    ) {
      matchedCommunity = community;
    }

    if (!syncState) {
      for (const identifier of storedIdentifiers) {
        if (identifier && syncStatuses?.[identifier]) {
          syncState = syncStatuses[identifier]?.syncState;
          break;
        }
      }
    }
  }

  return {
    state: matchedCommunity?.state,
    syncState,
    updatedAt: matchedCommunity?.updatedAt,
  };
};

const getDirectoryBoardLifecycleState = (
  communities: StoredCommunities | undefined,
  syncStatuses: CommunitySyncStatuses | undefined,
  board: DirectoryListBoard,
): CommunityLifecycleState => {
  const publicKey = board.publicKey ?? getDirectoryCandidateBoardByAddress(board.address)?.publicKey;
  return getCommunityLifecycleState(communities, syncStatuses, board.address, publicKey);
};

const getDirectoryBoardFreshnessState = (
  communities: StoredCommunities | undefined,
  syncStatuses: CommunitySyncStatuses | undefined,
  offlineState: CommunityFreshnessState | undefined,
  board: DirectoryListBoard,
): CommunityFreshnessState => {
  const lifecycleState = getDirectoryBoardLifecycleState(communities, syncStatuses, board);
  const updatedAts = [lifecycleState.updatedAt, offlineState?.updatedAt].filter((updatedAt): updatedAt is number => updatedAt !== undefined);

  return {
    state: lifecycleState.state === 'failed' || offlineState?.state === 'failed' ? 'failed' : (lifecycleState.state ?? offlineState?.state),
    syncState: lifecycleState.syncState,
    updatedAt: updatedAts.length > 0 ? Math.max(...updatedAts) : undefined,
  };
};

/**
 * Subscribe to the two lifecycle stores while exposing only the winning board address to React.
 * Both stores publish high-frequency sync progress updates, but a directory route only needs to
 * rerender when those updates actually change its winner.
 */
const useDirectoryWinnerAddress = (boards: DirectoryListBoard[] | undefined, enabled: boolean, nowSeconds: number): string | undefined => {
  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      if (!enabled) {
        return () => undefined;
      }

      const unsubscribeCommunities = useCommunitiesStore.subscribe(onStoreChange);
      const unsubscribeOfflineStates = useCommunityOfflineStore.subscribe(onStoreChange);
      return () => {
        unsubscribeCommunities();
        unsubscribeOfflineStates();
      };
    },
    [enabled],
  );

  const getSnapshot = useCallback(() => {
    if (!enabled || !boards?.length) {
      return undefined;
    }

    const { communities, syncStatuses } = useCommunitiesStore.getState() as {
      communities?: StoredCommunities;
      syncStatuses?: CommunitySyncStatuses;
    };
    const offlineStates = useCommunityOfflineStore.getState().communityOfflineState;
    const winner = pickDirectoryWinner(boards, (board) =>
      isCommunityKnownOffline(getDirectoryBoardFreshnessState(communities, syncStatuses, offlineStates?.[board.address], board), nowSeconds),
    );

    return winner?.address;
  }, [boards, enabled, nowSeconds]);

  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
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
  const nowSeconds = useNowSeconds(isCode);
  const winnerAddress = useDirectoryWinnerAddress(list?.boards, isCode, nowSeconds);

  return useMemo(() => {
    if (!boardIdentifier) return undefined;
    if (isCode && winnerAddress) {
      return winnerAddress;
    }
    return getCommunityAddress(boardIdentifier, directories);
  }, [boardIdentifier, directories, isCode, winnerAddress]);
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
  const nowSeconds = useNowSeconds(!!directoryCode);
  const winnerAddress = useDirectoryWinnerAddress(list?.boards, !!directoryCode, nowSeconds);

  return useMemo(() => {
    if (!boardIdentifier || !directoryCode) {
      return { boardPath: undefined, isDirectoryCandidate: false };
    }

    if (!list || list.boards.length === 0) {
      return { boardPath: undefined, isDirectoryCandidate: true };
    }

    return {
      boardPath: winnerAddress && areSameBoardAddress(winnerAddress, boardIdentifier) ? directoryCode : undefined,
      isDirectoryCandidate: true,
    };
  }, [boardIdentifier, directoryCode, list, winnerAddress]);
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
