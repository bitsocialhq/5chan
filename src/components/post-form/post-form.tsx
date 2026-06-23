import { type ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { Comment, setAccount, useAccount, useEditedComment } from '@bitsocial/bitsocial-react-hooks';
import getShortAddress from '../../lib/get-short-address';
import { communitiesPagesStore as useCommunitiesPagesStore } from '../../lib/bitsocial-internals/stores';
import { getDisplayMediaInfoType, getLinkMediaInfo, getTwimgMediaFilePublishUrl } from '../../lib/utils/media-utils';
import {
  getExpiringMediaLinkAlert,
  getPublishFileDisplayName,
  getPublishLinkOptions,
  isPublishFileMediaLink,
  isPublishFileMediaType,
} from '../../lib/utils/media-link-validation-utils';
import {
  type DiceRoll,
  type FortuneEntry,
  type PostOptionsValidationError,
  POST_OPTIONS_VALIDATION_DELAY_MS,
  getContentWithPostOptionState as getContentWithOptions,
  getNonokoPendingRouteState,
  getPostOptionsDirectoryCode,
  getPostOptionsPublishContentLength,
  getPostOptionsValidationError,
  hasNonokoOption,
  isPostOptionsValidationError,
} from '../../lib/utils/post-options-utils';
import { truncateWithEllipsisInMiddle } from '../../lib/utils/string-utils';
import { isValidPublishURL, isValidURL } from '../../lib/utils/url-utils';
import { getModerationPostingRoleLabel } from '../../lib/utils/author-display-utils';
import { hasModQueueAccessRole } from '../../lib/utils/mod-access';
import { getBoardPath, isDirectoryRoute } from '../../lib/utils/route-utils';
import { isAllView, isCatalogView, isModQueueView, isModView, isPostPageView, isSubscriptionsView } from '../../lib/utils/view-utils';
import { getCommentFlagOptionsForDirectory, getCommentFlagPublishOptionsForDirectory, type CommentFlagSelectOption } from '../../lib/comment-flag-selection';
import { FLASH_TAG_OPTIONS, getFlashTagPublishOptionsForDirectoryCode, isFlashDirectoryCode, type FlashTagOption } from '../../lib/flash-tags';
import { isMathDirectoryCode } from '../../lib/math-tags';
import { useAccountCommunityAddresses } from '../../hooks/use-account-community-addresses';
import { useDirectories } from '../../hooks/use-directories';
import { useDirectoryEntry } from '../../hooks/use-directory-entry';
import { useCommunityField } from '../../hooks/use-stable-community';
import useIsMobile from '../../hooks/use-is-mobile';
import { useResolvedCommunityAddress } from '../../hooks/use-resolved-community-address';
import useSafeAccountComment from '../../hooks/use-safe-account-comment';
import useFetchGifFirstFrame from '../../hooks/use-fetch-gif-first-frame';
import { useYouTubeThumbnailLinkConversion } from '../../hooks/use-youtube-thumbnail-link-conversion';
import usePublishSubmissionGuard from '../../hooks/use-publish-submission-guard';
import usePublishPost from '../../hooks/use-publish-post';
import usePublishReply from '../../hooks/use-publish-reply';
import { useFileUpload } from '../../hooks/use-file-upload';
import { getShowUploadControls, isWebRuntime } from '../../lib/media-hosting/show-upload-controls';
import { OEKAKI_WEB_WARNING_TEXT } from '../../lib/oekaki/oekaki-copy';
import { isCommentArchived } from '../../lib/utils/comment-moderation-utils';
import useMediaHostingStore from '../../stores/use-media-hosting-store';
import BoardOfflineAlert from '../board-offline-alert/board-offline-alert';
import BbcodeEditorToolbar, { BbcodePreview } from '../bbcode-editor-toolbar/bbcode-editor-toolbar';
import LoadingEllipsis from '../loading-ellipsis/loading-ellipsis';
import OekakiDrawingControls from '../oekaki-drawing-controls/oekaki-drawing-controls';
import TexLogo from '../tex-logo/tex-logo';
import PostOptionsErrorMessage from '../post-options-error-message/post-options-error-message';
import styles from './post-form.module.css';
import capitalize from 'lodash/capitalize';
import debounce from 'lodash/debounce';

const FILE_LINK_PLACEHOLDER = 'https://website.com/image.jpg';
const POST_FORM_FILE_DISPLAY_MAX_LENGTH = 28;

const mergeFlairs = (...flairGroups: Array<Comment['flairs'] | undefined>): Comment['flairs'] | undefined => {
  const flairs = flairGroups.flatMap((group) => (Array.isArray(group) ? group : []));
  return flairs.length > 0 ? flairs : undefined;
};

const getPostFormFileDisplayLabel = (url: string, uploadedFileName: string | null | undefined, noFileLabel: string, requireFile: boolean): string => {
  const raw = getPublishFileDisplayName(url, uploadedFileName, requireFile);
  if (!raw) return noFileLabel;
  return truncateWithEllipsisInMiddle(raw, POST_FORM_FILE_DISPLAY_MAX_LENGTH);
};

export const LinkTypePreviewer = ({ link, requireFile = false }: { link: string; requireFile?: boolean }) => {
  const { t } = useTranslation();
  const mediaInfo = getLinkMediaInfo(link);
  let type = mediaInfo?.type;
  const { status: gifFrameStatus } = useFetchGifFirstFrame(type === 'gif' ? mediaInfo?.url : undefined);

  if (requireFile && isValidURL(link) && !isPublishFileMediaType(type)) {
    return <span className={styles.linkTypeError}>{t('not_a_file')}</span>;
  }

  if (type === 'gif' && gifFrameStatus === 'ready') {
    type = t('animated_gif');
  } else if (type === 'gif') {
    type = t('gif');
  } else if (type) {
    type = getDisplayMediaInfoType(type, t);
  }

  return isValidURL(link) ? `${t('file')}: ${type}` : t('invalid_url');
};

const PostFormActions = ({
  disableReplyPublish = false,
  variant,
  t,
  isInPostView,
  onPublishReply,
  onPublishPost,
  handleUpload,
  isPublishSubmissionInFlight,
  isUploading,
  showUploadControls,
}: {
  disableReplyPublish?: boolean;
  variant: 'reply' | 'post' | 'upload';
  t: TFunction;
  isInPostView: boolean;
  onPublishReply: () => void | Promise<void>;
  onPublishPost: () => void | Promise<void>;
  handleUpload: () => void;
  isPublishSubmissionInFlight: boolean;
  isUploading: boolean;
  showUploadControls: boolean;
}) => {
  if (variant === 'reply' && isInPostView) {
    return (
      <button type='button' onClick={onPublishReply} disabled={disableReplyPublish || isPublishSubmissionInFlight || isUploading}>
        {t('post')}
      </button>
    );
  }
  if (variant === 'post' && !isInPostView) {
    return (
      <button type='button' onClick={onPublishPost} disabled={isPublishSubmissionInFlight}>
        {t('post')}
      </button>
    );
  }
  if (variant === 'upload' && showUploadControls) {
    return (
      <button type='button' onClick={handleUpload} disabled={isUploading}>
        {t('choose_file')}
      </button>
    );
  }
  return null;
};

interface PostFormFieldsProps {
  t: TFunction;
  account: ReturnType<typeof useAccount>;
  displayName: string | undefined;
  bbcodePreviewContent: string;
  isInPostView: boolean;
  isBbcodePreviewing: boolean;
  postCid: string;
  subjectRef: React.Ref<HTMLInputElement>;
  optionsRef: React.RefObject<HTMLInputElement | null>;
  flagRef: React.RefObject<HTMLSelectElement | null>;
  flashTagRef: React.RefObject<HTMLSelectElement | null>;
  textRef: React.RefObject<HTMLTextAreaElement | null>;
  urlRef: React.Ref<HTMLInputElement>;
  url: string;
  handleContentChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  handleContentValueChange: (content: string, options?: string) => void;
  handleLinkChange: (link: string) => void;
  handleLinkBlur: () => void;
  handleOptionsChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  disableLinkInput: boolean;
  setPublishPostOptions: (opts: Record<string, unknown>) => void;
  setPublishReplyOptions: (opts: Record<string, unknown>) => void;
  isUploading: boolean;
  uploadedFileName: string | null | undefined;
  showUploadControls: boolean;
  showOekakiControls: boolean;
  showSpoilerForPost: boolean;
  showSpoilerForReply: boolean;
  isInAllView: boolean;
  isInSubscriptionsView: boolean;
  isInModView: boolean;
  directories: ReturnType<typeof useDirectories>;
  accountCommunityAddresses: string[];
  subscriptions: string[];
  communityAddress: string | undefined;
  rulesPath: string;
  requirePostLinkIsMedia: boolean;
  flagOptions: CommentFlagSelectOption[];
  flashTagOptions: FlashTagOption[];
  showFlashTagSelector: boolean;
  showFlashUploadPrompt: boolean;
  showMathTagsPrompt: boolean;
  showBbcodeToolbar: boolean;
  onBbcodePreviewToggle: () => void;
  onPublishReply: () => void | Promise<void>;
  onPublishPost: () => void | Promise<void>;
  handleUpload: () => void;
  uploadFile: ReturnType<typeof useFileUpload>['uploadFile'];
  onOekakiClearUploadedUrl: (url: string) => void;
  isPublishSubmissionInFlight: boolean;
  disableReplyPublish: boolean;
}

const PostFormFields = ({
  t,
  account,
  displayName,
  bbcodePreviewContent,
  isInPostView,
  isBbcodePreviewing,
  postCid,
  subjectRef,
  optionsRef,
  flagRef,
  flashTagRef,
  textRef,
  urlRef,
  url,
  handleContentChange,
  handleContentValueChange,
  handleLinkChange,
  handleLinkBlur,
  handleOptionsChange,
  disableLinkInput,
  setPublishPostOptions,
  setPublishReplyOptions,
  isUploading,
  uploadedFileName,
  showUploadControls,
  showOekakiControls,
  showSpoilerForPost,
  showSpoilerForReply,
  isInAllView,
  isInSubscriptionsView,
  isInModView,
  directories,
  accountCommunityAddresses,
  subscriptions,
  communityAddress,
  rulesPath,
  requirePostLinkIsMedia,
  flagOptions,
  flashTagOptions,
  showFlashTagSelector,
  showFlashUploadPrompt,
  showMathTagsPrompt,
  showBbcodeToolbar,
  onBbcodePreviewToggle,
  onPublishReply,
  onPublishPost,
  handleUpload,
  uploadFile,
  onOekakiClearUploadedUrl,
  isPublishSubmissionInFlight,
  disableReplyPublish,
}: PostFormFieldsProps) => (
  <>
    <tr>
      <td>{t('name')}</td>
      <td>
        <input
          type='text'
          aria-label={t('name')}
          placeholder={!displayName ? capitalize(t('anonymous')) : undefined}
          defaultValue={displayName || undefined}
          onChange={(e) => {
            const newDisplayName = e.target.value.trim() || undefined;
            setAccount({ ...account, author: { ...account?.author, displayName: newDisplayName } });
            if (isInPostView) {
              setPublishReplyOptions({ displayName: newDisplayName });
            } else {
              setPublishPostOptions({ displayName: newDisplayName });
            }
          }}
        />
        <PostFormActions
          variant='reply'
          t={t}
          isInPostView={isInPostView}
          onPublishReply={onPublishReply}
          onPublishPost={onPublishPost}
          handleUpload={handleUpload}
          disableReplyPublish={disableReplyPublish}
          isPublishSubmissionInFlight={isPublishSubmissionInFlight}
          isUploading={isUploading}
          showUploadControls={showUploadControls}
        />
      </td>
    </tr>
    <tr>
      <td>{t('options')}</td>
      <td>
        <input type='text' aria-label={t('options')} ref={optionsRef} autoCorrect='off' autoComplete='off' spellCheck='false' onChange={handleOptionsChange} />
      </td>
    </tr>
    {!isInPostView && (
      <tr>
        <td>{t('subject')}</td>
        <td>
          <input
            type='text'
            aria-label={t('subject')}
            ref={subjectRef}
            onChange={(e) => {
              setPublishPostOptions({ title: e.target.value });
            }}
          />
          <PostFormActions
            variant='post'
            t={t}
            isInPostView={isInPostView}
            onPublishReply={onPublishReply}
            onPublishPost={onPublishPost}
            handleUpload={handleUpload}
            disableReplyPublish={disableReplyPublish}
            isPublishSubmissionInFlight={isPublishSubmissionInFlight}
            isUploading={isUploading}
            showUploadControls={showUploadControls}
          />
        </td>
      </tr>
    )}
    {showBbcodeToolbar ? (
      <tr>
        <td>format</td>
        <td>
          <BbcodeEditorToolbar
            textareaRef={textRef}
            onChange={(content) => handleContentValueChange(content)}
            isPreviewing={isBbcodePreviewing}
            onPreviewToggle={onBbcodePreviewToggle}
          />
        </td>
      </tr>
    ) : null}
    <tr>
      <td>{t('comment')}</td>
      <td>
        {showBbcodeToolbar && isBbcodePreviewing && (
          <BbcodePreview content={bbcodePreviewContent} postCid={isInPostView ? postCid : undefined} communityAddress={communityAddress} />
        )}
        <textarea
          cols={48}
          rows={4}
          wrap='soft'
          ref={textRef}
          aria-label={t('comment')}
          hidden={showBbcodeToolbar && isBbcodePreviewing}
          onChange={handleContentChange}
        />
      </td>
    </tr>
    {flagOptions.length > 0 && (
      <tr>
        <td>{t('flag')}</td>
        <td>
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
        </td>
      </tr>
    )}
    <tr>
      <td>{requirePostLinkIsMedia ? t('link_to_file') : t('link')}</td>
      <td className={styles.linkField}>
        <input
          type='text'
          aria-label={requirePostLinkIsMedia ? t('link_to_file') : t('link')}
          autoCorrect='off'
          autoComplete='off'
          spellCheck='false'
          placeholder={requirePostLinkIsMedia ? FILE_LINK_PLACEHOLDER : undefined}
          ref={urlRef}
          disabled={disableLinkInput}
          onChange={(e) => {
            handleLinkChange(e.target.value);
          }}
          onBlur={handleLinkBlur}
        />
        <span className={styles.linkType}> {url && <LinkTypePreviewer link={url} requireFile={requirePostLinkIsMedia} />}</span>
      </td>
    </tr>
    {showUploadControls && (
      <tr className={styles.uploadButton}>
        <td>{t('file')}</td>
        <td>
          <PostFormActions
            variant='upload'
            t={t}
            isInPostView={isInPostView}
            onPublishReply={onPublishReply}
            onPublishPost={onPublishPost}
            handleUpload={handleUpload}
            disableReplyPublish={disableReplyPublish}
            isPublishSubmissionInFlight={isPublishSubmissionInFlight}
            isUploading={isUploading}
            showUploadControls={showUploadControls}
          />
          <span title={getPublishFileDisplayName(url, uploadedFileName, requirePostLinkIsMedia) || undefined}>
            {isUploading ? <LoadingEllipsis string={t('uploading')} /> : getPostFormFileDisplayLabel(url, uploadedFileName, t('no_file_chosen'), requirePostLinkIsMedia)}
          </span>
        </td>
      </tr>
    )}
    {showFlashTagSelector && (
      <tr>
        <td>{t('tag')}</td>
        <td>
          <select name='flashTag' aria-label={t('tag')} className={styles.flagSelector} ref={flashTagRef} defaultValue=''>
            <option value=''>{t('choose_one')}</option>
            {flashTagOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </td>
      </tr>
    )}
    {showOekakiControls && (
      <tr>
        <td>Draw</td>
        <td>
          <OekakiDrawingControls disabled={isUploading} uploadFile={uploadFile} onClearUploadedUrl={onOekakiClearUploadedUrl} />
        </td>
      </tr>
    )}
    {((isInPostView && showSpoilerForReply) || (!isInPostView && showSpoilerForPost)) && (
      <tr className={styles.spoilerButton}>
        <td>{capitalize(t('spoiler'))}</td>
        <td>
          [
          <label>
            <input
              type='checkbox'
              aria-label={capitalize(t('spoiler'))}
              onChange={(e) => (isInPostView ? setPublishReplyOptions({ spoiler: e.target.checked }) : setPublishPostOptions({ spoiler: e.target.checked }))}
            />
            {capitalize(t('spoiler'))}?
          </label>
          ]
        </td>
      </tr>
    )}
    {(isInAllView || isInSubscriptionsView || isInModView) && (
      <tr>
        <td>{t('board')}</td>
        <td>
          <select
            aria-label={t('board')}
            className={styles.boardSelector}
            onChange={(e) => setPublishPostOptions({ communityAddress: e.target.value })}
            value={communityAddress}
          >
            <option value=''>{t('choose_one')}</option>
            {isInAllView &&
              directories.map((community) =>
                community.title && community.address ? (
                  <option key={community.address} value={community.address}>
                    {community.title}
                  </option>
                ) : null,
              )}
            {isInModView &&
              accountCommunityAddresses.map((address: string) => (
                <option key={address} value={address}>
                  {address && getShortAddress(address)}
                </option>
              ))}
            {isInSubscriptionsView &&
              subscriptions.map((sub: string) => (
                <option key={sub} value={sub}>
                  {sub}
                </option>
              ))}
          </select>
        </td>
      </tr>
    )}
    <tr className='rules'>
      <td colSpan={2}>
        <ul className='rules'>
          <li>
            <Trans
              i18nKey='post_form_rules_faq_prompt'
              components={{
                rules: <Link to={rulesPath} />,
                faq: <Link to='/faq' />,
              }}
            />
          </li>
          {showFlashUploadPrompt && (
            <li>
              <Trans
                i18nKey='post_form_flash_upload_prompt'
                components={{
                  catbox: <a href='https://catbox.moe/' target='_blank' rel='noopener noreferrer' aria-label='Catbox' />,
                }}
              />
            </li>
          )}
          {showMathTagsPrompt && (
            <>
              <li>
                <Trans
                  i18nKey='post_form_math_tags_prompt'
                  components={{
                    tex: <TexLogo />,
                  }}
                />
              </li>
              <li>{t('post_form_math_right_click_prompt')}</li>
            </>
          )}
          {showOekakiControls && isWebRuntime() ? <li>{OEKAKI_WEB_WARNING_TEXT}</li> : null}
        </ul>
      </td>
    </tr>
  </>
);

const PostFormErrorRow = ({ ariaLive, children }: { ariaLive?: 'polite'; children: ReactNode }) => (
  <tr className={styles.formErrorRow}>
    <td colSpan={2}>
      <div className={`${styles.error} ${styles.formError}`} aria-live={ariaLive}>
        {children}
      </div>
    </td>
  </tr>
);

const PostFormTable = ({ closeForm, postCid }: { closeForm: () => void; postCid: string }) => {
  const { t } = useTranslation();
  const params = useParams();
  const account = useAccount();
  const [url, setUrl] = useState('');
  const author = account?.author || {};
  const { displayName } = author || {};
  const accountComment = useSafeAccountComment({ commentIndex: params?.accountCommentIndex });
  const resolvedAddress = useResolvedCommunityAddress();
  const communityAddress = resolvedAddress || accountComment?.communityAddress;
  const { setPublishPostOptions, postIndex, publishPost, publishPostError, publishPostOptions, resetPublishPostOptions } = usePublishPost({
    communityAddress,
  });
  const effectiveBoardAddress = communityAddress || publishPostOptions.communityAddress;

  const textRef = useRef<HTMLTextAreaElement>(null);
  const urlRef = useRef<HTMLInputElement>(null);
  const subjectRef = useRef<HTMLInputElement>(null);
  const optionsRef = useRef<HTMLInputElement>(null);
  const flagRef = useRef<HTMLSelectElement>(null);
  const flashTagRef = useRef<HTMLSelectElement>(null);
  const fortuneEntryRef = useRef<FortuneEntry | null>(null);
  const diceRollRef = useRef<DiceRoll | null>(null);
  const nonokoRedirectPathRef = useRef<string | null>(null);

  const location = useLocation();
  const isInPostView = isPostPageView(location.pathname, params);
  const isInAllView = isAllView(location.pathname);
  const isInModView = isModView(location.pathname);
  const isInSubscriptionsView = isSubscriptionsView(location.pathname, useParams());
  const subscriptions = account?.subscriptions || [];
  const directories = useDirectories();
  const directoryEntry = useDirectoryEntry(effectiveBoardAddress, params?.boardIdentifier);
  const effectiveBoardPath = effectiveBoardAddress ? getBoardPath(effectiveBoardAddress, directories) : undefined;
  const pendingPostBoardPath = effectiveBoardPath;
  const rulesPath = effectiveBoardPath && isDirectoryRoute(effectiveBoardPath, directories) ? `/rules#${effectiveBoardPath}` : '/rules';
  const showSpoilerForPost = directoryEntry?.features?.noSpoilers !== true;
  const showSpoilerForReply = directoryEntry?.features?.noSpoilerReplies !== true;
  const postOptionsDirectoryCode = getPostOptionsDirectoryCode(directoryEntry, location.pathname);
  const showOekakiControls = postOptionsDirectoryCode === 'i' || directoryEntry?.directoryCode === 'i';
  const requirePostLinkIsMediaFeature = directoryEntry?.features?.requirePostLinkIsMedia;
  const requirePostLinkIsMedia = requirePostLinkIsMediaFeature === true || (requirePostLinkIsMediaFeature === undefined && (isInAllView || isInSubscriptionsView));
  const flagOptions = getCommentFlagOptionsForDirectory(directoryEntry);
  const showFlashUploadPrompt = isFlashDirectoryCode(postOptionsDirectoryCode);
  const showFlashTagSelector = showFlashUploadPrompt && !isInPostView;
  const showMathTagsPrompt = isMathDirectoryCode(postOptionsDirectoryCode) || isMathDirectoryCode(directoryEntry?.directoryCode);

  const accountCommunityAddresses = useAccountCommunityAddresses();
  const accountAddress = account?.author?.address;
  const roles = useCommunityField(effectiveBoardAddress, (community) => community?.roles);
  const accountRole = accountAddress ? roles?.[accountAddress]?.role : undefined;
  const showBbcodeToolbar = hasModQueueAccessRole(accountRole) || (!effectiveBoardAddress && isInModView && accountCommunityAddresses.length > 0);
  const moderationPostingRoleLabel = getModerationPostingRoleLabel({ address: accountAddress, role: accountRole });
  const moderationPostingWarning = showBbcodeToolbar && moderationPostingRoleLabel ? `warning: posting as ${moderationPostingRoleLabel}` : undefined;

  const [lengthError, setLengthError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | PostOptionsValidationError | null>(null);
  const [isBbcodePreviewing, setIsBbcodePreviewing] = useState(false);
  const [bbcodePreviewContent, setBbcodePreviewContent] = useState('');
  const { isPublishSubmissionInFlight, runPublishSubmission } = usePublishSubmissionGuard();

  const checkContentLength = useRef(
    debounce((content: string, t: TFunction, options: string, directoryCode: string | undefined) => {
      const length = getPostOptionsPublishContentLength(content, options, directoryCode);
      if (length > 2000) {
        setLengthError(`${t('error')}: ${t('comment_field_too_long', { length })}`);
      } else {
        setLengthError(null);
      }
    }, 1000),
  ).current;

  const checkPostOptions = useRef(
    debounce((options: string, directoryCode: string | undefined) => {
      const nextOptionsError = getPostOptionsValidationError(options, directoryCode);
      if (nextOptionsError) {
        setFormError(nextOptionsError);
      }
    }, POST_OPTIONS_VALIDATION_DELAY_MS),
  ).current;

  const resetFields = useCallback(() => {
    if (textRef.current) {
      textRef.current.value = '';
    }
    if (urlRef.current) {
      urlRef.current.value = '';
    }
    if (subjectRef.current) {
      subjectRef.current.value = '';
    }
    if (optionsRef.current) {
      optionsRef.current.value = '';
    }
    if (flagRef.current) {
      flagRef.current.value = flagRef.current.options[0]?.value ?? '';
    }
    if (flashTagRef.current) {
      flashTagRef.current.value = '';
    }
    checkContentLength.cancel();
    checkPostOptions.cancel();
    fortuneEntryRef.current = null;
    diceRollRef.current = null;
    setFormError(null);
    setIsBbcodePreviewing(false);
    setBbcodePreviewContent('');
  }, [checkContentLength, checkPostOptions]);

  const getBoardIndexPath = () => {
    if (effectiveBoardAddress) {
      return `/${getBoardPath(effectiveBoardAddress, directories)}`;
    }

    return params?.boardIdentifier ? `/${params.boardIdentifier}` : null;
  };

  const onPublishPost = () =>
    runPublishSubmission(async () => {
      const appliedYouTubeConversion = await applyPendingConversion();

      const currentTitle = subjectRef.current?.value.trim() || '';
      const currentContent = textRef.current?.value || '';
      const currentUrl = urlRef.current?.value.trim() || '';
      const currentOptions = optionsRef.current?.value || '';
      const currentOptionsError = getPostOptionsValidationError(currentOptions, postOptionsDirectoryCode);
      const publishContent = getContentWithOptions(currentContent, currentOptions, fortuneEntryRef, diceRollRef, postOptionsDirectoryCode);

      checkContentLength.cancel();
      checkPostOptions.cancel();
      setLengthError(null);
      setFormError(null);
      nonokoRedirectPathRef.current = null;

      if (currentOptionsError) {
        setFormError(currentOptionsError);
        return;
      }

      if (!currentTitle && !publishContent.trim() && !currentUrl) {
        setFormError(`${t('error')}: ${t('empty_comment_alert')}`);
        return;
      }
      if (currentUrl && !isValidPublishURL(currentUrl)) {
        setFormError(`${t('error')}: ${t('invalid_url_alert')}`);
        return;
      }
      if (currentUrl && requirePostLinkIsMedia && !isPublishFileMediaLink(currentUrl)) {
        setFormError(`${t('error')}: ${t('link_not_image_or_video_alert')}`);
        return;
      }
      const expiringMediaLinkAlert = currentUrl ? getExpiringMediaLinkAlert(currentUrl, t) : null;
      if (expiringMediaLinkAlert) {
        setFormError(expiringMediaLinkAlert);
        return;
      }

      if (publishContent.trim().length > 2000) {
        setFormError(`${t('error')}: ${t('field_too_long')}`);
        return;
      }

      if ((isInAllView || isInSubscriptionsView || isInModView) && !publishPostOptions.communityAddress) {
        setFormError(`${t('error')}: ${t('no_board_selected_warning')}`);
        return;
      }

      const flagPublishOptions = getCommentFlagPublishOptionsForDirectory(directoryEntry, flagRef.current?.value);
      const flashTagPublishOptions = getFlashTagPublishOptionsForDirectoryCode(postOptionsDirectoryCode, flashTagRef.current?.value);
      const flairs = mergeFlairs(flagPublishOptions.flairs, flashTagPublishOptions.flairs);
      const publishOptions = {
        ...flagPublishOptions,
        ...(flairs ? { flairs } : {}),
      };

      nonokoRedirectPathRef.current = hasNonokoOption(currentOptions) ? getBoardIndexPath() : null;
      await publishPost({ content: publishContent, ...getPublishLinkOptions(currentUrl, appliedYouTubeConversion), ...publishOptions });
    });

  // redirect to pending page when pending comment is created
  const navigate = useNavigate();
  useEffect(() => {
    if (typeof postIndex === 'number') {
      const nonokoRedirectPath = nonokoRedirectPathRef.current;
      nonokoRedirectPathRef.current = null;
      resetPublishPostOptions();
      resetFields();
      if (nonokoRedirectPath) {
        navigate(nonokoRedirectPath, { state: getNonokoPendingRouteState(postIndex) });
      } else {
        navigate(`/pending/${postIndex}`, pendingPostBoardPath ? { state: { boardPath: pendingPostBoardPath } } : undefined);
      }
    }
  }, [postIndex, pendingPostBoardPath, resetFields, resetPublishPostOptions, navigate]);

  // in post page, publish a reply to the post
  const cid = params?.commentCid || '';
  const { isResolvingExternalQuotes, publishReply, publishReplyError, publishReplyStateMessage, resetPublishReplyOptions, replyIndex, setPublishReplyOptions } =
    usePublishReply({ cid, communityAddress, postCid });

  useEffect(() => {
    return () => {
      checkContentLength.cancel();
      checkPostOptions.cancel();
      if (isInPostView) {
        resetPublishReplyOptions();
      } else {
        resetPublishPostOptions();
      }
    };
  }, [checkContentLength, checkPostOptions, isInPostView, resetPublishPostOptions, resetPublishReplyOptions]);

  const handleContentValueChange = (content: string, options = optionsRef.current?.value || '') => {
    const publishContent = getContentWithOptions(content, options, fortuneEntryRef, diceRollRef, postOptionsDirectoryCode, { includeFortune: false });
    if (isBbcodePreviewing) {
      setBbcodePreviewContent(content);
    }
    if (isInPostView) {
      setPublishReplyOptions({ content: publishContent });
    } else {
      setPublishPostOptions({ content: publishContent });
    }
    checkContentLength(publishContent, t, options, postOptionsDirectoryCode);
  };

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    handleContentValueChange(e.target.value);
  };

  const handleOptionsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const options = e.target.value;
    handleContentValueChange(textRef.current?.value || '', options);
    setFormError((currentError) => (isPostOptionsValidationError(currentError) ? null : currentError));
    checkPostOptions(options, postOptionsDirectoryCode);
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

  const onPublishReply = () =>
    runPublishSubmission(async () => {
      const appliedYouTubeConversion = await applyPendingConversion();

      const currentUrl = urlRef.current?.value.trim() || '';
      const currentOptions = optionsRef.current?.value || '';
      const currentOptionsError = getPostOptionsValidationError(currentOptions, postOptionsDirectoryCode);
      const publishContent = getContentWithOptions(textRef.current?.value || '', currentOptions, fortuneEntryRef, diceRollRef, postOptionsDirectoryCode);

      checkContentLength.cancel();
      checkPostOptions.cancel();
      setLengthError(null);
      setFormError(null);
      nonokoRedirectPathRef.current = null;

      if (currentOptionsError) {
        setFormError(currentOptionsError);
        return;
      }

      if (!publishContent.trim() && !currentUrl) {
        setFormError(`${t('error')}: ${t('empty_comment_alert')}`);
        return;
      }

      if (currentUrl && !isValidPublishURL(currentUrl)) {
        setFormError(`${t('error')}: ${t('invalid_url_alert')}`);
        return;
      }
      if (currentUrl && requirePostLinkIsMedia && !isPublishFileMediaLink(currentUrl)) {
        setFormError(`${t('error')}: ${t('link_not_image_or_video_alert')}`);
        return;
      }
      const expiringMediaLinkAlert = currentUrl ? getExpiringMediaLinkAlert(currentUrl, t) : null;
      if (expiringMediaLinkAlert) {
        setFormError(expiringMediaLinkAlert);
        return;
      }

      if (publishContent.trim().length > 2000) {
        setFormError(`${t('error')}: ${t('field_too_long')}`);
        return;
      }

      const flagPublishOptions = getCommentFlagPublishOptionsForDirectory(directoryEntry, flagRef.current?.value);

      nonokoRedirectPathRef.current = hasNonokoOption(currentOptions) ? getBoardIndexPath() : null;
      await publishReply({ content: publishContent, ...getPublishLinkOptions(currentUrl, appliedYouTubeConversion), ...flagPublishOptions });
    });

  const setLinkValue = (nextUrl: string) => {
    setUrl(nextUrl);
    if (isInPostView) {
      setPublishReplyOptions({ link: nextUrl });
    } else {
      setPublishPostOptions({ link: nextUrl });
    }
  };

  const {
    applyPendingConversion,
    cancelPendingConversion,
    noticeCountdown: youtubeThumbnailConversionCountdown,
    queueLinkConversion,
  } = useYouTubeThumbnailLinkConversion({
    enabled: requirePostLinkIsMedia,
    onContentChange: handleContentValueChange,
    onLinkChange: setLinkValue,
    textRef,
    urlRef,
  });

  const handleLinkChange = (nextUrl: string) => {
    setLinkValue(nextUrl);
    if (queueLinkConversion(nextUrl)) {
      setFormError(null);
    }
  };

  // Normalize pbs.twimg.com `?format=` media links to their `.jpg`/`.png` form once the field
  // loses focus, so the conversion that happens at publish time is visible in the input. Done on
  // blur (not per keystroke) to avoid rewriting the URL while it is still being typed or pasted.
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
    if (typeof replyIndex === 'number') {
      const nonokoRedirectPath = nonokoRedirectPathRef.current;
      nonokoRedirectPathRef.current = null;
      resetFields();
      closeForm();
      if (nonokoRedirectPath) {
        navigate(nonokoRedirectPath);
      }
    }
  }, [replyIndex, closeForm, navigate, resetFields]);

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

  const hasInitializedDisplayName = useRef(false);
  useEffect(() => {
    if (displayName && !hasInitializedDisplayName.current) {
      hasInitializedDisplayName.current = true;
      if (isInPostView) {
        setPublishReplyOptions({ displayName });
      } else {
        setPublishPostOptions({ displayName });
      }
    }
  }, [displayName, isInPostView, setPublishReplyOptions, setPublishPostOptions]);

  return (
    <>
      <table className={styles.postFormTable}>
        <tbody>
          <PostFormFields
            t={t}
            account={account}
            displayName={displayName}
            bbcodePreviewContent={bbcodePreviewContent}
            isInPostView={isInPostView}
            isBbcodePreviewing={isBbcodePreviewing}
            postCid={postCid}
            subjectRef={subjectRef}
            optionsRef={optionsRef}
            flagRef={flagRef}
            flashTagRef={flashTagRef}
            textRef={textRef}
            urlRef={urlRef}
            url={url}
            handleContentChange={handleContentChange}
            handleContentValueChange={handleContentValueChange}
            handleLinkChange={handleLinkChange}
            handleLinkBlur={handleLinkBlur}
            handleOptionsChange={handleOptionsChange}
            disableLinkInput={isUploading || youtubeThumbnailConversionCountdown !== null}
            setPublishPostOptions={setPublishPostOptions}
            setPublishReplyOptions={setPublishReplyOptions}
            isUploading={isUploading}
            uploadedFileName={uploadedFileName}
            showUploadControls={showUploadControls}
            showOekakiControls={showOekakiControls}
            showSpoilerForPost={showSpoilerForPost}
            showSpoilerForReply={showSpoilerForReply}
            isInAllView={isInAllView}
            isInSubscriptionsView={isInSubscriptionsView}
            isInModView={isInModView}
            directories={directories}
            accountCommunityAddresses={accountCommunityAddresses}
            subscriptions={subscriptions}
            communityAddress={communityAddress}
            rulesPath={rulesPath}
            requirePostLinkIsMedia={requirePostLinkIsMedia}
            flagOptions={flagOptions}
            flashTagOptions={FLASH_TAG_OPTIONS}
            showFlashTagSelector={showFlashTagSelector}
            showFlashUploadPrompt={showFlashUploadPrompt}
            showMathTagsPrompt={showMathTagsPrompt}
            showBbcodeToolbar={showBbcodeToolbar}
            onBbcodePreviewToggle={handleBbcodePreviewToggle}
            onPublishReply={onPublishReply}
            onPublishPost={onPublishPost}
            handleUpload={handleUpload}
            uploadFile={uploadFile}
            onOekakiClearUploadedUrl={handleOekakiClearUploadedUrl}
            isPublishSubmissionInFlight={isPublishSubmissionInFlight}
            disableReplyPublish={isResolvingExternalQuotes}
          />
        </tbody>
        <tfoot>
          {moderationPostingWarning ? <PostFormErrorRow>{moderationPostingWarning}</PostFormErrorRow> : null}
          {lengthError ? <PostFormErrorRow>{lengthError}</PostFormErrorRow> : null}
          {youtubeThumbnailConversionCountdown !== null ? (
            <PostFormErrorRow ariaLive='polite'>{t('youtube_thumbnail_link_conversion_notice', { count: youtubeThumbnailConversionCountdown })}</PostFormErrorRow>
          ) : formError ? (
            <PostFormErrorRow>
              {isPostOptionsValidationError(formError) ? <PostOptionsErrorMessage error={formError} directories={directories} /> : formError}
            </PostFormErrorRow>
          ) : null}
          {publishPostError ? <PostFormErrorRow>{publishPostError}</PostFormErrorRow> : null}
          {publishReplyError ? <PostFormErrorRow>{publishReplyError}</PostFormErrorRow> : null}
        </tfoot>
      </table>
      {publishReplyStateMessage && <div className={styles.status}>{publishReplyStateMessage}</div>}
    </>
  );
};

