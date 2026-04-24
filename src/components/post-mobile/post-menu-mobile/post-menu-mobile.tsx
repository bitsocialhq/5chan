import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import type { ChallengeVerification, Comment } from '@bitsocial/bitsocial-react-hooks';
import { useAccount, usePublishCommentEdit } from '@bitsocial/bitsocial-react-hooks';
import { autoUpdate, flip, FloatingFocusManager, offset, shift, useClick, useDismiss, useFloating, useId, useInteractions, useRole } from '@floating-ui/react';
import styles from './post-menu-mobile.module.css';
import { getCommentMediaInfo } from '../../../lib/utils/media-utils';
import { copyShareLinkToClipboard, isValidURL, type ShareLinkType } from '../../../lib/utils/url-utils';
import { copyToClipboard } from '../../../lib/utils/clipboard-utils';
import { getBoardPath } from '../../../lib/utils/route-utils';
import { useDirectories } from '../../../hooks/use-directories';
import useEditCommentPrivileges from '../../../hooks/use-author-privileges';
import { useBoardPseudonymityMode } from '../../../hooks/use-board-pseudonymity-mode';
import useHide from '../../../hooks/use-hide';
import EditMenu from '../../edit-menu/edit-menu';
import { isPostPageView } from '../../../lib/utils/view-utils';
import { useLocation, useParams } from 'react-router-dom';
import { PostMenuProps } from '../../../lib/utils/post-menu-props';
import { getCommentCommunityAddress, withResolvedCommentCommunityAddress } from '../../../lib/utils/comment-utils';
import { alertChallengeVerificationFailed, type ChallengePublication } from '../../../lib/utils/challenge-utils';
import useChallengesStore from '../../../stores/use-challenges-store';

async function copyShareLinkSafe(boardIdentifier: string, linkType: ShareLinkType, cid?: string): Promise<void> {
  try {
    if (linkType === 'thread' && cid) {
      await copyShareLinkToClipboard(boardIdentifier, linkType, cid);
    } else {
      await copyShareLinkToClipboard(boardIdentifier, linkType as Exclude<ShareLinkType, 'thread'>);
    }
  } catch (error) {
    console.error('Failed to copy share link', error);
  }
}

async function copyContentIdSafe(cid: string): Promise<void> {
  try {
    await copyToClipboard(cid);
  } catch (error) {
    console.error('Failed to copy content id', error);
  }
}

async function copyUserIdSafe(address: string): Promise<void> {
  try {
    await copyToClipboard(address);
  } catch (error) {
    console.error('Failed to copy user id', error);
  }
}

type HideButtonProps = {
  cid?: string;
  isReply?: boolean;
  postCid?: string;
  onClose?: () => void;
};

type CopyLinkButtonProps =
  | { cid: string; communityAddress: string; linkType: 'thread'; onClose: () => void }
  | { communityAddress: string; linkType: Exclude<ShareLinkType, 'thread'>; onClose: () => void; cid?: undefined };

const CopyLinkButton = ({ cid, communityAddress, linkType, onClose }: CopyLinkButtonProps) => {
  const { t } = useTranslation();
  const directories = useDirectories();
  const boardIdentifier = getBoardPath(communityAddress, directories);
  const handleClick = async () => {
    await copyShareLinkSafe(boardIdentifier, linkType, linkType === 'thread' ? cid : undefined);
    onClose();
  };
  return (
    <div
      role='button'
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleClick();
        }
      }}
    >
      <div className={styles.postMenuItem}>{t('copy_direct_link')}</div>
    </div>
  );
};

const CopyContentIdButton = ({ cid, onClose }: { cid: string; onClose: () => void }) => {
  const { t } = useTranslation();
  const handleClick = async () => {
    await copyContentIdSafe(cid);
    onClose();
  };
  return (
    <div
      role='button'
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleClick();
        }
      }}
    >
      <div className={styles.postMenuItem}>{t('copy_content_id')}</div>
    </div>
  );
};

const CopyUserIdButton = ({ address, onClose }: { address: string; onClose: () => void }) => {
  const { t } = useTranslation();
  const handleClick = async () => {
    await copyUserIdSafe(address);
    onClose();
  };
  return (
    <div
      role='button'
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleClick();
        }
      }}
    >
      <div className={styles.postMenuItem}>{t('copy_user_id')}</div>
    </div>
  );
};

