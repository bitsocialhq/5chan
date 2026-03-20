import { memo, useEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Comment, Role, useComment, useEditedComment, useCommunity } from '@bitsocialnet/bitsocial-react-hooks';
import useCommunitiesPagesStore from '@bitsocialnet/bitsocial-react-hooks/dist/stores/communities-pages';
import { useCommunityField } from '../../hooks/use-stable-community';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { isAllView } from '../../lib/utils/view-utils';
import { useResolvedCommunityAddress } from '../../hooks/use-resolved-community-address';
import { useDirectories } from '../../hooks/use-directories';
import { isCommentArchived } from '../../lib/utils/comment-moderation-utils';
import { areSameBoardAddress, isDirectoryBoard } from '../../lib/utils/route-utils';
import { getCommentCommunityAddress } from '../../lib/utils/comment-utils';
import useIsMobile from '../../hooks/use-is-mobile';
import ErrorDisplay from '../../components/error-display/error-display';
import { PageFooterDesktop, ThreadFooterFirstRow, ThreadFooterStyleRow, ThreadFooterMobile } from '../../components/footer';
import PostDesktop from '../../components/post-desktop';
import PostMobile from '../../components/post-mobile';
import { getRequestedThreadTopCid, scrollThreadContainerToTop } from '../../lib/utils/thread-scroll-utils';
import useThreadLiveUpdatesStore from '../../stores/use-thread-live-updates-store';
import styles from './post.module.css';

type CommentWithRefresh = Comment & {
  refresh?: () => Promise<void>;
  state?: string;
  error?: Error;
  errors?: Error[];
};

// useComment may not return cached feed data immediately due to its updatedAt comparison logic.
// This hook falls back to the communities pages store (populated by useFeed) so content
// from the catalog appears instantly instead of going through a loading phase.
const useCommentWithFeedCache = (options: { commentCid: string | undefined; autoUpdate?: boolean }): CommentWithRefresh | undefined => {
  const comment = useComment(options);
  const cachedComment = useCommunitiesPagesStore((state) => state.comments[options?.commentCid || '']);

  return useMemo(() => {
    if (!cachedComment || comment?.timestamp) return comment;
    return {
      ...cachedComment,
      refresh: comment?.refresh,
      state: comment?.state,
      error: comment?.error,
      errors: comment?.errors,
    } as CommentWithRefresh;
  }, [comment, cachedComment]);
};

export interface PostProps {
  index?: number;
  isHidden?: boolean;
  hasThumbnail?: boolean;
  post?: any;
  postReplyCount?: number;
  reply?: any;
  roles?: Role[];
  showAllReplies?: boolean;
  showReplies?: boolean;
  targetReplyCid?: string;
  threadNumber?: number;
  isModQueue?: boolean;
  modQueueStatus?: 'approved' | 'rejected' | 'failed' | null;
  modQueueError?: string;
  isPublishing?: boolean;
  onApprove?: () => void;
  onReject?: () => void;
  quotedByMap?: Map<string, Comment[]>;
}

