import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useLocation, useNavigationType, useParams } from 'react-router-dom';
import { Virtuoso, VirtuosoHandle, StateSnapshot } from 'react-virtuoso';
import { Comment, useEditedComment, useReplies, useAccount, usePublishCommentModeration } from '@bitsocial/bitsocial-react-hooks';
import getShortAddress from '../../lib/get-short-address';
import styles from '../../views/post/post.module.css';
import { shouldShowSnow } from '../../lib/snow';
import { getHasThumbnail } from '../../lib/utils/media-utils';
import { getTextColorForBackground, hashStringToColor } from '../../lib/utils/post-utils';
import { getFormattedDate, getFormattedTimeAgo } from '../../lib/utils/time-utils';
import { approvePendingCommentModeration, isPendingApprovalRejected, rejectPendingCommentModeration } from '../../lib/utils/pending-approval-moderation';
import { isAllView, isModQueueView, isModView, isPendingPostView, isPostPageView, isSubscriptionsView } from '../../lib/utils/view-utils';
import { formatUserIDForDisplay } from '../../lib/utils/string-utils';
import useModQueueStore from '../../stores/use-mod-queue-store';
import { findDirectoryByAddress, useDirectories } from '../../hooks/use-directories';
import { getBoardPath } from '../../lib/utils/route-utils';
import useAuthorAddressClick from '../../hooks/use-author-address-click';
import { useCommentMediaInfo } from '../../hooks/use-comment-media-info';
import useCountLinksInReplies from '../../hooks/use-count-links-in-replies';
import useHide from '../../hooks/use-hide';
import useStateString from '../../hooks/use-state-string';
import useScrollToReply from '../../hooks/use-scroll-to-reply';
import useSafeAccountComment from '../../hooks/use-safe-account-comment';
import { useCurrentTime } from '../../hooks/use-current-time';
import { useBoardPseudonymityMode } from '../../hooks/use-board-pseudonymity-mode';
import CommentContent from '../comment-content';
import CommentMedia, { MediaLoadFailureInfo } from '../comment-media';
import FailedPublishNotice from '../failed-publish-notice';
import LoadingEllipsis from '../loading-ellipsis';
import PostMenuMobile from './post-menu-mobile';
import ReplyQuotePreview from '../reply-quote-preview';
import Tooltip from '../tooltip';
import TimeAgoTooltip from '../time-ago-tooltip';
import { PostProps } from '../../views/post/post';
import capitalize from 'lodash/capitalize';
import lowerCase from 'lodash/lowerCase';
import useReplyModalStore from '../../stores/use-reply-modal-store';
import { selectPostMenuProps } from '../../lib/utils/post-menu-props';
import useChallengesStore from '../../stores/use-challenges-store';
import useFeedResetStore from '../../stores/use-feed-reset-store';
import useThreadLiveUpdatesStore from '../../stores/use-thread-live-updates-store';
import useRegisterFreshReplies from '../../hooks/use-register-fresh-replies';
import { alertChallengeVerificationFailed } from '../../lib/utils/challenge-utils';
import useQuotedByMap from '../../hooks/use-quoted-by-map';
import useProgressiveRender from '../../hooks/use-progressive-render';
import useReplyHeightEstimates from '../../hooks/use-reply-height-estimates';
import useFreshReplies from '../../hooks/use-fresh-replies';
import { BOARD_REPLIES_PREVIEW_FETCH_SIZE, BOARD_REPLIES_PREVIEW_VISIBLE_COUNT, REPLIES_PER_PAGE } from '../../lib/constants';
import { isCommentArchived } from '../../lib/utils/comment-moderation-utils';
import { formatErrorForDisplay } from '../../lib/utils/error-utils';
import { getModQueueCommentRoute, getQueuedCommentRouteState } from '../../lib/utils/mod-queue-utils';
import { filterRepliesForDisplay, getPreviewDisplayReplies, hasEnoughPreviewReplies } from '../../lib/utils/replies-preview-utils';
import { getRenderableMobileBacklinks } from '../../lib/utils/reply-backlink-utils';
import { getThreadTopNavigationState, scrollThreadContainerToTop } from '../../lib/utils/thread-scroll-utils';
import useDeleteFailedPost from '../../hooks/use-delete-failed-post';
import { getThreadPostCountsByAuthor } from '../../lib/utils/author-post-counts';
import { withResolvedCommentCommunityAddress } from '../../lib/utils/comment-utils';
import { getFeedPostHeightEstimate, getReplyHeightEstimates, reportReplyHeightAuditSample } from '../../lib/utils/pretext-height-estimates';
import { getAuthorBadge } from '../../lib/utils/author-display-utils';

const { addChallenge } = useChallengesStore.getState();

const RepliesFooter = ({ hasMore, loadingString }: { hasMore: boolean; loadingString: string }) =>
  hasMore ? (
    <div className={styles.stateString}>
      <LoadingEllipsis string={loadingString} />
    </div>
  ) : null;

// Store scroll position for replies virtuoso across navigations
const lastVirtuosoStates: { [key: string]: StateSnapshot } = {};

