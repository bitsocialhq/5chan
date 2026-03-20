import { useMemo } from 'react';
import { useAccount, useAccountComment } from '@bitsocialnet/bitsocial-react-hooks';

type SafeAccountCommentOptions = {
  accountName?: string;
  commentCid?: string;
  commentIndex?: number | string;
};

const EMPTY_ACCOUNT_COMMENT_LOOKUP = Object.freeze({ commentIndex: -1 as const });

const normalizeCommentIndex = (commentIndex: SafeAccountCommentOptions['commentIndex']) => {
  if (commentIndex === undefined || commentIndex === null || commentIndex === '') {
    return undefined;
  }

  const normalizedCommentIndex = Number(commentIndex);

  return Number.isInteger(normalizedCommentIndex) && normalizedCommentIndex >= 0 ? normalizedCommentIndex : undefined;
};

const useSafeAccountComment = (options?: SafeAccountCommentOptions) => {
  const account = useAccount(options?.accountName ? { accountName: options.accountName } : undefined);
  const normalizedCommentIndex = normalizeCommentIndex(options?.commentIndex);

  const safeOptions = useMemo(() => {
    if (typeof normalizedCommentIndex === 'number') {
      return {
        ...(options?.accountName ? { accountName: options.accountName } : {}),
        commentIndex: normalizedCommentIndex,
      };
    }

    if (options?.commentCid && account?.id) {
      return {
        ...(options?.accountName ? { accountName: options.accountName } : {}),
        commentCid: options.commentCid,
      };
    }

    return EMPTY_ACCOUNT_COMMENT_LOOKUP;
  }, [account?.id, normalizedCommentIndex, options?.accountName, options?.commentCid]);

  return useAccountComment(safeOptions);
};

export default useSafeAccountComment;