const ImageSearchButtons = ({ url, onClose }: { url: string; onClose: () => void }) => {
  const { t } = useTranslation();
  const encodedUrl = encodeURIComponent(url);
  return (
    <div
      role='button'
      tabIndex={0}
      onClick={onClose}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClose();
        }
      }}
    >
      <a href={`https://lens.google.com/uploadbyurl?url=${encodedUrl}`} target='_blank' rel='noopener noreferrer'>
        <div className={styles.postMenuItem}>{t('search_image_on_google')}</div>
      </a>
      <a href={`https://www.yandex.com/images/search?img_url=${encodedUrl}&rpt=imageview`} target='_blank' rel='noopener noreferrer'>
        <div className={styles.postMenuItem}>{t('search_image_on_yandex')}</div>
      </a>
      <a href={`https://saucenao.com/search.php?url=${encodedUrl}`} target='_blank' rel='noopener noreferrer'>
        <div className={styles.postMenuItem}>{t('search_image_on_saucenao')}</div>
      </a>
    </div>
  );
};

const { addChallenge } = useChallengesStore.getState();

const ReportPostButton = ({ onClose }: { onClose: () => void }) => {
  const { t } = useTranslation();
  const handleClick = () => {
    alert("Reporting isn't available yet.");
    onClose();
  };
  return (
    <div
      role='button'
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleClick();
        }
      }}
    >
      <div className={styles.postMenuItem}>{t('report_post')}</div>
    </div>
  );
};

type DeletePostButtonProps = {
  post: Comment;
  onClose: () => void;
};

const DeletePostButton = ({ post, onClose }: DeletePostButtonProps) => {
  const { t } = useTranslation();
  const account = useAccount();
  const resolvedPost = withResolvedCommentCommunityAddress(post);
  const { author, cid } = resolvedPost || {};
  const communityAddress = getCommentCommunityAddress(resolvedPost);
  const { isAccountCommentAuthor } = useEditCommentPrivileges({
    commentAuthorAddress: author?.address || '',
    communityAddress: communityAddress || '',
    postCid: resolvedPost?.postCid,
  });
  const signer = isAccountCommentAuthor ? account?.signer : undefined;
  const signerMatchesAuthor = Boolean(signer?.address && author?.address && signer.address === author.address);
  const latestPostRef = useRef(resolvedPost);
  useEffect(() => {
    latestPostRef.current = resolvedPost;
  }, [resolvedPost]);
  const onChallenge = useCallback(async (...args: unknown[]) => {
    addChallenge([...args, latestPostRef.current]);
  }, []);

  const deleteOptions = useMemo(
    () => ({
      commentCid: cid,
      communityAddress,
      deleted: true,
      ...(isAccountCommentAuthor && signer
        ? {
            signer,
            author: signerMatchesAuthor ? { address: signer.address, displayName: resolvedPost?.author?.displayName } : account?.author,
          }
        : {}),
      onChallenge,
      onChallengeVerification: async (challengeVerification: ChallengeVerification, publication: ChallengePublication | undefined) => {
        alertChallengeVerificationFailed(challengeVerification, publication);
      },
      onError: (error: Error) => {
        console.warn(error);
        alert('Comment edit failed. ' + error.message);
      },
    }),
    [cid, communityAddress, isAccountCommentAuthor, signer, signerMatchesAuthor, resolvedPost?.author?.displayName, account?.author, onChallenge],
  );

  const { publishCommentEdit } = usePublishCommentEdit(deleteOptions);

  const handleClick = async () => {
    const confirmed = window.confirm(t('delete_post_confirm'));
    if (!confirmed) {
      return;
    }
    try {
      await publishCommentEdit();
      onClose();
    } catch (error) {
      if (error instanceof Error) {
        alert(error.message);
      }
    }
  };

  return (
    <div
      role='button'
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleClick();
        }
      }}
    >
      <div className={styles.postMenuItem}>{t('delete_post')}</div>
    </div>
  );
};