const PostInfoAndMedia = ({
  onMediaLoadFailureChange,
  post,
  postReplyCount = 0,
  roles,
  threadNumber,
  postsByAuthorInThread,
}: PostProps & { onMediaLoadFailureChange?: (url: string | undefined) => void; postsByAuthorInThread?: Map<string, number> }) => {
  const { t } = useTranslation();
  const directories = useDirectories();
  const resolvedPost = withResolvedCommentCommunityAddress(post);
  const { author, cid, deleted, link, linkHeight, linkWidth, locked, parentCid, pinned, postCid, reason, removed, state, communityAddress, timestamp, thumbnailUrl } =
    resolvedPost || {};
  const archived = isCommentArchived(resolvedPost);
  const purged = resolvedPost?.commentModeration?.purged;
  const boardPath = communityAddress ? getBoardPath(communityAddress, directories) : undefined;
  const displayBoardPath =
    boardPath && communityAddress
      ? boardPath !== communityAddress
        ? boardPath
        : communityAddress.endsWith('.eth') || communityAddress.endsWith('.sol')
          ? communityAddress
          : getShortAddress(communityAddress)
      : undefined;
  const isReply = parentCid;
  const title = post?.title?.trim();
  const { address, shortAddress } = author || {};
  const displayName = author?.displayName?.trim();
  const authorBadge = getAuthorBadge({ address, role: roles?.[address]?.role });

  const params = useParams();
  const location = useLocation();
  const isInAllView = isAllView(location.pathname);
  const isInPostPageView = isPostPageView(location.pathname, params);
  const isInSubscriptionsView = isSubscriptionsView(location.pathname, params);
  const isInModView = isModView(location.pathname);
  const isInModQueueView = isModQueueView(location.pathname);
  const getAlertThresholdSeconds = useModQueueStore((state) => state.getAlertThresholdSeconds);
  const currentTime = useCurrentTime(isInModQueueView ? 60 : false);
  const account = useAccount();
  const accountAddress = account?.author?.address;

  // Check if user is mod of this board
  const accountRole = roles?.[accountAddress]?.role;
  const isAccountMod = accountRole === 'admin' || accountRole === 'owner' || accountRole === 'moderator';

  // Check if post is pending approval and user is mod (for post page view)
  const pendingApproval = resolvedPost?.pendingApproval;
  const shouldShowPendingApprovalButtons = isInPostPageView && !isInModQueueView && pendingApproval && isAccountMod && communityAddress;

  // Moderation actions for pending approval posts
  const {
    publishCommentModeration: approvePending,
    state: approvePendingState,
    error: approvePendingError,
  } = usePublishCommentModeration({
    commentCid: cid,
    communityAddress: shouldShowPendingApprovalButtons ? communityAddress : undefined,
    commentModeration: approvePendingCommentModeration,
    onChallenge: async (...args: any) => {
      addChallenge([...args, resolvedPost]);
    },
    onChallengeVerification: async (challengeVerification, comment) => {
      alertChallengeVerificationFailed(challengeVerification, comment);
    },
    onError: (error: Error & { details?: unknown }) => {
      console.error('Approve failed:', error, error.details);
    },
  });

  const {
    publishCommentModeration: rejectPending,
    state: rejectPendingState,
    error: rejectPendingError,
  } = usePublishCommentModeration({
    commentCid: cid,
    communityAddress: shouldShowPendingApprovalButtons ? communityAddress : undefined,
    commentModeration: rejectPendingCommentModeration,
    onChallenge: async (...args: any) => {
      addChallenge([...args, resolvedPost]);
    },
    onChallengeVerification: async (challengeVerification, comment) => {
      alertChallengeVerificationFailed(challengeVerification, comment);
    },
    onError: (error: Error & { details?: unknown }) => {
      console.error('Reject failed:', error, error.details);
    },
  });

  const [initiatedPendingAction, setInitiatedPendingAction] = useState<'approve' | 'reject' | null>(null);

  const handlePendingApprove = useCallback(async () => {
    const confirm = window.confirm(t('double_confirm'));
    if (!confirm) {
      return;
    }
    setInitiatedPendingAction('approve');
    try {
      await approvePending();
    } catch (e) {
      console.error(e);
    }
  }, [approvePending, t]);

  const handlePendingReject = useCallback(async () => {
    const confirm = window.confirm(t('double_confirm'));
    if (!confirm) {
      return;
    }
    setInitiatedPendingAction('reject');
    try {
      await rejectPending();
    } catch (e) {
      console.error(e);
    }
  }, [rejectPending, t]);

  const isApprovingPending =
    initiatedPendingAction === 'approve' && approvePendingState !== 'initializing' && approvePendingState !== 'succeeded' && approvePendingState !== 'failed';
  const isRejectingPending =
    initiatedPendingAction === 'reject' && rejectPendingState !== 'initializing' && rejectPendingState !== 'succeeded' && rejectPendingState !== 'failed';
  const isPublishingPending = isApprovingPending || isRejectingPending;

  const approvePendingSucceeded = initiatedPendingAction === 'approve' && approvePendingState === 'succeeded';
  const rejectPendingSucceeded = initiatedPendingAction === 'reject' && rejectPendingState === 'succeeded';
  const approvePendingFailed = initiatedPendingAction === 'approve' && approvePendingState === 'failed';
  const rejectPendingFailed = initiatedPendingAction === 'reject' && rejectPendingState === 'failed';

  const pendingStatus = approvePendingSucceeded ? 'approved' : rejectPendingSucceeded ? 'rejected' : approvePendingFailed || rejectPendingFailed ? 'failed' : null;
  const pendingError = approvePendingFailed ? approvePendingError : rejectPendingFailed ? rejectPendingError : undefined;
  const pendingErrorMessage = formatErrorForDisplay(pendingError);

  const commentMediaInfo = useCommentMediaInfo(link, thumbnailUrl, linkWidth, linkHeight);
  const hasThumbnail = getHasThumbnail(commentMediaInfo, link);

  // Check if post is awaiting approval and over threshold (for mod queue view)
  const approved = resolvedPost?.approved;
  const alreadyApproved = approved === true;
  const alreadyRejected = isPendingApprovalRejected(post);
  const isAwaitingApproval = isInModQueueView && !alreadyApproved && !alreadyRejected;
  const timeWaiting = timestamp ? currentTime - timestamp : 0;
  const alertThresholdSeconds = getAlertThresholdSeconds();
  const isOverThreshold = isAwaitingApproval && timeWaiting > alertThresholdSeconds;

  const hasFailedState = state === 'failed';
  const postMenuProps = selectPostMenuProps(resolvedPost);

  const pseudonymityMode = useBoardPseudonymityMode(communityAddress);
  const showUserID = pseudonymityMode === 'per-post';

  const handleUserAddressClick = useAuthorAddressClick();
  const numberOfPostsByAuthor = (() => {
    if (!showUserID || deleted || removed || purged || !shortAddress || !postCid) {
      return 0;
    }

    return Math.max(postsByAuthorInThread?.get(shortAddress) ?? 0, 1);
  })();

  const userID = address ? getShortAddress(address) : shortAddress;
  const userIDBackgroundColor = hashStringToColor(userID);
  const userIDTextColor = getTextColorForBackground(userIDBackgroundColor);

  const { hidden } = useHide({ cid: cid || '' });

  const { openReplyModal } = useReplyModalStore();

  const onReplyModalClick = () => {
    if (deleted) {
      alert(t(isReply ? 'this_reply_was_deleted' : 'this_thread_was_deleted'));
      return;
    }
    if (removed || purged) {
      alert(t(isReply ? 'this_reply_was_removed' : 'this_thread_was_removed'));
      return;
    }
    if (archived && !isReply) {
      alert(t('thread_archived'));
      return;
    }
    if (cid && postCid && communityAddress && openReplyModal) {
      openReplyModal(cid, resolvedPost?.number, postCid, threadNumber, communityAddress);
    }
  };

  const threadRoute = cid ? (boardPath ? `/${boardPath}/thread/${cid}` : `/thread/${cid}`) : undefined;
  const threadTopNavigationState = !isReply ? getThreadTopNavigationState(cid) : undefined;

  const onLinkToPostClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (!cid || !threadRoute) {
      e.preventDefault();
      return;
    }

    if (!isInPostPageView || isReply) return;

    e.preventDefault();
    scrollThreadContainerToTop(cid);
  };

  return (
    <>
      <div className={styles.postInfo} data-post-info-cid={cid}>
        <PostMenuMobile postMenu={postMenuProps} editMenuPost={resolvedPost} />
        <span className={(hidden || ((removed || deleted || purged) && !reason)) && parentCid ? styles.postDesktopHidden : ''}>
          <span className={styles.nameBlock}>
            <span
              className={`${styles.name} ${authorBadge && !(deleted || removed || purged) ? (authorBadge.icon === 'mod' ? styles.capcodeMod : styles.capcodeAdmin) : ''}`}
            >
              {removed ? (
                capitalize(t('removed'))
              ) : deleted ? (
                capitalize(t('deleted'))
              ) : purged ? (
                capitalize(t('purged'))
              ) : displayName ? (
                displayName.length <= 20 ? (
                  displayName
                ) : (
                  <Tooltip content={displayName.length < 1000 ? displayName : displayName.slice(0, 1000) + `... ${t('display_name_too_long')}`}>
                    {displayName.slice(0, 20) + '(...)'}
                  </Tooltip>
                )
              ) : (
                capitalize(t('anonymous'))
              )}{' '}
              {!(deleted || removed || purged) && authorBadge && (
                <span className={authorBadge.capitalizeLabel ? 'capitalize' : undefined}>
                  {' '}
                  ## {authorBadge.label}{' '}
                  <span className={styles.capcodeIconMobileWrapper}>
                    <span
                      className={`${styles.capcodeIconMobile} ${authorBadge.icon === 'mod' ? styles.capcodeModIcon : styles.capcodeAdminIcon}`}
                      title={authorBadge.title === '5chan Dev' ? authorBadge.title : t(authorBadge.title)}
                    />
                  </span>
                  &nbsp;
                </span>
              )}
            </span>
            {showUserID && (
              <>
                (ID: {''}
                {removed ? (
                  lowerCase(t('removed'))
                ) : deleted ? (
                  lowerCase(t('deleted'))
                ) : purged ? (
                  lowerCase(t('purged'))
                ) : !cid && pseudonymityMode ? (
                  <span className={styles.pendingCid}>{hasFailedState ? '?' : capitalize(t('pending'))}</span>
                ) : (
                  <Tooltip
                    content={`${numberOfPostsByAuthor === 1 ? t('1_post_by_this_id') : t('x_posts_by_this_id', { number: numberOfPostsByAuthor })}`}
                    showTooltip={isInPostPageView || postReplyCount < 6}
                  >
                    <span
                      title={t('highlight_posts')}
                      className={styles.userAddress}
                      role='button'
                      tabIndex={0}
                      onClick={() => handleUserAddressClick(userID, postCid)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          handleUserAddressClick(userID, postCid);
                        }
                      }}
                      style={{ backgroundColor: userIDBackgroundColor, color: userIDTextColor }}
                    >
                      {formatUserIDForDisplay(userID)}
                    </span>
                  </Tooltip>
                )}
                ){' '}
              </>
            )}
            {pinned && (
              <span className={styles.stickyIconWrapper}>
                <img src='assets/icons/sticky.gif' alt='' className={styles.stickyIcon} title={t('sticky')} />
              </span>
            )}
            {locked && (
              <span className={`${styles.closedIconWrapper} ${pinned && styles.addPaddingInBetween}`}>
                <img src='assets/icons/closed.gif' alt='' className={styles.closedIcon} title={t('closed')} />
              </span>
            )}
            {archived && (
              <span
                className={`${styles.closedIconWrapper} ${!locked && !pinned ? styles.addPaddingBeforeReply : ''} ${pinned || locked ? styles.addPaddingInBetween : ''}`}
              >
                <img src='assets/icons/archived.gif' alt='' className={styles.closedIcon} title={t('archived')} />
              </span>
            )}
            {title && (
              <span className={styles.subjectWrapper}>
                {title.length <= 30 ? (
                  <span className={styles.subject}>{title}</span>
                ) : (
                  <Tooltip content={title.length < 1000 ? title : title.slice(0, 1000) + `... ${t('title_too_long')}`}>
                    <span className={styles.subject}>{title.slice(0, 30) + '(...)'}</span>
                  </Tooltip>
                )}
              </span>
            )}
          </span>
          <span className={styles.dateTimePostNum}>
            {communityAddress && (isInAllView || isInSubscriptionsView || isInModView) && !isReply && boardPath && displayBoardPath && (
              <div className={styles.postNumLink}>
                {' '}
                <Link to={`/${boardPath}`}>Board: {displayBoardPath}</Link>
              </div>
            )}
            {isInModQueueView && isOverThreshold ? (
              <>
                <TimeAgoTooltip timestamp={timestamp}>
                  <span>{getFormattedDate(timestamp)}</span>
                </TimeAgoTooltip>{' '}
                (<span className={styles.alert}>{getFormattedTimeAgo(timestamp)}</span>)
              </>
            ) : (
              <TimeAgoTooltip timestamp={timestamp}>
                <span>{getFormattedDate(timestamp)}</span>
              </TimeAgoTooltip>
            )}{' '}
            {cid ? (
              <span className={styles.postNumLink}>
                <Link to={threadRoute || '#'} state={threadTopNavigationState} className={styles.linkToPost} title={t('link_to_post')} onClick={onLinkToPostClick}>
                  No.
                </Link>
                <span
                  className={styles.replyToPost}
                  title={t('reply_to_post')}
                  role='button'
                  tabIndex={0}
                  onMouseDown={onReplyModalClick}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onReplyModalClick();
                    }
                  }}
                >
                  {resolvedPost?.number || '?'}
                </span>
              </span>
            ) : (
              <>
                <span>No.</span>
                <span className={styles.pendingCid}>{hasFailedState ? '?' : capitalize(t('pending'))}</span>
              </>
            )}
            {shouldShowPendingApprovalButtons && (
              <div className={styles.modQueueActions}>
                {pendingStatus === 'approved' ? (
                  <span className={styles.modQueueStatusApproved}>{t('approved')}</span>
                ) : pendingStatus === 'rejected' ? (
                  <span className={styles.modQueueStatusRejected}>{t('rejected')}</span>
                ) : pendingStatus === 'failed' ? (
                  <span className={styles.modQueueStatusRejected} title={pendingErrorMessage}>
                    {t('failed')}
                    {pendingErrorMessage ? `: ${pendingErrorMessage}` : ''}
                  </span>
                ) : isPublishingPending ? (
                  <LoadingEllipsis string={t('publishing')} />
                ) : (
                  <>
                    <button className={`button ${styles.approveButton}`} onClick={handlePendingApprove} disabled={isPublishingPending}>
                      {t('approve')}
                    </button>
                    <button className={`button ${styles.rejectButton}`} onClick={handlePendingReject} disabled={isPublishingPending}>
                      {t('reject')}
                    </button>
                  </>
                )}
              </div>
            )}
          </span>
        </span>
      </div>
      {(hasThumbnail || link) && !(deleted || removed || purged) && (
        <PostMediaContent key={cid} onMediaLoadFailureChange={onMediaLoadFailureChange} post={resolvedPost} link={link} />
      )}
    </>
  );
};

