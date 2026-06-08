import { useMemo } from 'react';
import { Comment, useAccountComments } from '@bitsocial/bitsocial-react-hooks';
import { getCommentCommunityAddress } from '../lib/utils/comment-utils';

// Bound the account-comment lookup to recently published replies; propagation lag is seconds to
// minutes, so an hour is plenty while keeping the scanned set small. Matches the board/catalog feeds.
const RECENT_ACCOUNT_COMMENT_WINDOW_SECONDS = 60 * 60;
// Keep useAccountComments on its indexed fast path (and returning nothing) when there's no thread yet.
const EMPTY_ACCOUNT_COMMENT_LOOKUP = { commentIndices: [-1] };

/**
 * The protocol's `post.replyCount` only changes once a freshly published reply propagates back
 * through the community, which can take seconds to minutes. Until then the thread itself already
 * shows the reply (`useReplies` appends fresh account comments), so the stats count looks stale —
 * a thread with 1 reply still reads "1" right after you successfully publish your own reply.
 *
 * This hook returns `replyCount` plus the account's own replies in this thread that have been
 * published but aren't yet folded into `replyCount`. The optimistic bump is dropped automatically
 * once the post refreshes past the reply (`updatedAt > timestamp`), at which point the propagated
 * copy — same cid — is already counted, so we never double-count. Returns `undefined` while
 * `replyCount` is still loading so callers can keep rendering their placeholder.
 */
const useOptimisticReplyCount = (post: Comment | undefined): number | undefined => {
  const replyCount: number | undefined = typeof post?.replyCount === 'number' ? post.replyCount : undefined;
  const postCid: string | undefined = post?.cid;
  const postUpdatedAt: number | undefined = typeof post?.updatedAt === 'number' ? post.updatedAt : undefined;
  const communityAddress = getCommentCommunityAddress(post);

  const accountCommentsLookup = useMemo(
    () => (communityAddress ? { communityAddress, newerThan: RECENT_ACCOUNT_COMMENT_WINDOW_SECONDS, sortType: 'old' as const } : EMPTY_ACCOUNT_COMMENT_LOOKUP),
    [communityAddress],
  );
  const { accountComments } = useAccountComments(accountCommentsLookup);

  return useMemo(() => {
    if (replyCount === undefined || !postCid || !accountComments?.length) {
      return replyCount;
    }

    let pendingReplyCount = 0;
    for (const accountComment of accountComments) {
      const { cid, deleted, parentCid, postCid: replyPostCid, removed, state, timestamp } = accountComment || {};
      // A successfully published reply in this thread, excluding the OP itself (its postCid === its cid).
      if (replyPostCid !== postCid || !parentCid || !cid || cid === postCid) {
        continue;
      }
      if (deleted || removed || state !== 'succeeded') {
        continue;
      }
      // Once the post has refreshed past the reply, its propagated copy is already in replyCount.
      if (postUpdatedAt !== undefined && typeof timestamp === 'number' && postUpdatedAt > timestamp) {
        continue;
      }
      pendingReplyCount += 1;
    }

    return replyCount + pendingReplyCount;
  }, [accountComments, postCid, postUpdatedAt, replyCount]);
};

export default useOptimisticReplyCount;
