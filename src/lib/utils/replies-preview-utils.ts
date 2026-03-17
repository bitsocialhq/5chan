import { BOARD_REPLIES_PREVIEW_VISIBLE_COUNT } from '../constants';

interface CommentLike {
  cid?: string | null;
  deleted?: boolean;
  index?: number;
  pendingApproval?: boolean;
  state?: string;
  timestamp?: number;
}

export function filterRepliesForDisplay<T extends CommentLike>(replies: T[]): T[] {
  return replies.filter((reply) => !reply.deleted);
}

/**
 * Returns the latest N replies in chronological display order (oldest first).
 *
 * `useReplies` can append local account comments to the end of the preview array,
 * so we normalize by reply recency first to keep pending/mod-queue items visible in
 * board previews.
 */
export function getPreviewDisplayReplies<T extends CommentLike>(replies: T[], visibleCount: number = BOARD_REPLIES_PREVIEW_VISIBLE_COUNT): T[] {
  const getRecency = (reply: T): number => {
    if (typeof reply?.timestamp === 'number') {
      return reply.timestamp;
    }
    // Pending/local account replies can be missing timestamp early on.
    if (typeof reply?.index === 'number' || reply?.pendingApproval || (reply?.state && reply.state !== 'succeeded')) {
      return Number.POSITIVE_INFINITY;
    }
    return Number.NEGATIVE_INFINITY;
  };

  const tagged = replies.map((reply, i) => ({ reply, recency: getRecency(reply), i }));
  tagged.sort((a, b) => (a.recency !== b.recency ? b.recency - a.recency : a.i - b.i));
  return tagged
    .slice(0, visibleCount)
    .reverse()
    .map((t) => t.reply);
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
