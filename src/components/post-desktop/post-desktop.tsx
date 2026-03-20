import { useEffect, useRef, useState, useCallback } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { Link, useLocation, useNavigationType, useParams } from 'react-router-dom';
import { Virtuoso, VirtuosoHandle, StateSnapshot } from 'react-virtuoso';
import { Comment, useEditedComment, useReplies, useAccount, useAccountComment } from '@bitsocialnet/bitsocial-react-hooks';
import getShortAddress from '../../lib/get-short-address';
import styles from '../../views/post/post.module.css';
import { CommentMediaInfo, getDisplayMediaInfoType, getHasThumbnail, getMediaDimensions } from '../../lib/utils/media-utils';
import { hashStringToColor, getTextColorForBackground } from '../../lib/utils/post-utils';
import { getFormattedDate, getFormattedTimeAgo } from '../../lib/utils/time-utils';
import { approvePendingCommentModeration, isPendingApprovalRejected, rejectPendingCommentModeration } from '../../lib/utils/pending-approval-moderation';
import { isValidURL } from '../../lib/utils/url-utils';
import { isAllView, isModQueueView, isModView, isPendingPostView, isPostPageView, isSubscriptionsView } from '../../lib/utils/view-utils';
import { formatUserIDForDisplay, truncateWithEllipsisInMiddle } from '../../lib/utils/string-utils';
import useModQueueStore from '../../stores/use-mod-queue-store';
import { findDirectoryByAddress, useDirectories } from '../../hooks/use-directories';
import { getBoardPath } from '../../lib/utils/route-utils';
import useAuthorAddressClick from '../../hooks/use-author-address-click';
import { useCommentMediaInfo } from '../../hooks/use-comment-media-info';
import useCountLinksInReplies from '../../hooks/use-count-links-in-replies';
import useFetchGifFirstFrame from '../../hooks/use-fetch-gif-first-frame';
import useHide from '../../hooks/use-hide';
import useStateString from '../../hooks/use-state-string';
import useScrollToReply from '../../hooks/use-scroll-to-reply';
import { useCurrentTime } from '../../hooks/use-current-time';
import { useBoardPseudonymityMode } from '../../hooks/use-board-pseudonymity-mode';
import CommentContent from '../comment-content';
import CommentMedia from '../comment-media';
import EditMenu from '../edit-menu/edit-menu';
import FailedPublishNotice from '../failed-publish-notice';
import { canEmbed } from '../embed';
import LoadingEllipsis from '../loading-ellipsis';
import PostMenuDesktop from './post-menu-desktop';
import ReplyQuotePreview from '../reply-quote-preview';
import Tooltip from '../tooltip';
import { PostProps } from '../../views/post/post';
import { create } from 'zustand';
import capitalize from 'lodash/capitalize';
import lowerCase from 'lodash/lowerCase';
import { shouldShowSnow } from '../../lib/snow';
import useReplyModalStore from '../../stores/use-reply-modal-store';
import { selectPostMenuProps } from '../../lib/utils/post-menu-props';
import useChallengesStore from '../../stores/use-challenges-store';
import useFeedResetStore from '../../stores/use-feed-reset-store';
import useThreadLiveUpdatesStore from '../../stores/use-thread-live-updates-store';
import useRegisterFreshReplies from '../../hooks/use-register-fresh-replies';
import { alertChallengeVerificationFailed } from '../../lib/utils/challenge-utils';
import { usePublishCommentModeration } from '@bitsocialnet/bitsocial-react-hooks';
import useQuotedByMap from '../../hooks/use-quoted-by-map';
import useProgressiveRender from '../../hooks/use-progressive-render';
import useFreshReplies from '../../hooks/use-fresh-replies';
import { BOARD_REPLIES_PREVIEW_FETCH_SIZE, BOARD_REPLIES_PREVIEW_VISIBLE_COUNT, REPLIES_PER_PAGE } from '../../lib/constants';
import {
  computeOmittedCount,
  filterRepliesForDisplay,
  getPreviewDisplayReplies,
  getTotalReplyCount,
  hasEnoughPreviewReplies,
} from '../../lib/utils/replies-preview-utils';
import { isCommentArchived } from '../../lib/utils/comment-moderation-utils';
import { getThreadTopNavigationState, scrollThreadContainerToTop } from '../../lib/utils/thread-scroll-utils';
import useDeleteFailedPost from '../../hooks/use-delete-failed-post';
import { getThreadPostCountsByAuthor } from '../../lib/utils/author-post-counts';
import { withResolvedCommentCommunityAddress } from '../../lib/utils/comment-utils';

const { addChallenge } = useChallengesStore.getState();

const RepliesFooter = ({ hasMore, loadingString }: { hasMore: boolean; loadingString: string }) =>
  hasMore ? (
    <div className={styles.stateString}>
      <LoadingEllipsis string={loadingString} />
    </div>
  ) : null;

// Store scroll position for replies virtuoso across navigations
const lastVirtuosoStates: { [key: string]: StateSnapshot } = {};

interface ShowOmittedRepliesState {
  showOmittedReplies: Record<string, boolean>;
  setShowOmittedReplies: (cid: string, showOmittedReplies: boolean) => void;
}

