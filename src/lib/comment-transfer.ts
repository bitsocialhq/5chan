import type { Comment } from '@bitsocial/bitsocial-react-hooks';
import { isCommentFlagFlair } from './comment-flags';
import { isSpecialBoardCode } from './special-boards';
import { isCommentArchived } from './utils/comment-moderation-utils';
import { normalizePublishURL } from './utils/url-utils';

export type PostTransferField = 'displayName' | 'title' | 'content' | 'link' | 'spoiler' | 'flairs';
export type PostTransferFields = Record<PostTransferField, boolean>;

export type TransferBoardLike = {
  address?: string;
  directoryCode?: string;
  title?: string;
};

export const TRANSFERRED_COMMENT_FLAIR_TEXT = '5chan:transferred';
export const TRANSFERRED_COMMENT_FLAIR = { text: TRANSFERRED_COMMENT_FLAIR_TEXT } as const;
export const TRANSFER_FIELD_KEYS: PostTransferField[] = ['displayName', 'title', 'content', 'link', 'spoiler', 'flairs'];

const getTextField = (value: unknown): string | undefined => (typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined);
const getVerbatimTextField = (value: unknown): string | undefined => (typeof value === 'string' && value.trim().length > 0 ? value : undefined);

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);

export const getCommentDisplayName = (comment: Comment): string | undefined => getTextField(comment.displayName) ?? getTextField(comment.author?.displayName);

export const isTransferredCommentFlair = (flair: unknown): boolean => isRecord(flair) && getTextField(flair.text) === TRANSFERRED_COMMENT_FLAIR_TEXT;

const getFlairs = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);

export const getTransferableCommentFlairs = (comment: Comment): unknown[] =>
  getFlairs(comment.flairs).filter((flair) => !isCommentFlagFlair(flair) && !isTransferredCommentFlair(flair));

export const hasTransferableCommentFlairs = (comment: Comment): boolean => getTransferableCommentFlairs(comment).length > 0;

export const canTransferComment = (comment: Comment | undefined): boolean => {
  if (!comment?.cid || comment.parentCid) {
    return false;
  }

  return (
    comment.deleted !== true &&
    comment.removed !== true &&
    comment.commentModeration?.removed !== true &&
    comment.commentModeration?.purged !== true &&
    !isCommentArchived(comment)
  );
};

export const getInitialTransferFields = (comment: Comment): PostTransferFields => ({
  displayName: false,
  title: Boolean(getTextField(comment.title)),
  content: Boolean(getTextField(comment.content)),
  link: Boolean(getTextField(comment.link)),
  spoiler: comment.spoiler === true,
  flairs: hasTransferableCommentFlairs(comment),
});

export const getAvailableTransferFields = (comment: Comment): PostTransferField[] => {
  const initialFields = getInitialTransferFields(comment);
  return TRANSFER_FIELD_KEYS.filter((field) => (field === 'displayName' ? Boolean(getCommentDisplayName(comment)) : initialFields[field]));
};

export const hasSelectedTransferFields = (fields: PostTransferFields, availableFields: PostTransferField[]) => availableFields.some((field) => fields[field]);

export const getTransferPublishPayload = (comment: Comment, fields: PostTransferFields, targetBoardAddress: string): Record<string, unknown> => {
  const payload: Record<string, unknown> = {
    communityAddress: targetBoardAddress,
  };
  const displayName = getCommentDisplayName(comment);
  const title = getTextField(comment.title);
  const content = getVerbatimTextField(comment.content);
  const link = getTextField(comment.link);
  const flairs = getTransferableCommentFlairs(comment);

  if (fields.displayName && displayName) {
    payload.author = { displayName };
  }
  if (fields.title && title) {
    payload.title = title;
  }
  if (fields.content && content) {
    payload.content = content;
  }
  if (fields.link && link) {
    payload.link = normalizePublishURL(link);
  }
  if (fields.spoiler && comment.spoiler === true) {
    payload.spoiler = true;
  }
  if (fields.flairs && flairs.length > 0) {
    payload.flairs = flairs;
  }

  return payload;
};

export const getTargetTransferModerationFlairs = (comment: Comment, fields: PostTransferFields): unknown[] => {
  const copiedFlairs = fields.flairs ? getTransferableCommentFlairs(comment) : [];
  return [...copiedFlairs, TRANSFERRED_COMMENT_FLAIR];
};

export const getTransferBoardReference = (targetBoard: TransferBoardLike | undefined, targetBoardAddress: string): string => {
  const directoryCode = getTextField(targetBoard?.directoryCode);
  if (directoryCode) return `>>>/${directoryCode}/`;
  return getTextField(targetBoard?.address) ?? targetBoardAddress;
};

export const getTransferSourceBoardReference = (sourceBoard: TransferBoardLike | undefined, sourceBoardAddress: string | undefined): string => {
  const directoryCode = getTextField(sourceBoard?.directoryCode);
  if (directoryCode) return `/${directoryCode}/`;
  return getTextField(sourceBoard?.address) ?? getTextField(sourceBoardAddress) ?? 'this board';
};

export const getTransferSourceBoardRulesLink = (sourceBoard: TransferBoardLike | undefined): string => {
  const directoryCode = getTextField(sourceBoard?.directoryCode);
  return directoryCode && !isSpecialBoardCode(directoryCode) ? `[rules](/rules#${directoryCode})` : 'the rules';
};

export const getTransferSourceModeration = (
  comment: Comment,
  targetBoardReference: string,
  sourceBoardReference = 'this board',
  sourceBoardRulesLink = 'the rules',
): Record<string, unknown> => {
  const reason = `Moved to ${targetBoardReference}, this post did not belong to ${sourceBoardReference} (${sourceBoardRulesLink})`;
  return comment.pendingApproval === true ? { approved: false, reason } : { removed: true, reason };
};

export const getTransferredCommentCid = (challengeVerification: unknown, challengeComment: unknown): string | undefined => {
  if (isRecord(challengeVerification)) {
    const commentUpdate = challengeVerification.commentUpdate;
    if (isRecord(commentUpdate)) {
      const cid = getTextField(commentUpdate.cid);
      if (cid) return cid;
    }
    const comment = challengeVerification.comment;
    if (isRecord(comment)) {
      const cid = getTextField(comment.cid);
      if (cid) return cid;
    }
  }

  return isRecord(challengeComment) ? getTextField(challengeComment.cid) : undefined;
};

const hasTransferredMarkerInFlairs = (flairs: unknown): boolean => getFlairs(flairs).some(isTransferredCommentFlair);

export const hasTransferredCommentMarker = (comment: unknown): boolean => {
  if (!isRecord(comment)) return false;

  const raw = isRecord(comment.raw) ? comment.raw : undefined;
  const commentUpdate = raw && isRecord(raw.commentUpdate) ? raw.commentUpdate : undefined;
  const commentModeration = isRecord(comment.commentModeration) ? comment.commentModeration : undefined;

  return hasTransferredMarkerInFlairs(commentUpdate?.flairs) || hasTransferredMarkerInFlairs(commentModeration?.flairs);
};
