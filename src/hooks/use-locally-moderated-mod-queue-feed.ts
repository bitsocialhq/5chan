import { useMemo } from 'react';
import { Comment } from '@bitsocial/bitsocial-react-hooks';
import { accountsStore as useAccountsStore } from '../lib/bitsocial-internals/stores';

type LocalModerationEditSummary = Record<string, { timestamp?: number; value: unknown } | undefined>;
type LocalModerationEditSummaries = Record<string, LocalModerationEditSummary | undefined>;

const LOCAL_MODERATION_EDIT_FIELDS = ['approved', 'removed'] as const;
const LOCAL_EDIT_PENDING_SECONDS = 20 * 60;

const shouldApplyLocalModerationEdit = (
  comment: Comment,
  propertyName: (typeof LOCAL_MODERATION_EDIT_FIELDS)[number],
  edit: { timestamp?: number; value: unknown },
  now: number,
) => {
  const editTimestamp = edit.timestamp ?? 0;
  const updatedAt = (comment as { updatedAt?: number }).updatedAt;
  const currentValue = (comment as Record<string, unknown>)[propertyName];

  if (!updatedAt) {
    return Object.is(currentValue, edit.value) || editTimestamp > now - LOCAL_EDIT_PENDING_SECONDS;
  }

  if (updatedAt < editTimestamp || Object.is(currentValue, edit.value)) {
    return true;
  }

  return editTimestamp > now - LOCAL_EDIT_PENDING_SECONDS || updatedAt - editTimestamp < LOCAL_EDIT_PENDING_SECONDS;
};

const applyLocalModerationEdits = (comment: Comment, editSummary: LocalModerationEditSummary | undefined, now: number): Comment => {
  if (!editSummary) {
    return comment;
  }

  let editedComment: Comment | undefined;
  for (const propertyName of LOCAL_MODERATION_EDIT_FIELDS) {
    const edit = editSummary[propertyName];
    if (!edit || edit.value === undefined || !shouldApplyLocalModerationEdit(comment, propertyName, edit, now)) {
      continue;
    }
    editedComment = { ...(editedComment ?? comment), [propertyName]: edit.value } as Comment;
  }

  return editedComment ?? comment;
};

// Overlay the active account's local (optimistic) approve/removed edits onto a
// mod queue feed so a just-moderated comment reflects the pending state until
// the edit lands or expires (LOCAL_EDIT_PENDING_SECONDS). Shared by the mod
// queue route and the board mod-queue button.
export const useLocallyModeratedModQueueFeed = (feed: Comment[], currentTime: number) => {
  const accountId = useAccountsStore((state) => state.activeAccountId);
  const editSummaries = useAccountsStore((state) => (accountId ? state.accountsEditsSummaries[accountId] : undefined)) as LocalModerationEditSummaries | undefined;

  return useMemo(() => {
    if (!editSummaries) {
      return feed;
    }
    return feed.map((comment) => (comment.cid ? applyLocalModerationEdits(comment, editSummaries[comment.cid], currentTime) : comment));
  }, [currentTime, editSummaries, feed]);
};

export default useLocallyModeratedModQueueFeed;
