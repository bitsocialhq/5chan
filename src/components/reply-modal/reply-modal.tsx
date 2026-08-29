import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { setAccount, useAccount } from '@bitsocial/bitsocial-react-hooks';
import { getExpiringMediaLinkAlert, getPublishFileDisplayName, getPublishLinkOptions } from '../../lib/utils/media-link-validation-utils';
import { getTwimgMediaFilePublishUrl } from '../../lib/utils/media-utils';
import {
  getEffectiveReplyLinkFeatures,
  getNoReplyLinks,
  getPublishLinkValidationError,
  getRequireReplyLink,
  getRequireReplyLinkIsMedia,
} from '../../lib/utils/publish-link-requirements';
import { getCommentFlagOptionsForDirectory, getCommentFlagPublishOptionsForDirectory } from '../../lib/comment-flag-selection';
import {
  type DiceRoll,
  type FortuneEntry,
  type PostOptionsValidationError,
  POST_OPTIONS_VALIDATION_DELAY_MS,
  getContentWithPostOptionState as getContentWithOptions,
  getPostOptionsDirectoryCode,
  getPostOptionsPublishContentLength,
  getPostOptionsValidationError,
  hasNonokoOption,
  isPostOptionsValidationError,
} from '../../lib/utils/post-options-utils';
import { isMathDirectoryCode } from '../../lib/math-tags';
import { hasModQueueAccessRole } from '../../lib/utils/mod-access';
import { getModerationPostingRoleLabel } from '../../lib/utils/author-display-utils';
import { isAllView, isModView, isSubscriptionsView } from '../../lib/utils/view-utils';
import useSelectedTextStore from '../../stores/use-selected-text-store';
import useReplyModalStore, { type ReplyModalDraft } from '../../stores/use-reply-modal-store';
import { getShowUploadControls, isWebRuntime } from '../../lib/media-hosting/show-upload-controls';
import useMediaHostingStore from '../../stores/use-media-hosting-store';
import { useDirectories } from '../../hooks/use-directories';
import { useDirectoryEntry } from '../../hooks/use-directory-entry';
import usePublishReply from '../../hooks/use-publish-reply';
import useIsMobile from '../../hooks/use-is-mobile';
import { useFileUpload } from '../../hooks/use-file-upload';
import { useYouTubeThumbnailLinkConversion } from '../../hooks/use-youtube-thumbnail-link-conversion';
import usePublishSubmissionGuard from '../../hooks/use-publish-submission-guard';
import { useCommunityField } from '../../hooks/use-stable-community';
import { OEKAKI_WEB_WARNING_TEXT } from '../../lib/oekaki/oekaki-copy';
import BbcodeEditorToolbar, { BbcodePreview } from '../bbcode-editor-toolbar/bbcode-editor-toolbar';
import BoardOfflineAlert from '../board-offline-alert/board-offline-alert';
import LoadingEllipsis from '../loading-ellipsis/loading-ellipsis';
import OekakiDrawingControls from '../oekaki-drawing-controls/oekaki-drawing-controls';
import PostOptionsErrorMessage from '../post-options-error-message/post-options-error-message';
import TexLogo from '../tex-logo/tex-logo';
import TexPreviewModal from '../tex-preview-modal/tex-preview-modal';
import Tooltip from '../tooltip/tooltip';
import { preloadMathJax } from '../../lib/mathjax/mathjax-typeset';
import styles from './reply-modal.module.css';
import capitalize from 'lodash/capitalize';
import debounce from 'lodash/debounce';
import { useSpring, animated } from '@react-spring/web';
import { useDrag } from '@use-gesture/react';

const FILE_LINK_PLACEHOLDER = 'https://website.com/image.jpg';
const REPLY_MODAL_POSITION_SESSION_STORAGE_KEY = '5chan:reply-modal-position';

type ReplyModalPosition = {
  left: number;
  top: number;
};

