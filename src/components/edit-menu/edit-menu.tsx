import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { autoUpdate, FloatingFocusManager, FloatingPortal, offset, shift, useClick, useDismiss, useFloating, useId, useInteractions, useRole } from '@floating-ui/react';
import {
  Comment,
  PublishCommentEditOptions,
  useAccount,
  usePublishCommentEdit,
  usePublishCommentModeration,
  PublishCommentModerationOptions,
} from '@bitsocialnet/bitsocial-react-hooks';
import styles from './edit-menu.module.css';
import { alertChallengeVerificationFailed } from '../../lib/utils/challenge-utils';
import { isCommentArchived } from '../../lib/utils/comment-moderation-utils';
import useChallengesStore from '../../stores/use-challenges-store';
import capitalize from 'lodash/capitalize';
import useIsMobile from '../../hooks/use-is-mobile';
import useAuthorPrivileges from '../../hooks/use-author-privileges';
import { useBoardPseudonymityMode } from '../../hooks/use-board-pseudonymity-mode';
import { getCommentCommunityAddress, withResolvedCommentCommunityAddress } from '../../lib/utils/comment-utils';

const { addChallenge } = useChallengesStore.getState();

const daysToTimestampInSeconds = (days: number) => {
  const now = new Date();
  now.setDate(now.getDate() + days);
  return Math.floor(now.getTime() / 1000);
};

const timestampToDays = (timestamp: number) => {
  const now = Math.floor(Date.now() / 1000);
  return Math.max(1, Math.floor((timestamp - now) / (24 * 60 * 60)));
};

