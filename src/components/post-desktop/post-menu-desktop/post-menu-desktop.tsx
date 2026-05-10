import { memo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLocation, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { autoUpdate, flip, FloatingFocusManager, offset, shift, useClick, useDismiss, useFloating, useId, useInteractions, useRole } from '@floating-ui/react';
import styles from './post-menu-desktop.module.css';
import { getCommentMediaInfo } from '../../../lib/utils/media-utils';
import { copyShareLinkToClipboard, isValidURL, type ShareLinkType } from '../../../lib/utils/url-utils';
import { copyToClipboard } from '../../../lib/utils/clipboard-utils';
import { getBoardPath } from '../../../lib/utils/route-utils';
import { useDirectories } from '../../../hooks/use-directories';
import { isCatalogView, isPostPageView } from '../../../lib/utils/view-utils';
import useHide from '../../../hooks/use-hide';
import capitalize from 'lodash/capitalize';
import { PostMenuProps } from '../../../lib/utils/post-menu-props';

const safeCopyShareLink = async (boardIdentifier: string, linkType: ShareLinkType, cid?: string): Promise<boolean> => {
  try {
    if (linkType === 'thread' && cid) {
      await copyShareLinkToClipboard(boardIdentifier, linkType, cid);
    } else {
      await copyShareLinkToClipboard(boardIdentifier, linkType as Exclude<ShareLinkType, 'thread'>);
    }
    return true;
  } catch (error) {
    console.error('Failed to copy share link', error);
    return false;
  }
};

const safeCopyToClipboard = async (text: string, label: string): Promise<boolean> => {
  try {
    await copyToClipboard(text);
    return true;
  } catch (error) {
    console.error(`Failed to copy ${label}`, error);
    return false;
  }
};

type CopyLinkButtonProps =
  | { cid: string; communityAddress: string; linkType: 'thread'; onClose: () => void }
  | { communityAddress: string; linkType: Exclude<ShareLinkType, 'thread'>; onClose: () => void; cid?: undefined };

const CopyLinkButton = ({ cid, communityAddress, linkType, onClose }: CopyLinkButtonProps) => {
  const { t } = useTranslation();
  const directories = useDirectories();
  const boardIdentifier = getBoardPath(communityAddress, directories);
  const copyDirectLink = async () => {
    await safeCopyShareLink(boardIdentifier, linkType, linkType === 'thread' ? cid : undefined);
    onClose();
  };
  return (
    <div
      className={styles.postMenuItem}
      role='button'
      tabIndex={0}
      onClick={copyDirectLink}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          copyDirectLink();
        }
      }}
    >
      {t('copy_direct_link')}
    </div>
  );
};

const CopyContentIdButton = ({ cid, onClose }: { cid: string; onClose: () => void }) => {
  const { t } = useTranslation();
  const copyContentId = async () => {
    await safeCopyToClipboard(cid, 'content id');
    onClose();
  };
  return (
    <div
      className={styles.postMenuItem}
      role='button'
      tabIndex={0}
      onClick={copyContentId}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          copyContentId();
        }
      }}
    >
      {t('copy_content_id')}
    </div>
  );
};

const CopyUserIdButton = ({ address, onClose }: { address: string; onClose: () => void }) => {
  const { t } = useTranslation();
  const copyUserId = async () => {
    await safeCopyToClipboard(address, 'user id');
    onClose();
  };
  return (
    <div
      className={styles.postMenuItem}
      role='button'
      tabIndex={0}
      onClick={copyUserId}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          copyUserId();
        }
      }}
    >
      {t('copy_user_id')}
    </div>
  );
};

const ImageSearchButton = ({ url, onClose }: { url: string; onClose: () => void }) => {
  const { t } = useTranslation();
  const [isImageSearchMenuOpen, setIsImageSearchMenuOpen] = useState(false);
  const encodedUrl = encodeURIComponent(url);

  const { refs, floatingStyles } = useFloating({
    placement: 'right-start',
    middleware: [flip(), shift({ padding: 10 })],
  });

  return (
    <div
      className={`${styles.postMenuItem} ${styles.dropdown}`}
      role='button'
      tabIndex={0}
      onMouseOver={() => setIsImageSearchMenuOpen(true)}
      onMouseLeave={() => setIsImageSearchMenuOpen(false)}
      ref={refs.setReference}
      onClick={onClose}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClose();
        }
      }}
    >
      {capitalize(t('image_search'))} »
      {isImageSearchMenuOpen && (
        <div ref={refs.setFloating} style={floatingStyles} className={styles.dropdownMenu}>
          <a href={`https://lens.google.com/uploadbyurl?url=${encodedUrl}`} target='_blank' rel='noopener noreferrer'>
            <div className={styles.postMenuItem}>Google</div>
          </a>
          <a href={`https://www.yandex.com/images/search?img_url=${encodedUrl}&rpt=imageview`} target='_blank' rel='noopener noreferrer'>
            <div className={styles.postMenuItem}>Yandex</div>
          </a>
          <a href={`https://saucenao.com/search.php?url=${encodedUrl}`} target='_blank' rel='noopener noreferrer'>
            <div className={styles.postMenuItem}>SauceNAO</div>
          </a>
        </div>
      )}
    </div>
  );
};