const PostMediaContent = ({
  onMediaLoadFailureChange,
  post,
  link,
}: {
  onMediaLoadFailureChange?: (url: string | undefined) => void;
  post: Comment | undefined;
  link: string;
}) => {
  const [showThumbnail, setShowThumbnail] = useState(true);
  const { thumbnailUrl, linkWidth, linkHeight, spoiler, deleted, removed, parentCid } = post || {};
  const purged = post?.commentModeration?.purged;
  const commentMediaInfo = useCommentMediaInfo(link, thumbnailUrl, linkWidth, linkHeight);

  return (
    commentMediaInfo && (
      <CommentMedia
        commentMediaInfo={commentMediaInfo}
        deleted={deleted}
        purged={purged}
        removed={removed}
        linkHeight={linkHeight}
        linkWidth={linkWidth}
        showThumbnail={showThumbnail}
        setShowThumbnail={setShowThumbnail}
        parentCid={parentCid}
        spoiler={spoiler}
        onMediaLoadFailureChange={onMediaLoadFailureChange}
      />
    )
  );
};

interface ReplyBacklinksProps extends PostProps {
  directRepliesByParentCid?: Map<string, Comment[]>;
}

const ReplyBacklinks = ({ post, quotedByMap, directRepliesByParentCid }: ReplyBacklinksProps) => {
  const { cid, parentCid } = post || {};
  const { opBacklinks, directReplyBacklinks, quotedReplyBacklinks } = getRenderableMobileBacklinks({
    cid,
    parentCid,
    quotedByMap,
    directRepliesByParentCid,
  });

  return opBacklinks.length > 0 || directReplyBacklinks.length > 0 || quotedReplyBacklinks.length > 0 ? (
    <div className={styles.mobileReplyBacklinks}>
      {opBacklinks.map((reply: Comment) => (
        <ReplyQuotePreview key={`op-bl-${reply.cid}`} isBacklinkReply={true} backlinkReply={reply} />
      ))}
      {directReplyBacklinks.map((reply: Comment) => (
        <ReplyQuotePreview key={reply.cid} isBacklinkReply={true} backlinkReply={reply} />
      ))}
      {quotedReplyBacklinks.map((reply: Comment) => (
        <ReplyQuotePreview key={`qb-${reply.cid}`} isBacklinkReply={true} backlinkReply={reply} />
      ))}
    </div>
  ) : null;
};

