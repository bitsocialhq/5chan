import type { Comment } from '@bitsocial/bitsocial-react-hooks';
import { getCommentCommunityAddress } from './comment-utils';
import { isPendingApprovalRejected } from './pending-approval-moderation';
import { areSameBoardAddress } from './route-utils';
import { getThreadTopNavigationState } from './thread-scroll-utils';

type ModQueueCommentLike = {
  approved?: boolean;
  author?: Comment['author'];
  cid?: string;
  commentModeration?: Comment['commentModeration'];
  communityAddress?: string;
  content?: Comment['content'];
  deleted?: Comment['deleted'];
  link?: Comment['link'];
  linkHeight?: Comment['linkHeight'];
  linkWidth?: Comment['linkWidth'];
  number?: Comment['number'];
  parentCid?: Comment['parentCid'];
  pendingApproval?: boolean;
  postCid?: Comment['postCid'];
  reason?: Comment['reason'];
  removed?: boolean;
  replyCount?: Comment['replyCount'];
  threadCid?: Comment['threadCid'];
  thumbnailUrl?: Comment['thumbnailUrl'];
  timestamp?: Comment['timestamp'];
  title?: Comment['title'];
};

const emptyDismissedCommentCids = new Set<string>();

export type QueuedCommentRouteState = {
  scrollThreadContainerCid?: string;
  queuedComment?: QueuedCommentSnapshot;
};

export type QueuedCommentSnapshot = {
  approved?: Comment['approved'];
  author?: Comment['author'];
  cid?: Comment['cid'];
  commentModeration?: Comment['commentModeration'];
  communityAddress?: string;
  content?: Comment['content'];
  deleted?: Comment['deleted'];
  link?: Comment['link'];
  linkHeight?: Comment['linkHeight'];
  linkWidth?: Comment['linkWidth'];
  number?: Comment['number'];
  parentCid?: Comment['parentCid'];
  pendingApproval?: Comment['pendingApproval'];
  postCid?: Comment['postCid'];
  reason?: Comment['reason'];
  removed?: Comment['removed'];
  replyCount?: Comment['replyCount'];
  threadCid?: Comment['threadCid'];
  thumbnailUrl?: Comment['thumbnailUrl'];
  timestamp?: Comment['timestamp'];
  title?: Comment['title'];
};

export const getModQueueCommentRoute = (boardPath: string | undefined, commentCid: string | undefined): string | undefined =>
  boardPath && commentCid ? `/${boardPath}/thread/${commentCid}` : undefined;

export const getQueuedCommentSnapshot = (comment: ModQueueCommentLike | undefined): QueuedCommentSnapshot | undefined => {
  if (!comment?.cid) {
    return undefined;
  }

  return {
    approved: comment.approved,
    author: comment.author,
    cid: comment.cid,
    commentModeration: comment.commentModeration,
    communityAddress: getCommentCommunityAddress(comment),
    content: comment.content,
    deleted: comment.deleted,
    link: comment.link,
    linkHeight: comment.linkHeight,
    linkWidth: comment.linkWidth,
    number: comment.number,
    parentCid: comment.parentCid,
    pendingApproval: comment.pendingApproval,
    postCid: comment.postCid,
    reason: comment.reason,
    removed: comment.removed,
    replyCount: comment.replyCount,
    threadCid: comment.threadCid,
    thumbnailUrl: comment.thumbnailUrl,
    timestamp: comment.timestamp,
    title: comment.title,
  };
};

export const getQueuedCommentRouteState = (comment: ModQueueCommentLike | undefined): QueuedCommentRouteState | undefined => {
  const queuedComment = getQueuedCommentSnapshot(comment);
  if (!queuedComment) {
    return undefined;
  }

  return {
    ...(queuedComment.parentCid ? {} : getThreadTopNavigationState(queuedComment.cid)),
    queuedComment,
  };
};

export const shouldKeepQueuedCommentHistory = (comment: ModQueueCommentLike | undefined): boolean => comment?.approved === true || isPendingApprovalRejected(comment);

export const getVisibleQueuedCommentHistory = <T extends ModQueueCommentLike>(
  feed: readonly ModQueueCommentLike[],
  queuedCommentHistory: readonly T[],
  communityAddresses: readonly string[],
): T[] => {
  const liveCids = feed.reduce<Set<string>>((cids, comment) => {
    if (comment.cid) cids.add(comment.cid);
    return cids;
  }, new Set());

  return queuedCommentHistory.filter((comment) => {
    const commentCommunityAddress = getCommentCommunityAddress(comment);
    if (!comment.cid || !shouldKeepQueuedCommentHistory(comment) || liveCids.has(comment.cid) || !commentCommunityAddress) {
      return false;
    }
    return communityAddresses.some((communityAddress) => areSameBoardAddress(communityAddress, commentCommunityAddress));
  });
};

export const filterVisibleModQueueFeed = <T extends ModQueueCommentLike>(
  feed: T[],
  selectedBoardFilter: string | null,
  dismissedCommentCids: ReadonlySet<string> = emptyDismissedCommentCids,
): T[] =>
  feed.filter((comment) => {
    if (comment.cid && dismissedCommentCids.has(comment.cid)) {
      return false;
    }

    if (!selectedBoardFilter) {
      return true;
    }

    return getCommentCommunityAddress(comment) === selectedBoardFilter;
  });