type PostMenuDesktopProps = {
  postMenu: PostMenuProps;
};

const PostMenuDesktop = ({ postMenu }: PostMenuDesktopProps) => {
  const { t } = useTranslation();
  const { authorAddress, cid, communityAddress, link, thumbnailUrl, linkWidth, linkHeight, postCid } = postMenu || {};
  const commentMediaInfo = getCommentMediaInfo(link || '', thumbnailUrl || '', linkWidth ?? 0, linkHeight ?? 0);
  const { thumbnail, type, url } = commentMediaInfo || {};
  const [menuBtnRotated, setMenuBtnRotated] = useState(false);

  const { hidden, unhide, hide } = useHide({ cid: cid || '' });

  const location = useLocation();
  const params = useParams();
  const isInCatalogView = isCatalogView(location.pathname, params);
  const isInPostPageView = isPostPageView(location.pathname, params);

  const { refs, floatingStyles, context } = useFloating({
    placement: 'bottom-start',
    open: menuBtnRotated,
    onOpenChange: setMenuBtnRotated,
    middleware: [offset({ mainAxis: isInCatalogView ? -2 : 6, crossAxis: isInCatalogView ? -1 : 5 }), flip({ fallbackAxisSideDirection: 'end' }), shift({ padding: 10 })],
    whileElementsMounted: autoUpdate,
  });
  const click = useClick(context);
  const dismiss = useDismiss(context);
  const role = useRole(context);
  const { getReferenceProps, getFloatingProps } = useInteractions([click, dismiss, role]);
  const headingId = useId();

  const handleMenuClick = () => {
    if (cid) {
      setMenuBtnRotated((prev) => !prev);
    }
  };

  const handleClose = () => setMenuBtnRotated(false);

  return (
    <>
      <span className={isInCatalogView ? styles.postMenuBtnCatalogWrapper : styles.postMenuBtnWrapper} ref={refs.setReference} {...getReferenceProps()}>
        <span
          className={isInCatalogView ? styles.postMenuBtnCatalog : styles.postMenuBtn}
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
          style={{ transform: menuBtnRotated && cid ? 'rotate(90deg)' : 'rotate(0deg)' }}
        >
          ▶
        </span>
      </span>
      {menuBtnRotated &&
        cid &&
        createPortal(
          <FloatingFocusManager context={context} modal={false}>
            <div className={styles.postMenu} ref={refs.setFloating} style={floatingStyles} aria-labelledby={headingId} {...getFloatingProps()}>
              <div
                className={styles.postMenuItem}
                role='button'
                tabIndex={0}
                onClick={() => {
                  alert("Reporting isn't available yet.");
                  handleClose();
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    alert("Reporting isn't available yet.");
                    handleClose();
                  }
                }}
              >
                {t('report_post')}
              </div>
              {!(isInPostPageView && postCid === cid) && (
                <div
                  className={styles.postMenuItem}
                  role='button'
                  tabIndex={0}
                  onClick={() => {
                    if (hidden) {
                      unhide();
                    } else {
                      hide();
                    }
                    handleClose();
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      if (hidden) {
                        unhide();
                      } else {
                        hide();
                      }
                      handleClose();
                    }
                  }}
                >
                  {hidden ? (postCid === cid ? t('unhide_thread') : t('unhide_post')) : postCid === cid ? t('hide_thread') : t('hide_post')}
                </div>
              )}
              {cid && communityAddress && <CopyLinkButton cid={cid} communityAddress={communityAddress} linkType='thread' onClose={handleClose} />}
              {cid && <CopyContentIdButton cid={cid} onClose={handleClose} />}
              {authorAddress && <CopyUserIdButton address={authorAddress} onClose={handleClose} />}
              {link && isValidURL(link) && (type === 'image' || type === 'gif' || thumbnail) && url && <ImageSearchButton url={url} onClose={handleClose} />}
            </div>
          </FloatingFocusManager>,
          document.body,
        )}
    </>
  );
};

export default memo(PostMenuDesktop);
