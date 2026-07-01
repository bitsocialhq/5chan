import React, { useEffect, useEffectEvent, useMemo, useReducer, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { useSpring, animated } from '@react-spring/web';
import { useDrag } from '@use-gesture/react';
import { type ChallengeVerification, type Comment } from '@bitsocial/bitsocial-react-hooks';
import useAccountsStore from '@bitsocial/bitsocial-react-hooks/dist/stores/accounts/index.js';
import ErrorDisplay from '../error-display/error-display';
import { useDirectories } from '../../hooks/use-directories';
import useChallengesStore from '../../stores/use-challenges-store';
import { alertChallengeVerificationFailed } from '../../lib/utils/challenge-utils';
import { areSameBoardAddress } from '../../lib/utils/route-utils';
import { getCommentCommunityAddress } from '../../lib/utils/comment-utils';
import capitalize from 'lodash/capitalize';
import styles from './post-transfer-modal.module.css';
import {
  getAvailableTransferFields,
  getInitialTransferFields,
  getTargetTransferModerationFlairs,
  getTransferBoardReference,
  getTransferPublishPayload,
  getTransferSourceBoardReference,
  getTransferSourceBoardRulesLink,
  getTransferSourceModeration,
  getTransferredCommentCid,
  hasSelectedTransferFields,
  type PostTransferField,
  type PostTransferFields,
} from '../../lib/comment-transfer';

export type PostTransferState = 'idle' | 'publishing' | 'succeeded' | 'failed';
type CreateAccountAction = (accountName?: string) => Promise<void>;
type PublishCommentAction = (publishCommentOptions: Record<string, unknown>, accountName?: string) => Promise<{ index?: number } | undefined>;
type DeleteCommentAction = (commentCidOrAccountCommentIndex: string | number, accountName?: string) => Promise<void>;
type DeleteAccountAction = (accountName?: string) => Promise<void>;
type PublishCommentModerationAction = (publishCommentModerationOptions: Record<string, unknown>, accountName?: string) => Promise<void>;

interface TransferModalState {
  targetBoardAddress: string;
  selectedFields: PostTransferFields;
  transferState: PostTransferState;
  transferError?: unknown;
  transferredIndex?: number;
}

type TransferModalAction =
  | { type: 'field'; field: PostTransferField; checked: boolean }
  | { type: 'targetBoard'; value: string }
  | { type: 'publishStarted' }
  | { type: 'publishSucceeded'; transferredIndex?: number }
  | { type: 'publishFailed'; error: unknown };

interface PostTransferModalProps {
  comment: Comment;
  onClose: () => void;
  onTransferStateChange?: (state: PostTransferState) => void;
  onTransferSuccess?: () => void;
}

const getInitialTransferModalState = (comment: Comment): TransferModalState => ({
  targetBoardAddress: '',
  selectedFields: getInitialTransferFields(comment),
  transferState: 'idle',
});

const resetTransferResult = (state: TransferModalState): TransferModalState =>
  state.transferState === 'idle' ? state : { ...state, transferState: 'idle', transferError: undefined, transferredIndex: undefined };

const transferModalReducer = (state: TransferModalState, action: TransferModalAction): TransferModalState => {
  if (action.type === 'field') {
    if (state.transferState === 'succeeded') return state;
    return resetTransferResult({ ...state, selectedFields: { ...state.selectedFields, [action.field]: action.checked } });
  }
  if (action.type === 'targetBoard') {
    if (state.transferState === 'succeeded') return state;
    return resetTransferResult({ ...state, targetBoardAddress: action.value });
  }
  if (action.type === 'publishStarted') {
    return { ...state, transferState: 'publishing', transferError: undefined, transferredIndex: undefined };
  }
  if (action.type === 'publishSucceeded') {
    return { ...state, transferState: 'succeeded', transferredIndex: action.transferredIndex };
  }
  return { ...state, transferState: 'failed', transferError: action.error };
};

const getTransferBoardLabel = (community: { address?: string; directoryCode?: string; title?: string }): string =>
  community.title || community.directoryCode || community.address || '';

const getTransferFieldLabel = (field: PostTransferField, t: (key: string) => string): string => {
  if (field === 'displayName') return capitalize(t('name'));
  if (field === 'title') return capitalize(t('subject'));
  if (field === 'content') return capitalize(t('comment'));
  if (field === 'link') return t('link');
  if (field === 'spoiler') return capitalize(t('spoiler'));
  return capitalize(t('tag'));
};

const getTemporaryTransferAccountName = (sourceCommentCid: string | undefined): string => {
  const sourceHint = sourceCommentCid ? sourceCommentCid.slice(0, 8) : 'post';
  return `5chan-transfer-${sourceHint}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
};

const getInitialTransferModalPosition = () => {
  if (typeof window === 'undefined') {
    return { left: 0, top: 0 };
  }

  return {
    left: Math.round(window.innerWidth / 2),
    top: Math.round(window.innerHeight / 2),
  };
};

const PostTransferModal = ({ comment, onClose, onTransferStateChange, onTransferSuccess }: PostTransferModalProps) => {
  const { t } = useTranslation();
  const nodeRef = useRef<HTMLDivElement>(null);
  const finalizedTransferRef = useRef(false);
  const bodySelectionStyleBeforeDragRef = useRef<{ userSelect: string; webkitUserSelect: string } | null>(null);
  const directories = useDirectories();
  const createAccount = useAccountsStore((state) => state.accountsActions.createAccount) as CreateAccountAction;
  const publishComment = useAccountsStore((state) => state.accountsActions.publishComment) as PublishCommentAction;
  const publishCommentModeration = useAccountsStore((state) => state.accountsActions.publishCommentModeration) as PublishCommentModerationAction;
  const deleteComment = useAccountsStore((state) => state.accountsActions.deleteComment) as DeleteCommentAction;
  const deleteAccount = useAccountsStore((state) => state.accountsActions.deleteAccount) as DeleteAccountAction;
  const sourceCommunityAddress = getCommentCommunityAddress(comment);
  const sourceCommentCid = comment.cid;
  const boardOptions = useMemo(
    () =>
      directories
        .filter((community) => community.address && (!sourceCommunityAddress || !areSameBoardAddress(community.address, sourceCommunityAddress)))
        .sort((left, right) => getTransferBoardLabel(left).localeCompare(getTransferBoardLabel(right), undefined, { sensitivity: 'base' })),
    [directories, sourceCommunityAddress],
  );
  const [modalState, dispatchModalState] = useReducer(transferModalReducer, comment, getInitialTransferModalState);
  const { targetBoardAddress, selectedFields, transferState, transferError, transferredIndex } = modalState;

  const resolvedTargetBoardAddress = targetBoardAddress;
  const resolvedTargetBoard = boardOptions.find((community) => community.address === targetBoardAddress);
  const availableFields = useMemo(() => getAvailableTransferFields(comment), [comment]);
  const sourceBoard = useMemo(
    () => (sourceCommunityAddress ? directories.find((community) => areSameBoardAddress(community.address, sourceCommunityAddress)) : undefined),
    [directories, sourceCommunityAddress],
  );
  const sourceBoardLabel = useMemo(() => {
    return sourceBoard ? getTransferBoardLabel(sourceBoard) : sourceCommunityAddress || 'N/A';
  }, [sourceBoard, sourceCommunityAddress]);
  const transferTitle = comment.number !== undefined ? t('modQueue.transferTitleWithNumber', { number: comment.number }) : t('modQueue.transferTitle');
  const isPublishingTransfer = transferState === 'publishing';
  const isTransferComplete = transferState === 'succeeded';
  const canSubmit =
    !isPublishingTransfer &&
    !isTransferComplete &&
    Boolean(targetBoardAddress) &&
    Boolean(sourceCommunityAddress) &&
    Boolean(sourceCommentCid) &&
    typeof createAccount === 'function' &&
    typeof publishComment === 'function' &&
    typeof publishCommentModeration === 'function' &&
    typeof deleteAccount === 'function' &&
    hasSelectedTransferFields(selectedFields, availableFields);

  const [{ left, top }, api] = useSpring(
    () => ({
      from: getInitialTransferModalPosition(),
    }),
    [],
  );

  const disableBodyTextSelection = () => {
    if (!bodySelectionStyleBeforeDragRef.current) {
      bodySelectionStyleBeforeDragRef.current = {
        userSelect: document.body.style.userSelect,
        webkitUserSelect: document.body.style.webkitUserSelect,
      };
    }
    Object.assign(document.body.style, { userSelect: 'none', webkitUserSelect: 'none' });
  };

  const restoreBodyTextSelection = () => {
    const previousStyle = bodySelectionStyleBeforeDragRef.current;
    Object.assign(document.body.style, {
      userSelect: previousStyle?.userSelect ?? '',
      webkitUserSelect: previousStyle?.webkitUserSelect ?? '',
    });
    bodySelectionStyleBeforeDragRef.current = null;
  };

  const bind = useDrag(
    ({ active, event, offset: [ox, oy] }) => {
      const nextLeft = Math.round(ox);
      const nextTop = Math.round(oy);

      if (active) {
        event.preventDefault();
        disableBodyTextSelection();
      } else {
        restoreBodyTextSelection();
      }
      api.start({ left: nextLeft, top: nextTop, immediate: true });
    },
    {
      from: () => [left.get(), top.get()],
      filterTaps: true,
      bounds: undefined,
    },
  );

  const closeTransferModalOnEscape = useEffectEvent(() => {
    if (!isPublishingTransfer) {
      onClose();
    }
  });

  useEffect(() => {
    const handleTransferModalKeydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeTransferModalOnEscape();
      }
    };

    document.addEventListener('keydown', handleTransferModalKeydown);
    return () => {
      document.removeEventListener('keydown', handleTransferModalKeydown);
      restoreBodyTextSelection();
    };
  }, []);

  const getTransferModerationCallbacks = (message: string) => ({
    onChallenge: async (...args: any[]) => {
      useChallengesStore.getState().addChallenge([...args, comment]);
    },
    onChallengeVerification: async (challengeVerification: ChallengeVerification, moderation: Comment) => {
      alertChallengeVerificationFailed(challengeVerification, moderation);
    },
    onError: (error: Error & { details?: unknown }) => {
      console.error(message, error, error.details);
    },
  });

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSubmit) return;

    let pendingIndex: number | undefined;
    let temporaryAccountCreated = false;
    const temporaryAccountName = getTemporaryTransferAccountName(sourceCommentCid);
    const cleanupTemporaryAccount = async ({ deletePendingComment = false } = {}) => {
      if (!temporaryAccountCreated) return;
      if (deletePendingComment && pendingIndex !== undefined && typeof deleteComment === 'function') {
        try {
          await deleteComment(pendingIndex, temporaryAccountName);
        } catch (error) {
          console.error('Transfer pending comment cleanup failed:', error);
        }
      }
      try {
        await deleteAccount(temporaryAccountName);
        temporaryAccountCreated = false;
      } catch (error) {
        console.error('Transfer temporary account cleanup failed:', error);
      }
    };
    finalizedTransferRef.current = false;
    onTransferStateChange?.('publishing');
    dispatchModalState({ type: 'publishStarted' });

    try {
      await createAccount(temporaryAccountName);
      temporaryAccountCreated = true;
      const payload = getTransferPublishPayload(comment, selectedFields, resolvedTargetBoardAddress);
      await publishComment(
        {
          ...payload,
          _onPendingCommentIndex: (index: number) => {
            pendingIndex = index;
          },
          onChallenge: async (...args: any[]) => {
            useChallengesStore.getState().addChallenge([...args, comment], async () => {
              await cleanupTemporaryAccount({ deletePendingComment: true });
              onTransferStateChange?.('failed');
              dispatchModalState({ type: 'publishFailed', error: new Error('Transfer challenge was abandoned.') });
            });
          },
          onChallengeVerification: async (challengeVerification: ChallengeVerification, challengeComment: Comment) => {
            try {
              alertChallengeVerificationFailed(challengeVerification, challengeComment);
              if (challengeVerification?.challengeSuccess !== true) {
                return;
              }
              if (finalizedTransferRef.current) return;
              finalizedTransferRef.current = true;

              const targetCommentCid = getTransferredCommentCid(challengeVerification, challengeComment);
              if (!targetCommentCid) {
                throw new Error('Transferred post was accepted, but no target CID was returned.');
              }

              // Queue the target marker first so a target moderation failure does not remove the original post.
              await publishCommentModeration({
                commentCid: targetCommentCid,
                communityAddress: resolvedTargetBoardAddress,
                commentModeration: {
                  flairs: getTargetTransferModerationFlairs(comment, selectedFields),
                },
                ...getTransferModerationCallbacks('Transfer target moderation failed:'),
              });
              await publishCommentModeration({
                commentCid: sourceCommentCid,
                communityAddress: sourceCommunityAddress,
                commentModeration: getTransferSourceModeration(
                  comment,
                  getTransferBoardReference(resolvedTargetBoard, resolvedTargetBoardAddress),
                  getTransferSourceBoardReference(sourceBoard, sourceCommunityAddress),
                  getTransferSourceBoardRulesLink(sourceBoard),
                ),
                ...getTransferModerationCallbacks('Transfer source moderation failed:'),
              });

              await cleanupTemporaryAccount();
              try {
                onTransferSuccess?.();
              } catch (error) {
                console.error('Transfer success callback failed:', error);
              }
              onTransferStateChange?.('succeeded');
              dispatchModalState({ type: 'publishSucceeded', transferredIndex: pendingIndex });
            } catch (error) {
              console.error('Transfer finalization failed:', error);
              await cleanupTemporaryAccount();
              onTransferStateChange?.('failed');
              dispatchModalState({ type: 'publishFailed', error });
            }
          },
          onError: (error: Error & { details?: unknown }) => {
            console.error('Transfer failed:', error, error.details);
            void cleanupTemporaryAccount({ deletePendingComment: true });
            onTransferStateChange?.('failed');
            dispatchModalState({ type: 'publishFailed', error });
          },
        },
        temporaryAccountName,
      );
    } catch (error) {
      console.error('Transfer failed:', error);
      await cleanupTemporaryAccount({ deletePendingComment: true });
      onTransferStateChange?.('failed');
      dispatchModalState({ type: 'publishFailed', error });
    }
  };

  if (typeof document === 'undefined') {
    return null;
  }

  return createPortal(
    <animated.div ref={nodeRef} className={styles.transferModal} role='dialog' aria-modal='false' aria-labelledby='post-transfer-title' style={{ left, top }}>
      <form onSubmit={handleSubmit}>
        <div className={`replyModalHandle ${styles.transferHeader}`} {...bind()}>
          <span id='post-transfer-title'>{transferTitle}</span>
          <button
            type='button'
            className={styles.transferCloseButton}
            aria-label={t('close')}
            onClick={(event) => {
              event.stopPropagation();
              onClose();
            }}
            disabled={isPublishingTransfer}
          />
        </div>

        <div className={styles.transferBody}>
          <div className={styles.transferAlert}>{t('modQueue.transferRecreateNotice')}</div>
          <div className={styles.transferAlert}>{t('modQueue.transferRepliesNotice')}</div>
          <div className={styles.transferHint}>{t('modQueue.transferTemporaryAccountNotice')}</div>
          <div className={styles.transferRow}>
            <span className={styles.transferLabel}>{t('modQueue.transferSource')}</span>
            <span>{sourceBoardLabel}</span>
          </div>
          <label className={styles.transferRow}>
            <span className={styles.transferLabel}>{t('modQueue.transferTarget')}</span>
            <select
              value={targetBoardAddress}
              onChange={(event) => dispatchModalState({ type: 'targetBoard', value: event.target.value })}
              disabled={isPublishingTransfer || isTransferComplete}
            >
              <option value='' disabled>
                {t('choose_one')}
              </option>
              {boardOptions.map((community) => (
                <option key={community.address} value={community.address}>
                  {getTransferBoardLabel(community)}
                </option>
              ))}
            </select>
          </label>

          <fieldset className={styles.transferFields}>
            <legend>{t('modQueue.transferFields')}</legend>
            {availableFields.length > 0 ? (
              availableFields.map((field) => (
                <label key={field} className={styles.transferField}>
                  <input
                    type='checkbox'
                    checked={selectedFields[field]}
                    onChange={(event) => dispatchModalState({ type: 'field', field, checked: event.target.checked })}
                    disabled={isPublishingTransfer || isTransferComplete}
                  />
                  {getTransferFieldLabel(field, t)}
                </label>
              ))
            ) : (
              <div className={styles.transferHint}>{t('no_content')}</div>
            )}
          </fieldset>

          {availableFields.length > 0 && !hasSelectedTransferFields(selectedFields, availableFields) && (
            <div className={styles.transferError}>{t('modQueue.transferNoFields')}</div>
          )}
          {transferState === 'failed' && transferError !== undefined && (
            <div className={styles.transferError}>
              <ErrorDisplay error={transferError} inline={true} showImmediately={true} />
            </div>
          )}
          {transferState === 'succeeded' && (
            <div className={styles.transferSuccess}>
              {t('modQueue.transferSuccess')}
              {transferredIndex !== undefined ? ` #${transferredIndex}` : ''}
            </div>
          )}
        </div>

        <div className={styles.transferFooter}>
          <button type='button' onClick={onClose} disabled={isPublishingTransfer}>
            {t('close')}
          </button>
          <button type='submit' disabled={!canSubmit}>
            {isPublishingTransfer ? t('publishing') : t('transfer')}
          </button>
        </div>
      </form>
    </animated.div>,
    document.body,
  );
};

export default PostTransferModal;