const HidePostButton = ({ cid, isReply, onClose, postCid }: HideButtonProps) => {
  const { t } = useTranslation();
  const { hide, hidden, unhide } = useHide({ cid: cid || '' });
  const isInPostView = isPostPageView(useLocation().pathname, useParams());

  const handleClick = () => {
    if (hidden) {
      unhide();
    } else {
      hide();
    }
    onClose?.();
  };
  return (
    (!isInPostView || isReply) && (
      <div
        role='button'
        tabIndex={0}
        onClick={handleClick}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleClick();
          }
        }}
      >
        <div className={styles.postMenuItem}>
          {hidden ? (postCid === cid ? t('unhide_thread') : t('unhide_post')) : postCid === cid ? t('hide_thread') : t('hide_post')}
        </div>
      </div>
    )
  );
};

type PostMenuMobileProps = {
  postMenu: PostMenuProps;
  editMenuPost?: Comment;
};

const PostMenuMobile = ({ postMenu, editMenuPost }: PostMenuMobileProps) => {
  const { authorAddress, cid, communityAddress, deleted, link, linkHeight, linkWidth, parentCid, postCid, removed, thumbnailUrl } = postMenu || {};
  const { isAccountMod, isAccountCommentAuthor } = useEditCommentPrivileges({
    commentAuthorAddress: authorAddress || '',
    communityAddress: communityAddress || '',
  });
  const pseudonymityMode = useBoardPseudonymityMode(communityAddress);
  const canAttemptAuthorDelete = pseudonymityMode !== undefined && pseudonymityMode !== 'none';
  const commentMediaInfo = getCommentMediaInfo(link || '', thumbnailUrl || '', linkWidth || 0, linkHeight || 0);
  const { thumbnail, type, url } = commentMediaInfo || {};
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { refs, floatingStyles, context } = useFloating({
    placement: 'bottom-start',
    open: isMenuOpen,
    onOpenChange: setIsMenuOpen,
    middleware: [offset({ mainAxis: 3, crossAxis: 8 }), flip(), shift({ padding: 10 })],
    whileElementsMounted: autoUpdate,
  });
  const click = useClick(context);
  const dismiss = useDismiss(context);
  const role = useRole(context);
  const { getReferenceProps, getFloatingProps } = useInteractions([click, dismiss, role]);
  const headingId = useId();

  const handleMenuClick = () => {
    if (cid) {
      setIsMenuOpen((prev) => !prev);
    }
  };

  const handleClose = () => setIsMenuOpen(false);

  return (
    <>
      {!(deleted || removed) && (
        <>
          <span
            className={styles.postMenuBtn}
            title='Post menu'
            role='button'
            tabIndex={0}
            onClick={handleMenuClick}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleMenuClick();
              }
            }}
            ref={refs.setReference}
            {...getReferenceProps()}
          >
            ...
          </span>
          {isMenuOpen &&
            cid &&
            createPortal(
              <FloatingFocusManager context={context} modal={false}>
                <div className={styles.postMenu} ref={refs.setFloating} style={floatingStyles} aria-labelledby={headingId} {...getFloatingProps()}>
                  <ReportPostButton onClose={handleClose} />
                  {cid && communityAddress && <HidePostButton cid={cid} isReply={!!parentCid} postCid={postCid} onClose={handleClose} />}
                  {(isAccountCommentAuthor || canAttemptAuthorDelete) && cid && editMenuPost && <DeletePostButton post={editMenuPost} onClose={handleClose} />}
                  {cid && communityAddress && <CopyLinkButton cid={cid} communityAddress={communityAddress} linkType='thread' onClose={handleClose} />}
                  {cid && <CopyContentIdButton cid={cid} onClose={handleClose} />}
                  {authorAddress && <CopyUserIdButton address={authorAddress} onClose={handleClose} />}
                  {link && isValidURL(link) && (type === 'image' || type === 'gif' || thumbnail) && url && <ImageSearchButtons url={url} onClose={handleClose} />}
                </div>
              </FloatingFocusManager>,
              document.body,
            )}
        </>
      )}
      {isAccountMod && cid && editMenuPost && (
        <span className={styles.checkbox}>
          <EditMenu post={editMenuPost} />
        </span>
      )}
    </>
  );
};

export default memo(PostMenuMobile);
