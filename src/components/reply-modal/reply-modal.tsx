import { useEffect, useRef, useState } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { setAccount, useAccount } from '@bitsocialnet/bitsocial-react-hooks';
import { isValidURL } from '../../lib/utils/url-utils';
import { isAllView, isModView, isSubscriptionsView } from '../../lib/utils/view-utils';
import useSelectedTextStore from '../../stores/use-selected-text-store';
import useReplyModalStore from '../../stores/use-reply-modal-store';
import { getShowUploadControls, isWebRuntime } from '../../lib/media-hosting/show-upload-controls';
import useMediaHostingStore from '../../stores/use-media-hosting-store';
import { useDirectoryByAddress } from '../../hooks/use-directories';
import usePublishReply from '../../hooks/use-publish-reply';
import useIsMobile from '../../hooks/use-is-mobile';
import { useFileUpload } from '../../hooks/use-file-upload';
import BoardOfflineAlert from '../board-offline-alert/board-offline-alert';
import styles from './reply-modal.module.css';
import capitalize from 'lodash/capitalize';
import debounce from 'lodash/debounce';
import { useSpring, animated } from '@react-spring/web';
import { useDrag } from '@use-gesture/react';

interface ReplyModalProps {
  closeModal: () => void;
  showReplyModal: boolean;
  parentCid: string;
  parentNumber: number | null;
  threadNumber: number | null;
  postCid: string;
  scrollY: number;
  communityAddress: string;
}

