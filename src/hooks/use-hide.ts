import { useCallback, useMemo } from 'react';
import { useAccount, useBlock } from '@bitsocial/bitsocial-react-hooks';
import type { Comment } from '@bitsocial/bitsocial-react-hooks';
import { accountsStore } from '../lib/bitsocial-internals/stores';
import useHiddenCatalogThreadsStore from '../stores/use-hidden-catalog-threads-store';

export type HiddenCidLookup = { [cid: string]: boolean | undefined };

type CommentWithCid = {
  cid?: string;
};

export const isCidHidden = (hiddenCids: HiddenCidLookup | undefined, cid?: string): boolean => Boolean(cid && hiddenCids?.[cid]);

export const filterHiddenComments = <T extends CommentWithCid>(comments: readonly T[], hiddenCids: HiddenCidLookup | undefined): T[] =>
  comments.filter((comment) => !isCidHidden(hiddenCids, comment?.cid));

export const useHiddenCids = (): HiddenCidLookup => {
  const account = useAccount();
  return useMemo(() => account?.blockedCids || {}, [account?.blockedCids]);
};

const shouldLogHideActionError = (cid: string, expectedHidden: boolean): boolean => {
  const { accounts, activeAccountId } = accountsStore.getState();
  if (!activeAccountId) {
    return true;
  }

  return Boolean(accounts?.[activeAccountId]?.blockedCids?.[cid]) !== expectedHidden;
};

const getCurrentAccountHiddenState = (cid: string): boolean => {
  const { accounts, activeAccountId } = accountsStore.getState();
  return Boolean(activeAccountId && accounts?.[activeAccountId]?.blockedCids?.[cid]);
};

const useHide = ({ cid, comment }: { cid: string; comment?: Comment }) => {
  const account = useAccount();
  const { error, errors, state } = useBlock({ cid: cid || undefined });
  const hidden = isCidHidden(account?.blockedCids, cid);
  const rememberHiddenComment = useHiddenCatalogThreadsStore((state) => state.rememberHiddenComment);
  const forgetHiddenComment = useHiddenCatalogThreadsStore((state) => state.forgetHiddenComment);

  const hide = useCallback(() => {
    if (!cid) {
      return;
    }

    if (getCurrentAccountHiddenState(cid)) {
      rememberHiddenComment(comment);
      return;
    }

    rememberHiddenComment(comment);
    void accountsStore
      .getState()
      .accountsActions.blockCid(cid)
      .catch((error: unknown) => {
        if (!getCurrentAccountHiddenState(cid)) {
          forgetHiddenComment(cid);
        }
        if (shouldLogHideActionError(cid, true)) {
          console.error('Failed to hide post', error);
        }
      });
  }, [cid, comment, forgetHiddenComment, rememberHiddenComment]);

  const unhide = useCallback(() => {
    if (!cid) {
      return;
    }

    forgetHiddenComment(cid);
    if (!getCurrentAccountHiddenState(cid)) {
      return;
    }

    void accountsStore
      .getState()
      .accountsActions.unblockCid(cid)
      .catch((error: unknown) => {
        if (shouldLogHideActionError(cid, false)) {
          console.error('Failed to unhide post', error);
        }
      });
  }, [cid, forgetHiddenComment]);

  return useMemo(() => ({ error, errors, hidden, hide, state, unhide }), [error, errors, hidden, hide, state, unhide]);
};

export default useHide;
