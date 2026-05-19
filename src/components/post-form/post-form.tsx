import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { Comment, setAccount, useAccount, useEditedComment } from '@bitsocial/bitsocial-react-hooks';
import getShortAddress from '../../lib/get-short-address';
import useCommunitiesPagesStore from '@bitsocial/bitsocial-react-hooks/dist/stores/communities-pages';
import { getDisplayMediaInfoType, getLinkMediaInfo } from '../../lib/utils/media-utils';
import { getExpiringMediaLinkAlert } from '../../lib/utils/media-link-validation-utils';
import { getPublishURLFilename, isValidPublishURL, isValidURL } from '../../lib/utils/url-utils';
import { hasModQueueAccessRole } from '../../lib/utils/mod-access';
import { isAllView, isCatalogView, isModQueueView, isModView, isPostPageView, isSubscriptionsView } from '../../lib/utils/view-utils';
import { useAccountCommunityAddresses } from '../../hooks/use-account-community-addresses';
import { useDirectories, useDirectoryByAddress } from '../../hooks/use-directories';
import { useCommunityField } from '../../hooks/use-stable-community';
import useIsMobile from '../../hooks/use-is-mobile';
import { useResolvedCommunityAddress } from '../../hooks/use-resolved-community-address';
import useSafeAccountComment from '../../hooks/use-safe-account-comment';
import useFetchGifFirstFrame from '../../hooks/use-fetch-gif-first-frame';
import usePublishPost from '../../hooks/use-publish-post';
import usePublishReply from '../../hooks/use-publish-reply';
import { useFileUpload } from '../../hooks/use-file-upload';
import { getShowUploadControls, isWebRuntime } from '../../lib/media-hosting/show-upload-controls';
import { isCommentArchived } from '../../lib/utils/comment-moderation-utils';
import useMediaHostingStore from '../../stores/use-media-hosting-store';
import BoardOfflineAlert from '../board-offline-alert/board-offline-alert';
import BbcodeEditorToolbar, { BbcodePreview } from '../bbcode-editor-toolbar/bbcode-editor-toolbar';
import LoadingEllipsis from '../loading-ellipsis';
import styles from './post-form.module.css';
import capitalize from 'lodash/capitalize';
import debounce from 'lodash/debounce';

const FILE_LINK_PLACEHOLDER = 'https://website.com/image.jpg';

export const LinkTypePreviewer = ({ link }: { link: string }) => {
  const { t } = useTranslation();
  const mediaInfo = getLinkMediaInfo(link);
  let type = mediaInfo?.type;
  const { status: gifFrameStatus } = useFetchGifFirstFrame(type === 'gif' ? mediaInfo?.url : undefined);

  if (type === 'gif' && gifFrameStatus === 'ready') {
    type = t('animated_gif');
  } else if (type === 'gif') {
    type = t('gif');
  } else if (type) {
    type = getDisplayMediaInfoType(type, t);
  }

  return isValidURL(link) ? `type: ${type}` : t('invalid_url');
};

