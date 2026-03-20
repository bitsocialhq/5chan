import { useMemo } from 'react';
import { Comment, useAccountComments } from '@bitsocialnet/bitsocial-react-hooks';

// Keep the hook on its indexed fast path when there are no reply indices to resolve.
const EMPTY_ACCOUNT_COMMENT_LOOKUP = { commentIndices: [-1] };

const useFreshReplies = (replies: Comment[] = []) => {
  const replyIndices = useMemo(
    () => Array.from(new Set(replies.map((reply) => reply?.index).filter((replyIndex): replyIndex is number => typeof replyIndex === 'number'))),
    [replies],
  );
  const accountCommentLookupOptions = useMemo(() => (replyIndices.length > 0 ? { commentIndices: replyIndices } : EMPTY_ACCOUNT_COMMENT_LOOKUP), [replyIndices]);
  const { accountComments } = useAccountComments(accountCommentLookupOptions);

  return useMemo(() => {
    if (!replies.length || !accountComments?.length) {
      return replies;
    }

    const accountCommentsByIndex = new Map<number, Comment>();
    for (const accountComment of accountComments) {
      if (typeof accountComment?.index === 'number') {
        accountCommentsByIndex.set(accountComment.index, accountComment);
      }
    }

    let hasFreshReplies = false;
    const nextReplies = replies.map((reply) => {
      if (typeof reply?.index !== 'number') {
        return reply;
      }

      const freshReply = accountCommentsByIndex.get(reply.index);
      if (!freshReply) {
        return reply;
      }

      hasFreshReplies = true;
      return freshReply;
    });

    return hasFreshReplies ? nextReplies : replies;
  }, [accountComments, replies]);
};

export default useFreshReplies;