const ReplyModal = ({ closeModal, showReplyModal, parentCid, parentNumber, threadNumber, postCid, scrollY, communityAddress }: ReplyModalProps) => {
  const { t } = useTranslation();
  const location = useLocation();
  const params = useParams();
  const isInAllView = isAllView(location.pathname);
  const isInModView = isModView(location.pathname);
  const isInSubscriptionsView = isSubscriptionsView(location.pathname, params);
  const directoryEntry = useDirectoryByAddress(communityAddress);
  const showSpoilerForReply = directoryEntry?.features?.noSpoilerReplies !== true;
  const requirePostLinkIsMediaFeature = directoryEntry?.features?.requirePostLinkIsMedia;
  const requirePostLinkIsMedia = requirePostLinkIsMediaFeature === true || (requirePostLinkIsMediaFeature === undefined && (isInAllView || isInSubscriptionsView));
  const { isResolvingExternalQuotes, publishReply, publishReplyError, publishReplyStateMessage, resetPublishReplyOptions, replyIndex, setPublishReplyOptions } =
    usePublishReply({
      cid: parentCid,
      subplebbitAddress: communityAddress,
      postCid,
    });
  const account = useAccount();
  const { displayName } = account?.author || {};
  const textRef = useRef<HTMLTextAreaElement | null>(null);
  const urlRef = useRef<HTMLInputElement>(null);
  const lastSelectionStartRef = useRef(0);
  const lastSelectionEndRef = useRef(0);
  const lastProcessedQuoteInsertRequestIdRef = useRef(0);
  const { selectedText } = useSelectedTextStore();
  const openEmpty = useReplyModalStore((state) => state.openEmpty);
  const quoteInsertRequestId = useReplyModalStore((state) => state.quoteInsertRequestId);
  const quoteInsertNumber = useReplyModalStore((state) => state.quoteInsertNumber);
  const quoteInsertSelectedText = useReplyModalStore((state) => state.quoteInsertSelectedText);

  const [error, setError] = useState<string | null>(null);
  const [lengthError, setLengthError] = useState<string | null>(null);

  const checkContentLengthRef = useRef(
    debounce((content: string, t: Function) => {
      const length = content.trim().length;
      if (length > 2000) {
        setError(null);
        setLengthError(`${t('error')}: ${t('comment_field_too_long', { length })}`);
      } else {
        setLengthError(null);
      }
    }, 1000),
  );

  const onPublishReply = () => {
    const currentContent = textRef.current?.value.trim() || '';
    const currentUrl = urlRef.current?.value.trim() || '';

    if (!currentContent && !currentUrl) {
      setError(t('error') + ': ' + t('empty_comment_alert'));
      return;
    }

    if (currentUrl && !isValidURL(currentUrl)) {
      setError(t('error') + ': ' + t('invalid_url_alert'));
      return;
    }

    checkContentLengthRef.current.cancel();
    setLengthError(null);

    if (currentContent.length > 2000) {
      setError(t('error') + ': ' + t('field_too_long'));
      return;
    }

    setError(null);
    publishReply();
  };

  useEffect(() => {
    if (typeof replyIndex === 'number') {
      resetPublishReplyOptions();
      closeModal();
    }
  }, [replyIndex, resetPublishReplyOptions, closeModal]);

  const nodeRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();

  const [{ left, top }, api] = useSpring(() => ({
    left: Math.round(window.innerWidth / 2 - 150),
    top: Math.round(window.innerHeight / 2 - 200),
  }));

  const bind = useDrag(
    ({ active, event, offset: [ox, oy] }) => {
      const nextLeft = Math.round(ox);
      const nextTop = Math.round(oy);

      if (active) {
        event.preventDefault();
        document.body.style.userSelect = 'none';
        document.body.style.webkitUserSelect = 'none';
      } else {
        document.body.style.userSelect = '';
        document.body.style.webkitUserSelect = '';
      }
      api.start({ left: nextLeft, top: nextTop, immediate: true });
    },
    {
      from: () => [left.get(), top.get()],
      filterTaps: true,
      bounds: undefined,
    },
  );

  useEffect(() => {
    if (nodeRef.current && isMobile) {
      const viewportHeight = window.innerHeight;
      const centeredPosition = Math.round(scrollY + viewportHeight / 2 - 300);
      api.start({ top: centeredPosition, immediate: true });
    }
  }, [api, isMobile, scrollY]);

  const parentCidRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (parentCidRef.current && parentCidRef.current) {
      const cidWidth = parentCidRef.current.offsetWidth;
      parentCidRef.current.style.width = `${cidWidth}px`;
    }
  }, [parentCid]);

  useEffect(() => {
    if (showReplyModal) {
      setTimeout(() => {
        if (textRef.current) {
          textRef.current.focus();
        }
      }, 0);

      if (!isMobile) {
        const handleEscape = (e: KeyboardEvent) => {
          if (e.key === 'Escape') {
            closeModal();
          }
        };
        document.addEventListener('keydown', handleEscape);

        return () => {
          document.removeEventListener('keydown', handleEscape);
        };
      }
    }
  }, [showReplyModal, closeModal, isMobile]);

  useEffect(() => {
    if (textRef.current) {
      const len = textRef.current.value.length;
      textRef.current.setSelectionRange(len, len);
    }
  }, []);

  const defaultParentQuote = `>>${parentNumber ?? '?'}\n`;

  // Enable spellcheck after initial content is injected into the textarea.
  useEffect(() => {
    if (showReplyModal && textRef.current) {
      textRef.current.spellcheck = false;
      textRef.current.value = openEmpty ? selectedText || '' : `${defaultParentQuote}${selectedText || ''}`;
      const len = textRef.current.value.length;
      lastSelectionStartRef.current = len;
      lastSelectionEndRef.current = len;
      const content = textRef.current.value;
      setPublishReplyOptions({ content });
      checkContentLengthRef.current(content, t);

      setTimeout(() => {
        if (textRef.current) {
          textRef.current.spellcheck = true;
        }
      }, 100);
    }
  }, [showReplyModal, openEmpty, defaultParentQuote, selectedText]);

  const handleContentInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    lastSelectionStartRef.current = e.target.selectionStart ?? e.target.value.length;
    lastSelectionEndRef.current = e.target.selectionEnd ?? lastSelectionStartRef.current;
  };

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const content = e.target.value;
    setPublishReplyOptions({ content });
    checkContentLengthRef.current(content, t);
  };

  useEffect(() => {
    const canInsertQuote = showReplyModal && quoteInsertRequestId !== 0 && !!textRef.current;

    const textarea = textRef.current;
    if (!canInsertQuote || !textarea) {
      return;
    }

    // Guard: skip if we already processed this exact request id.
    // setPublishReplyOptions identity changes after each call (store update -> new content -> new useCallback),
    // which re-triggers this effect. Without this guard, that creates an infinite update loop.
    if (quoteInsertRequestId === lastProcessedQuoteInsertRequestIdRef.current) {
      return;
    }
    lastProcessedQuoteInsertRequestIdRef.current = quoteInsertRequestId;

    const quote = `>>${quoteInsertNumber ?? '?'}`;
    const selectedQuote = quoteInsertSelectedText?.trimEnd() || '';
    const isFocused = document.activeElement === textarea;
    const rawStart = isFocused ? (textarea.selectionStart ?? textarea.value.length) : lastSelectionStartRef.current;
    const selectionEnd = isFocused ? (textarea.selectionEnd ?? rawStart) : lastSelectionEndRef.current;
    const start = Math.max(rawStart, 0);
    const end = Math.max(selectionEnd, 0);
    const before = textarea.value.slice(0, start);
    const after = textarea.value.slice(end);
    const needsLeadingNewline = before.length > 0 && !before.endsWith('\n');
    let insertion = `${needsLeadingNewline ? '\n' : ''}${quote}\n`;
    if (selectedQuote) {
      insertion += `${selectedQuote}\n`;
    }
    const nextValue = `${before}${insertion}${after}`;

    textarea.value = nextValue;
    const nextCursor = before.length + insertion.length;
    textarea.focus();
    textarea.setSelectionRange(nextCursor, nextCursor);
    lastSelectionStartRef.current = nextCursor;
    lastSelectionEndRef.current = nextCursor;

    setPublishReplyOptions({ content: nextValue });
    checkContentLengthRef.current(nextValue, t);
  }, [showReplyModal, quoteInsertRequestId, quoteInsertNumber, quoteInsertSelectedText, setPublishReplyOptions, t]);

  const { isUploading, uploadedFileName, handleUpload } = useFileUpload({
    onUploadComplete: (uploadedUrl: string) => {
      if (uploadedUrl) {
        if (urlRef.current) {
          urlRef.current.value = uploadedUrl;
        }
        setPublishReplyOptions({ link: uploadedUrl });
      }
    },
  });
  const uploadMode = useMediaHostingStore((state) => state.uploadMode);
  const showUploadControls = getShowUploadControls(uploadMode, isWebRuntime());

  const hasInitializedDisplayName = useRef(false);
  useEffect(() => {
    if (displayName && !hasInitializedDisplayName.current) {
      hasInitializedDisplayName.current = true;
      setPublishReplyOptions({ displayName });
    }
  }, [displayName, setPublishReplyOptions]);

  const modalContent = (
    <animated.div
      className={styles.container}
      ref={nodeRef}
      style={{
        left,
        top,
        touchAction: 'none',
      }}
    >
      <div className={`replyModalHandle ${styles.title}`} {...(!isMobile ? bind() : {})}>
        {t('reply_to_no', { no: threadNumber ?? '?' })}
        <button
          className={styles.closeIcon}
          onClick={(e) => {
            e.stopPropagation();
            closeModal();
          }}
          title='close'
        />
      </div>
      <div className={styles.replyForm}>
        <div className={styles.name}>
          <input
            type='text'
            defaultValue={displayName}
            placeholder={displayName ? undefined : capitalize(t('name'))}
            onChange={(e) => {
              setAccount({ ...account, author: { ...account?.author, displayName: e.target.value } });
              setPublishReplyOptions({ displayName: e.target.value });
            }}
          />
        </div>
        <div className={styles.link}>
          <input
            type='text'
            ref={urlRef}
            placeholder={capitalize(requirePostLinkIsMedia ? t('link_to_file') : t('link'))}
            disabled={isUploading}
            onChange={(e) => setPublishReplyOptions({ link: e.target.value })}
          />
        </div>
        <div className={styles.content}>
          <textarea
            cols={48}
            rows={4}
            wrap='soft'
            ref={textRef}
            spellCheck={true}
            onInput={handleContentInput}
            onChange={handleContentChange}
            onSelect={(e) => {
              lastSelectionStartRef.current = e.currentTarget.selectionStart ?? e.currentTarget.value.length;
              lastSelectionEndRef.current = e.currentTarget.selectionEnd ?? lastSelectionStartRef.current;
            }}
            onBlur={(e) => {
              lastSelectionStartRef.current = e.currentTarget.selectionStart ?? e.currentTarget.value.length;
              lastSelectionEndRef.current = e.currentTarget.selectionEnd ?? lastSelectionStartRef.current;
            }}
          />
        </div>
        <div className={styles.footer}>
          {showUploadControls && (
            <span className={styles.uploadContainer}>
              <span className={styles.uploadButton}>
                <button onClick={handleUpload} disabled={isUploading}>
                  {t('choose_file')}
                </button>
              </span>
              <span className={styles.uploadFileName} title={uploadedFileName || t('no_file_chosen')}>
                {isUploading ? t('uploading') : uploadedFileName || t('no_file_chosen')}
              </span>
            </span>
          )}
          {showSpoilerForReply && (
            <span className={styles.spoilerButton}>
              [
              <label>
                <input type='checkbox' onChange={(e) => setPublishReplyOptions({ spoiler: e.target.checked })} />
                {capitalize(t('spoiler'))}?
              </label>
              ]
            </span>
          )}
          <button className={styles.publishButton} disabled={isResolvingExternalQuotes} onClick={onPublishReply}>
            {t('post')}
          </button>
        </div>
        {lengthError ? (
          <div className={styles.error}>{lengthError}</div>
        ) : error ? (
          <div className={styles.error}>{error}</div>
        ) : (
          publishReplyError && <div className={styles.error}>{publishReplyError}</div>
        )}
        {publishReplyStateMessage && <div className={styles.status}>{publishReplyStateMessage}</div>}
        <BoardOfflineAlert className={styles.offlineBoard} hidden={isInAllView || isInSubscriptionsView || isInModView} communityAddress={communityAddress} />
      </div>
    </animated.div>
  );

  return showReplyModal && modalContent;
};

export default ReplyModal;
