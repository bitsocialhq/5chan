import { useEffect, useMemo, useRef } from 'react';
import { useAccount, type Comment } from '@bitsocial/bitsocial-react-hooks';
import { accountsStore, communitiesStore, communitiesPagesStore } from '../lib/bitsocial-internals/stores';
import { getCommentCommunityAddress } from '../lib/utils/comment-utils';
import { isCommentArchived } from '../lib/utils/comment-moderation-utils';
import { getRawBoardThreadState } from '../lib/utils/raw-board-thread-state';
import { useDirectories } from './use-directories';
import { getBoardAddressKeys, isBoardAddressInScope } from './use-hidden-catalog-threads';

type UsePruneHiddenCatalogThreadsOptions = {
  enabled: boolean;
  hiddenThreadCandidates: readonly Comment[];
  communityAddress: string | undefined;
  sortType: 'active' | 'new';
};

const EMPTY_RAW_BOARD_THREAD_STATE = getRawBoardThreadState({
  accountId: undefined,
  communitiesPages: {},
  community: undefined,
  sortType: 'active',
});

const usePruneHiddenCatalogThreads = ({ enabled, hiddenThreadCandidates, communityAddress, sortType }: UsePruneHiddenCatalogThreadsOptions) => {
  const account = useAccount();
  const directories = useDirectories();
  const community = communitiesStore((state) => (communityAddress ? state.communities[communityAddress] : undefined));
  const communitiesPages = communitiesPagesStore((state) => state.communitiesPages);
  const pendingPruneCidsRef = useRef(new Set<string>());
  const boardAddressKeys = useMemo(() => (enabled ? getBoardAddressKeys(communityAddress, directories) : new Set<string>()), [communityAddress, directories, enabled]);
  const rawBoardCatalogState = useMemo(
    () =>
      enabled
        ? getRawBoardThreadState({
            accountId: account?.id,
            communitiesPages,
            community,
            sortType,
          })
        : EMPTY_RAW_BOARD_THREAD_STATE,
    [account?.id, communitiesPages, community, enabled, sortType],
  );

  const removedHiddenThreadCids = useMemo(() => {
    if (!enabled || boardAddressKeys.size === 0 || !rawBoardCatalogState.isFullyLoaded) {
      return [];
    }

    return hiddenThreadCandidates
      .filter((comment) => {
        const cid = comment?.cid;
        return (
          cid &&
          !isCommentArchived(comment) &&
          isBoardAddressInScope(getCommentCommunityAddress(comment), boardAddressKeys, directories) &&
          !rawBoardCatalogState.rootThreadCids.has(cid)
        );
      })
      .map((comment) => comment.cid)
      .filter((cid): cid is string => typeof cid === 'string')
      .sort();
  }, [boardAddressKeys, directories, enabled, hiddenThreadCandidates, rawBoardCatalogState]);

  useEffect(() => {
    if (!enabled || removedHiddenThreadCids.length === 0) {
      return;
    }

    for (const cid of removedHiddenThreadCids) {
      if (pendingPruneCidsRef.current.has(cid)) {
        continue;
      }

      pendingPruneCidsRef.current.add(cid);
      void accountsStore
        .getState()
        .accountsActions.unblockCid(cid)
        .catch((error: unknown) => {
          const { accounts, activeAccountId } = accountsStore.getState();
          if (activeAccountId && accounts?.[activeAccountId]?.blockedCids?.[cid]) {
            console.error('Failed to remove stale hidden thread from account', error);
          }
        })
        .finally(() => {
          pendingPruneCidsRef.current.delete(cid);
        });
    }
  }, [enabled, removedHiddenThreadCids]);
};

export default usePruneHiddenCatalogThreads;
