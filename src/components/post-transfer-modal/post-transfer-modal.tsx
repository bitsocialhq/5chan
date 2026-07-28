import React, { useEffect, useEffectEvent, useLayoutEffect, useMemo, useReducer, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
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
import { getSpecialBoardByAddress, TRASH_BOARD_ADDRESS } from '../../lib/special-boards';
import styles from './post-transfer-modal.module.css';
import {
  getAvailableTransferFields,
  getInitialTransferFields,
  getTargetTransferModerationFlairs,
  getTransferBoardReference,
  getTransferPublishIdentity,
  getTransferPublishPayload,
  getTransferSourceBoardReference,
  getTransferSourceBoardRulesLink,
  getTransferSourceModeration,
  getTransferredCommentCid,
  getTransferredCommentNumber,
  hasSelectedTransferFields,
  type PostTransferField,
  type PostTransferFields,
} from '../../lib/comment-transfer';

export type PostTransferState = 'idle' | 'publishing' | 'succeeded' | 'failed' | 'finalizationFailed';
type CreateAccountAction = (accountName?: string) => Promise<void>;
type PublishCommentAction = (publishCommentOptions: Record<string, unknown>, accountName?: string) => Promise<{ index?: number } | undefined>;
type DeleteCommentAction = (commentCidOrAccountCommentIndex: string | number, accountName?: string) => Promise<void>;
type DeleteAccountAction = (accountName?: string) => Promise<void>;
type PublishCommentModerationAction = (publishCommentModerationOptions: Record<string, unknown>, accountName?: string) => Promise<void>;
type TransferModalPosition = { left: number; top: number };
type InitialTransferModalPosition = { isStored: boolean; position: TransferModalPosition };

const TRANSFER_MODAL_WIDTH_PX = 430;
const TRANSFER_MODAL_VIEWPORT_GUTTER_PX = 20;
const TRANSFER_MODAL_POSITION_SESSION_STORAGE_KEY = '5chan:transfer-modal-position';

interface TransferModalState {
  selectedFields: PostTransferFields;
  targetComment?: { cid: string; number?: number };
  transferState: PostTransferState;
  transferError?: unknown;
}

type TransferModalAction =
  | { type: 'field'; field: PostTransferField; checked: boolean }
  | { type: 'publishStarted' }
  | { type: 'publishSucceeded'; targetComment: { cid: string; number?: number } }
  | { type: 'publishFinalizationFailed'; error: unknown }
  | { type: 'publishFailed'; error: unknown };

interface PostTransferModalProps {
  comment: Comment;
  onClose: () => void;
  onTransferStateChange?: (state: PostTransferState) => void;
  onTransferSuccess?: () => void;
}

const getInitialTransferModalState = (comment: Comment): TransferModalState => ({
  selectedFields: getInitialTransferFields(comment),
  transferState: 'idle',
});

const resetTransferResult = (state: TransferModalState): TransferModalState =>
  state.transferState === 'idle' ? state : { ...state, transferState: 'idle', transferError: undefined };

const isTerminalTransferState = (state: PostTransferState): boolean => state === 'succeeded' || state === 'finalizationFailed';

const transferModalReducer = (state: TransferModalState, action: TransferModalAction): TransferModalState => {
  if (action.type === 'field') {
    if (isTerminalTransferState(state.transferState)) return state;
    return resetTransferResult({ ...state, selectedFields: { ...state.selectedFields, [action.field]: action.checked } });
  }
  if (action.type === 'publishStarted') {
    return { ...state, targetComment: undefined, transferState: 'publishing', transferError: undefined };
  }
  if (action.type === 'publishSucceeded') {
    return { ...state, targetComment: action.targetComment, transferState: 'succeeded' };
  }
  if (action.type === 'publishFinalizationFailed') {
    return { ...state, transferState: 'finalizationFailed', transferError: action.error };
  }
  return { ...state, transferState: 'failed', transferError: action.error };
};

const getTransferBoardLabel = (community: { address?: string; directoryCode?: string; title?: string }): string =>
  community.title || community.directoryCode || community.address || '';

const isSameTransferBoard = (community: { address?: string; aliases?: string[]; publicKey?: string }, sourceCommunityAddress: string | undefined): boolean => {
  if (!sourceCommunityAddress) return false;
  return (
    areSameBoardAddress(community.address, sourceCommunityAddress) ||
    community.publicKey === sourceCommunityAddress ||
    Boolean(community.aliases?.includes(sourceCommunityAddress))
  );
};

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

const getCenteredTransferModalPosition = (modalElement?: HTMLElement | null): TransferModalPosition => {
  if (typeof window === 'undefined') {
    return { left: 0, top: 0 };
  }

  const modalRect = modalElement?.getBoundingClientRect();
  const fallbackWidth = Math.min(TRANSFER_MODAL_WIDTH_PX, Math.max(0, window.innerWidth - TRANSFER_MODAL_VIEWPORT_GUTTER_PX));
  const modalWidth = modalRect?.width || fallbackWidth;
  const modalHeight = modalRect?.height || 0;

  return {
    left: Math.round((window.innerWidth - modalWidth) / 2),
    top: Math.round((window.innerHeight - modalHeight) / 2),
  };
};

const readTransferModalPosition = (): TransferModalPosition | null => {
  if (typeof window === 'undefined') return null;

  try {
    const storedPosition = window.sessionStorage.getItem(TRANSFER_MODAL_POSITION_SESSION_STORAGE_KEY);
    if (!storedPosition) return null;

    const parsedPosition = JSON.parse(storedPosition) as Partial<TransferModalPosition>;
    if (typeof parsedPosition.left !== 'number' || typeof parsedPosition.top !== 'number') return null;
    if (!Number.isFinite(parsedPosition.left) || !Number.isFinite(parsedPosition.top)) return null;

    return {
      left: Math.round(parsedPosition.left),
      top: Math.round(parsedPosition.top),
    };
  } catch (error) {
    console.warn('Failed to read transfer modal position from sessionStorage:', error);
    return null;
  }
};

const writeTransferModalPosition = (position: TransferModalPosition) => {
  if (typeof window === 'undefined') return;

  try {
    window.sessionStorage.setItem(TRANSFER_MODAL_POSITION_SESSION_STORAGE_KEY, JSON.stringify(position));
  } catch (error) {
    console.warn('Failed to save transfer modal position to sessionStorage:', error);
  }
};

const shouldUseStoredTransferModalPosition = () => typeof window !== 'undefined' && window.innerWidth >= 640;

const getInitialTransferModalPosition = (): InitialTransferModalPosition => {
  const centeredPosition = getCenteredTransferModalPosition();
  if (!shouldUseStoredTransferModalPosition()) return { isStored: false, position: centeredPosition };

  const storedPosition = readTransferModalPosition();
  return storedPosition ? { isStored: true, position: storedPosition } : { isStored: false, position: centeredPosition };
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
  const resolvedTargetBoardAddress = TRASH_BOARD_ADDRESS;
  const resolvedTargetBoard = getSpecialBoardByAddress(TRASH_BOARD_ADDRESS);
  const targetBoardLabel = getTransferBoardLabel(resolvedTargetBoard ?? { address: TRASH_BOARD_ADDRESS });
  const isSourceTargetBoard = isSameTransferBoard(resolvedTargetBoard ?? { address: TRASH_BOARD_ADDRESS }, sourceCommunityAddress);
  const [modalState, dispatchModalState] = useReducer(transferModalReducer, comment, getInitialTransferModalState);
  const { selectedFields, targetComment, transferState, transferError } = modalState;

  const availableFields = useMemo(() => getAvailableTransferFields(comment), [comment]);
  const sourceBoard = useMemo(() => {
    if (!sourceCommunityAddress) return undefined;
    return getSpecialBoardByAddress(sourceCommunityAddress) ?? directories.find((community) => isSameTransferBoard(community, sourceCommunityAddress));
  }, [directories, sourceCommunityAddress]);
  const sourceBoardLabel = useMemo(() => {
    return sourceBoard ? getTransferBoardLabel(sourceBoard) : sourceCommunityAddress || 'N/A';
  }, [sourceBoard, sourceCommunityAddress]);
  const transferTitle = comment.number !== undefined ? t('modQueue.transferTitleWithNumber', { number: comment.number }) : t('modQueue.transferTitle');
  const isPublishingTransfer = transferState === 'publishing';
  const isTransferComplete = isTerminalTransferState(transferState);
  const canSubmit =
    !isPublishingTransfer &&
    !isTransferComplete &&
    !isSourceTargetBoard &&
    Boolean(sourceCommunityAddress) &&
    Boolean(sourceCommentCid) &&
    typeof createAccount === 'function' &&
    typeof publishComment === 'function' &&
    typeof publishCommentModeration === 'function' &&
    typeof deleteAccount === 'function' &&
    hasSelectedTransferFields(selectedFields, availableFields);

  const [initialModalPosition] = useState(getInitialTransferModalPosition);
  const [{ left, top }, api] = useSpring(
    () => ({
      from: initialModalPosition.position,
    }),
    [],
  );

  useLayoutEffect(() => {
    if (initialModalPosition.isStored) return;

    api.start({ ...getCenteredTransferModalPosition(nodeRef.current), immediate: true });
  }, [api, initialModalPosition.isStored]);

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
        if (shouldUseStoredTransferModalPosition()) {
          writeTransferModalPosition({ left: nextLeft, top: nextTop });
        }
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
      const targetPublishIdentity = getTransferPublishIdentity(resolvedTargetBoard, resolvedTargetBoardAddress);
      const sourcePublishIdentity = sourceCommunityAddress ? getTransferPublishIdentity(sourceBoard, sourceCommunityAddress) : undefined;
      const payload = getTransferPublishPayload(comment, selectedFields, resolvedTargetBoardAddress, resolvedTargetBoard);
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
                await cleanupTemporaryAccount({ deletePendingComment: true });
                onTransferStateChange?.('failed');
                dispatchModalState({ type: 'publishFailed', error: new Error(challengeVerification?.reason || 'Transfer challenge verification failed.') });
                return;
              }
              if (finalizedTransferRef.current) return;
              finalizedTransferRef.current = true;

              const targetCommentCid = getTransferredCommentCid(challengeVerification, challengeComment);
              if (!targetCommentCid) {
                throw new Error('Transferred post was accepted, but no target CID was returned.');
              }
              const targetCommentNumber = getTransferredCommentNumber(challengeVerification, challengeComment);
              if (!sourcePublishIdentity) {
                throw new Error('Transferred post was accepted, but no source board was resolved.');
              }

              // Queue the target marker first so a target moderation failure does not remove the original post.
              await publishCommentModeration({
                commentCid: targetCommentCid,
                ...targetPublishIdentity,
                commentModeration: {
                  flairs: getTargetTransferModerationFlairs(comment, selectedFields),
                },
                ...getTransferModerationCallbacks('Transfer target moderation failed:'),
              });
              await publishCommentModeration({
                commentCid: sourceCommentCid,
                ...sourcePublishIdentity,
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
              dispatchModalState({ type: 'publishSucceeded', targetComment: { cid: targetCommentCid, number: targetCommentNumber } });
            } catch (error) {
              console.error('Transfer finalization failed:', error);
              await cleanupTemporaryAccount();
              onTransferStateChange?.('finalizationFailed');
              dispatchModalState({ type: 'publishFinalizationFailed', error });
            }
          },
          onError: async (error: Error & { details?: unknown }) => {
            console.error('Transfer failed:', error, error.details);
            await cleanupTemporaryAccount({ deletePendingComment: true });
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
          <div className={styles.transferRow}>
            <span className={styles.transferLabel}>{t('modQueue.transferTarget')}</span>
            <span>{targetBoardLabel}</span>
          </div>

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
          {(transferState === 'failed' || transferState === 'finalizationFailed') && transferError !== undefined && (
            <div className={styles.transferError}>
              <ErrorDisplay error={transferError} inline={true} showImmediately={true} />
            </div>
          )}
          {transferState === 'succeeded' && targetComment && (
            <div className={styles.transferSuccess}>
              {t('modQueue.transferSuccess')} <Link to={`/trash/thread/${targetComment.cid}`}>{`>>>/trash/${targetComment.number ?? targetComment.cid}`}</Link>
            </div>
          )}
        </div>

        <div className={styles.transferFooter}>
          <button type='button' onClick={onClose} disabled={isPublishingTransfer}>
            {t('close')}
          </button>
          <button type='submit' disabled={!canSubmit}>
            {isPublishingTransfer ? t('publishing') : t('trash')}
          </button>
        </div>
      </form>
    </animated.div>,
    document.body,
  );
};

export default PostTransferModal;
