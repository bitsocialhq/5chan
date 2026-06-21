import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Comment, usePublishCommentModeration } from '@bitsocial/bitsocial-react-hooks';
import { approvePendingCommentModeration, rejectPendingCommentModeration } from '../lib/utils/pending-approval-moderation';
import { alertChallengeVerificationFailed } from '../lib/utils/challenge-utils';
import { formatErrorForDisplay } from '../lib/utils/error-utils';
import useChallengesStore from '../stores/use-challenges-store';

export type PendingModerationStatus = 'approved' | 'rejected' | 'failed' | null;

export interface UsePendingCommentModerationActionsOptions {
  // The comment the moderation challenge is published against. Forwarded to the
  // challenge store so the challenge UI can reference the target comment.
  comment: Comment | undefined;
  commentCid: string | undefined;
  communityAddress: string | undefined;
  // When false, the underlying publishers are disabled by withholding the
  // community address (mirrors the mobile post page gating its actions).
  enabled?: boolean;
  // Run after a successful approve/reject publish, inside the same try block as
  // the publish call so a throw here is logged exactly like the publish path.
  onApproveSuccess?: () => void | Promise<void>;
  onRejectSuccess?: () => void | Promise<void>;
}

export interface PendingCommentModerationActions {
  handleApprove: () => Promise<void>;
  handleReject: () => Promise<void>;
  isPublishing: boolean;
  // Action-derived status only ('approved'/'rejected' on success, 'failed' on
  // error). Callers that also have a baseline (e.g. an already-moderated mod
  // queue comment) combine that baseline with this value themselves.
  status: PendingModerationStatus;
  error: unknown;
  errorMessage: string | undefined;
}

// Shared approve/reject state machine for pending-approval comment moderation.
// Extracted from the duplicated copies in desktop posts, mobile posts, and the
// mod queue so the riskiest moderation flow lives behind one tested boundary.
export const usePendingCommentModerationActions = ({
  comment,
  commentCid,
  communityAddress,
  enabled = true,
  onApproveSuccess,
  onRejectSuccess,
}: UsePendingCommentModerationActionsOptions): PendingCommentModerationActions => {
  const { t } = useTranslation();
  const effectiveCommunityAddress = enabled ? communityAddress : undefined;

  const {
    publishCommentModeration: approve,
    state: approveState,
    error: approveError,
  } = usePublishCommentModeration({
    commentCid,
    communityAddress: effectiveCommunityAddress,
    commentModeration: approvePendingCommentModeration,
    onChallenge: async (...args: any) => {
      useChallengesStore.getState().addChallenge([...args, comment]);
    },
    onChallengeVerification: async (challengeVerification, challengedComment) => {
      alertChallengeVerificationFailed(challengeVerification, challengedComment);
    },
    onError: (error: Error & { details?: unknown }) => {
      console.error('Approve failed:', error, error.details);
    },
  });

  const {
    publishCommentModeration: reject,
    state: rejectState,
    error: rejectError,
  } = usePublishCommentModeration({
    commentCid,
    communityAddress: effectiveCommunityAddress,
    commentModeration: rejectPendingCommentModeration,
    onChallenge: async (...args: any) => {
      useChallengesStore.getState().addChallenge([...args, comment]);
    },
    onChallengeVerification: async (challengeVerification, challengedComment) => {
      alertChallengeVerificationFailed(challengeVerification, challengedComment);
    },
    onError: (error: Error & { details?: unknown }) => {
      console.error('Reject failed:', error, error.details);
    },
  });

  const [initiatedAction, setInitiatedAction] = useState<'approve' | 'reject' | null>(null);

  const handleApprove = useCallback(async () => {
    if (!window.confirm(t('double_confirm'))) {
      return;
    }
    setInitiatedAction('approve');
    try {
      await approve();
      await onApproveSuccess?.();
    } catch (e) {
      console.error(e);
    }
  }, [approve, onApproveSuccess, t]);

  const handleReject = useCallback(async () => {
    if (!window.confirm(t('double_confirm'))) {
      return;
    }
    setInitiatedAction('reject');
    try {
      await reject();
      await onRejectSuccess?.();
    } catch (e) {
      console.error(e);
    }
  }, [reject, onRejectSuccess, t]);

  const isApproving = initiatedAction === 'approve' && approveState !== 'initializing' && approveState !== 'succeeded' && approveState !== 'failed';
  const isRejecting = initiatedAction === 'reject' && rejectState !== 'initializing' && rejectState !== 'succeeded' && rejectState !== 'failed';
  const isPublishing = isApproving || isRejecting;

  const approveSucceeded = initiatedAction === 'approve' && approveState === 'succeeded';
  const rejectSucceeded = initiatedAction === 'reject' && rejectState === 'succeeded';
  const approveFailed = initiatedAction === 'approve' && approveState === 'failed';
  const rejectFailed = initiatedAction === 'reject' && rejectState === 'failed';

  const status: PendingModerationStatus = approveSucceeded ? 'approved' : rejectSucceeded ? 'rejected' : approveFailed || rejectFailed ? 'failed' : null;
  const error = approveFailed ? approveError : rejectFailed ? rejectError : undefined;
  const errorMessage = formatErrorForDisplay(error);

  return { handleApprove, handleReject, isPublishing, status, error, errorMessage };
};

export default usePendingCommentModerationActions;
