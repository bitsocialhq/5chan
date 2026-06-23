import { BOARD_REPLIES_PREVIEW_VISIBLE_COUNT } from '../constants';

interface CommentLike {
  cid?: string | null;
  deleted?: boolean;
  index?: number;
  number?: number;
  pendingApproval?: boolean;
  reason?: string | null;
  removed?: boolean;
  state?: string;
  timestamp?: number;
}

const getReplyNumber = (reply: CommentLike): number | undefined => (typeof reply?.number === 'number' && Number.isFinite(reply.number) ? reply.number : undefined);

export function sortRepliesForDisplay<T extends CommentLike>(replies: T[]): T[] {
  if (replies.length < 2) {
    return replies;
  }

  const taggedReplies = replies.map((reply, index) => ({
    index,
    number: getReplyNumber(reply),
    reply,
  }));

  taggedReplies.sort((a, b) => {
    if (a.number !== undefined && b.number !== undefined) {
      return a.number === b.number ? a.index - b.index : a.number - b.number;
    }

    if (a.number !== undefined) {
      return -1;
    }

    if (b.number !== undefined) {
      return 1;
    }

    return a.index - b.index;
  });

  const sortedReplies = taggedReplies.map((taggedReply) => taggedReply.reply);
  return sortedReplies.every((reply, index) => reply === replies[index]) ? replies : sortedReplies;
}

export function filterRepliesForDisplay<T extends CommentLike>(replies: T[]): T[] {
  return replies.filter((reply) => !reply.deleted && (!reply.removed || Boolean(reply.reason?.trim())));
}

/**
 * Returns the latest N replies in chronological display order (oldest first).
 *
 * `useReplies` can append local account comments to the end of the preview array,
 * so we normalize by reply recency first to keep pending/mod-queue items visible in
 * board previews.
 */
export function getPreviewDisplayReplies<T extends CommentLike>(replies: T[], visibleCount: number = BOARD_REPLIES_PREVIEW_VISIBLE_COUNT): T[] {
  const getRecency = (reply: T): { group: number; value: number } => {
    const number = getReplyNumber(reply);
    if (number !== undefined) {
      return { group: 2, value: number };
    }

    // Pending/local account replies can be missing timestamp early on.
    if (typeof reply?.index === 'number' || reply?.pendingApproval || (reply?.state && reply.state !== 'succeeded')) {
      return { group: 3, value: 0 };
    }

    if (typeof reply?.timestamp === 'number') {
      return { group: 1, value: reply.timestamp };
    }

    return { group: 0, value: 0 };
  };

  const tagged = replies.map((reply, i) => ({ reply, recency: getRecency(reply), i }));
  tagged.sort((a, b) => {
    if (a.recency.group !== b.recency.group) {
      return b.recency.group - a.recency.group;
    }

    if (a.recency.value !== b.recency.value) {
      return b.recency.value - a.recency.value;
    }

    return a.i - b.i;
  });
  return sortRepliesForDisplay(
    tagged
      .slice(0, visibleCount)
      .reverse()
      .map((t) => t.reply),
  );
}

interface ComputeOmittedParams {
  totalReplyCount: number;
  visibleCount: number;
}

/**
 * Computes omitted reply count for board view. All threads (pinned or not) show
 * the last `visibleCount` replies when collapsed; omitted = total - visible.
 * Result is always clamped at zero.
 */
export function computeOmittedCount({ totalReplyCount, visibleCount }: ComputeOmittedParams): number {
  return Math.max(0, totalReplyCount - visibleCount);
}

interface HasEnoughPreviewRepliesParams {
  replyCount: number | undefined;
  loadedCount: number;
  visibleCount: number;
}

/**
 * Board previews can skip a live fetch when cached replies already cover all
 * replies that could be shown. If total reply count is unknown, require a full
 * visible slice so UX matches the current live-preview behavior.
 */
export function hasEnoughPreviewReplies({ replyCount, loadedCount, visibleCount }: HasEnoughPreviewRepliesParams): boolean {
  const requiredCount = typeof replyCount === 'number' && replyCount >= 0 ? Math.min(visibleCount, replyCount) : visibleCount;
  return requiredCount === 0 || loadedCount >= requiredCount;
}

interface GetTotalReplyCountParams {
  replyCount: number | undefined;
  fullLoadedCount: number;
  previewLoadedCount: number;
}

/**
 * Returns total reply count: post.replyCount when defined, else max of loaded counts.
 */
export function getTotalReplyCount({ replyCount, fullLoadedCount, previewLoadedCount }: GetTotalReplyCountParams): number {
  if (typeof replyCount === 'number' && replyCount >= 0) {
    return replyCount;
  }
  return Math.max(fullLoadedCount, previewLoadedCount);
}