export const Post = memo(
  ({ post, showAllReplies = false, showReplies = true, targetReplyCid, isModQueue, modQueueStatus, modQueueError, isPublishing, onApprove, onReject }: PostProps) => {
    // Only subscribe to roles field to avoid rerenders from updatingState changes
    const communityAddress = post?.communityAddress || post?.subplebbitAddress;
    const roles = useCommunityField(communityAddress, (community) => community?.roles);
    const isMobile = useIsMobile();

    let comment = post;

    // handle pending mod or author edit
    const { editedComment } = useEditedComment({ comment });
    if (editedComment) {
      comment = editedComment;
    }

    return (
      <div className={styles.thread}>
        <div className={styles.postContainer}>
          {isMobile ? (
            <PostMobile
              post={comment}
              roles={roles}
              showAllReplies={showAllReplies}
              showReplies={showReplies}
              targetReplyCid={targetReplyCid}
              isModQueue={isModQueue}
              modQueueStatus={modQueueStatus}
              modQueueError={modQueueError}
              isPublishing={isPublishing}
              onApprove={onApprove}
              onReject={onReject}
            />
          ) : (
            <PostDesktop
              post={comment}
              roles={roles}
              showAllReplies={showAllReplies}
              showReplies={showReplies}
              targetReplyCid={targetReplyCid}
              isModQueue={isModQueue}
              modQueueStatus={modQueueStatus}
              modQueueError={modQueueError}
              isPublishing={isPublishing}
              onApprove={onApprove}
              onReject={onReject}
            />
          )}
        </div>
      </div>
    );
  },
  (prevProps, nextProps) => {
    const prev = prevProps.post;
    const next = nextProps.post;
    return (
      prev?.cid === next?.cid &&
      prev?.replyCount === next?.replyCount &&
      prev?.updatedAt === next?.updatedAt &&
      prev?.locked === next?.locked &&
      prev?.pinned === next?.pinned &&
      isCommentArchived(prev) === isCommentArchived(next) &&
      prev?.removed === next?.removed &&
      prev?.deleted === next?.deleted &&
      prev?.commentModeration?.purged === next?.commentModeration?.purged &&
      prevProps.showAllReplies === nextProps.showAllReplies &&
      prevProps.showReplies === nextProps.showReplies &&
      prevProps.targetReplyCid === nextProps.targetReplyCid &&
      prevProps.isModQueue === nextProps.isModQueue &&
      prevProps.modQueueStatus === nextProps.modQueueStatus &&
      prevProps.modQueueError === nextProps.modQueueError &&
      prevProps.isPublishing === nextProps.isPublishing &&
      prevProps.onApprove === nextProps.onApprove &&
      prevProps.onReject === nextProps.onReject
    );
  },
);