const getCenteredReplyModalPosition = (): ReplyModalPosition => ({
  left: Math.round(window.innerWidth / 2 - 150),
  top: Math.round(window.innerHeight / 2 - 200),
});

const readReplyModalPosition = (): ReplyModalPosition | null => {
  try {
    const storedPosition = window.sessionStorage.getItem(REPLY_MODAL_POSITION_SESSION_STORAGE_KEY);
    if (!storedPosition) return null;

    const parsedPosition = JSON.parse(storedPosition) as Partial<ReplyModalPosition>;
    if (typeof parsedPosition.left !== 'number' || typeof parsedPosition.top !== 'number') return null;
    if (!Number.isFinite(parsedPosition.left) || !Number.isFinite(parsedPosition.top)) return null;

    return {
      left: Math.round(parsedPosition.left),
      top: Math.round(parsedPosition.top),
    };
  } catch (error) {
    console.warn('Failed to read reply modal position from sessionStorage:', error);
    return null;
  }
};

const writeReplyModalPosition = (position: ReplyModalPosition) => {
  try {
    window.sessionStorage.setItem(REPLY_MODAL_POSITION_SESSION_STORAGE_KEY, JSON.stringify(position));
  } catch (error) {
    console.warn('Failed to save reply modal position to sessionStorage:', error);
  }
};

const shouldUseStoredReplyModalPosition = () => window.innerWidth >= 640;

const getInitialReplyModalPosition = (): ReplyModalPosition => {
  const centeredPosition = getCenteredReplyModalPosition();
  if (!shouldUseStoredReplyModalPosition()) return centeredPosition;

  return readReplyModalPosition() ?? centeredPosition;
};

interface ReplyModalProps {
  closeModal: () => void;
  locationDraftKey: string;
  showReplyModal: boolean;
  parentCid: string;
  parentNumber: number | null;
  threadNumber: number | null;
  postCid: string;
  scrollY: number;
  communityAddress: string;
}