const PostFormActions = ({
  disableReplyPublish = false,
  variant,
  t,
  isInPostView,
  onPublishReply,
  onPublishPost,
  handleUpload,
  isUploading,
  showUploadControls,
}: {
  disableReplyPublish?: boolean;
  variant: 'reply' | 'post' | 'upload';
  t: TFunction;
  isInPostView: boolean;
  onPublishReply: () => void;
  onPublishPost: () => void;
  handleUpload: () => void;
  isUploading: boolean;
  showUploadControls: boolean;
}) => {
  if (variant === 'reply' && isInPostView) {
    return (
      <button type='button' onClick={onPublishReply} disabled={disableReplyPublish || isUploading}>
        {t('post')}
      </button>
    );
  }
  if (variant === 'post' && !isInPostView) {
    return (
      <button type='button' onClick={onPublishPost}>
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
  textRef: React.RefObject<HTMLTextAreaElement>;
  urlRef: React.Ref<HTMLInputElement>;
  url: string;
  lengthError: string | null;
  handleContentChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  handleContentValueChange: (content: string) => void;
  setPublishPostOptions: (opts: Record<string, unknown>) => void;
  setPublishReplyOptions: (opts: Record<string, unknown>) => void;
  setUrl: (url: string) => void;
  isUploading: boolean;
  uploadedFileName: string | null | undefined;
  showUploadControls: boolean;
  showSpoilerForPost: boolean;
  showSpoilerForReply: boolean;
  isInAllView: boolean;
  isInSubscriptionsView: boolean;
  isInModView: boolean;
  directories: ReturnType<typeof useDirectories>;
  accountCommunityAddresses: string[];
  subscriptions: string[];
  communityAddress: string | undefined;
  requirePostLinkIsMedia: boolean;
  showBbcodeToolbar: boolean;
  onBbcodePreviewToggle: () => void;
  onPublishReply: () => void;
  onPublishPost: () => void;
  handleUpload: () => void;
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
  textRef,
  urlRef,
  url,
  lengthError,
  handleContentChange,
  handleContentValueChange,
  setPublishPostOptions,
  setPublishReplyOptions,
  setUrl,
  isUploading,
  uploadedFileName,
  showUploadControls,
  showSpoilerForPost,
  showSpoilerForReply,
  isInAllView,
  isInSubscriptionsView,
  isInModView,
  directories,
  accountCommunityAddresses,
  subscriptions,
  communityAddress,
  requirePostLinkIsMedia,
  showBbcodeToolbar,
  onBbcodePreviewToggle,
  onPublishReply,
  onPublishPost,
  handleUpload,
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
          isUploading={isUploading}
          showUploadControls={showUploadControls}
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
            isUploading={isUploading}
            showUploadControls={showUploadControls}
          />
        </td>
      </tr>
    )}
    {showBbcodeToolbar ? (
      <tr>
        <td>mods only</td>
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
        {lengthError && <div className={styles.error}>{lengthError}</div>}
      </td>
    </tr>
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
          disabled={isUploading}
          onChange={(e) => {
            setUrl(e.target.value);
            if (isInPostView) {
              setPublishReplyOptions({ link: e.target.value });
            } else {
              setPublishPostOptions({ link: e.target.value });
            }
          }}
        />
        <span className={styles.linkType}> {url && <LinkTypePreviewer link={url} />}</span>
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
            isUploading={isUploading}
            showUploadControls={showUploadControls}
          />
          <span>{isUploading ? <LoadingEllipsis string={t('uploading')} /> : getPublishURLFilename(url) || uploadedFileName || t('no_file_chosen')}</span>
        </td>
      </tr>
    )}
    {((isInPostView && showSpoilerForReply) || (!isInPostView && showSpoilerForPost)) && (
      <tr className={styles.spoilerButton}>
        <td>{t('options')}</td>
        <td>
          [
          <label>
            <input
              type='checkbox'
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
          <select aria-label={t('board')} onChange={(e) => setPublishPostOptions({ communityAddress: e.target.value })} value={communityAddress}>
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
  </>
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

  const location = useLocation();
  const isInAllView = isAllView(location.pathname);
  const isInModView = isModView(location.pathname);
  const isInSubscriptionsView = isSubscriptionsView(location.pathname, useParams());
  const subscriptions = account?.subscriptions || [];
  const directories = useDirectories();
  const directoryEntry = useDirectoryByAddress(effectiveBoardAddress);
  const showSpoilerForPost = directoryEntry?.features?.noSpoilers !== true;
  const showSpoilerForReply = directoryEntry?.features?.noSpoilerReplies !== true;
  const requirePostLinkIsMediaFeature = directoryEntry?.features?.requirePostLinkIsMedia;
  const requirePostLinkIsMedia = requirePostLinkIsMediaFeature === true || (requirePostLinkIsMediaFeature === undefined && (isInAllView || isInSubscriptionsView));

  const accountCommunityAddresses = useAccountCommunityAddresses();
  const accountAddress = account?.author?.address;
  const roles = useCommunityField(effectiveBoardAddress, (community) => community?.roles);
  const accountRole = accountAddress ? roles?.[accountAddress]?.role : undefined;
  const showBbcodeToolbar = hasModQueueAccessRole(accountRole) || (!effectiveBoardAddress && isInModView && accountCommunityAddresses.length > 0);

  const [lengthError, setLengthError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isBbcodePreviewing, setIsBbcodePreviewing] = useState(false);
  const [bbcodePreviewContent, setBbcodePreviewContent] = useState('');

  const checkContentLength = useRef(
    debounce((content: string, t: TFunction) => {
      const length = content.trim().length;
      if (length > 2000) {
        setLengthError(`${t('error')}: ${t('comment_field_too_long', { length })}`);
      } else {
        setLengthError(null);
      }
    }, 1000),
  ).current;

  const resetFields = () => {
    if (textRef.current) {
      textRef.current.value = '';
    }
    if (urlRef.current) {
      urlRef.current.value = '';
    }
    if (subjectRef.current) {
      subjectRef.current.value = '';
    }
    setIsBbcodePreviewing(false);
    setBbcodePreviewContent('');
  };

  const onPublishPost = () => {
    const currentTitle = subjectRef.current?.value.trim() || '';
    const currentContent = textRef.current?.value.trim() || '';
    const currentUrl = urlRef.current?.value.trim() || '';

    checkContentLength.cancel();
    setLengthError(null);
    setFormError(null);

    if (!currentTitle && !currentContent && !currentUrl) {
      setFormError(`${t('error')}: ${t('empty_comment_alert')}`);
      return;
    }
    if (currentUrl && !isValidPublishURL(currentUrl)) {
      setFormError(`${t('error')}: ${t('invalid_url_alert')}`);
      return;
    }
    const expiringMediaLinkAlert = currentUrl ? getExpiringMediaLinkAlert(currentUrl, t) : null;
    if (expiringMediaLinkAlert) {
      setFormError(expiringMediaLinkAlert);
      return;
    }

    if (currentContent.length > 2000) {
      setFormError(`${t('error')}: ${t('field_too_long')}`);
      return;
    }

    if ((isInAllView || isInSubscriptionsView || isInModView) && !publishPostOptions.communityAddress) {
      setFormError(`${t('error')}: ${t('no_board_selected_warning')}`);
      return;
    }

    publishPost();
  };

  // redirect to pending page when pending comment is created
  const navigate = useNavigate();
  useEffect(() => {
    if (typeof postIndex === 'number') {
      resetPublishPostOptions();
      resetFields();
      navigate(`/pending/${postIndex}`);
    }
  }, [postIndex, resetPublishPostOptions, navigate]);

  // in post page, publish a reply to the post
  const isInPostView = isPostPageView(location.pathname, params);
  const cid = params?.commentCid || '';
  const { isResolvingExternalQuotes, publishReply, publishReplyError, publishReplyStateMessage, resetPublishReplyOptions, replyIndex, setPublishReplyOptions } =
    usePublishReply({ cid, communityAddress, postCid });

  useEffect(() => {
    return () => {
      checkContentLength.cancel();
      if (isInPostView) {
        resetPublishReplyOptions();
      } else {
        resetPublishPostOptions();
      }
    };
  }, [checkContentLength, isInPostView, resetPublishPostOptions, resetPublishReplyOptions]);

  const handleContentValueChange = (content: string) => {
    if (isBbcodePreviewing) {
      setBbcodePreviewContent(content);
    }
    if (isInPostView) {
      setPublishReplyOptions({ content });
    } else {
      setPublishPostOptions({ content });
    }
    checkContentLength(content, t);
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

  const onPublishReply = () => {
    const currentContent = textRef.current?.value.trim() || '';
    const currentUrl = urlRef.current?.value.trim() || '';

    checkContentLength.cancel();
    setLengthError(null);
    setFormError(null);

    if (!currentContent && !currentUrl) {
      setFormError(`${t('error')}: ${t('empty_comment_alert')}`);
      return;
    }

    if (currentUrl && !isValidPublishURL(currentUrl)) {
      setFormError(`${t('error')}: ${t('invalid_url_alert')}`);
      return;
    }
    const expiringMediaLinkAlert = currentUrl ? getExpiringMediaLinkAlert(currentUrl, t) : null;
    if (expiringMediaLinkAlert) {
      setFormError(expiringMediaLinkAlert);
      return;
    }

    if (currentContent.length > 2000) {
      setFormError(`${t('error')}: ${t('field_too_long')}`);
      return;
    }

    publishReply();
  };

  useEffect(() => {
    if (typeof replyIndex === 'number') {
      resetFields();
      closeForm();
    }
  }, [replyIndex, closeForm]);

  const { isUploading, uploadedFileName, handleUpload } = useFileUpload({
    onUploadComplete: (uploadedUrl: string) => {
      if (uploadedUrl) {
        setUrl(uploadedUrl);
        if (urlRef.current) {
          urlRef.current.value = uploadedUrl;
        }
        if (isInPostView) {
          setPublishReplyOptions({ link: uploadedUrl });
        } else {
          setPublishPostOptions({ link: uploadedUrl });
        }
      }
    },
  });
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
            textRef={textRef}
            urlRef={urlRef}
            url={url}
            lengthError={lengthError}
            handleContentChange={handleContentChange}
            handleContentValueChange={handleContentValueChange}
            setPublishPostOptions={setPublishPostOptions}
            setPublishReplyOptions={setPublishReplyOptions}
            setUrl={setUrl}
            isUploading={isUploading}
            uploadedFileName={uploadedFileName}
            showUploadControls={showUploadControls}
            showSpoilerForPost={showSpoilerForPost}
            showSpoilerForReply={showSpoilerForReply}
            isInAllView={isInAllView}
            isInSubscriptionsView={isInSubscriptionsView}
            isInModView={isInModView}
            directories={directories}
            accountCommunityAddresses={accountCommunityAddresses}
            subscriptions={subscriptions}
            communityAddress={communityAddress}
            requirePostLinkIsMedia={requirePostLinkIsMedia}
            showBbcodeToolbar={showBbcodeToolbar}
            onBbcodePreviewToggle={handleBbcodePreviewToggle}
            onPublishReply={onPublishReply}
            onPublishPost={onPublishPost}
            handleUpload={handleUpload}
            disableReplyPublish={isResolvingExternalQuotes}
          />
        </tbody>
      </table>
      {formError && <div className={`${styles.error} ${styles.formError}`}>{formError}</div>}
      {publishPostError && <div className={`${styles.error} ${styles.formError}`}>{publishPostError}</div>}
      {publishReplyError && <div className={`${styles.error} ${styles.formError}`}>{publishReplyError}</div>}
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
            <button className={`${styles.showFormButton} button`} onClick={() => setShowForm(showForm ? false : true)}>
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
          <button className='button' onClick={() => setShowForm(true)}>
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
