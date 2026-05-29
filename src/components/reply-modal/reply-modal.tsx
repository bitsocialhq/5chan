import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { setAccount, useAccount } from '@bitsocial/bitsocial-react-hooks';
import { getExpiringMediaLinkAlert } from '../../lib/utils/media-link-validation-utils';
import { getCommentFlagOptionsForDirectory, getCommentFlagPublishOptionsForDirectory } from '../../lib/comment-flag-selection';
import {
  type DiceRoll,
  type FortuneEntry,
  type PostOptionsValidationError,
  POST_OPTIONS_VALIDATION_DELAY_MS,
  getContentWithPostOptionState as getContentWithOptions,
  getPostOptionsDirectoryCode,
  getPostOptionsValidationError,
  hasNonokoOption,
  isPostOptionsValidationError,
} from '../../lib/utils/post-options-utils';
import { getPublishURLFilename, isValidPublishURL } from '../../lib/utils/url-utils';
import { hasModQueueAccessRole } from '../../lib/utils/mod-access';
import { isAllView, isModView, isSubscriptionsView } from '../../lib/utils/view-utils';
import useSelectedTextStore from '../../stores/use-selected-text-store';
import useReplyModalStore from '../../stores/use-reply-modal-store';
import { getShowUploadControls, isWebRuntime } from '../../lib/media-hosting/show-upload-controls';
import useMediaHostingStore from '../../stores/use-media-hosting-store';
import { findDirectoryByAddress, useDirectories } from '../../hooks/use-directories';
import usePublishReply from '../../hooks/use-publish-reply';
import useIsMobile from '../../hooks/use-is-mobile';
import { useFileUpload } from '../../hooks/use-file-upload';
import { useCommunityField } from '../../hooks/use-stable-community';
import BbcodeEditorToolbar, { BbcodePreview } from '../bbcode-editor-toolbar/bbcode-editor-toolbar';
import BoardOfflineAlert from '../board-offline-alert/board-offline-alert';
import LoadingEllipsis from '../loading-ellipsis';
import PostOptionsErrorMessage from '../post-options-error-message/post-options-error-message';
import styles from './reply-modal.module.css';
import capitalize from 'lodash/capitalize';
import debounce from 'lodash/debounce';
import { useSpring, animated } from '@react-spring/web';
import { useDrag } from '@use-gesture/react';