const PostForm = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const params = useParams();
  const isInPostView = isPostPageView(location.pathname, params);
  const isInAllView = isAllView(location.pathname);
  const isInModView = isModView(location.pathname);
  const isInModQueueView = isModQueueView(location.pathname);
  const isInSubscriptionsView = isSubscriptionsView(location.pathname, params);
  const isInCatalogView = isCatalogView(location.pathname, params);
  const isMobile = useIsMobile();

  const commentCid = params?.commentCid;
  const post = useCommunitiesPagesStore((state) => (commentCid ? state.comments[commentCid] : undefined));
  let comment: Comment | undefined = post;
  // handle pending mod or author edit
  const { editedComment } = useEditedComment({ comment });
  if (editedComment) {
    comment = editedComment;
  }

  const { deleted, locked, removed, postCid } = comment || {};
  const archived = isCommentArchived(comment);
  const isThreadClosed = deleted || locked || removed || archived;
  const threadStateKey = archived ? 'thread_archived' : 'thread_closed';

  const [showForm, setShowForm] = useState(false);

  const accountComment = useSafeAccountComment({ commentIndex: params?.accountCommentIndex });
  const resolvedAddress = useResolvedCommunityAddress();
  const communityAddress = resolvedAddress || accountComment?.communityAddress;

  const shouldShowOfflineAlert = !(isInAllView || isInSubscriptionsView || isInModView) && showForm;

  if (isMobile) {
    return (
      <div className={styles.postFormMobile}>
        {shouldShowOfflineAlert && <BoardOfflineAlert className={styles.offlineBoard} communityAddress={communityAddress} />}
        {isInModQueueView ? (
          <div className={styles.modQueueTitle}>{t('moderation_queue')}</div>
        ) : isThreadClosed ? (
          <div className={styles.closed}>
            {t(threadStateKey)}
            <br />
            {t('may_not_reply')}
          </div>
        ) : (
          <>
            <button type='button' className={`${styles.showFormButton} button`} onClick={() => setShowForm(showForm ? false : true)}>
              {showForm ? t('close_post_form') : isInPostView ? t('post_a_reply') : t('start_new_thread')}
            </button>
            {showForm && <PostFormTable closeForm={() => setShowForm(false)} postCid={postCid} />}
          </>
        )}
        {isInCatalogView && <hr />}
      </div>
    );
  }

  return (
    <div className={styles.postFormDesktop}>
      {shouldShowOfflineAlert && <BoardOfflineAlert className={styles.offlineBoard} communityAddress={communityAddress} />}
      {isInModQueueView ? (
        <div className={styles.modQueueTitle}>{t('moderation_queue')}</div>
      ) : isThreadClosed ? (
        <div className={styles.closed}>
          {t(threadStateKey)}
          <br />
          {t('may_not_reply')}
        </div>
      ) : !showForm ? (
        <div>
          [
          <button type='button' className='button' onClick={() => setShowForm(true)}>
            {isInPostView ? t('post_a_reply') : t('start_new_thread')}
          </button>
          ]
        </div>
      ) : (
        <PostFormTable closeForm={() => setShowForm(false)} postCid={postCid} />
      )}
    </div>
  );
};

export default PostForm;