const Reply = ({
  postReplyCount,
  reply,
  roles,
  threadNumber,
  quotedByMap,
  directRepliesByParentCid,
  postsByAuthorInThread,
  disableDeferredLayout,
}: PostProps & { directRepliesByParentCid?: Map<string, Comment[]>; postsByAuthorInThread?: Map<string, number>; disableDeferredLayout?: boolean }) => {
  const accountReply = useSafeAccountComment({
    commentIndex: typeof reply?.index === 'number' ? reply.index : undefined,
  });
  const hasReplyIndex = typeof reply?.index === 'number';
  let post = hasReplyIndex && accountReply?.index === reply.index ? accountReply : reply;
  // handle pending mod or author edit
  const { editedComment } = useEditedComment({ comment: post });
  if (editedComment) {
    post = editedComment;
  }
  post = withResolvedCommentCommunityAddress(post);
  const { author, cid, deleted, postCid, reason, removed, communityAddress } = post || {};
  const purged = post?.commentModeration?.purged;
  const directories = useDirectories();
  const boardPath = communityAddress ? getBoardPath(communityAddress, directories) : undefined;
  const location = useLocation();
  const route = boardPath ? `/${boardPath}/thread/${cid}` : `/thread/${cid}`;
  const isRouteLinkToReply = cid ? location.pathname.startsWith(route) : false;
  const { hidden } = useHide({ cid });
  const { canDeleteFailedPost, canRetryFailedPost, isDeletingFailedPost, isRetryingFailedPost, onDeleteFailedPost, onRetryFailedPost } = useDeleteFailedPost(post);
  const failedPublishNotice = canDeleteFailedPost ? (
    <FailedPublishNotice
      isDeleting={isDeletingFailedPost}
      isRetrying={isRetryingFailedPost}
      onDelete={onDeleteFailedPost}
      onRetry={canRetryFailedPost ? onRetryFailedPost : undefined}
    />
  ) : undefined;
  const [failedMediaUrl, setFailedMediaUrl] = useState<string | undefined>();
  const mediaLoadFailureInfo = failedMediaUrl && failedMediaUrl === post?.link ? <MediaLoadFailureInfo url={failedMediaUrl} /> : undefined;

  return (
    <div className={`${styles.replyMobile} ${disableDeferredLayout ? styles.pretextVirtualizedReply : ''}`}>
      <div className={styles.reply}>
        <div
          className={`${styles.replyContainer} ${isRouteLinkToReply && styles.highlight}`}
          data-cid={cid}
          data-author-address={author?.shortAddress}
          data-post-cid={postCid}
        >
          <PostInfoAndMedia
            onMediaLoadFailureChange={setFailedMediaUrl}
            post={post}
            postReplyCount={postReplyCount}
            postsByAuthorInThread={postsByAuthorInThread}
            roles={roles}
            threadNumber={threadNumber}
          />
          {post && !hidden && (!(removed || deleted || purged) || ((removed || deleted) && reason) || purged) && (
            <CommentContent appendContent={mediaLoadFailureInfo} comment={post} prependContent={failedPublishNotice} roles={roles} />
          )}
          {post && <ReplyBacklinks post={post} quotedByMap={quotedByMap} directRepliesByParentCid={directRepliesByParentCid} />}
        </div>
      </div>
    </div>
  );
};