const FILE_LINK_PLACEHOLDER = 'https://website.com/image.jpg';

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
  const navigate = useNavigate();
  const params = useParams();
  const isInAllView = isAllView(location.pathname);
  const isInModView = isModView(location.pathname);
  const isInSubscriptionsView = isSubscriptionsView(location.pathname, params);
  const directories = useDirectories();
  const directoryEntry = findDirectoryByAddress(directories, communityAddress);
  const showSpoilerForReply = directoryEntry?.features?.noSpoilerReplies !== true;
  const postOptionsDirectoryCode = getPostOptionsDirectoryCode(directoryEntry, location.pathname);
  const requirePostLinkIsMediaFeature = directoryEntry?.features?.requirePostLinkIsMedia;
  const requirePostLinkIsMedia = requirePostLinkIsMediaFeature === true || (requirePostLinkIsMediaFeature === undefined && (isInAllView || isInSubscriptionsView));
  const flagOptions = getCommentFlagOptionsForDirectory(directoryEntry);
  const { isResolvingExternalQuotes, publishReply, publishReplyError, publishReplyStateMessage, resetPublishReplyOptions, replyIndex, setPublishReplyOptions } =
    usePublishReply({
      cid: parentCid,
      communityAddress,
      postCid,
    });
  const account = useAccount();
  const { displayName } = account?.author || {};
  const accountAddress = account?.author?.address;
  const roles = useCommunityField(communityAddress, (community) => community?.roles);
  const accountRole = accountAddress ? roles?.[accountAddress]?.role : undefined;
  const showBbcodeToolbar = hasModQueueAccessRole(accountRole);
  const textRef = useRef<HTMLTextAreaElement | null>(null);
  const setTextRef = useRef((element: HTMLTextAreaElement | null) => {
    textRef.current = element;
    if (!element) return;

    window.setTimeout(() => {
      if (textRef.current === element) {
        element.focus();
      }
    }, 0);
  });
  const urlRef = useRef<HTMLInputElement>(null);
  const optionsRef = useRef<HTMLInputElement>(null);
  const flagRef = useRef<HTMLSelectElement>(null);
  const fortuneEntryRef = useRef<FortuneEntry | null>(null);
  const diceRollRef = useRef<DiceRoll | null>(null);
  const nonokoRedirectPathRef = useRef<string | null>(null);
  const lastSelectionStartRef = useRef(0);
  const lastSelectionEndRef = useRef(0);
  const initializedReplyContentKeyRef = useRef('');
  const lastProcessedQuoteInsertRequestIdRef = useRef(0);
  const { selectedText } = useSelectedTextStore();
  const openEmpty = useReplyModalStore((state) => state.openEmpty);
  const quoteInsertRequestId = useReplyModalStore((state) => state.quoteInsertRequestId);
  const quoteInsertNumber = useReplyModalStore((state) => state.quoteInsertNumber);
  const quoteInsertSelectedText = useReplyModalStore((state) => state.quoteInsertSelectedText);

  const [error, setError] = useState<string | PostOptionsValidationError | null>(null);
  const [lengthError, setLengthError] = useState<string | null>(null);
  const [url, setUrl] = useState('');
  const [isBbcodePreviewing, setIsBbcodePreviewing] = useState(false);
  const [bbcodePreviewContent, setBbcodePreviewContent] = useState('');

  const checkContentLengthRef = useRef(
    debounce((content: string, t: TFunction) => {
      const length = content.trim().length;
      if (length > 2000) {
        setError(null);
        setLengthError(`${t('error')}: ${t('comment_field_too_long', { length })}`);
      } else {
        setLengthError(null);
      }
    }, 1000),
  );

  const checkPostOptionsRef = useRef(
    debounce((options: string, directoryCode: string | undefined) => {
      const nextOptionsError = getPostOptionsValidationError(options, directoryCode);
      if (nextOptionsError) {
        setLengthError(null);
        setError(nextOptionsError);
      }
    }, POST_OPTIONS_VALIDATION_DELAY_MS),
  );

  const onPublishReply = () => {
    const currentContent = textRef.current?.value || '';
    const currentUrl = urlRef.current?.value.trim() || '';
    const currentOptions = optionsRef.current?.value || '';
    const currentOptionsError = getPostOptionsValidationError(currentOptions, postOptionsDirectoryCode);
    const publishContent = getContentWithOptions(currentContent, currentOptions, fortuneEntryRef, diceRollRef, postOptionsDirectoryCode);

    checkContentLengthRef.current.cancel();
    checkPostOptionsRef.current.cancel();
    setLengthError(null);
    nonokoRedirectPathRef.current = null;

    if (currentOptionsError) {
      setError(currentOptionsError);
      return;
    }

    if (!publishContent.trim() && !currentUrl) {
      setError(t('error') + ': ' + t('empty_comment_alert'));
      return;
    }

    if (currentUrl && !isValidPublishURL(currentUrl)) {
      setError(t('error') + ': ' + t('invalid_url_alert'));
      return;
    }
    const expiringMediaLinkAlert = currentUrl ? getExpiringMediaLinkAlert(currentUrl, t) : null;
    if (expiringMediaLinkAlert) {
      setError(expiringMediaLinkAlert);
      return;
    }

    if (publishContent.trim().length > 2000) {
      setError(t('error') + ': ' + t('field_too_long'));
      return;
    }

    const flagPublishOptions = getCommentFlagPublishOptionsForDirectory(directoryEntry, flagRef.current?.value);

    setError(null);
    nonokoRedirectPathRef.current = hasNonokoOption(currentOptions) ? `/${postOptionsDirectoryCode || params.boardIdentifier || communityAddress}` : null;
    publishReply({ content: publishContent, ...flagPublishOptions });
  };

  useEffect(() => {
    if (typeof replyIndex === 'number') {
      const nonokoRedirectPath = nonokoRedirectPathRef.current;
      nonokoRedirectPathRef.current = null;
      resetPublishReplyOptions();
      closeModal();
      if (nonokoRedirectPath) {
        navigate(nonokoRedirectPath);
      }
    }
  }, [replyIndex, resetPublishReplyOptions, closeModal, navigate]);

  const nodeRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();

  const [{ left, top }, api] = useSpring(
    () => ({
      from: {
        left: Math.round(window.innerWidth / 2 - 150),
        top: Math.round(window.innerHeight / 2 - 200),
      },
    }),
    [],
  );

  const bodySelectionStyleBeforeDragRef = useRef<{ userSelect: string; webkitUserSelect: string } | null>(null);

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

  useEffect(() => {
    const checkContentLength = checkContentLengthRef.current;
    const checkPostOptions = checkPostOptionsRef.current;

    return () => {
      checkContentLength.cancel();
      checkPostOptions.cancel();
      restoreBodyTextSelection();
    };
  }, []);

  useEffect(() => {
    if (nodeRef.current && isMobile) {
      const viewportHeight = window.innerHeight;
      const centeredPosition = Math.round(scrollY + viewportHeight / 2 - 300);
      api.start({ top: centeredPosition, immediate: true });
    }
  }, [api, isMobile, scrollY]);

  const parentCidRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!showReplyModal || isMobile) {
      return;
    }

    const closeReplyModalOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeModal();
      }
    };

    document.addEventListener('keydown', closeReplyModalOnEscape);
    return () => document.removeEventListener('keydown', closeReplyModalOnEscape);
  }, [showReplyModal, isMobile, closeModal]);

  useEffect(() => {
    if (parentCidRef.current) {
      const cidWidth = parentCidRef.current.offsetWidth;
      parentCidRef.current.style.width = `${cidWidth}px`;
    }
  }, [parentCid]);

  useEffect(() => {
    if (textRef.current) {
      const len = textRef.current.value.length;
      textRef.current.setSelectionRange(len, len);
    }
  }, []);

  const defaultParentQuote = `>>${parentNumber ?? '?'}\n`;

  // Enable spellcheck after initial content is injected into the textarea.
  useEffect(() => {
    if (!showReplyModal || !textRef.current) {
      initializedReplyContentKeyRef.current = '';
      return;
    }

    const initialContent = openEmpty ? selectedText || '' : `${defaultParentQuote}${selectedText || ''}`;
    const initialContentKey = `${parentCid}:${openEmpty ? 'empty' : 'quoted'}:${initialContent}`;
    if (initializedReplyContentKeyRef.current === initialContentKey) {
      return;
    }
    initializedReplyContentKeyRef.current = initialContentKey;

    textRef.current.spellcheck = false;
    textRef.current.value = initialContent;
    const len = textRef.current.value.length;
    lastSelectionStartRef.current = len;
    lastSelectionEndRef.current = len;
    const publishContent = getContentWithOptions(initialContent, optionsRef.current?.value || '', fortuneEntryRef, diceRollRef, postOptionsDirectoryCode);
    setPublishReplyOptions({ content: publishContent });
    checkContentLengthRef.current(publishContent, t);

    const spellcheckTimeout = window.setTimeout(() => {
      if (textRef.current) {
        textRef.current.spellcheck = true;
      }
    }, 100);

    return () => {
      window.clearTimeout(spellcheckTimeout);
    };
  }, [showReplyModal, parentCid, openEmpty, defaultParentQuote, selectedText, postOptionsDirectoryCode, setPublishReplyOptions, t]);

  useEffect(() => {
    if (!showReplyModal) {
      checkContentLengthRef.current.cancel();
      checkPostOptionsRef.current.cancel();
      setIsBbcodePreviewing(false);
      setBbcodePreviewContent('');
    }
  }, [showReplyModal]);

  useEffect(() => {
    if (!showReplyModal) {
      fortuneEntryRef.current = null;
      diceRollRef.current = null;
    }
  }, [showReplyModal]);

  const handleContentInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    lastSelectionStartRef.current = e.target.selectionStart ?? e.target.value.length;
    lastSelectionEndRef.current = e.target.selectionEnd ?? lastSelectionStartRef.current;
  };

  const handleContentValueChange = (content: string, selectionStart?: number, selectionEnd?: number, options = optionsRef.current?.value || '') => {
    if (isBbcodePreviewing) {
      setBbcodePreviewContent(content);
    }
    if (typeof selectionStart === 'number') {
      lastSelectionStartRef.current = selectionStart;
      lastSelectionEndRef.current = selectionEnd ?? selectionStart;
    }
    const publishContent = getContentWithOptions(content, options, fortuneEntryRef, diceRollRef, postOptionsDirectoryCode);
    setPublishReplyOptions({ content: publishContent });
    checkContentLengthRef.current(publishContent, t);
  };

  const handleOptionsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const options = e.target.value;
    handleContentValueChange(textRef.current?.value || '', undefined, undefined, options);
    setError((currentError) => (isPostOptionsValidationError(currentError) ? null : currentError));
    checkPostOptionsRef.current(options, postOptionsDirectoryCode);
  };

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    handleContentValueChange(e.target.value);
  };

  const handleBbcodePreviewToggle = () => {
    if (isBbcodePreviewing) {
      setIsBbcodePreviewing(false);
      window.requestAnimationFrame(() => textRef.current?.focus());
      return;
    }

    setBbcodePreviewContent(textRef.current?.value ?? '');
    setIsBbcodePreviewing(true);
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

    const publishContent = getContentWithOptions(nextValue, optionsRef.current?.value || '', fortuneEntryRef, diceRollRef, postOptionsDirectoryCode);
    setPublishReplyOptions({ content: publishContent });
    checkContentLengthRef.current(publishContent, t);
  }, [showReplyModal, quoteInsertRequestId, quoteInsertNumber, quoteInsertSelectedText, postOptionsDirectoryCode, setPublishReplyOptions, t]);

  const { isUploading, uploadedFileName, handleUpload } = useFileUpload({
    onUploadComplete: (uploadedUrl: string) => {
      if (uploadedUrl) {
        setUrl(uploadedUrl);
        if (urlRef.current) {
          urlRef.current.value = uploadedUrl;
        }
        setPublishReplyOptions({ link: uploadedUrl });
      }
    },
  });
  const uploadMode = useMediaHostingStore((state) => state.uploadMode);
  const showUploadControls = getShowUploadControls(uploadMode, isWebRuntime());
  const displayedFileName = getPublishURLFilename(url) || uploadedFileName;

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
      role='dialog'
      aria-modal='true'
      aria-labelledby='reply-modal-title'
      style={{
        left,
        top,
        touchAction: 'none',
      }}
    >
      <div id='reply-modal-title' className={`replyModalHandle ${styles.title}`} {...(!isMobile ? bind() : {})}>
        {t('reply_to_no', { no: threadNumber ?? '?' })}
        <button
          type='button'
          className={styles.closeIcon}
          onClick={(e) => {
            e.stopPropagation();
            closeModal();
          }}
          title='close'
          aria-label={t('close')}
        />
      </div>
      <div className={styles.replyForm}>
        <div className={styles.name}>
          <input
            type='text'
            aria-label={t('name')}
            defaultValue={displayName}
            placeholder={displayName ? undefined : capitalize(t('name'))}
            onChange={(e) => {
              setAccount({ ...account, author: { ...account?.author, displayName: e.target.value } });
              setPublishReplyOptions({ displayName: e.target.value });
            }}
          />
        </div>
        <div className={styles.options}>
          <input
            type='text'
            ref={optionsRef}
            aria-label={t('options')}
            placeholder={capitalize(t('options'))}
            autoCorrect='off'
            autoComplete='off'
            spellCheck='false'
            onChange={handleOptionsChange}
          />
        </div>
        <div className={styles.content}>
          {showBbcodeToolbar && (
            <BbcodeEditorToolbar
              textareaRef={textRef}
              onChange={handleContentValueChange}
              isPreviewing={isBbcodePreviewing}
              onPreviewToggle={handleBbcodePreviewToggle}
            />
          )}
          {showBbcodeToolbar && isBbcodePreviewing && <BbcodePreview content={bbcodePreviewContent} postCid={postCid} communityAddress={communityAddress} />}
          <textarea
            cols={48}
            rows={4}
            wrap='soft'
            ref={setTextRef.current}
            aria-label={t('comment')}
            spellCheck={true}
            hidden={showBbcodeToolbar && isBbcodePreviewing}
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
        <div className={styles.link}>
          <input
            type='text'
            ref={urlRef}
            aria-label={requirePostLinkIsMedia ? t('link_to_file') : t('link')}
            placeholder={requirePostLinkIsMedia ? FILE_LINK_PLACEHOLDER : capitalize(t('link'))}
            disabled={isUploading}
            onChange={(e) => {
              setUrl(e.target.value);
              setPublishReplyOptions({ link: e.target.value });
            }}
          />
        </div>
        {flagOptions.length > 0 && (
          <div>
            <select
              key={flagOptions.map((option) => option.value).join('|')}
              name='flag'
              aria-label={t('flag')}
              className={styles.flagSelector}
              ref={flagRef}
              defaultValue={flagOptions[0]?.value}
            >
              {flagOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        )}
        <div className={styles.footer}>
          {showUploadControls && (
            <span className={styles.uploadContainer}>
              <span className={styles.uploadButton}>
                <button type='button' onClick={handleUpload} disabled={isUploading}>
                  {t('choose_file')}
                </button>
              </span>
              <span className={styles.uploadFileName} title={displayedFileName || t('no_file_chosen')}>
                {isUploading ? <LoadingEllipsis string={t('uploading')} /> : displayedFileName || t('no_file_chosen')}
              </span>
            </span>
          )}
          {showSpoilerForReply && (
            <span className={styles.spoilerButton}>
              [
              <label>
                <input type='checkbox' aria-label={capitalize(t('spoiler'))} onChange={(e) => setPublishReplyOptions({ spoiler: e.target.checked })} />
                {capitalize(t('spoiler'))}?
              </label>
              ]
            </span>
          )}
          <button className={styles.publishButton} disabled={isResolvingExternalQuotes} type='button' onClick={onPublishReply}>
            {t('post')}
          </button>
        </div>
        {showBbcodeToolbar ? <div className={styles.error}>warning: posting as moderator</div> : null}
        {lengthError ? (
          <div className={styles.error}>{lengthError}</div>
        ) : error ? (
          <div className={styles.error}>{isPostOptionsValidationError(error) ? <PostOptionsErrorMessage error={error} directories={directories} /> : error}</div>
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
