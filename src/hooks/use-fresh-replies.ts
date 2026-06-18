import { useMemo } from 'react';
import { Comment, useAccountComments } from '@bitsocial/bitsocial-react-hooks';
import { sortRepliesForDisplay } from '../lib/utils/replies-preview-utils';
import { getCommentCommunityAddress } from '../lib/utils/comment-utils';
import { normalizeBoardAddress } from '../lib/utils/directory-list-lookup-utils';

// Keep the hook on its indexed fast path when there are no reply indices to resolve.
const EMPTY_ACCOUNT_COMMENT_LOOKUP = { commentIndices: [-1] };

type UseFreshRepliesOptions = {
  post?: Comment;
};

const getString = (value: unknown): string | undefined => (typeof value === 'string' && value.length > 0 ? value : undefined);

const getThreadPostCid = (post: Comment | undefined): string | undefined => getString(post?.postCid) ?? getString(post?.cid);

const hasSameCommunityAddress = (a: string | undefined, b: string | undefined): boolean => {
  if (!a || !b) return a === b;
  return normalizeBoardAddress(a) === normalizeBoardAddress(b);
};

const isFreshReplyForOriginalReply = (reply: Comment, freshReply: Comment, post: Comment | undefined): boolean => {
  const replyCid = getString(reply?.cid);
  const freshReplyCid = getString(freshReply?.cid);
  if (replyCid && reply?.pendingApproval !== true && replyCid !== freshReplyCid) {
    return false;
  }

  const expectedPostCid = getString(reply?.postCid) ?? getThreadPostCid(post);
  if (expectedPostCid) {
    if (getString(freshReply?.postCid) !== expectedPostCid) {
      return false;
    }

    if (!getString(freshReply?.parentCid)) {
      return false;
    }
  }

  const expectedParentCid = getString(reply?.parentCid);
  if (expectedParentCid && getString(freshReply?.parentCid) !== expectedParentCid) {
    return false;
  }

  const expectedCommunityAddress = getCommentCommunityAddress(reply) ?? getCommentCommunityAddress(post);
  const freshCommunityAddress = getCommentCommunityAddress(freshReply);
  return hasSameCommunityAddress(expectedCommunityAddress, freshCommunityAddress);
};

const useFreshReplies = (replies: Comment[] = [], options: UseFreshRepliesOptions = {}) => {
  const { post } = options;
  const replyIndices = useMemo(
    () => Array.from(new Set(replies.map((reply) => reply?.index).filter((replyIndex): replyIndex is number => typeof replyIndex === 'number'))),
    [replies],
  );
  const replyCidsWithoutIndices = useMemo(
    () =>
      Array.from(
        new Set(
          replies
            .map((reply) => (typeof reply?.index === 'number' ? undefined : reply?.cid))
            .filter((replyCid): replyCid is string => typeof replyCid === 'string' && replyCid.length > 0),
        ),
      ),
    [replies],
  );
  const accountCommentLookupOptions = useMemo(() => (replyIndices.length > 0 ? { commentIndices: replyIndices } : EMPTY_ACCOUNT_COMMENT_LOOKUP), [replyIndices]);
  const accountCommentCidLookupOptions = useMemo(() => {
    if (replyCidsWithoutIndices.length === 0) {
      return EMPTY_ACCOUNT_COMMENT_LOOKUP;
    }

    const replyCidSet = new Set(replyCidsWithoutIndices);
    return {
      filter: (accountComment: Comment) => typeof accountComment?.cid === 'string' && replyCidSet.has(accountComment.cid),
    };
  }, [replyCidsWithoutIndices]);
  const { accountComments: accountCommentsByIndexList } = useAccountComments(accountCommentLookupOptions);
  const { accountComments: accountCommentsByCidList } = useAccountComments(accountCommentCidLookupOptions);

  return useMemo(() => {
    if (!replies.length) {
      return replies;
    }

    if (!accountCommentsByIndexList?.length && !accountCommentsByCidList?.length) {
      return sortRepliesForDisplay(replies);
    }

    const accountCommentsByIndex = new Map<number, Comment>();
    for (const accountComment of accountCommentsByIndexList) {
      if (typeof accountComment?.index === 'number') {
        accountCommentsByIndex.set(accountComment.index, accountComment);
      }
    }
    const accountCommentsByCidMap = new Map<string, Comment>();
    for (const accountComment of accountCommentsByCidList) {
      if (typeof accountComment?.cid === 'string') {
        accountCommentsByCidMap.set(accountComment.cid, accountComment);
      }
    }

    let hasFreshReplies = false;
    const nextReplies = replies.map((reply) => {
      if (typeof reply?.index !== 'number') {
        const freshReply = typeof reply?.cid === 'string' ? accountCommentsByCidMap.get(reply.cid) : undefined;
        if (!freshReply) {
          return reply;
        }

        hasFreshReplies = true;
        return freshReply;
      }

      const freshReply = accountCommentsByIndex.get(reply.index);
      if (!freshReply) {
        return reply;
      }

      if (!isFreshReplyForOriginalReply(reply, freshReply, post)) {
        return reply;
      }

      hasFreshReplies = true;
      return freshReply;
    });

    if (!hasFreshReplies) {
      return sortRepliesForDisplay(replies);
    }

    const seenReplyIndices = new Set<number>();
    let hasDuplicateReplyIndices = false;
    const dedupedReplies = nextReplies.filter((reply) => {
      if (typeof reply?.index !== 'number') {
        return true;
      }

      if (seenReplyIndices.has(reply.index)) {
        hasDuplicateReplyIndices = true;
        return false;
      }

      seenReplyIndices.add(reply.index);
      return true;
    });

    return sortRepliesForDisplay(hasDuplicateReplyIndices ? dedupedReplies : nextReplies);
  }, [accountCommentsByCidList, accountCommentsByIndexList, post, replies]);
};

export default useFreshReplies;
