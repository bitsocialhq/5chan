import { type ReactNode, type Ref, useCallback, useEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { Trans, useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { Comment, setAccount, useAccount, useAccountComment, useEditedComment } from '@bitsocial/bitsocial-react-hooks';
import getShortAddress from '../../lib/get-short-address';
import { communitiesPagesStore as useCommunitiesPagesStore } from '../../lib/bitsocial-internals/stores';
import { getDisplayMediaInfoType, getLinkMediaInfo, getTwimgMediaFilePublishUrl } from '../../lib/utils/media-utils';
import {
  canLoadMediaLinkInBrowser,
  getExpiringMediaLinkAlert,
  getPublishFileDisplayName,
  getPublishLinkOptions,
  isPublishFileMediaType,
  requiresBrowserMediaLoadValidation,
} from '../../lib/utils/media-link-validation-utils';
import {
  getEffectivePostLinkFeatures,
  getEffectiveReplyLinkFeatures,
  getNoReplyLinks,
  getPublishLinkValidationError,
  getRequirePostLink,
  getRequirePostLinkIsMedia,
  getRequireReplyLink,
  getRequireReplyLinkIsMedia,
} from '../../lib/utils/publish-link-requirements';
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
import { getHostname, isValidURL } from '../../lib/utils/url-utils';
import { getModerationPostingRoleLabel } from '../../lib/utils/author-display-utils';
import { hasModQueueAccessRole } from '../../lib/utils/mod-access';
import { getPageDraftKey } from '../../lib/utils/location-draft-utils';
import { getCommentCommunityAddress } from '../../lib/utils/comment-utils';
import { getPendingPostRoutePost } from '../../lib/utils/pending-post-route-state';
import { getBoardPath, isDirectoryRoute } from '../../lib/utils/route-utils';
import { isAllView, isCatalogView, isModQueueView, isModView, isPostPageView, isSubscriptionsView } from '../../lib/utils/view-utils';
import { getCommentFlagOptionsForDirectory, getCommentFlagPublishOptionsForDirectory, type CommentFlagSelectOption } from '../../lib/comment-flag-selection';
import { FLASH_TAG_OPTIONS, getFlashTagPublishOptionsForDirectoryCode, isFlashDirectoryCode, type FlashTagOption } from '../../lib/flash-tags';
import { isMathDirectoryCode } from '../../lib/math-tags';
import { isCodeTagDirectoryCode } from '../../lib/code-tags';
import { useAccountCommunityAddresses } from '../../hooks/use-account-community-addresses';
import { useDirectories } from '../../hooks/use-directories';
import { useDirectoryEntry } from '../../hooks/use-directory-entry';
import { useCommunityField } from '../../hooks/use-stable-community';
import useIsMobile from '../../hooks/use-is-mobile';
import { useResolvedCommunityAddress } from '../../hooks/use-resolved-community-address';
import { normalizeAccountCommentIndex } from '../../lib/utils/account-comment-index-utils';
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
import usePendingPostNavigationStore from '../../stores/use-pending-post-navigation-store';
import usePostFormDraftsStore, { EMPTY_POST_FORM_STATE, type PostFormDraft } from '../../stores/use-post-form-drafts-store';
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

type LinkMediaLoadStatus = 'loading' | 'ready' | 'error';
type SettledLinkMediaLoadStatus = Exclude<LinkMediaLoadStatus, 'loading'>;

interface LinkMediaLoadResult {
  link: string;
  status: SettledLinkMediaLoadStatus;
}

const getLinkMediaLoadStatus = (link: string, result: LinkMediaLoadResult | null): LinkMediaLoadStatus | null => {
  const normalizedLink = link.trim();
  if (!normalizedLink || !requiresBrowserMediaLoadValidation(normalizedLink)) {
    return null;
  }
  return result?.link.trim() === normalizedLink ? result.status : 'loading';
};

const getLinkMediaLoadError = (link: string, t: TFunction): string => {
  const hostname = getHostname(link);
  return hostname ? `${t('error')}: ${t('image_cannot_be_embedded', { host: hostname })}.` : `${t('error')}: ${t('media_failed_to_load')}.`;
};

const mergeFlairs = (...flairGroups: Array<Comment['flairs'] | undefined>): Comment['flairs'] | undefined => {
  const flairs = flairGroups.flatMap((group) => (Array.isArray(group) ? group : []));
  return flairs.length > 0 ? flairs : undefined;
};

const getPostFormFileDisplayLabel = (url: string, uploadedFileName: string | null | undefined, noFileLabel: string, requireFile: boolean): string => {
  const raw = getPublishFileDisplayName(url, uploadedFileName, requireFile);
  if (!raw) return noFileLabel;
  return truncateWithEllipsisInMiddle(raw, POST_FORM_FILE_DISPLAY_MAX_LENGTH);
};

export const LinkTypePreviewer = ({
  link,
  requireFile = false,
  settledMediaLoadResult,
  onMediaLoadStatusChange,
}: {
  link: string;
  requireFile?: boolean;
  settledMediaLoadResult?: LinkMediaLoadResult | null;
  onMediaLoadStatusChange?: (link: string, status: SettledLinkMediaLoadStatus) => void;
}) => {
  const { t } = useTranslation();
  const mediaInfo = getLinkMediaInfo(link);
  const rawType = mediaInfo?.type;
  let type = rawType;
  const [localMediaLoadResult, setLocalMediaLoadResult] = useState<LinkMediaLoadResult | null>(null);
  const mediaLoadStatus = getLinkMediaLoadStatus(link, settledMediaLoadResult ?? localMediaLoadResult);
  const { status: gifFrameStatus } = useFetchGifFirstFrame(type === 'gif' ? mediaInfo?.url : undefined);

  const settleMediaLoad = (status: SettledLinkMediaLoadStatus) => {
    setLocalMediaLoadResult({ link, status });
    onMediaLoadStatusChange?.(link, status);
  };

  if (requireFile && isValidURL(link) && !isPublishFileMediaType(type)) {
    return <span className={styles.linkTypeError}>{t('not_a_file')}</span>;
  }

  if (mediaLoadStatus === 'error') {
    return (
      <span className={styles.linkTypeError} role='alert'>
        {t('failed')}
      </span>
    );
  }

  if (type === 'gif' && gifFrameStatus === 'ready') {
    type = t('animated_gif');
  } else if (type === 'gif') {
    type = t('gif');
  } else if (type) {
    type = getDisplayMediaInfoType(type, t);
  }

  return (
    <>
      {isValidURL(link) ? `${t('file')}: ${type}` : t('invalid_url')}
      {mediaLoadStatus === 'loading' ? ` (${t('loading')})` : null}
      {(rawType === 'image' || rawType === 'gif') && (
        <img hidden src={mediaInfo?.url} alt='' onLoad={() => settleMediaLoad('ready')} onError={() => settleMediaLoad('error')} />
      )}
    </>
  );
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
  nameRef: Ref<HTMLInputElement>;
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
  mediaLoadResult: LinkMediaLoadResult | null;
  onMediaLoadStatusChange: (link: string, status: SettledLinkMediaLoadStatus) => void;
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
  requireCurrentLinkIsMedia: boolean;
  flagOptions: CommentFlagSelectOption[];
  flashTagOptions: FlashTagOption[];
  showFlashTagSelector: boolean;
  showFlashUploadPrompt: boolean;
  showMathTagsPrompt: boolean;
  showCodeTagsPrompt: boolean;
  showBbcodeToolbar: boolean;
  onBbcodePreviewToggle: () => void;
  onPublishReply: () => void | Promise<void>;
  onPublishPost: () => void | Promise<void>;
  handleUpload: () => void;
  uploadFile: ReturnType<typeof useFileUpload>['uploadFile'];
  onOekakiClearUploadedUrl: (url: string) => void;
  isPublishSubmissionInFlight: boolean;
  disableReplyPublish: boolean;
  draft: PostFormDraft;
  updateDraft: (draft: Partial<PostFormDraft>) => void;
}

const PostFormFields = ({
  t,
  account,
  displayName,
  nameRef,
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
  mediaLoadResult,
  onMediaLoadStatusChange,
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
  requireCurrentLinkIsMedia,
  flagOptions,
  flashTagOptions,
  showFlashTagSelector,
  showFlashUploadPrompt,
  showMathTagsPrompt,
  showCodeTagsPrompt,
  showBbcodeToolbar,
  onBbcodePreviewToggle,
  onPublishReply,
  onPublishPost,
  handleUpload,
  uploadFile,
  onOekakiClearUploadedUrl,
  isPublishSubmissionInFlight,
  disableReplyPublish,
  draft,
  updateDraft,
}: PostFormFieldsProps) => (
  <>
    <tr>
      <td>{t('name')}</td>
      <td>
        <input
          key={account?.id ?? account?.name ?? account?.author?.address}
          type='text'
          ref={nameRef}
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
        <input
          type='text'
          aria-label={t('options')}
          ref={optionsRef}
          autoCorrect='off'
          autoComplete='off'
          spellCheck='false'
          defaultValue={draft.options}
          onChange={handleOptionsChange}
        />
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
            defaultValue={draft.title}
            onChange={(e) => {
              updateDraft({ title: e.target.value });
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
          defaultValue={draft.content}
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
            defaultValue={draft.flag ?? flagOptions[0]?.value}
            onChange={(event) => updateDraft({ flag: event.target.value })}
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
      <td>{requireCurrentLinkIsMedia ? t('link_to_file') : t('link')}</td>
      <td className={styles.linkField}>
        <input
          type='text'
          aria-label={requireCurrentLinkIsMedia ? t('link_to_file') : t('link')}
          autoCorrect='off'
          autoComplete='off'
          spellCheck='false'
          placeholder={requireCurrentLinkIsMedia ? FILE_LINK_PLACEHOLDER : undefined}
          ref={urlRef}
          disabled={disableLinkInput}
          defaultValue={draft.link}
          onChange={(e) => {
            handleLinkChange(e.target.value);
          }}
          onBlur={handleLinkBlur}
        />
        <span className={styles.linkType}>
          {' '}
          {url && (
            <LinkTypePreviewer
              link={url}
              requireFile={requireCurrentLinkIsMedia}
              settledMediaLoadResult={mediaLoadResult}
              onMediaLoadStatusChange={onMediaLoadStatusChange}
            />
          )}
        </span>
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
          <span title={getPublishFileDisplayName(url, uploadedFileName, requireCurrentLinkIsMedia) || undefined}>
            {isUploading ? (
              <LoadingEllipsis string={t('uploading')} />
            ) : (
              getPostFormFileDisplayLabel(url, uploadedFileName, t('no_file_chosen'), requireCurrentLinkIsMedia)
            )}
          </span>
        </td>
      </tr>
    )}
    {showFlashTagSelector && (
      <tr>
        <td>{t('tag')}</td>
        <td>
          <select
            name='flashTag'
            aria-label={t('tag')}
            className={styles.flagSelector}
            ref={flashTagRef}
            defaultValue={draft.flashTag}
            onChange={(event) => updateDraft({ flashTag: event.target.value })}
          >
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
              defaultChecked={draft.spoiler}
              onChange={(e) => {
                updateDraft({ spoiler: e.target.checked });
                if (isInPostView) {
                  setPublishReplyOptions({ spoiler: e.target.checked });
                } else {
                  setPublishPostOptions({ spoiler: e.target.checked });
                }
              }}
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
            onChange={(e) => {
              updateDraft({ communityAddress: e.target.value || undefined });
              setPublishPostOptions({ communityAddress: e.target.value });
            }}
            value={communityAddress || ''}
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
          {showCodeTagsPrompt ? <li>{t('post_form_code_tags_prompt')}</li> : null}
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

const PostFormTable = ({ closeForm, draftKey, hideForm, postCid }: { closeForm: () => void; draftKey: string; hideForm: () => void; postCid: string }) => {
  const { t } = useTranslation();
  const params = useParams();
  const location = useLocation();
  const account = useAccount();
  const draft = usePostFormDraftsStore((state) => state.forms[draftKey]?.draft ?? EMPTY_POST_FORM_STATE.draft);
  const submissionError = usePostFormDraftsStore((state) => state.forms[draftKey]?.submissionError);
  const clearSubmissionError = usePostFormDraftsStore((state) => state.clearSubmissionError);
  const showSubmissionError = usePostFormDraftsStore((state) => state.showSubmissionError);
  const updateStoredDraft = usePostFormDraftsStore((state) => state.updateDraft);
  const updateDraft = useCallback((nextDraft: Partial<PostFormDraft>) => updateStoredDraft(draftKey, nextDraft), [draftKey, updateStoredDraft]);
  const hasRestoredDraftRef = useRef(Boolean(draft.communityAddress || draft.content || draft.link || draft.options || draft.spoiler || draft.title));
  const [url, setUrl] = useState(draft.link);
  const [mediaLoadResult, setMediaLoadResult] = useState<LinkMediaLoadResult | null>(null);
  const author = account?.author || {};
  const { displayName } = author || {};
  const accountComment = useAccountComment({ commentIndex: normalizeAccountCommentIndex(params?.accountCommentIndex) });
  const resolvedAddress = useResolvedCommunityAddress();
  const communityAddress = resolvedAddress || getCommentCommunityAddress(accountComment) || getCommentCommunityAddress(getPendingPostRoutePost(location.state));
  const navigate = useNavigate();
  const nonokoRedirectPathRef = useRef<string | null>(null);
  const pendingPostBoardPathRef = useRef<string | undefined>(undefined);
  const handledPendingPostIndexRef = useRef<number | null>(null);
  const pendingPostNavigationIndexRef = useRef<number | null>(null);
  const duplicateMediaReturnPathRef = useRef<string | null>(null);
  const navigateToPendingPost = useCallback(
    (accountCommentIndex: number, pendingPost: Comment) => {
      const nonokoRedirectPath = nonokoRedirectPathRef.current;
      const boardPath = pendingPostBoardPathRef.current;
      handledPendingPostIndexRef.current = accountCommentIndex;
      pendingPostNavigationIndexRef.current = accountCommentIndex;

      if (nonokoRedirectPath) {
        flushSync(() => navigate(nonokoRedirectPath, { flushSync: true, state: getNonokoPendingRouteState(accountCommentIndex) }));
      } else {
        flushSync(() => usePendingPostNavigationStore.getState().beginPendingPostNavigation(accountCommentIndex));
        try {
          flushSync(() =>
            navigate(`/pending/${accountCommentIndex}`, {
              flushSync: true,
              state: { ...(boardPath ? { boardPath } : {}), pendingPost },
            }),
          );
        } catch (error) {
          handledPendingPostIndexRef.current = null;
          pendingPostNavigationIndexRef.current = null;
          usePendingPostNavigationStore.getState().clearPendingPostNavigation(accountCommentIndex);
          throw error;
        }
      }
      hideForm();
    },
    [hideForm, navigate],
  );
  const navigateAfterAbandon = useCallback(() => {
    const boardPath = pendingPostBoardPathRef.current;
    const duplicateMediaReturnPath = duplicateMediaReturnPathRef.current;
    const pendingPostNavigationIndex = pendingPostNavigationIndexRef.current;
    const activePendingPostNavigationIndex = usePendingPostNavigationStore.getState().pendingPostNavigationIndex;
    if (activePendingPostNavigationIndex !== null && activePendingPostNavigationIndex !== pendingPostNavigationIndex) {
      return;
    }
    duplicateMediaReturnPathRef.current = null;
    pendingPostNavigationIndexRef.current = null;
    if (pendingPostNavigationIndex !== null) {
      usePendingPostNavigationStore.getState().clearPendingPostNavigation(pendingPostNavigationIndex);
    }
    if (duplicateMediaReturnPath || boardPath) {
      flushSync(() => navigate(duplicateMediaReturnPath ?? `/${boardPath}`, { flushSync: true, replace: true }));
    }
  }, [navigate]);
  const clearPendingPostHandoffAfterPublishError = useCallback(() => {
    const pendingPostNavigationIndex = pendingPostNavigationIndexRef.current;
    pendingPostNavigationIndexRef.current = null;
    if (pendingPostNavigationIndex !== null) {
      usePendingPostNavigationStore.getState().clearPendingPostHandoff(pendingPostNavigationIndex);
    }
  }, []);
  const handleDuplicateMediaRejection = useCallback(
    (error: string) => {
      duplicateMediaReturnPathRef.current = draftKey;
      showSubmissionError(draftKey, `${t('error')}: ${error}`);
    },
    [draftKey, showSubmissionError, t],
  );
  const { setPublishPostOptions, postIndex, publishPost, publishPostError, publishPostOptions, resetPublishPostOptions } = usePublishPost({
    communityAddress,
    onAbandonPost: navigateAfterAbandon,
    onDuplicateMediaRejected: handleDuplicateMediaRejection,
    onPublishAccepted: closeForm,
    onPublishError: clearPendingPostHandoffAfterPublishError,
    onPendingPost: navigateToPendingPost,
  });
  const effectiveBoardAddress = communityAddress || draft.communityAddress || publishPostOptions.communityAddress;

  const textRef = useRef<HTMLTextAreaElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const urlRef = useRef<HTMLInputElement>(null);
  const subjectRef = useRef<HTMLInputElement>(null);
  const optionsRef = useRef<HTMLInputElement>(null);
  const flagRef = useRef<HTMLSelectElement>(null);
  const flashTagRef = useRef<HTMLSelectElement>(null);
  const fortuneEntryRef = useRef<FortuneEntry | null>(null);
  const diceRollRef = useRef<DiceRoll | null>(null);

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
  const communityFeatures = useCommunityField(effectiveBoardAddress, (community) => community?.features);
  const postLinkFeatures = getEffectivePostLinkFeatures(communityFeatures, directoryEntry?.features);
  const replyLinkFeatures = getEffectiveReplyLinkFeatures(communityFeatures, directoryEntry?.features);
  const requirePostLink = getRequirePostLink(postLinkFeatures);
  const requirePostLinkIsMedia = getRequirePostLinkIsMedia(postLinkFeatures, isInAllView || isInSubscriptionsView);
  const requireReplyLink = getRequireReplyLink(replyLinkFeatures);
  const requireReplyLinkIsMedia = getRequireReplyLinkIsMedia(replyLinkFeatures, isInAllView || isInSubscriptionsView);
  const noReplyLinks = getNoReplyLinks(replyLinkFeatures);
  const requireCurrentLinkIsMedia = isInPostView ? requireReplyLinkIsMedia : requirePostLinkIsMedia;
  const currentMediaLoadError = getLinkMediaLoadStatus(url, mediaLoadResult) === 'error' ? getLinkMediaLoadError(url, t) : null;
  const flagOptions = getCommentFlagOptionsForDirectory(directoryEntry);
  const showFlashUploadPrompt = isFlashDirectoryCode(postOptionsDirectoryCode);
  const showFlashTagSelector = showFlashUploadPrompt && !isInPostView;
  const showMathTagsPrompt = isMathDirectoryCode(postOptionsDirectoryCode) || isMathDirectoryCode(directoryEntry?.directoryCode);
  const showCodeTagsPrompt =
    isCodeTagDirectoryCode(postOptionsDirectoryCode) || isCodeTagDirectoryCode(directoryEntry?.directoryCode) || isCodeTagDirectoryCode(params?.boardIdentifier);

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

  const getMediaLoadError = async (link: string): Promise<string | null> => {
    const errorMessage = getLinkMediaLoadError(link, t);
    const status = getLinkMediaLoadStatus(link, mediaLoadResult);
    if (status === 'error') {
      return errorMessage;
    }
    if (status !== 'loading') {
      return null;
    }

    const didLoad = await canLoadMediaLinkInBrowser(link);
    setMediaLoadResult({ link, status: didLoad ? 'ready' : 'error' });
    return didLoad ? null : errorMessage;
  };

  const onPublishPost = () =>
    runPublishSubmission(async () => {
      const appliedYouTubeConversion = await applyPendingConversion();

      const currentTitle = subjectRef.current?.value.trim() || '';
      const currentDisplayName = nameRef.current?.value.trim() || undefined;
      const currentContent = textRef.current?.value || '';
      const currentUrl = urlRef.current?.value.trim() || '';
      const currentOptions = optionsRef.current?.value || '';
      const currentOptionsError = getPostOptionsValidationError(currentOptions, postOptionsDirectoryCode);
      const publishContent = getContentWithOptions(currentContent, currentOptions, fortuneEntryRef, diceRollRef, postOptionsDirectoryCode);

      checkContentLength.cancel();
      checkPostOptions.cancel();
      setLengthError(null);
      setFormError(null);
      clearSubmissionError(draftKey);
      nonokoRedirectPathRef.current = null;
      handledPendingPostIndexRef.current = null;
      pendingPostNavigationIndexRef.current = null;

      if (currentOptionsError) {
        setFormError(currentOptionsError);
        return;
      }

      if (!currentTitle && !publishContent.trim() && !currentUrl) {
        setFormError(`${t('error')}: ${t('empty_comment_alert')}`);
        return;
      }
      const linkValidationError = getPublishLinkValidationError({
        link: currentUrl,
        requireLink: requirePostLink,
        requireMedia: requirePostLinkIsMedia,
        requiredLinkAlertKey: 'post_link_required_alert',
        requiredMediaLinkAlertKey: 'post_media_link_required_alert',
        t,
      });
      if (linkValidationError) {
        setFormError(linkValidationError);
        return;
      }
      const mediaLoadError = await getMediaLoadError(currentUrl);
      if (mediaLoadError) {
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

      if ((isInAllView || isInSubscriptionsView || isInModView) && !draft.communityAddress) {
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
      pendingPostBoardPathRef.current = pendingPostBoardPath;
      await publishPost({
        displayName: currentDisplayName,
        content: publishContent,
        ...getPublishLinkOptions(currentUrl, appliedYouTubeConversion || (hasRestoredDraftRef.current && Boolean(currentUrl))),
        ...publishOptions,
        ...(hasRestoredDraftRef.current && draft.communityAddress ? { communityAddress: draft.communityAddress } : {}),
        ...(hasRestoredDraftRef.current && draft.spoiler ? { spoiler: true } : {}),
        ...(hasRestoredDraftRef.current && currentTitle ? { title: currentTitle } : {}),
      });
    });

  // redirect to pending page when pending comment is created
  useEffect(() => {
    if (typeof postIndex === 'number') {
      const alreadyNavigatedToPostIndex = handledPendingPostIndexRef.current === postIndex;
      handledPendingPostIndexRef.current = null;
      const nonokoRedirectPath = nonokoRedirectPathRef.current;
      nonokoRedirectPathRef.current = null;
      resetPublishPostOptions();
      if (alreadyNavigatedToPostIndex) {
        return;
      }
      resetFields();
      closeForm();
      if (nonokoRedirectPath) {
        navigate(nonokoRedirectPath, { state: getNonokoPendingRouteState(postIndex) });
      } else {
        pendingPostNavigationIndexRef.current = postIndex;
        usePendingPostNavigationStore.getState().beginPendingPostNavigation(postIndex);
        navigate(`/pending/${postIndex}`, pendingPostBoardPath ? { state: { boardPath: pendingPostBoardPath } } : undefined);
      }
    }
  }, [postIndex, pendingPostBoardPath, resetFields, resetPublishPostOptions, closeForm, navigate]);

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
    updateDraft({ content });
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

  const handleConvertedContentChange = (content: string, selectionStart: number, selectionEnd: number) => {
    if (textRef.current) {
      textRef.current.setSelectionRange(selectionStart, selectionEnd);
    }
    handleContentValueChange(content);
  };

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    handleContentValueChange(e.target.value);
  };

  const handleOptionsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const options = e.target.value;
    updateDraft({ options });
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
      const currentDisplayName = nameRef.current?.value.trim() || undefined;
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
        setFormError(linkValidationError);
        return;
      }
      const mediaLoadError = await getMediaLoadError(currentUrl);
      if (mediaLoadError) {
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
      await publishReply({
        displayName: currentDisplayName,
        content: publishContent,
        ...getPublishLinkOptions(currentUrl, appliedYouTubeConversion || (hasRestoredDraftRef.current && Boolean(currentUrl))),
        ...flagPublishOptions,
        ...(hasRestoredDraftRef.current && draft.spoiler ? { spoiler: true } : {}),
      });
    });

  const setLinkValue = (nextUrl: string) => {
    setUrl(nextUrl);
    updateDraft({ link: nextUrl });
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
    enabled: requireCurrentLinkIsMedia && !(isInPostView && noReplyLinks),
    onContentChange: handleConvertedContentChange,
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

  const handleMediaLoadStatusChange = useCallback((link: string, status: SettledLinkMediaLoadStatus) => {
    setMediaLoadResult((current) => (current?.link === link && current.status === status ? current : { link, status }));
  }, []);

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

  return (
    <>
      <table className={styles.postFormTable}>
        <tbody>
          <PostFormFields
            t={t}
            account={account}
            displayName={displayName}
            nameRef={nameRef}
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
            disableLinkInput={isUploading || youtubeThumbnailConversionCountdown !== null || (isInPostView && noReplyLinks)}
            mediaLoadResult={mediaLoadResult}
            onMediaLoadStatusChange={handleMediaLoadStatusChange}
            setPublishPostOptions={setPublishPostOptions}
            setPublishReplyOptions={setPublishReplyOptions}
            isUploading={isUploading}
            uploadedFileName={uploadedFileName}
            showUploadControls={showUploadControls && !(isInPostView && noReplyLinks)}
            showOekakiControls={showOekakiControls && !(isInPostView && noReplyLinks)}
            showSpoilerForPost={showSpoilerForPost}
            showSpoilerForReply={showSpoilerForReply}
            isInAllView={isInAllView}
            isInSubscriptionsView={isInSubscriptionsView}
            isInModView={isInModView}
            directories={directories}
            accountCommunityAddresses={accountCommunityAddresses}
            subscriptions={subscriptions}
            communityAddress={effectiveBoardAddress}
            rulesPath={rulesPath}
            requireCurrentLinkIsMedia={requireCurrentLinkIsMedia}
            flagOptions={flagOptions}
            flashTagOptions={FLASH_TAG_OPTIONS}
            showFlashTagSelector={showFlashTagSelector}
            showFlashUploadPrompt={showFlashUploadPrompt}
            showMathTagsPrompt={showMathTagsPrompt}
            showCodeTagsPrompt={showCodeTagsPrompt}
            showBbcodeToolbar={showBbcodeToolbar}
            onBbcodePreviewToggle={handleBbcodePreviewToggle}
            onPublishReply={onPublishReply}
            onPublishPost={onPublishPost}
            handleUpload={handleUpload}
            uploadFile={uploadFile}
            onOekakiClearUploadedUrl={handleOekakiClearUploadedUrl}
            isPublishSubmissionInFlight={isPublishSubmissionInFlight}
            disableReplyPublish={isResolvingExternalQuotes}
            draft={draft}
            updateDraft={updateDraft}
          />
        </tbody>
        <tfoot>
          {moderationPostingWarning ? <PostFormErrorRow>{moderationPostingWarning}</PostFormErrorRow> : null}
          {lengthError ? <PostFormErrorRow>{lengthError}</PostFormErrorRow> : null}
          {youtubeThumbnailConversionCountdown !== null ? (
            <PostFormErrorRow ariaLive='polite'>{t('youtube_thumbnail_link_conversion_notice', { count: youtubeThumbnailConversionCountdown })}</PostFormErrorRow>
          ) : currentMediaLoadError ? (
            <PostFormErrorRow>{currentMediaLoadError}</PostFormErrorRow>
          ) : formError ? (
            <PostFormErrorRow>
              {isPostOptionsValidationError(formError) ? <PostOptionsErrorMessage error={formError} directories={directories} /> : formError}
            </PostFormErrorRow>
          ) : null}
          {submissionError ? <PostFormErrorRow>{submissionError}</PostFormErrorRow> : null}
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
  const draftKey = getPageDraftKey(location);
  const showForm = usePostFormDraftsStore((state) => state.forms[draftKey]?.isOpen ?? false);
  const openForm = usePostFormDraftsStore((state) => state.openForm);
  const clearForm = usePostFormDraftsStore((state) => state.clearForm);
  const hideStoredForm = usePostFormDraftsStore((state) => state.closeForm);
  const closeForm = useCallback(() => clearForm(draftKey), [clearForm, draftKey]);
  const hideForm = useCallback(() => hideStoredForm(draftKey), [draftKey, hideStoredForm]);
  const toggleForm = useCallback(() => {
    if (showForm) {
      closeForm();
    } else {
      openForm(draftKey);
    }
  }, [closeForm, draftKey, openForm, showForm]);

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

  const accountComment = useAccountComment({ commentIndex: normalizeAccountCommentIndex(params?.accountCommentIndex) });
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
            <button type='button' className={`${styles.showFormButton} button`} onClick={toggleForm}>
              {showForm ? t('close_post_form') : isInPostView ? t('post_a_reply') : t('start_new_thread')}
            </button>
            {showForm && <PostFormTable key={draftKey} closeForm={closeForm} draftKey={draftKey} hideForm={hideForm} postCid={postCid} />}
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
          <button type='button' className='button' onClick={() => openForm(draftKey)}>
            {isInPostView ? t('post_a_reply') : t('start_new_thread')}
          </button>
          ]
        </div>
      ) : (
        <PostFormTable key={draftKey} closeForm={closeForm} draftKey={draftKey} hideForm={hideForm} postCid={postCid} />
      )}
    </div>
  );
};

export default PostForm;