const PostMobile = ({
  feedVirtualizationModeOverride,
  post,
  roles,
  replyPaginationOverride,
  replyVirtualizationModeOverride,
  showAllReplies,
  showReplies = true,
  targetReplyCid,
  isModQueue,
  modQueueStatus,
  modQueueError,
  isPublishing,
  onApprove,
  onReject,
  onRemoveFromModQueue,
}: PostProps) => {
  const { t } = useTranslation();
  const resolvedPost = withResolvedCommentCommunityAddress(post);
  const { author, cid, parentCid, postCid, replyCount, state, communityAddress } = resolvedPost || {};
  const params = useParams();
  const location = useLocation();
  const navigationType = useNavigationType();
  const isInPendingPostView = isPendingPostView(location.pathname, params);
  const isInPostView = isPostPageView(location.pathname, params);
  const directories = useDirectories();
  const directoryEntry = findDirectoryByAddress(directories, communityAddress);
  const requirePostLinkIsMedia = directoryEntry?.features?.requirePostLinkIsMedia === true;
  const boardPath = communityAddress ? getBoardPath(communityAddress, directories) : undefined;
  const modQueueThreadRoute = getModQueueCommentRoute(boardPath, resolvedPost?.cid);
  const modQueueThreadRouteState = getQueuedCommentRouteState(resolvedPost);
  const modQueueErrorMessage = formatErrorForDisplay(modQueueError);
  const modQueueRemoveButton = onRemoveFromModQueue ? (
    <button className='button' onClick={onRemoveFromModQueue} disabled={isPublishing}>
      {capitalize(t('remove'))}
    </button>
  ) : null;
  const linksCount = useCountLinksInReplies(resolvedPost);
  const deleteFailedPostRedirectPath = isInPendingPostView ? (boardPath ? `/${boardPath}` : '/') : undefined;
  const hasReplyPaginationOverride = !!replyPaginationOverride;
  const shouldFetchReplies = showReplies && !isModQueue && !hasReplyPaginationOverride;
  const shouldUsePreview = shouldFetchReplies && !showAllReplies;
  const cachedPreviewRepliesResult = useReplies({
    comment: shouldUsePreview ? resolvedPost : undefined,
    onlyIfCached: true,
    sortType: 'new',
    flat: true,
    repliesPerPage: BOARD_REPLIES_PREVIEW_FETCH_SIZE,
    accountComments: { newerThan: Infinity, append: true },
  });
  const cachedPreviewReplies = cachedPreviewRepliesResult.updatedReplies?.length ? cachedPreviewRepliesResult.updatedReplies : cachedPreviewRepliesResult.replies || [];
  const cachedPreviewDisplayCount = filterRepliesForDisplay(cachedPreviewReplies).length;
  const hasEnoughCachedPreview = hasEnoughPreviewReplies({
    replyCount: resolvedPost?.replyCount,
    loadedCount: cachedPreviewDisplayCount,
    visibleCount: BOARD_REPLIES_PREVIEW_VISIBLE_COUNT,
  });
  const previewRepliesResult = useReplies({
    comment: shouldUsePreview && !hasEnoughCachedPreview ? resolvedPost : undefined,
    sortType: 'new',
    flat: true,
    repliesPerPage: BOARD_REPLIES_PREVIEW_FETCH_SIZE,
    accountComments: { newerThan: Infinity, append: true },
  });
  const fullRepliesResult = useReplies({
    comment: shouldFetchReplies && showAllReplies ? resolvedPost : undefined,
    sortType: 'old',
    flat: true,
    repliesPerPage: REPLIES_PER_PAGE,
    accountComments: { newerThan: Infinity, append: true },
  });
  const livePreviewReplies = previewRepliesResult.updatedReplies?.length ? previewRepliesResult.updatedReplies : previewRepliesResult.replies || [];
  const previewReplies = hasReplyPaginationOverride ? replyPaginationOverride.replies : hasEnoughCachedPreview ? cachedPreviewReplies : livePreviewReplies;
  const repliesResult = hasReplyPaginationOverride
    ? {
        hasMore: replyPaginationOverride.hasMore ?? false,
        loadMore: replyPaginationOverride.loadMore ?? (() => {}),
        replies: replyPaginationOverride.replies,
        reset: replyPaginationOverride.reset,
        updatedReplies: replyPaginationOverride.replies,
      }
    : showAllReplies
      ? fullRepliesResult
      : { ...previewRepliesResult, replies: previewReplies, updatedReplies: previewReplies };
  const { replies, hasMore, loadMore } = repliesResult;
  const updatedReplies = repliesResult.updatedReplies;
  const repliesForRender = updatedReplies?.length ? updatedReplies : replies || [];
  const freshRepliesForRender = useFreshReplies(repliesForRender);
  useRegisterFreshReplies(resolvedPost, freshRepliesForRender);
  const reset = (repliesResult as { reset?: () => Promise<void> }).reset;
  const setResetFunction = useFeedResetStore((s) => s.setResetFunction);
  const repliesResetRequestId = useThreadLiveUpdatesStore((state) => state.repliesResetRequestId);
  const lastHandledRepliesResetRequestIdRef = useRef(repliesResetRequestId);
  useEffect(() => {
    if ((isInPostView || isInPendingPostView) && reset) {
      setResetFunction(() => {
        reset();
      });
    }
  }, [isInPostView, isInPendingPostView, reset, setResetFunction]);
  useEffect(() => {
    if (!reset || repliesResetRequestId === 0 || repliesResetRequestId === lastHandledRepliesResetRequestIdRef.current) return;
    lastHandledRepliesResetRequestIdRef.current = repliesResetRequestId;
    void reset();
  }, [repliesResetRequestId, reset]);

  const isInPostPageView = isPostPageView(location.pathname, params);
  const { hidden, unhide } = useHide({ cid });

  const stateString = useStateString(resolvedPost) || t('loading_post');
  const hasFailedState = state === 'failed';
  const isReply = !!parentCid;
  const { canDeleteFailedPost, canRetryFailedPost, isDeletingFailedPost, isRetryingFailedPost, onDeleteFailedPost, onRetryFailedPost } = useDeleteFailedPost(
    resolvedPost,
    deleteFailedPostRedirectPath,
  );
  const failedPublishNotice = canDeleteFailedPost ? (
    <FailedPublishNotice
      isDeleting={isDeletingFailedPost}
      isRetrying={isRetryingFailedPost}
      onDelete={onDeleteFailedPost}
      onRetry={canRetryFailedPost ? onRetryFailedPost : undefined}
    />
  ) : undefined;
  const [failedMediaUrl, setFailedMediaUrl] = useState<string | undefined>();
  const mediaLoadFailureInfo = failedMediaUrl && failedMediaUrl === resolvedPost?.link ? <MediaLoadFailureInfo url={failedMediaUrl} /> : undefined;

  // Author-deleted replies are hidden from thread replies; moderator removals still render their placeholder.
  const filteredReplies = useMemo(() => filterRepliesForDisplay(freshRepliesForRender), [freshRepliesForRender]);
  const postsByAuthorInThread = useMemo(() => getThreadPostCountsByAuthor(resolvedPost, filteredReplies), [resolvedPost, filteredReplies]);
  const previewDisplayReplies = useMemo(() => getPreviewDisplayReplies(filteredReplies, BOARD_REPLIES_PREVIEW_VISIBLE_COUNT), [filteredReplies]);

  const directRepliesByParentCid = useMemo(() => {
    const map = new Map<string, Comment[]>();
    for (const reply of filteredReplies) {
      const directParentCid = reply?.parentCid;
      if (!directParentCid || !reply?.cid) continue;
      const existingReplies = map.get(directParentCid);
      if (existingReplies) {
        existingReplies.push(reply);
      } else {
        map.set(directParentCid, [reply]);
      }
    }
    return map;
  }, [filteredReplies]);

  const quotedByMap = useQuotedByMap(filteredReplies, communityAddress);
  const {
    defaultItemHeight: defaultReplyItemHeight,
    heightEstimates: replyHeightEstimates,
    itemSize: replyItemSize,
    metrics,
    windowWidth,
  } = useReplyHeightEstimates({
    directRepliesByParentCid,
    enabled: showAllReplies,
    isMobile: true,
    maxContentChars: showAllReplies ? 2000 : 1000,
    mode: replyVirtualizationModeOverride,
    quotedByMap,
    replies: filteredReplies,
  });
  const replyVirtualizationProps = replyItemSize ? { itemSize: replyItemSize } : {};
  const shouldUseFeedHeightEstimate = !showAllReplies && feedVirtualizationModeOverride !== 'off';
  const previewReplyHeightEstimates = useMemo(
    () =>
      !shouldUseFeedHeightEstimate || previewDisplayReplies.length === 0
        ? []
        : getReplyHeightEstimates({
            context: 'preview',
            directRepliesByParentCid,
            isMobile: true,
            maxContentChars: 1000,
            metrics,
            quotedByMap,
            replies: previewDisplayReplies,
            windowWidth,
          }),
    [directRepliesByParentCid, metrics, previewDisplayReplies, quotedByMap, shouldUseFeedHeightEstimate, windowWidth],
  );
  const getPreviewReplyDebugProps = useCallback(
    (index: number) => (import.meta.env.DEV && shouldUseFeedHeightEstimate ? { 'data-pretext-reply-estimate': previewReplyHeightEstimates[index] } : {}),
    [previewReplyHeightEstimates, shouldUseFeedHeightEstimate],
  );
  const feedHeightEstimate = useMemo(
    () =>
      !shouldUseFeedHeightEstimate
        ? undefined
        : getFeedPostHeightEstimate({
            directRepliesByParentCid,
            isMobile: true,
            metrics,
            post: resolvedPost,
            previewReplies: previewDisplayReplies,
            previewReplyEstimates: previewReplyHeightEstimates,
            quotedByMap,
            windowWidth,
          }),
    [directRepliesByParentCid, metrics, previewDisplayReplies, previewReplyHeightEstimates, quotedByMap, resolvedPost, shouldUseFeedHeightEstimate, windowWidth],
  );

  const visibleReplies = useProgressiveRender(filteredReplies, {
    batchSize: 50,
    intervalMs: 100,
    resetKey: cid,
    disabled: hasMore || !!targetReplyCid || !showAllReplies,
  });

  // Virtuoso scroll position management for infinite replies
  const virtuosoRef = useRef<VirtuosoHandle | null>(null);
  const virtuosoStateKey = `replies-mobile-${cid}`;

  useEffect(() => {
    if (!showAllReplies || !isInPostPageView) return;

    const currentKey = virtuosoStateKey;
    const setLastVirtuosoState = () => {
      virtuosoRef.current?.getState((snapshot: StateSnapshot) => {
        if (snapshot?.ranges?.length) {
          lastVirtuosoStates[currentKey] = snapshot;
        }
      });
    };
    window.addEventListener('scroll', setLastVirtuosoState, { passive: true });
    return () => window.removeEventListener('scroll', setLastVirtuosoState);
  }, [virtuosoStateKey, showAllReplies, isInPostPageView]);

  const lastVirtuosoState = navigationType === 'POP' ? lastVirtuosoStates?.[virtuosoStateKey] : undefined;

  const shouldScrollToReply = showAllReplies && showReplies && !isInPendingPostView && !!targetReplyCid;
  useScrollToReply({
    targetReplyCid,
    replies: filteredReplies,
    hasMore,
    loadMore,
    virtuosoRef,
    enabled: shouldScrollToReply,
  });

  const virtuosoFooter = useCallback(() => <RepliesFooter hasMore={hasMore} loadingString={t('loading')} />, [hasMore, t]);

  return (
    <>
      {hidden && !isInPostPageView ? (
        <>
          <hr className={styles.unhideButtonHr} />
          <span className={styles.mobileUnhideButton}>
            <span
              className='button'
              role='button'
              tabIndex={0}
              onClick={unhide}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  unhide();
                }
              }}
            >
              Show Hidden Thread
            </span>
          </span>
        </>
      ) : (
        <div className={styles.postMobile} data-pretext-height={shouldUseFeedHeightEstimate ? feedHeightEstimate : undefined}>
          {(showReplies || isModQueue) && (
            <div className={styles.hrWrapper}>
              <hr />
            </div>
          )}
          <div className={showReplies || isModQueue ? styles.thread : styles.quotePreview}>
            <div className={styles.postContainer}>
              <div
                className={`${styles.postOp} ${shouldShowSnow() ? styles.xmasHatWrapper : ''}`}
                data-thread-container-cid={cid}
                data-cid={cid}
                data-author-address={author?.shortAddress}
                data-post-cid={postCid}
              >
                {shouldShowSnow() && <img src='assets/xmashat.gif' className={styles.xmasHat} alt='' />}
                <PostInfoAndMedia
                  onMediaLoadFailureChange={setFailedMediaUrl}
                  post={resolvedPost}
                  postReplyCount={replyCount}
                  postsByAuthorInThread={postsByAuthorInThread}
                  roles={roles}
                  threadNumber={resolvedPost?.number}
                />
                {resolvedPost && <CommentContent appendContent={mediaLoadFailureInfo} comment={resolvedPost} prependContent={failedPublishNotice} roles={roles} />}
                {resolvedPost && <ReplyBacklinks post={resolvedPost} quotedByMap={quotedByMap} directRepliesByParentCid={directRepliesByParentCid} />}
              </div>
              {!isInPostView && !isInPendingPostView && (showReplies || isModQueue) && (
                <div className={styles.postLink}>
                  <span className={styles.info}>
                    {[
                      isModQueue ? `${capitalize(t('type'))}: ${capitalize(t(isReply ? 'reply' : 'post'))}` : null,
                      replyCount > 0 ? `${replyCount} Replies` : null,
                      linksCount > 0 ? `${linksCount} ${requirePostLinkIsMedia ? 'Images' : 'Links'}` : null,
                    ]
                      .filter(Boolean)
                      .join(' / ')}
                  </span>
                  {isModQueue ? (
                    <div className={styles.modQueueActions}>
                      {modQueueStatus === 'approved' ? (
                        <>
                          <span className={styles.modQueueStatusApproved}>{t('approved')}</span>
                          {modQueueRemoveButton}
                        </>
                      ) : modQueueStatus === 'rejected' ? (
                        <>
                          <span className={styles.modQueueStatusRejected}>{t('rejected')}</span>
                          {modQueueRemoveButton}
                        </>
                      ) : modQueueStatus === 'failed' ? (
                        <span className={styles.modQueueStatusRejected} title={modQueueErrorMessage}>
                          {t('failed')}
                          {modQueueErrorMessage ? `: ${modQueueErrorMessage}` : ''}
                        </span>
                      ) : isPublishing ? (
                        <LoadingEllipsis string={t('publishing')} />
                      ) : (
                        <>
                          {isReply && modQueueThreadRoute && (
                            <Link to={modQueueThreadRoute} state={modQueueThreadRouteState} className={`button ${styles.approveButton}`}>
                              {t('view_thread')}
                            </Link>
                          )}
                          <button className={`button ${styles.approveButton}`} onClick={onApprove} disabled={isPublishing}>
                            {t('approve')}
                          </button>
                          <button className={`button ${styles.rejectButton}`} onClick={onReject} disabled={isPublishing}>
                            {t('reject')}
                          </button>
                        </>
                      )}
                    </div>
                  ) : (
                    <Link to={boardPath ? `/${boardPath}/thread/${cid}` : `/thread/${cid}`} className='button'>
                      {t('view_thread')}
                    </Link>
                  )}
                </div>
              )}
            </div>
            {/* Virtuoso infinite scroll for post page view when there's more content to paginate */}
            {showAllReplies && !isInPendingPostView && showReplies && hasMore && !!resolvedPost?.replyCount && (
              <Virtuoso
                defaultItemHeight={defaultReplyItemHeight}
                heightEstimates={replyHeightEstimates}
                {...replyVirtualizationProps}
                increaseViewportBy={{ bottom: 1200, top: 1200 }}
                totalCount={filteredReplies.length}
                data={filteredReplies}
                itemContent={(index, reply) => {
                  const renderableBacklinks = import.meta.env.DEV
                    ? getRenderableMobileBacklinks({
                        cid: reply.cid,
                        directRepliesByParentCid,
                        parentCid: reply.parentCid,
                        quotedByMap,
                      })
                    : undefined;
                  const backlinkCount = renderableBacklinks
                    ? renderableBacklinks.directReplyBacklinks.length + renderableBacklinks.opBacklinks.length + renderableBacklinks.quotedReplyBacklinks.length
                    : undefined;

                  return (
                    <div
                      className={styles.replyContainer}
                      data-pretext-height={replyHeightEstimates?.[index]}
                      data-pretext-reply-backlink-count={backlinkCount}
                      data-pretext-reply-content-length={import.meta.env.DEV ? reply.content?.length || 0 : undefined}
                      data-pretext-reply-has-media={import.meta.env.DEV ? (reply.link ? '1' : '0') : undefined}
                      data-pretext-reply-number={import.meta.env.DEV ? reply.number : undefined}
                      data-pretext-reply-title-length={import.meta.env.DEV ? reply.title?.trim().length || 0 : undefined}
                      ref={(element) => reportReplyHeightAuditSample(element, replyHeightEstimates?.[index], reply.cid)}
                    >
                      <Reply
                        disableDeferredLayout={Boolean(replyItemSize)}
                        postReplyCount={replyCount}
                        reply={reply}
                        postsByAuthorInThread={postsByAuthorInThread}
                        roles={roles}
                        threadNumber={resolvedPost?.number}
                        quotedByMap={quotedByMap}
                        directRepliesByParentCid={directRepliesByParentCid}
                      />
                    </div>
                  );
                }}
                useWindowScroll={true}
                components={{ Footer: virtuosoFooter }}
                endReached={loadMore}
                ref={virtuosoRef}
                restoreStateFrom={lastVirtuosoState}
                initialScrollTop={lastVirtuosoState?.scrollTop}
              />
            )}
            {/* Non-virtualized rendering for post page view when all replies fit on one page */}
            {showAllReplies &&
              !isInPendingPostView &&
              showReplies &&
              !hasMore &&
              visibleReplies.map((reply) => (
                <div key={reply.cid} className={styles.replyContainer}>
                  <Reply
                    postReplyCount={replyCount}
                    reply={reply}
                    postsByAuthorInThread={postsByAuthorInThread}
                    roles={roles}
                    threadNumber={resolvedPost?.number}
                    quotedByMap={quotedByMap}
                    directRepliesByParentCid={directRepliesByParentCid}
                  />
                </div>
              ))}
            {/* Non-virtualized rendering for board view (last 5 replies) */}
            {!showAllReplies &&
              !isInPendingPostView &&
              freshRepliesForRender &&
              showReplies &&
              previewDisplayReplies.map((reply, index) => (
                <div key={reply.cid} className={styles.replyContainer} {...getPreviewReplyDebugProps(index)}>
                  <Reply
                    disableDeferredLayout={feedVirtualizationModeOverride === 'item-size'}
                    postReplyCount={replyCount}
                    reply={reply}
                    postsByAuthorInThread={postsByAuthorInThread}
                    roles={roles}
                    threadNumber={resolvedPost?.number}
                    quotedByMap={quotedByMap}
                    directRepliesByParentCid={directRepliesByParentCid}
                  />
                </div>
              ))}
          </div>
          {!isInPendingPostView &&
          stateString &&
          !hasFailedState &&
          state !== 'succeeded' &&
          !(resolvedPost?.timestamp && !resolvedPost?.updatedAt) &&
          isInPostPageView &&
          !(!showReplies && !showAllReplies) ? (
            <div className={styles.stateString}>
              <LoadingEllipsis string={stateString} />
            </div>
          ) : (
            hasFailedState && <span className={styles.error}>{t('failed')}</span>
          )}
        </div>
      )}
    </>
  );
};

export default PostMobile;