const EditMenu = ({ post }: { post: Comment }) => {
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  const resolvedPost = withResolvedCommentCommunityAddress(post);
  const { author, cid, content, deleted, locked, parentCid, pinned, postCid, removed, spoiler } = resolvedPost || {};
  const communityAddress = getCommentCommunityAddress(resolvedPost);
  const archived = isCommentArchived(resolvedPost);
  const authorDisplayName = resolvedPost?.author?.displayName;
  const modBanExpiresAt = resolvedPost?.commentModeration?.author?.banExpiresAt;
  const purged = resolvedPost?.commentModeration?.purged ?? false;
  const [isEditMenuOpen, setIsEditMenuOpen] = useState(false);
  const [isContentEditorOpen, setIsContentEditorOpen] = useState(false);

  const account = useAccount();
  const { isCommentAuthorMod, isAccountMod, isAccountCommentAuthor } = useAuthorPrivileges({
    commentAuthorAddress: author?.address,
    communityAddress: communityAddress || '',
    postCid,
  });
  const pseudonymityMode = useBoardPseudonymityMode(communityAddress);
  const allowsPseudonymousDelete = pseudonymityMode !== undefined && pseudonymityMode !== 'none';
  const canAttemptAuthorDelete = isAccountCommentAuthor || allowsPseudonymousDelete;
  const canOpenEditMenu = isAccountMod || canAttemptAuthorDelete;
  const requiresDeleteSelection = canAttemptAuthorDelete && !isAccountCommentAuthor && !isAccountMod;
  const signer = isAccountCommentAuthor ? account?.signer : undefined;
  const latestPostRef = useRef(resolvedPost);
  useEffect(() => {
    latestPostRef.current = resolvedPost;
  }, [resolvedPost]);
  const onChallenge = useCallback((...args: any) => addChallenge([...args, latestPostRef.current]), []);

  const defaultPublishEditOptions = useMemo(() => {
    return {
      commentCid: cid,
      communityAddress,
      // Author edit properties
      content: isAccountCommentAuthor ? content : undefined,
      deleted: canAttemptAuthorDelete ? (deleted ?? false) : undefined,
      spoiler: isAccountCommentAuthor ? (spoiler ?? false) : undefined,
      // Mod edit properties
      commentModeration: isAccountMod
        ? {
            locked: locked ?? false,
            archived: parentCid === undefined ? (archived ?? false) : undefined,
            pinned: pinned ?? false,
            removed: removed ?? false,
            purged: purged ?? false,
            spoiler: spoiler ?? false,
            author: modBanExpiresAt ? { banExpiresAt: modBanExpiresAt } : undefined,
          }
        : undefined,
      onChallenge,
      onChallengeVerification: alertChallengeVerificationFailed,
      onError: (error: Error) => {
        console.warn(error);
        alert('Comment edit failed. ' + error.message);
      },
    };
  }, [
    isAccountMod,
    isAccountCommentAuthor,
    canAttemptAuthorDelete,
    archived,
    cid,
    content,
    deleted,
    locked,
    pinned,
    removed,
    purged,
    spoiler,
    communityAddress,
    modBanExpiresAt,
    onChallenge,
  ]);

  const [publishCommentEditOptions, setPublishCommentEditOptions] = useState<PublishCommentEditOptions>(defaultPublishEditOptions);

  const authorEditOptions = useMemo<PublishCommentEditOptions>(() => {
    const options: PublishCommentEditOptions = {
      commentCid: cid,
      communityAddress,
      content: publishCommentEditOptions.content,
      deleted: publishCommentEditOptions.deleted,
      spoiler: publishCommentEditOptions.spoiler,
      onChallenge,
      onChallengeVerification: alertChallengeVerificationFailed,
      onError: (error: Error) => {
        console.warn(error);
        alert('Comment edit failed. ' + error.message);
      },
    };

    if (!isAccountCommentAuthor) {
      return options;
    }

    return {
      ...options,
      signer,
      author: signer?.address === author?.address ? { address: signer?.address, displayName: authorDisplayName } : account?.author,
    };
  }, [publishCommentEditOptions, cid, communityAddress, isAccountCommentAuthor, signer, account?.author, author?.address, authorDisplayName, onChallenge]);

  const modEditOptions = useMemo<PublishCommentModerationOptions>(
    () => ({
      commentCid: cid,
      communityAddress,
      commentModeration: {
        locked: parentCid === undefined ? publishCommentEditOptions.commentModeration?.locked : undefined,
        archived: parentCid === undefined ? publishCommentEditOptions.commentModeration?.archived : undefined,
        pinned: publishCommentEditOptions.commentModeration?.pinned,
        removed: publishCommentEditOptions.commentModeration?.removed,
        purged: publishCommentEditOptions.commentModeration?.purged,
        spoiler: publishCommentEditOptions.commentModeration?.spoiler,
        author: publishCommentEditOptions.commentModeration?.author,
      },
      author: account?.author,
      onChallenge,
      onChallengeVerification: alertChallengeVerificationFailed,
      onError: (error: Error) => {
        console.warn(error);
        alert('Comment moderation failed. ' + error.message);
      },
    }),
    [publishCommentEditOptions, cid, communityAddress, account?.author, parentCid, onChallenge],
  );

  const { publishCommentEdit: publishAuthorEdit } = usePublishCommentEdit(authorEditOptions);
  const { publishCommentModeration } = usePublishCommentModeration(modEditOptions);

  const [banDuration, setBanDuration] = useState(() =>
    defaultPublishEditOptions.commentModeration?.author?.banExpiresAt ? timestampToDays(defaultPublishEditOptions.commentModeration.author.banExpiresAt) : 1,
  );

  const resetMenuState = () => {
    setPublishCommentEditOptions(defaultPublishEditOptions);
    setBanDuration(
      defaultPublishEditOptions.commentModeration?.author?.banExpiresAt ? timestampToDays(defaultPublishEditOptions.commentModeration.author.banExpiresAt) : 1,
    );
    setIsContentEditorOpen(false);
  };

  const onCheckbox = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, checked } = e.target;

    setPublishCommentEditOptions((state) => {
      const newState = { ...state };

      if (isAccountMod) {
        if (id === 'banUser') {
          const banValue = checked ? daysToTimestampInSeconds(banDuration) : undefined;
          newState.commentModeration = {
            ...newState.commentModeration,
            author: banValue ? { banExpiresAt: banValue } : undefined,
          };
        } else {
          newState.commentModeration = {
            ...newState.commentModeration,
            [id]: checked,
          };
        }
      }

      if (id === 'deleted' && canAttemptAuthorDelete) {
        newState.deleted = checked;
      } else if (isAccountCommentAuthor) {
        newState[id] = checked;
      }

      return newState;
    });
  };

  const onBanDurationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const days = parseInt(e.target.value, 10) || 1;
    setBanDuration(days);
    setPublishCommentEditOptions((state) => {
      // Only update ban expiration if ban is currently enabled (checkbox is checked)
      const isBanEnabled = state.commentModeration?.author?.banExpiresAt !== undefined;
      return {
        ...state,
        commentModeration: {
          ...state.commentModeration,
          author: isBanEnabled ? { banExpiresAt: daysToTimestampInSeconds(days) } : state.commentModeration?.author,
        },
      };
    });
  };

  const onPurgeCheckbox = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { checked } = e.target;

    if (checked) {
      const confirmed = window.confirm(t('purge_confirm'));
      if (!confirmed) {
        return;
      }
    }

    setPublishCommentEditOptions((state) => {
      const newState = { ...state };
      if (isAccountMod) {
        newState.commentModeration = {
          ...newState.commentModeration,
          purged: checked,
        };
      }
      return newState;
    });
  };

  const { refs, floatingStyles, context } = useFloating({
    placement: 'bottom-start',
    open: isEditMenuOpen,
    onOpenChange: setIsEditMenuOpen,
    middleware: [offset(2), shift()],
    whileElementsMounted: autoUpdate,
  });

  const click = useClick(context);
  const dismiss = useDismiss(context);
  const role = useRole(context);

  const { getReferenceProps, getFloatingProps } = useInteractions([click, dismiss, role]);

  const headingId = useId();
  const canSave = !requiresDeleteSelection || publishCommentEditOptions.deleted === true;

  const _publishCommentEdit = async () => {
    if (!canSave) {
      return;
    }

    const shouldPublishAuthorEdit = isAccountCommentAuthor || (canAttemptAuthorDelete && publishCommentEditOptions.deleted === true);

    try {
      if (shouldPublishAuthorEdit && isAccountMod) {
        await publishAuthorEdit();
        await publishCommentModeration();
      } else if (shouldPublishAuthorEdit) {
        await publishAuthorEdit();
      } else if (isAccountMod) {
        await publishCommentModeration();
      }
    } catch (error) {
      if (error instanceof Error) {
        console.warn(error);
        alert(error.message);
      }
    }
    setIsEditMenuOpen(false);
  };

  return (
    <>
      <span className={`${styles.checkbox} ${parentCid && styles.replyCheckbox}`} ref={refs.setReference} {...(cid && getReferenceProps())}>
        <input
          type='checkbox'
          onChange={() => {
            if (cid && canOpenEditMenu) {
              if (!isEditMenuOpen) {
                resetMenuState();
                setIsEditMenuOpen(true);
              } else {
                setIsEditMenuOpen(false);
              }
            } else {
              setIsEditMenuOpen(false);
              alert(parentCid ? t('cannot_edit_reply') : t('cannot_edit_thread'));
            }
          }}
          checked={isEditMenuOpen}
        />
      </span>
      {isEditMenuOpen && canOpenEditMenu && (
        <FloatingPortal>
          <FloatingFocusManager context={context} modal={false}>
            <div className={styles.modal} ref={refs.setFloating} style={floatingStyles} aria-labelledby={headingId} {...getFloatingProps()}>
              <div className={styles.editMenu}>
                {canAttemptAuthorDelete && (
                  <>
                    <div className={styles.menuItem}>
                      <label>
                        [
                        <input onChange={onCheckbox} checked={publishCommentEditOptions.deleted ?? false} type='checkbox' id='deleted' />
                        {capitalize(t('delete'))}?]
                      </label>
                    </div>
                  </>
                )}
                {isAccountCommentAuthor && (
                  <>
                    <div className={styles.menuItem}>
                      <label>
                        [
                        <input type='checkbox' onChange={() => setIsContentEditorOpen(!isContentEditorOpen)} checked={isContentEditorOpen} />
                        {capitalize(t('edit'))}?]
                      </label>
                    </div>
                    {isContentEditorOpen && (
                      <div>
                        <textarea
                          className={styles.editTextarea}
                          value={publishCommentEditOptions.content || ''}
                          onChange={(e) => {
                            const newContent = e.target.value;
                            setPublishCommentEditOptions((state) => ({ ...state, content: newContent }));
                          }}
                        />
                      </div>
                    )}
                  </>
                )}
                {isAccountMod && (
                  <>
                    <div className={styles.menuItem}>
                      <label>
                        [
                        <input onChange={onCheckbox} checked={publishCommentEditOptions.commentModeration?.removed ?? false} type='checkbox' id='removed' />
                        {capitalize(t('remove'))}?]
                      </label>{' '}
                      <span className={styles.purgeItem}>
                        <label>
                          [
                          <input onChange={onPurgeCheckbox} checked={publishCommentEditOptions.commentModeration?.purged ?? false} type='checkbox' id='purged' />
                          {capitalize(t('purge'))}?]
                        </label>
                      </span>
                    </div>
                    {!parentCid && (
                      <div className={styles.menuItem}>
                        [
                        <label>
                          <input onChange={onCheckbox} checked={publishCommentEditOptions.commentModeration?.locked ?? false} type='checkbox' id='locked' />
                          {capitalize(t('close_thread'))}?
                        </label>
                        ]
                      </div>
                    )}
                    <div className={styles.menuItem}>
                      [
                      <label>
                        <input onChange={onCheckbox} checked={publishCommentEditOptions.commentModeration?.spoiler ?? false} type='checkbox' id='spoiler' />
                        {capitalize(t('spoiler'))}?
                      </label>
                      ]
                    </div>
                    {!parentCid && (
                      <div className={styles.menuItem}>
                        [
                        <label>
                          <input onChange={onCheckbox} checked={publishCommentEditOptions.commentModeration?.archived ?? false} type='checkbox' id='archived' />
                          {capitalize(t('archived'))}?
                        </label>
                        ]
                      </div>
                    )}
                    <div className={styles.menuItem}>
                      [
                      <label>
                        <input onChange={onCheckbox} checked={publishCommentEditOptions.commentModeration?.pinned ?? false} type='checkbox' id='pinned' />
                        {capitalize(t('sticky'))}?
                      </label>
                      ]
                    </div>
                    {!isCommentAuthorMod && isAccountMod && !isAccountCommentAuthor && (
                      <div className={styles.menuItem}>
                        [
                        <label>
                          <input
                            onChange={onCheckbox}
                            checked={publishCommentEditOptions.commentModeration?.author?.banExpiresAt !== undefined}
                            type='checkbox'
                            id='banUser'
                          />
                          <Trans
                            i18nKey='ban_user_for'
                            shouldUnescape={true}
                            components={{
                              1: (
                                <input
                                  key='ban-duration-input'
                                  className={styles.banInput}
                                  onChange={onBanDurationChange}
                                  type='number'
                                  min={1}
                                  max={100}
                                  value={banDuration || ''}
                                />
                              ),
                            }}
                          />
                          ?
                        </label>
                        ]
                      </div>
                    )}
                  </>
                )}
                <div className={styles.bottom}>
                  <button className={isMobile ? 'button' : ''} onClick={_publishCommentEdit} disabled={!canSave}>
                    {t('save')}
                  </button>
                </div>
              </div>
            </div>
          </FloatingFocusManager>
        </FloatingPortal>
      )}
    </>
  );
};

export default EditMenu;
