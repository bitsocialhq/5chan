import { useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useDirectories } from './use-directories';
import { pickDirectoryWinner, useDirectoryList } from './use-directory-list';
import useCommunityOfflineStore from '../stores/use-community-offline-store';
import { getCommunityAddress, getBoardPath, isDirectoryRoute } from '../lib/utils/route-utils';
import { isCommunityKnownOffline } from '../lib/utils/community-freshness-utils';
import { useNowSeconds } from './use-now-seconds';

/**
 * Resolve a board identifier from URL params to canonical community address.
 *
 * For directory codes (e.g. /biz) with a per-directory list of candidates, picks the
 * highest-ranked candidate that is not currently flagged offline. Falls back to the
 * vendored single-candidate default while the per-directory list is still loading.
 */
export const useResolvedCommunityAddress = (): string | undefined => {
  const params = useParams<{ boardIdentifier?: string }>();
  const directories = useDirectories();
  const boardIdentifier = params.boardIdentifier;
  const isCode = !!boardIdentifier && isDirectoryRoute(boardIdentifier, directories);
  const { list } = useDirectoryList(isCode ? boardIdentifier : undefined);
  const offlineStates = useCommunityOfflineStore((state) => (isCode ? state.communityOfflineState : undefined));
  const nowSeconds = useNowSeconds(isCode);

  return useMemo(() => {
    if (!boardIdentifier) return undefined;
    if (isCode && list && list.boards.length > 0) {
      const isOffline = (address: string) => isCommunityKnownOffline(offlineStates?.[address], nowSeconds);
      const winner = pickDirectoryWinner(list.boards, isOffline);
      if (winner) return winner.address;
    }
    return getCommunityAddress(boardIdentifier, directories);
  }, [boardIdentifier, directories, isCode, list, offlineStates, nowSeconds]);
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