const PostPage = () => {
  const { t } = useTranslation();
  const params = useParams();
  const location = useLocation();
  const { commentCid } = params;
  const autoUpdateEnabled = useThreadLiveUpdatesStore((state) => state.enabled);
  const updateRequestId = useThreadLiveUpdatesStore((state) => state.updateRequestId);
  const startUpdate = useThreadLiveUpdatesStore((state) => state.startUpdate);
  const finishUpdate = useThreadLiveUpdatesStore((state) => state.finishUpdate);
  const resetThreadLiveUpdates = useThreadLiveUpdatesStore((state) => state.resetState);
  const resolvedCommunityAddress = useResolvedCommunityAddress();
  const isInAllView = isAllView(location.pathname);

  const comment = useCommentWithFeedCache({ commentCid, autoUpdate: autoUpdateEnabled });
  const commentCommunityAddress = getCommentCommunityAddress(comment);
  const communityAddress = resolvedCommunityAddress ?? commentCommunityAddress;
  const consumedThreadTopScrollRef = useRef<string | null>(null);
  const previousThreadCidRef = useRef<string>();
  const lastProcessedUpdateRequestIdRef = useRef(0);

  const navigate = useNavigate();
  useEffect(() => {
    if (commentCommunityAddress && resolvedCommunityAddress && !areSameBoardAddress(commentCommunityAddress, resolvedCommunityAddress)) {
      navigate('/not-found', { replace: true });
    }
  }, [commentCommunityAddress, resolvedCommunityAddress, navigate]);

  const community = useCommunity({ communityAddress });
  const { error: communityError, shortAddress, title } = community || {};
  const directories = useDirectories();

  // if the comment is a reply, return the post comment instead, then the reply will be highlighted in the thread
  const postComment = useCommentWithFeedCache({ commentCid: comment?.postCid, autoUpdate: autoUpdateEnabled });
  const post = comment?.parentCid ? postComment : comment;
  const requestedThreadTopCid = getRequestedThreadTopCid(location.state);

  const { error } = post || {};

  // These two effects split normal opens from explicit OP-top intents:
  // the first keeps ordinary thread visits on `window.scrollTo(0, 0)`, while the
  // second consumes `requestedThreadTopCid` once per `location.key` via
  // `consumedThreadTopScrollRef` so `scrollThreadContainerToTop(commentCid)` only
  // replays for deliberate OP-link clicks and never for route-driven thread opens.
  useEffect(() => {
    if (!comment?.cid || comment.parentCid) return;
    if (requestedThreadTopCid === comment.cid) return;
    window.scrollTo(0, 0);
  }, [comment?.cid, comment?.parentCid, requestedThreadTopCid]);

  useEffect(() => {
    if (!commentCid || post?.cid !== commentCid) return;
    if (requestedThreadTopCid !== commentCid) return;

    const consumedKey = `${location.key}:${commentCid}`;
    if (consumedThreadTopScrollRef.current === consumedKey) return;

    if (scrollThreadContainerToTop(commentCid)) {
      consumedThreadTopScrollRef.current = consumedKey;
    }
  }, [commentCid, location.key, post?.cid, requestedThreadTopCid]);

  useEffect(() => {
    const boardIdentifier = params.boardIdentifier;
    const isDirectory = boardIdentifier ? isDirectoryBoard(boardIdentifier, directories) : false;

    let boardTitle: string;
    if (isInAllView) {
      boardTitle = t('all');
    } else if (isDirectory) {
      boardTitle = `/${boardIdentifier}/`;
    } else {
      boardTitle = title ? title : shortAddress || communityAddress || '';
    }

    const postTitle = post?.title?.slice(0, 30) || post?.content?.slice(0, 30);
    const postTitlePart = postTitle ? ` - ${postTitle.trim()}...` : '';
    document.title = `${boardTitle}${postTitlePart} - 5chan`;
  }, [title, shortAddress, communityAddress, post?.title, post?.content, isInAllView, t, params.boardIdentifier, directories]);

  const shouldShowCommentError = comment?.error?.message && !comment?.cid;
  const shouldShowPostError = post?.error && post?.replyCount > 0 && post?.replies?.length === 0;
  const shouldShowCommunityError = communityError?.message && !post?.cid;

  const targetReplyCid = comment?.parentCid ? comment?.cid : undefined;

  useEffect(() => {
    return () => {
      resetThreadLiveUpdates();
    };
  }, [resetThreadLiveUpdates]);

  useEffect(() => {
    if (!post?.cid) return;
    if (previousThreadCidRef.current && previousThreadCidRef.current !== post.cid) {
      lastProcessedUpdateRequestIdRef.current = 0;
      consumedThreadTopScrollRef.current = null;
      resetThreadLiveUpdates();
    }
    previousThreadCidRef.current = post.cid;
  }, [post?.cid, resetThreadLiveUpdates]);

  useEffect(() => {
    if (!post?.cid || updateRequestId <= lastProcessedUpdateRequestIdRef.current) return;

    const refreshByCid = new Map<string, () => Promise<void>>();
    if (comment?.cid && typeof comment.refresh === 'function') {
      refreshByCid.set(comment.cid, comment.refresh);
    }
    if (post?.cid && typeof post.refresh === 'function') {
      refreshByCid.set(post.cid, post.refresh);
    }
    if (refreshByCid.size === 0) return;

    lastProcessedUpdateRequestIdRef.current = updateRequestId;
    let cancelled = false;
    startUpdate();

    void (async () => {
      const results = await Promise.allSettled(Array.from(refreshByCid.values(), (refresh) => refresh()));
      if (cancelled) return;

      const hasSuccessfulRefresh = results.some((result) => result.status === 'fulfilled');
      finishUpdate(updateRequestId, hasSuccessfulRefresh);

      const rejectedResult = results.find((result) => result.status === 'rejected');
      if (rejectedResult?.status === 'rejected') {
        console.error('Failed to refresh thread comments:', rejectedResult.reason);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [comment?.cid, comment?.refresh, finishUpdate, post?.cid, post?.refresh, startUpdate, updateRequestId]);

  return (
    <div className={styles.content}>
      {shouldShowPostError && (
        <div className={styles.error}>
          <ErrorDisplay error={error} />
        </div>
      )}
      <Post post={post} showAllReplies={true} targetReplyCid={targetReplyCid} />
      {shouldShowCommunityError && (
        <div className={styles.error}>
          <ErrorDisplay error={communityError} />
        </div>
      )}
      {shouldShowCommentError && (
        <div className={styles.error}>
          <ErrorDisplay error={comment?.error} />
        </div>
      )}
      {post?.cid && communityAddress ? (
        <>
          <PageFooterDesktop
            firstRow={
              <ThreadFooterFirstRow
                postCid={post.cid}
                threadNumber={post?.number}
                communityAddress={communityAddress}
                isThreadClosed={!!(post?.locked || isCommentArchived(post))}
              />
            }
            styleRow={<ThreadFooterStyleRow />}
          />
          <ThreadFooterMobile
            postCid={post.cid}
            threadNumber={post?.number}
            communityAddress={communityAddress}
            isThreadClosed={!!(post?.locked || isCommentArchived(post))}
          />
        </>
      ) : null}
    </div>
  );
};

export default PostPage;