const ReplyModal = ({ closeModal, locationDraftKey, showReplyModal, parentCid, parentNumber, threadNumber, postCid, scrollY, communityAddress }: ReplyModalProps) => {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const params = useParams();
  const isInAllView = isAllView(location.pathname);
  const isInModView = isModView(location.pathname);
  const isInSubscriptionsView = isSubscriptionsView(location.pathname, params);
  const directories = useDirectories();
  const directoryEntry = useDirectoryEntry(communityAddress, params?.boardIdentifier);
  const showSpoilerForReply = directoryEntry?.features?.noSpoilerReplies !== true;
  const postOptionsDirectoryCode = getPostOptionsDirectoryCode(directoryEntry, location.pathname);
  const showOekakiControls = postOptionsDirectoryCode === 'i' || directoryEntry?.directoryCode === 'i';
  const showTexButton = isMathDirectoryCode(postOptionsDirectoryCode) || isMathDirectoryCode(directoryEntry?.directoryCode);
  const communityFeatures = useCommunityField(communityAddress, (community) => community?.features);
  const replyLinkFeatures = getEffectiveReplyLinkFeatures(communityFeatures, directoryEntry?.features);
  const requireReplyLink = getRequireReplyLink(replyLinkFeatures);
  const requireReplyLinkIsMedia = getRequireReplyLinkIsMedia(replyLinkFeatures, isInAllView || isInSubscriptionsView);
  const noReplyLinks = getNoReplyLinks(replyLinkFeatures);
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
  const moderationPostingRoleLabel = getModerationPostingRoleLabel({ address: accountAddress, role: accountRole });
  const moderationPostingWarning = showBbcodeToolbar && moderationPostingRoleLabel ? `warning: posting as ${moderationPostingRoleLabel}` : undefined;
  const textRef = useRef<HTMLTextAreaElement | null>(null);
  const nameRef = useRef<HTMLInputElement>(null);
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
  const { selectedText } = useSelectedTextStore();
  const modalState = useReplyModalStore((state) => state.modals[locationDraftKey]);
  const updateStoredDraft = useReplyModalStore((state) => state.updateDraft);
  const updateDraft = useCallback((nextDraft: Partial<ReplyModalDraft>) => updateStoredDraft(locationDraftKey, nextDraft), [locationDraftKey, updateStoredDraft]);
  const openEmpty = modalState?.openEmpty ?? false;
  const quoteInsertRequestId = modalState?.quoteInsertRequestId ?? 0;
  const quoteInsertNumber = modalState?.quoteInsertNumber ?? null;
  const quoteInsertSelectedText = modalState?.quoteInsertSelectedText ?? null;
  const draft = modalState?.draft;
  const initialDraftRef = useRef(draft);
  const lastProcessedQuoteInsertRequestIdRef = useRef(quoteInsertRequestId);

  const [error, setError] = useState<string | PostOptionsValidationError | null>(null);
  const [lengthError, setLengthError] = useState<string | null>(null);
  const [url, setUrl] = useState(draft?.link ?? '');
  const [isBbcodePreviewing, setIsBbcodePreviewing] = useState(false);
  const [bbcodePreviewContent, setBbcodePreviewContent] = useState('');
  const [showTexPreview, setShowTexPreview] = useState(false);
  const { isPublishSubmissionInFlight, runPublishSubmission } = usePublishSubmissionGuard();
  const texButtonRef = useRef<HTMLButtonElement>(null);
  // Blur in the close handler so the TeX button doesn't keep a lingering focus state
  // (focus-visible promotion on Escape, focus-triggered tooltip) after the preview closes.
  const closeTexPreview = useCallback(() => {
    setShowTexPreview(false);
    texButtonRef.current?.blur();
  }, []);

  const checkContentLengthRef = useRef(
    debounce((content: string, t: TFunction, options: string, directoryCode: string | undefined) => {
      const length = getPostOptionsPublishContentLength(content, options, directoryCode);
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

  const onPublishReply = () =>
    runPublishSubmission(async () => {
      const appliedYouTubeConversion = await applyPendingConversion();

      const currentContent = textRef.current?.value || '';
      const currentDisplayName = nameRef.current?.value.trim() || undefined;
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

      const linkValidationError = getPublishLinkValidationError({
        link: currentUrl,
        noLinks: noReplyLinks,
        requireLink: requireReplyLink,
        requireMedia: requireReplyLinkIsMedia,
        requiredLinkAlertKey: 'reply_link_required_alert',
        requiredMediaLinkAlertKey: 'reply_media_link_required_alert',
        noLinksAlertKey: 'reply_links_not_allowed_alert',
        t,
      });
      if (linkValidationError) {
        setError(linkValidationError);
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
      await publishReply({
        displayName: currentDisplayName,
        content: publishContent,
        ...getPublishLinkOptions(currentUrl, appliedYouTubeConversion),
        ...flagPublishOptions,
      });
    });

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
  const [initialModalPosition] = useState(getInitialReplyModalPosition);

  const [{ left, top }, api] = useSpring(
    () => ({
      from: initialModalPosition,
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
        if (!isMobile) {
          writeReplyModalPosition({ left: nextLeft, top: nextTop });
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

    const initialDraft = initialDraftRef.current;
    const initialContent = initialDraft?.content ?? (openEmpty ? selectedText || '' : `${defaultParentQuote}${selectedText || ''}`);
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
    const publishContent = getContentWithOptions(initialContent, optionsRef.current?.value || '', fortuneEntryRef, diceRollRef, postOptionsDirectoryCode, {
      includeFortune: false,
    });
    setPublishReplyOptions({
      content: publishContent,
      ...(initialDraft?.link ? { link: initialDraft.link } : {}),
      ...(initialDraft?.spoiler ? { spoiler: true } : {}),
    });
    checkContentLengthRef.current(publishContent, t, optionsRef.current?.value || '', postOptionsDirectoryCode);

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
      setShowTexPreview(false);
    }
  }, [showReplyModal]);

  useEffect(() => {
    if (!showReplyModal) {
      fortuneEntryRef.current = null;
      diceRollRef.current = null;
    }
  }, [showReplyModal]);

  const handleContentInput = (e: React.FormEvent<HTMLTextAreaElement>) => {
    lastSelectionStartRef.current = e.currentTarget.selectionStart ?? e.currentTarget.value.length;
    lastSelectionEndRef.current = e.currentTarget.selectionEnd ?? lastSelectionStartRef.current;
  };

  const handleContentValueChange = (content: string, selectionStart?: number, selectionEnd?: number, options = optionsRef.current?.value || '') => {
    updateDraft({ content });
    if (isBbcodePreviewing) {
      setBbcodePreviewContent(content);
    }
    if (typeof selectionStart === 'number') {
      lastSelectionStartRef.current = selectionStart;
      lastSelectionEndRef.current = selectionEnd ?? selectionStart;
    }
    const publishContent = getContentWithOptions(content, options, fortuneEntryRef, diceRollRef, postOptionsDirectoryCode, { includeFortune: false });
    setPublishReplyOptions({ content: publishContent });
    checkContentLengthRef.current(publishContent, t, options, postOptionsDirectoryCode);
  };

  const handleOptionsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const options = e.target.value;
    updateDraft({ options });
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

  const setLinkValue = (nextUrl: string) => {
    setUrl(nextUrl);
    updateDraft({ link: nextUrl });
    setPublishReplyOptions({ link: nextUrl });
  };

  const handleConvertedContentChange = (content: string, selectionStart: number, selectionEnd: number) => {
    if (textRef.current) {
      textRef.current.setSelectionRange(selectionStart, selectionEnd);
    }
    handleContentValueChange(content, selectionStart, selectionEnd);
  };

  const {
    applyPendingConversion,
    cancelPendingConversion,
    noticeCountdown: youtubeThumbnailConversionCountdown,
    queueLinkConversion,
  } = useYouTubeThumbnailLinkConversion({
    enabled: !noReplyLinks,
    onContentChange: handleConvertedContentChange,
    onLinkChange: setLinkValue,
    textRef,
    urlRef,
  });

  const handleLinkChange = (nextUrl: string) => {
    setLinkValue(nextUrl);
    if (queueLinkConversion(nextUrl)) {
      setError(null);
    }
  };

  // Mirror the inline post form: normalize twimg `?format=` links to their `.jpg`/`.png` form once
  // the field loses focus, so the conversion that happens at publish time is visible in the input.
  const handleLinkBlur = () => {
    const currentValue = urlRef.current?.value ?? '';
    const twimgPublishUrl = getTwimgMediaFilePublishUrl(currentValue);
    if (twimgPublishUrl && twimgPublishUrl !== currentValue) {
      if (urlRef.current) {
        urlRef.current.value = twimgPublishUrl;
      }
      setLinkValue(twimgPublishUrl);
    }
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

    const publishContent = getContentWithOptions(nextValue, optionsRef.current?.value || '', fortuneEntryRef, diceRollRef, postOptionsDirectoryCode, {
      includeFortune: false,
    });
    updateDraft({ content: nextValue });
    setPublishReplyOptions({ content: publishContent });
    checkContentLengthRef.current(publishContent, t, optionsRef.current?.value || '', postOptionsDirectoryCode);
  }, [showReplyModal, quoteInsertRequestId, quoteInsertNumber, quoteInsertSelectedText, postOptionsDirectoryCode, setPublishReplyOptions, t, updateDraft]);

  const { isUploading, uploadedFileName, handleUpload, uploadFile } = useFileUpload({
    onUploadComplete: (uploadedUrl: string) => {
      if (uploadedUrl) {
        cancelPendingConversion();
        setLinkValue(uploadedUrl);
        if (urlRef.current) {
          urlRef.current.value = uploadedUrl;
        }
      }
    },
  });
  const handleOekakiClearUploadedUrl = (uploadedUrl: string) => {
    if ((urlRef.current?.value || url) !== uploadedUrl) return;
    cancelPendingConversion();
    setLinkValue('');
    if (urlRef.current) {
      urlRef.current.value = '';
    }
  };
  const uploadMode = useMediaHostingStore((state) => state.uploadMode);
  const showUploadControls = getShowUploadControls(uploadMode, isWebRuntime());
  const displayedFileName = getPublishFileDisplayName(url, uploadedFileName, requireReplyLinkIsMedia);
  const youtubeThumbnailConversionNotice =
    youtubeThumbnailConversionCountdown !== null ? t('youtube_thumbnail_link_conversion_notice', { count: youtubeThumbnailConversionCountdown }) : null;

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
        {showTexButton && !isMobile && (
          <Tooltip content={t('preview_tex_equations')} className={styles.texButtonTooltip}>
            <button
              ref={texButtonRef}
              type='button'
              className={styles.texButton}
              onClick={(e) => {
                e.stopPropagation();
                preloadMathJax();
                setShowTexPreview(true);
              }}
              aria-label={t('preview_tex_equations')}
            >
              <TexLogo />
            </button>
          </Tooltip>
        )}
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
            key={account?.id ?? account?.name ?? account?.author?.address}
            type='text'
            ref={nameRef}
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
            defaultValue={draft?.options}
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
            aria-label={requireReplyLinkIsMedia ? t('link_to_file') : t('link')}
            placeholder={requireReplyLinkIsMedia ? FILE_LINK_PLACEHOLDER : capitalize(t('link'))}
            disabled={isUploading || youtubeThumbnailConversionCountdown !== null || noReplyLinks}
            defaultValue={draft?.link}
            onChange={(e) => {
              handleLinkChange(e.target.value);
            }}
            onBlur={handleLinkBlur}
          />
        </div>
        {showOekakiControls && !noReplyLinks && (
          <div className={styles.oekakiRow}>
            <span className={styles.oekakiLabel}>Draw</span>
            <OekakiDrawingControls className={styles.oekakiControls} disabled={isUploading} uploadFile={uploadFile} onClearUploadedUrl={handleOekakiClearUploadedUrl} />
          </div>
        )}
        {showOekakiControls && !noReplyLinks && isWebRuntime() ? <div className={styles.oekakiWarning}>{OEKAKI_WEB_WARNING_TEXT}</div> : null}
        {flagOptions.length > 0 && (
          <div>
            <select
              key={flagOptions.map((option) => option.value).join('|')}
              name='flag'
              aria-label={t('flag')}
              className={styles.flagSelector}
              ref={flagRef}
              defaultValue={draft?.flag ?? flagOptions[0]?.value}
              onChange={(event) => updateDraft({ flag: event.target.value })}
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
          {showUploadControls && !noReplyLinks && (
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
                <input
                  type='checkbox'
                  aria-label={capitalize(t('spoiler'))}
                  defaultChecked={draft?.spoiler}
                  onChange={(e) => {
                    updateDraft({ spoiler: e.target.checked });
                    setPublishReplyOptions({ spoiler: e.target.checked });
                  }}
                />
                {capitalize(t('spoiler'))}?
              </label>
              ]
            </span>
          )}
          <button className={styles.publishButton} disabled={isResolvingExternalQuotes || isPublishSubmissionInFlight} type='button' onClick={onPublishReply}>
            {t('post')}
          </button>
        </div>
        {moderationPostingWarning ? <div className={styles.error}>{moderationPostingWarning}</div> : null}
        {youtubeThumbnailConversionNotice ? (
          <div className={styles.error} aria-live='polite'>
            {youtubeThumbnailConversionNotice}
          </div>
        ) : lengthError ? (
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

  return (
    showReplyModal && (
      <>
        {modalContent}
        {showTexPreview && <TexPreviewModal closeModal={closeTexPreview} />}
      </>
    )
  );
};

export default ReplyModal;