const useShowOmittedReplies = create<ShowOmittedRepliesState>((set) => ({
  showOmittedReplies: {},
  setShowOmittedReplies: (cid, showOmittedReplies) =>
    set((state) => ({
      showOmittedReplies: {
        ...state.showOmittedReplies,
        [cid]: showOmittedReplies,
      },
    })),
}));

const PostInfo = ({
  post,
  postReplyCount = 0,
  roles,
  isHidden,
  threadNumber,
  isModQueue,
  modQueueStatus,
  modQueueError,
  isPublishing,
  onApprove,
  onReject,
  quotedByMap,
  directRepliesByParentCid,
  postsByAuthorInThread,
}: PostProps & { directRepliesByParentCid?: Map<string, Comment[]>; postsByAuthorInThread?: Map<string, number> }) => {
  const { t } = useTranslation();
  const { author, cid, deleted, locked, pinned, parentCid, postCid, reason, removed, state, communityAddress, timestamp } = post || {};
  const archived = isCommentArchived(post);
  const purged = post?.commentModeration?.purged;
  const title = post?.title?.trim();
  const { address, shortAddress } = author || {};
  const displayName = author?.displayName?.trim();
  const authorRole = roles?.[address]?.role?.replace('moderator', 'mod');
  const hasFailedState = state === 'failed';
  const isReply = parentCid;
  const { showOmittedReplies } = useShowOmittedReplies();
  const directories = useDirectories();
  const boardPath = communityAddress ? getBoardPath(communityAddress, directories) : undefined;
  const postMenuProps = selectPostMenuProps(post);

  const params = useParams();
  const location = useLocation();
  const isInPostPageView = isPostPageView(location.pathname, params);
  const isInModQueueView = isModQueueView(location.pathname);
  const { getAlertThresholdSeconds } = useModQueueStore();
  const currentTime = useCurrentTime();
  const account = useAccount();
  const accountAddress = account?.author?.address;

  // Check if user is mod of this board
  const accountRole = roles?.[accountAddress]?.role;
  const isAccountMod = accountRole === 'admin' || accountRole === 'owner' || accountRole === 'moderator';

  // Check if post is pending approval and user is mod (for post page view)
  const pendingApproval = post?.pendingApproval;
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
      addChallenge([...args, post]);
    },
    onChallengeVerification: async (challengeVerification, comment) => {
      alertChallengeVerificationFailed(challengeVerification, comment);
    },
    onError: (error: Error) => {
      console.error('Approve failed:', error);
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
      addChallenge([...args, post]);
    },
    onChallengeVerification: async (challengeVerification, comment) => {
      alertChallengeVerificationFailed(challengeVerification, comment);
    },
    onError: (error: Error) => {
      console.error('Reject failed:', error);
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
  const pendingErrorMessage = approvePendingFailed ? approvePendingError?.message : rejectPendingFailed ? rejectPendingError?.message : undefined;

  // Check if post is awaiting approval and over threshold (for mod queue view)
  const approved = post?.approved;
  const alreadyApproved = approved === true;
  const alreadyRejected = isPendingApprovalRejected(post);
  const isAwaitingApproval = isInModQueueView && !alreadyApproved && !alreadyRejected;
  const timeWaiting = timestamp ? currentTime - timestamp : 0;
  const alertThresholdSeconds = getAlertThresholdSeconds();
  const isOverThreshold = isAwaitingApproval && timeWaiting > alertThresholdSeconds;

  const userID = address ? getShortAddress(address) : shortAddress;
  const userIDBackgroundColor = hashStringToColor(userID);
  const userIDTextColor = getTextColorForBackground(userIDBackgroundColor);

  const pseudonymityMode = useBoardPseudonymityMode(communityAddress);
  const showUserID = pseudonymityMode === 'per-post';

  const handleUserAddressClick = useAuthorAddressClick();
  const numberOfPostsByAuthor = (() => {
    if (!showUserID || deleted || removed || purged || !shortAddress || !postCid) {
      return 0;
    }

    return Math.max(postsByAuthorInThread?.get(shortAddress) ?? 0, 1);
  })();

  const { hidden } = useHide(post);

  const { openReplyModal } = useReplyModalStore();

  const onReplyModalClick = () => {
    deleted
      ? isReply
        ? alert(t('this_reply_was_deleted'))
        : alert(t('this_thread_was_deleted'))
      : removed || purged
        ? isReply
          ? alert(t('this_reply_was_removed'))
          : alert(t('this_thread_was_removed'))
        : archived && !isReply
          ? alert(t('thread_archived'))
          : openReplyModal && openReplyModal(cid, post?.number, postCid, threadNumber, communityAddress);
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
    <div className={styles.postInfo} data-post-info-cid={cid}>
      {isHidden ? parentCid && <span className={styles.hiddenReplyEditMenuSpacer} /> : <EditMenu post={post} />}
      <span className={(hidden || ((removed || deleted || purged) && !reason)) && parentCid ? styles.postDesktopHidden : ''}>
        {title &&
          (title.length <= 75 ? (
            <span className={styles.subject}>{title} </span>
          ) : (
            <Tooltip content={title.length < 1000 ? title : title.slice(0, 1000) + `... ${t('title_too_long')}`}>
              <span className={styles.subject}>{title.slice(0, 75) + '(...)'} </span>
            </Tooltip>
          ))}
        <span className={styles.nameBlock}>
          <span className={`${styles.name} ${authorRole && !(deleted || removed || purged) && (authorRole === 'mod' ? styles.capcodeMod : styles.capcodeAdmin)}`}>
            {deleted ? (
              capitalize(t('deleted'))
            ) : removed ? (
              capitalize(t('removed'))
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
            )}
            {!(deleted || removed || purged) && authorRole && (
              <span className='capitalize'>
                {' '}
                ## Board {authorRole}{' '}
                <span
                  className={`${styles.capcodeIcon} ${authorRole === 'mod' ? styles.capcodeModIcon : styles.capcodeAdminIcon}`}
                  title={authorRole === 'mod' ? t('moderator_of_this_board') : t('administrator_of_this_board')}
                />
              </span>
            )}{' '}
          </span>
          {showUserID && (
            <>
              (ID:{' '}
              {deleted ? (
                t('deleted')
              ) : removed ? (
                t('removed')
              ) : purged ? (
                t('purged')
              ) : !cid && pseudonymityMode ? (
                <span className={styles.pendingCid}>{hasFailedState ? capitalize(t('failed')) : capitalize(t('pending'))}</span>
              ) : (
                <Tooltip
                  content={`${numberOfPostsByAuthor === 1 ? t('1_post_by_this_id') : t('x_posts_by_this_id', { number: numberOfPostsByAuthor })}`}
                  showTooltip={isInPostPageView || showOmittedReplies[postCid] || (postReplyCount < 6 && !pinned)}
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
        </span>
        <span className={styles.dateTime}>
          {isInModQueueView && isOverThreshold ? (
            <>
              <Tooltip content={getFormattedTimeAgo(timestamp)}>
                <span>{getFormattedDate(timestamp)}</span>
              </Tooltip>{' '}
              (<span className={styles.alert}>{getFormattedTimeAgo(timestamp)}</span>)
            </>
          ) : (
            <Tooltip content={getFormattedTimeAgo(timestamp)}>
              <span>{getFormattedDate(timestamp)}</span>
            </Tooltip>
          )}{' '}
        </span>
        <span className={styles.postNum}>
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
                {post?.number || '?'}
              </span>
            </span>
          ) : (
            <>
              <span>No.</span>
              <span className={styles.pendingCid}>{hasFailedState ? capitalize(t('failed')) : capitalize(t('pending'))}</span>
            </>
          )}
          {pinned && (
            <span className={`${styles.stickyIconWrapper} ${!locked && styles.addPaddingBeforeReply}`}>
              <img src='assets/icons/sticky.gif' alt='' className={styles.stickyIcon} title={t('sticky')} />
            </span>
          )}
          {locked && (
            <span className={`${styles.closedIconWrapper} ${styles.addPaddingBeforeReply} ${pinned && styles.addPaddingInBetween}`}>
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
          {!isInPostPageView && !isReply && !isHidden && !isModQueue && (
            <span className={styles.replyButton}>
              [
              <Link to={boardPath ? `/${boardPath}/thread/${postCid}` : `/thread/${postCid}`} onClick={(e) => !cid && e.preventDefault()}>
                {capitalize(t('reply'))}
              </Link>
              ]
            </span>
          )}
          {isModQueue && (
            <span className={styles.modQueueActions}>
              <span className={styles.modQueueTypeField}>
                {capitalize(t('type'))}: {capitalize(t(isReply ? 'reply' : 'post'))}
              </span>
              {modQueueStatus === 'approved' ? (
                <span className={styles.modQueueStatusApproved}>{t('approved')}</span>
              ) : modQueueStatus === 'rejected' ? (
                <span className={styles.modQueueStatusRejected}>{t('rejected')}</span>
              ) : modQueueStatus === 'failed' ? (
                <span className={styles.modQueueStatusRejected}>
                  {t('failed')}
                  {modQueueError ? `: ${modQueueError}` : ''}
                </span>
              ) : isPublishing ? (
                <LoadingEllipsis string={t('publishing')} />
              ) : (
                <>
                  {isReply && boardPath && (post?.threadCid || post?.parentCid) && (
                    <span className={styles.modQueueButtonWrapper}>
                      [
                      <Link to={`/${boardPath}/thread/${post.threadCid || post.parentCid}`} className={styles.modQueueActionButton}>
                        {t('view_thread')}
                      </Link>
                      ]
                    </span>
                  )}
                  <span className={styles.modQueueButtonWrapper}>
                    [
                    <button className={styles.modQueueActionButton} onClick={onApprove} disabled={isPublishing}>
                      {t('approve')}
                    </button>
                    ]
                  </span>
                  <span className={styles.modQueueButtonWrapper}>
                    [
                    <button className={styles.modQueueActionButton} onClick={onReject} disabled={isPublishing}>
                      {t('reject')}
                    </button>
                    ]
                  </span>
                </>
              )}
            </span>
          )}
          {shouldShowPendingApprovalButtons && (
            <span className={styles.modQueueActions}>
              {pendingStatus === 'approved' ? (
                <span className={styles.modQueueStatusApproved}>{t('approved')}</span>
              ) : pendingStatus === 'rejected' ? (
                <span className={styles.modQueueStatusRejected}>{t('rejected')}</span>
              ) : pendingStatus === 'failed' ? (
                <span className={styles.modQueueStatusRejected}>
                  {t('failed')}
                  {pendingErrorMessage ? `: ${pendingErrorMessage}` : ''}
                </span>
              ) : isPublishingPending ? (
                <LoadingEllipsis string={t('publishing')} />
              ) : (
                <>
                  <span className={styles.modQueueButtonWrapper}>
                    [
                    <button className={styles.modQueueActionButton} onClick={handlePendingApprove} disabled={isPublishingPending}>
                      {t('approve')}
                    </button>
                    ]
                  </span>
                  <span className={styles.modQueueButtonWrapper}>
                    [
                    <button className={styles.modQueueActionButton} onClick={handlePendingReject} disabled={isPublishingPending}>
                      {t('reject')}
                    </button>
                    ]
                  </span>
                </>
              )}
            </span>
          )}
        </span>
        {!(removed || deleted || purged) && !isModQueue && <PostMenuDesktop postMenu={postMenuProps} />}
        {cid && parentCid && <ReplyBacklinks post={post} quotedByMap={quotedByMap} directRepliesByParentCid={directRepliesByParentCid} />}
        {cid && !parentCid && <OpBacklinks cid={cid} quotedByMap={quotedByMap} />}
      </span>
    </div>
  );
};

const ReplyBacklinks = ({
  post,
  quotedByMap,
  directRepliesByParentCid,
}: {
  post: Comment;
  quotedByMap?: Map<string, Comment[]>;
  directRepliesByParentCid?: Map<string, Comment[]>;
}) => {
  const { cid, parentCid } = post || {};
  if (!cid || !parentCid) {
    return null;
  }
  const directReplies = directRepliesByParentCid?.get(cid) || [];

  return (
    <>
      {directReplies.map(
        (reply: Comment) =>
          reply?.parentCid === cid &&
          reply?.cid &&
          reply?.number &&
          !(reply?.deleted || reply?.removed) && <ReplyQuotePreview key={reply.cid} isBacklinkReply={true} backlinkReply={reply} />,
      )}
      {quotedByMap
        ?.get(cid)
        ?.map(
          (reply: Comment) =>
            reply?.parentCid !== cid &&
            reply?.cid &&
            reply?.number &&
            !(reply?.deleted || reply?.removed) && <ReplyQuotePreview key={reply.cid} isBacklinkReply={true} backlinkReply={reply} />,
        )}
    </>
  );
};

const OpBacklinks = ({ cid, quotedByMap }: { cid: string; quotedByMap?: Map<string, Comment[]> }) => (
  <>
    {quotedByMap
      ?.get(cid)
      ?.map(
        (reply: Comment) =>
          reply?.cid &&
          reply?.number &&
          !(reply?.deleted || reply?.removed) && <ReplyQuotePreview key={`op-bl-${reply.cid}`} isBacklinkReply={true} backlinkReply={reply} />,
      )}
  </>
);

interface PostMediaProps {
  commentMediaInfo: CommentMediaInfo | undefined;
  hasThumbnail: boolean;
  spoiler: boolean;
  deleted: boolean;
  purged: boolean;
  removed: boolean;
  linkHeight: number;
  linkWidth: number;
  parentCid: string;
  communityAddress?: string;
  isInAllView: boolean;
  isInSubscriptionsView: boolean;
  isInModView: boolean;
}

const PostMedia = ({
  commentMediaInfo,
  hasThumbnail,
  spoiler,
  deleted,
  purged,
  removed,
  linkHeight,
  linkWidth,
  parentCid,
  communityAddress,
  isInAllView,
  isInSubscriptionsView,
  isInModView,
}: PostMediaProps) => {
  const { t } = useTranslation();
  const { url } = commentMediaInfo || {};
  let type = commentMediaInfo?.type;
  const { status: gifFrameStatus } = useFetchGifFirstFrame(type === 'gif' ? url : undefined);
  const directories = useDirectories();

  if (type === 'gif' && gifFrameStatus === 'ready') {
    type = 'animated gif';
  } else if (type === 'gif' && gifFrameStatus === 'failed') {
    type = 'static gif';
  }

  const embedUrl = url && new URL(url);
  const [showThumbnail, setShowThumbnail] = useState(true);

  const mediaDimensions = getMediaDimensions(commentMediaInfo);
  const directoryEntry = findDirectoryByAddress(directories, communityAddress);
  const requirePostLinkIsMedia = directoryEntry?.features?.requirePostLinkIsMedia === true;
  const boardPath = communityAddress ? getBoardPath(communityAddress, directories) : undefined;
  const displayBoardPath =
    boardPath && communityAddress && boardPath !== communityAddress
      ? boardPath
      : communityAddress && (communityAddress.endsWith('.eth') || communityAddress.endsWith('.sol'))
        ? communityAddress
        : communityAddress
          ? getShortAddress(communityAddress)
          : undefined;

  return (
    <div className={styles.file}>
      <div className={styles.fileText}>
        {communityAddress && (isInAllView || isInSubscriptionsView || isInModView) && boardPath && !parentCid && (
          <>
            {t('board')}: <Link to={`/${boardPath}`}>{displayBoardPath}</Link>{' '}
          </>
        )}
        {requirePostLinkIsMedia ? t('file') : t('link')}:{' '}
        <a href={url} target='_blank' rel='noopener noreferrer'>
          {(() => {
            if (spoiler) return capitalize(t('spoiler'));
            if (requirePostLinkIsMedia && url) {
              try {
                const filename = new URL(url).pathname.split('/').pop();
                if (filename && /\.\w+$/.test(filename)) return truncateWithEllipsisInMiddle(filename);
              } catch {}
            }
            return truncateWithEllipsisInMiddle(url ?? '');
          })()}
        </a>{' '}
        ({type && lowerCase(getDisplayMediaInfoType(type, t))}
        {mediaDimensions && `, ${mediaDimensions}`})
        {!showThumbnail && (type === 'iframe' || type === 'video' || type === 'audio') && (
          <span>
            -[
            <span
              className={styles.closeMedia}
              role='button'
              tabIndex={0}
              onClick={() => setShowThumbnail(true)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setShowThumbnail(true);
                }
              }}
            >
              {t('close')}
            </span>
            ]
          </span>
        )}
        {showThumbnail && !hasThumbnail && embedUrl && canEmbed(embedUrl) && (
          <span>
            -[
            <span
              className={styles.closeMedia}
              role='button'
              tabIndex={0}
              onClick={() => setShowThumbnail(false)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setShowThumbnail(false);
                }
              }}
            >
              {t('open')}
            </span>
            ]
          </span>
        )}
      </div>
      {(hasThumbnail || (!hasThumbnail && !showThumbnail) || spoiler || Boolean(commentMediaInfo?.url)) && (
        <div className={styles.fileThumbnail}>
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
          />
        </div>
      )}
    </div>
  );
};

const Reply = ({
  postReplyCount,
  reply,
  roles,
  threadNumber,
  quotedByMap,
  directRepliesByParentCid,
  postsByAuthorInThread,
}: PostProps & { directRepliesByParentCid?: Map<string, Comment[]>; postsByAuthorInThread?: Map<string, number> }) => {
  const accountReply = useAccountComment({
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

  const { author, cid, deleted, link, linkHeight, linkWidth, postCid, reason, removed, spoiler, communityAddress, thumbnailUrl, parentCid } = post || {};
  const purged = post?.commentModeration?.purged;
  const directories = useDirectories();
  const boardPath = communityAddress ? getBoardPath(communityAddress, directories) : undefined;

  const location = useLocation();
  const route = boardPath ? `/${boardPath}/thread/${cid}` : `/thread/${cid}`;
  const isRouteLinkToReply = cid ? location.pathname.startsWith(route) : false;
  const { hidden } = useHide({ cid });

  const isInAllView = isAllView(location.pathname);
  const params = useParams();
  const isInSubscriptionsView = isSubscriptionsView(location.pathname, params);
  const isInModView = isModView(location.pathname);

  const commentMediaInfo = useCommentMediaInfo(link, thumbnailUrl, linkWidth, linkHeight);
  const hasThumbnail = getHasThumbnail(commentMediaInfo, link);
  const { canDeleteFailedPost, isDeletingFailedPost, onDeleteFailedPost } = useDeleteFailedPost(post);
  const failedPublishNotice = canDeleteFailedPost ? <FailedPublishNotice isDeleting={isDeletingFailedPost} onDelete={onDeleteFailedPost} /> : undefined;

  return (
    <div className={styles.replyDesktop}>
      <div className={styles.sideArrows}>{'>>'}</div>
      <div className={`${styles.reply} ${isRouteLinkToReply && styles.highlight}`} data-cid={cid} data-author-address={author?.shortAddress} data-post-cid={postCid}>
        <PostInfo
          post={post}
          postReplyCount={postReplyCount}
          postsByAuthorInThread={postsByAuthorInThread}
          roles={roles}
          isHidden={hidden}
          threadNumber={threadNumber}
          quotedByMap={quotedByMap}
          directRepliesByParentCid={directRepliesByParentCid}
        />
        {link && !hidden && !(deleted || removed || purged) && isValidURL(link) && (
          <PostMedia
            commentMediaInfo={commentMediaInfo}
            hasThumbnail={hasThumbnail}
            spoiler={spoiler}
            deleted={deleted}
            purged={!!purged}
            removed={removed}
            linkHeight={linkHeight}
            linkWidth={linkWidth}
            parentCid={parentCid}
            communityAddress={communityAddress}
            isInAllView={isInAllView}
            isInSubscriptionsView={isInSubscriptionsView}
            isInModView={isInModView}
          />
        )}
        {!hidden && (!(removed || deleted || purged) || ((removed || deleted) && reason) || purged) && (
          <CommentContent comment={post} prependContent={failedPublishNotice} />
        )}
      </div>
    </div>
  );
};

const PostDesktop = ({
  post,
  roles,
  showAllReplies,
  showReplies = true,
  targetReplyCid,
  isModQueue,
  modQueueStatus,
  modQueueError,
  isPublishing,
  onApprove,
  onReject,
}: PostProps) => {
  const { t } = useTranslation();
  const resolvedPost = withResolvedCommentCommunityAddress(post);
  const { author, cid, content, deleted, link, linkHeight, linkWidth, pinned, postCid, removed, spoiler, state, communityAddress, thumbnailUrl, parentCid } =
    resolvedPost || {};
  const purged = resolvedPost?.commentModeration?.purged;
  const params = useParams();
  const location = useLocation();
  const navigationType = useNavigationType();
  const isInPendingPostView = isPendingPostView(location.pathname, params);
  const isInPostPageView = isPostPageView(location.pathname, params);
  const isInAllView = isAllView(location.pathname);
  const isInSubscriptionsView = isSubscriptionsView(location.pathname, params);
  const isInModView = isModView(location.pathname);
  const isMultiboardView = isInAllView || isInSubscriptionsView || isInModView;
  const directories = useDirectories();
  const boardPath = communityAddress ? getBoardPath(communityAddress, directories) : undefined;
  const displayBoardPath =
    boardPath && communityAddress
      ? boardPath !== communityAddress
        ? boardPath
        : communityAddress.endsWith('.eth') || communityAddress.endsWith('.sol')
          ? communityAddress
          : getShortAddress(communityAddress)
      : undefined;

  const { hidden, unhide, hide } = useHide({ cid });
  const isHidden = hidden && !isInPostPageView;

  const { showOmittedReplies, setShowOmittedReplies } = useShowOmittedReplies();

  const shouldUsePreview = showReplies && !isModQueue && !showAllReplies;
  const shouldFetchFull = showReplies && !isModQueue && (showAllReplies || showOmittedReplies[cid]);

  const cachedPreviewRepliesResult = useReplies({
    comment: shouldUsePreview ? resolvedPost : undefined,
    onlyIfCached: true,
    sortType: 'new',
    flat: true,
    repliesPerPage: BOARD_REPLIES_PREVIEW_FETCH_SIZE,
    accountComments: { newerThan: Infinity, append: true },
  });
  const cachedPreviewReplies = (cachedPreviewRepliesResult as { updatedReplies?: Comment[] }).updatedReplies?.length
    ? (cachedPreviewRepliesResult as { updatedReplies?: Comment[] }).updatedReplies!
    : cachedPreviewRepliesResult.replies || [];
  const hasEnoughCachedPreview = hasEnoughPreviewReplies({
    replyCount: resolvedPost?.replyCount,
    loadedCount: cachedPreviewReplies.length,
    visibleCount: BOARD_REPLIES_PREVIEW_VISIBLE_COUNT,
  });
  const previewRepliesResult = useReplies({
    comment: shouldUsePreview && !showOmittedReplies[cid] && !hasEnoughCachedPreview ? resolvedPost : undefined,
    sortType: 'new',
    flat: true,
    repliesPerPage: BOARD_REPLIES_PREVIEW_FETCH_SIZE,
    accountComments: { newerThan: Infinity, append: true },
  });
  const fullRepliesResult = useReplies({
    comment: shouldFetchFull ? resolvedPost : undefined,
    sortType: 'old',
    flat: true,
    repliesPerPage: REPLIES_PER_PAGE,
    accountComments: { newerThan: Infinity, append: true },
  });

  const livePreviewReplies = (previewRepliesResult as { updatedReplies?: Comment[] }).updatedReplies?.length
    ? (previewRepliesResult as { updatedReplies?: Comment[] }).updatedReplies!
    : previewRepliesResult.replies || [];
  const previewReplies = hasEnoughCachedPreview ? cachedPreviewReplies : livePreviewReplies;
  const fullReplies = (fullRepliesResult as { updatedReplies?: Comment[] }).updatedReplies?.length
    ? (fullRepliesResult as { updatedReplies?: Comment[] }).updatedReplies!
    : fullRepliesResult.replies || [];

  const { hasMore, loadMore } = fullRepliesResult;
  const reset = (fullRepliesResult as { reset?: () => Promise<void> }).reset;

  const fullIsFetching = shouldFetchFull && fullReplies.length === 0 && fullRepliesResult.hasMore;

  const repliesForRender = showAllReplies
    ? fullReplies
    : showOmittedReplies[cid]
      ? fullReplies.length
        ? fullReplies
        : previewReplies
      : getPreviewDisplayReplies(previewReplies, BOARD_REPLIES_PREVIEW_VISIBLE_COUNT);
  const freshRepliesForRender = useFreshReplies(repliesForRender);
  useRegisterFreshReplies(resolvedPost, freshRepliesForRender);
  const setResetFunction = useFeedResetStore((s) => s.setResetFunction);
  const repliesResetRequestId = useThreadLiveUpdatesStore((state) => state.repliesResetRequestId);
  const lastHandledRepliesResetRequestIdRef = useRef(repliesResetRequestId);
  useEffect(() => {
    if ((isInPostPageView || isInPendingPostView) && reset) {
      setResetFunction(() => {
        reset();
      });
    }
  }, [isInPostPageView, isInPendingPostView, reset, setResetFunction]);
  useEffect(() => {
    if (!reset || repliesResetRequestId === 0 || repliesResetRequestId === lastHandledRepliesResetRequestIdRef.current) return;
    lastHandledRepliesResetRequestIdRef.current = repliesResetRequestId;
    void reset();
  }, [repliesResetRequestId, reset]);
  const visiblelinksCount = useCountLinksInReplies(resolvedPost, BOARD_REPLIES_PREVIEW_VISIBLE_COUNT);
  const totalLinksCount = useCountLinksInReplies(resolvedPost);
  const replyCount = freshRepliesForRender.length;

  const totalReplyCount = getTotalReplyCount({
    replyCount: resolvedPost?.replyCount,
    fullLoadedCount: fullReplies.length,
    previewLoadedCount: Math.max(cachedPreviewReplies.length, livePreviewReplies.length),
  });
  const repliesCount = computeOmittedCount({
    totalReplyCount,
    visibleCount: BOARD_REPLIES_PREVIEW_VISIBLE_COUNT,
  });
  const linksCount = totalLinksCount - visiblelinksCount;

  const stateString = useStateString(resolvedPost) || t('downloading_board');
  const hasFailedState = state === 'failed';
  const { canDeleteFailedPost, isDeletingFailedPost, onDeleteFailedPost } = useDeleteFailedPost(resolvedPost);
  const failedPublishNotice = canDeleteFailedPost ? <FailedPublishNotice isDeleting={isDeletingFailedPost} onDelete={onDeleteFailedPost} /> : undefined;

  const commentMediaInfo = useCommentMediaInfo(link, thumbnailUrl, linkWidth, linkHeight);
  const hasThumbnail = getHasThumbnail(commentMediaInfo, link);

  // Author-deleted replies are hidden from thread replies; moderator removals still render their placeholder.
  const filteredReplies = filterRepliesForDisplay(freshRepliesForRender);
  const postsByAuthorInThread = getThreadPostCountsByAuthor(resolvedPost, filteredReplies);
  const directRepliesByParentCid = (() => {
    const map = new Map<string, Comment[]>();
    for (const reply of filteredReplies) {
      const directParentCid = reply?.parentCid;
      if (!directParentCid || !reply?.cid) {
        continue;
      }
      const existingReplies = map.get(directParentCid);
      if (existingReplies) {
        existingReplies.push(reply);
      } else {
        map.set(directParentCid, [reply]);
      }
    }
    return map;
  })();

  const quotedByMap = useQuotedByMap(filteredReplies, communityAddress);

  const visibleReplies = useProgressiveRender(filteredReplies, {
    batchSize: 50,
    intervalMs: 100,
    resetKey: cid,
    disabled: hasMore || !!targetReplyCid || !showAllReplies,
  });

  // Virtuoso scroll position management for infinite replies
  const virtuosoRef = useRef<VirtuosoHandle | null>(null);
  const virtuosoStateKey = `replies-desktop-${cid}`;

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
    <div className={styles.postDesktop}>
      {showReplies || isModQueue ? (
        <div className={styles.hrWrapper}>
          <hr />
        </div>
      ) : (
        <div className={styles.replyQuotePreviewSpacer} />
      )}
      <div className={isHidden ? styles.postDesktopHidden : ''}>
        {!isInPostPageView && showReplies && (
          <span className={`${styles.hideButtonWrapper} ${!hasThumbnail ? styles.hideButtonWrapperNoImage : ''}`}>
            <span
              className={`${styles.hideButton} ${hidden ? styles.unhideThread : styles.hideThread}`}
              role='button'
              tabIndex={0}
              onClick={hidden ? unhide : hide}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  (hidden ? unhide : hide)();
                }
              }}
            />
          </span>
        )}
        <div
          data-thread-container-cid={cid}
          data-cid={cid}
          data-author-address={author?.shortAddress}
          data-post-cid={postCid}
          className={`${styles.opContainer} ${shouldShowSnow() && hasThumbnail ? styles.xmasHatWrapper : ''}`}
        >
          {shouldShowSnow() && hasThumbnail && <img src='assets/xmashat.gif' className={styles.xmasHat} alt='' />}
          {!link && !parentCid && communityAddress && isMultiboardView && boardPath && (
            <div className={styles.file}>
              <div className={styles.fileText}>
                {t('board')}: <Link to={`/${boardPath}`}>{displayBoardPath}</Link>
              </div>
            </div>
          )}
          {link && !isHidden && !(deleted || removed || purged) && isValidURL(link) && (
            <PostMedia
              commentMediaInfo={commentMediaInfo}
              hasThumbnail={hasThumbnail}
              spoiler={spoiler}
              deleted={deleted}
              purged={!!purged}
              removed={removed}
              linkHeight={linkHeight}
              linkWidth={linkWidth}
              parentCid={parentCid}
              communityAddress={communityAddress}
              isInAllView={isInAllView}
              isInSubscriptionsView={isInSubscriptionsView}
              isInModView={isInModView}
            />
          )}
          <PostInfo
            isHidden={hidden}
            post={resolvedPost}
            postReplyCount={replyCount}
            postsByAuthorInThread={postsByAuthorInThread}
            roles={roles}
            threadNumber={resolvedPost?.number}
            isModQueue={isModQueue}
            modQueueStatus={modQueueStatus}
            modQueueError={modQueueError}
            isPublishing={isPublishing}
            onApprove={onApprove}
            onReject={onReject}
            quotedByMap={quotedByMap}
            directRepliesByParentCid={directRepliesByParentCid}
          />
          {!isHidden && !content && !(deleted || removed || purged) && <div className={styles.spacer} />}
          {!isHidden && <CommentContent comment={resolvedPost} prependContent={failedPublishNotice} />}
        </div>
        {!isHidden && !isInPendingPostView && showReplies && repliesCount > 0 && !isInPostPageView && (
          <span className={styles.summary}>
            <span
              className={`${showOmittedReplies[cid] ? styles.hideOmittedReplies : styles.showOmittedReplies} ${styles.omittedRepliesButtonWrapper}`}
              role='button'
              tabIndex={0}
              onClick={() => setShowOmittedReplies(cid, !showOmittedReplies[cid])}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setShowOmittedReplies(cid, !showOmittedReplies[cid]);
                }
              }}
            />
            {showOmittedReplies[cid] ? (
              t('showing_all_replies')
            ) : linksCount > 0 ? (
              <Trans
                i18nKey={'replies_and_links_omitted'}
                shouldUnescape={true}
                components={{ 1: <Link key={cid} to={boardPath ? `/${boardPath}/thread/${cid}` : `/thread/${cid}`} /> }}
                values={{ repliesCount, linksCount }}
              />
            ) : (
              <Trans
                i18nKey={'replies_omitted'}
                shouldUnescape={true}
                components={{ 1: <Link key={cid} to={boardPath ? `/${boardPath}/thread/${cid}` : `/thread/${cid}`} /> }}
                values={{ repliesCount }}
              />
            )}
          </span>
        )}
        {/* Virtuoso infinite scroll for post page view when there's more content to paginate */}
        {!isHidden && showAllReplies && !isInPendingPostView && showReplies && hasMore && !!resolvedPost?.replyCount && (
          <Virtuoso
            increaseViewportBy={{ bottom: 1200, top: 1200 }}
            totalCount={filteredReplies.length}
            data={filteredReplies}
            itemContent={(index, reply) => (
              <div className={styles.replyContainer}>
                <Reply
                  reply={reply}
                  roles={roles}
                  postReplyCount={replyCount}
                  postsByAuthorInThread={postsByAuthorInThread}
                  threadNumber={resolvedPost?.number}
                  quotedByMap={quotedByMap}
                  directRepliesByParentCid={directRepliesByParentCid}
                />
              </div>
            )}
            useWindowScroll={true}
            components={{ Footer: virtuosoFooter }}
            endReached={loadMore}
            ref={virtuosoRef}
            restoreStateFrom={lastVirtuosoState}
            initialScrollTop={lastVirtuosoState?.scrollTop}
          />
        )}
        {/* Non-virtualized rendering for post page view when all replies fit on one page */}
        {!isHidden &&
          showAllReplies &&
          !isInPendingPostView &&
          showReplies &&
          !hasMore &&
          visibleReplies.map((reply) => (
            <div key={reply.cid} className={styles.replyContainer}>
              <Reply
                reply={reply}
                roles={roles}
                postReplyCount={replyCount}
                postsByAuthorInThread={postsByAuthorInThread}
                threadNumber={resolvedPost?.number}
                quotedByMap={quotedByMap}
                directRepliesByParentCid={directRepliesByParentCid}
              />
            </div>
          ))}
        {/* Non-virtualized rendering for board view (preview replies when collapsed, full when expanded) */}
        {!isHidden &&
          !showAllReplies &&
          !isInPendingPostView &&
          freshRepliesForRender &&
          showReplies &&
          filteredReplies.map((reply) => (
            <div key={reply.cid} className={styles.replyContainer}>
              <Reply
                reply={reply}
                roles={roles}
                postReplyCount={replyCount}
                postsByAuthorInThread={postsByAuthorInThread}
                threadNumber={resolvedPost?.number}
                quotedByMap={quotedByMap}
                directRepliesByParentCid={directRepliesByParentCid}
              />
            </div>
          ))}
        {!isHidden && !showAllReplies && showOmittedReplies[cid] && fullIsFetching && showReplies && filteredReplies.length > 0 && (
          <div className={styles.stateString}>
            <LoadingEllipsis string={t('loading')} />
          </div>
        )}
      </div>
      {!isInPendingPostView &&
      stateString &&
      !hasFailedState &&
      state !== 'succeeded' &&
      !(resolvedPost?.timestamp && !resolvedPost?.updatedAt) &&
      isInPostPageView &&
      !(!showReplies && !showAllReplies) ? (
        <div className={styles.stateString}>
          <br />
          <LoadingEllipsis string={stateString} />
        </div>
      ) : (
        hasFailedState && <span className={styles.error}>{t('failed')}</span>
      )}
    </div>
  );
};

export default PostDesktop;
