import type { Comment } from '@bitsocial/bitsocial-react-hooks';
import type { DirectoryCommunity } from '../../hooks/use-directories';
import { getCommentCommunityAddress } from './comment-utils';
import { hasModQueueAccessRole } from './mod-access';
import { isPendingApprovalRejected } from './pending-approval-moderation';
import { areSameBoardAddress, getBoardPath } from './route-utils';
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

export interface ModQueueBoardFilterGroup {
  addresses: string[];
  boardPath: string;
  filterKey: string;
  isDirectory: boolean;
}

interface ModQueueCommunityRoleSource {
  roles?: Record<string, { role?: string } | undefined>;
}

export const getModQueueCommentRoute = (boardPath: string | undefined, commentCid: string | undefined): string | undefined =>
  boardPath && commentCid ? `/${boardPath}/thread/${commentCid}` : undefined;

export const getModQueueBoardFilterKey = (communityAddress: string, directories: DirectoryCommunity[]): string => {
  const boardPath = getBoardPath(communityAddress, directories);
  return boardPath !== communityAddress ? boardPath : communityAddress;
};

const addUniqueBoardAddress = (addresses: string[], address: string) => {
  if (!addresses.some((existingAddress) => areSameBoardAddress(existingAddress, address))) {
    addresses.push(address);
  }
};

export const getModQueueBoardFilterGroups = (
  accountCommunityAddresses: readonly string[],
  directories: DirectoryCommunity[],
  boardCodeGroups: readonly (readonly string[])[],
): ModQueueBoardFilterGroup[] => {
  const groupsByFilterKey = new Map<string, ModQueueBoardFilterGroup>();
  const filterKeyByAddress = new Map<string, string>();

  for (const address of accountCommunityAddresses) {
    const boardPath = getBoardPath(address, directories);
    const filterKey = boardPath !== address ? boardPath : address;
    const existingGroup = groupsByFilterKey.get(filterKey);
    if (existingGroup) {
      addUniqueBoardAddress(existingGroup.addresses, address);
    } else {
      groupsByFilterKey.set(filterKey, {
        addresses: [address],
        boardPath,
        filterKey,
        isDirectory: boardPath !== address,
      });
    }
    filterKeyByAddress.set(address, filterKey);
  }

  const orderedGroups: ModQueueBoardFilterGroup[] = [];
  const seenFilterKeys = new Set<string>();
  const addGroup = (filterKey: string | undefined) => {
    if (!filterKey || seenFilterKeys.has(filterKey)) {
      return;
    }
    const group = groupsByFilterKey.get(filterKey);
    if (!group) {
      return;
    }
    orderedGroups.push(group);
    seenFilterKeys.add(filterKey);
  };

  for (const group of boardCodeGroups) {
    for (const code of group) {
      addGroup(code);
    }
  }

  for (const address of accountCommunityAddresses) {
    addGroup(filterKeyByAddress.get(address));
  }

  return orderedGroups;
};

export const getModQueueSelectedBoardAddresses = (
  communityAddresses: readonly string[],
  selectedBoardFilter: string | null,
  directories: DirectoryCommunity[],
): string[] | null => {
  if (!selectedBoardFilter) {
    return null;
  }

  const selectedFilterKey = getModQueueBoardFilterKey(selectedBoardFilter, directories);
  const selectedAddresses = communityAddresses.filter((address) => {
    if (areSameBoardAddress(address, selectedBoardFilter)) {
      return true;
    }
    return getModQueueBoardFilterKey(address, directories) === selectedFilterKey;
  });

  return selectedAddresses.length > 0 ? selectedAddresses : [selectedBoardFilter];
};

export const getModeratedCommunityAddresses = ({
  accountAddress,
  accountCommunityAddresses,
  candidateCommunityAddresses,
  communities,
}: {
  accountAddress: string | undefined;
  accountCommunityAddresses: readonly string[];
  candidateCommunityAddresses: readonly string[];
  communities: readonly (ModQueueCommunityRoleSource | undefined)[];
}): string[] => {
  const moderatedAddresses = [...accountCommunityAddresses];

  if (!accountAddress) {
    return moderatedAddresses;
  }

  candidateCommunityAddresses.forEach((candidateAddress, index) => {
    const role = communities[index]?.roles?.[accountAddress]?.role;
    if (hasModQueueAccessRole(role)) {
      addUniqueBoardAddress(moderatedAddresses, candidateAddress);
    }
  });

  return moderatedAddresses;
};

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
  selectedBoardFilterAddresses: readonly string[] | null = null,
): T[] =>
  feed.filter((comment) => {
    if (comment.cid && dismissedCommentCids.has(comment.cid)) {
      return false;
    }

    if (!selectedBoardFilter) {
      return true;
    }

    const commentCommunityAddress = getCommentCommunityAddress(comment);
    if (!commentCommunityAddress) {
      return false;
    }

    if (selectedBoardFilterAddresses?.length) {
      return selectedBoardFilterAddresses.some((address) => areSameBoardAddress(address, commentCommunityAddress));
    }

    return areSameBoardAddress(commentCommunityAddress, selectedBoardFilter);
  });
