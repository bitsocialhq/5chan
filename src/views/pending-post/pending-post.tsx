import { useEffect, useRef } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useAccountComment, useAccountComments } from '@bitsocial/bitsocial-react-hooks';
import { useDirectories } from '../../hooks/use-directories';
import { normalizeAccountCommentIndex } from '../../lib/utils/account-comment-index-utils';
import { getCommentCommunityAddress } from '../../lib/utils/comment-utils';
import { getPendingPostRouteBoardPath, getPendingPostRoutePost } from '../../lib/utils/pending-post-route-state';
import { getBoardPath } from '../../lib/utils/route-utils';
import useChallengesStore from '../../stores/use-challenges-store';
import useFailedPostRetryStore from '../../stores/use-failed-post-retry-store';
import usePendingPostNavigationStore from '../../stores/use-pending-post-navigation-store';
import { Post } from '../post/post';

type PendingAccountComment = {
  index?: number;
};

const hasPendingAccountCommentIndex = (accountComments: PendingAccountComment[] | undefined, accountCommentIndex: number) => {
  if (!accountComments || accountComments.length === 0) {
    return false;
  }

  let hasExplicitIndices = false;
  for (const accountComment of accountComments) {
    if (typeof accountComment?.index !== 'number') {
      continue;
    }

    hasExplicitIndices = true;
    if (accountComment.index === accountCommentIndex) {
      return true;
    }
  }

  return hasExplicitIndices ? false : accountCommentIndex < accountComments.length;
};

const PendingPost = () => {
  const { accountComments, state: accountCommentsState } = useAccountComments();
  const { accountCommentIndex } = useParams<{ accountCommentIndex?: string }>();
  const location = useLocation();
  const normalizedAccountCommentIndex = normalizeAccountCommentIndex(accountCommentIndex);
  const isNavigatingToPendingPost = usePendingPostNavigationStore((state) => state.isNavigatingToPendingPost);
  const pendingPostNavigationIndex = usePendingPostNavigationStore((state) => state.pendingPostNavigationIndex);
  const hasNormalizedAccountCommentIndex = normalizedAccountCommentIndex !== undefined;
  const storedPost = useAccountComment({ commentIndex: normalizedAccountCommentIndex });
  const routePost = getPendingPostRoutePost(location.state);
  const storedPostCommunityAddress = getCommentCommunityAddress(storedPost);
  const hasAddressableStoredPost = Boolean(storedPost?.cid || storedPostCommunityAddress);
  const observedAddressableStoredPostIndexRef = useRef<number | undefined>(undefined);
  const hadObservedAddressableStoredPost = observedAddressableStoredPostIndexRef.current === normalizedAccountCommentIndex;
  const hasLiveOptimisticHandoff = pendingPostNavigationIndex === normalizedAccountCommentIndex;
  const optimisticRoutePost =
    hasLiveOptimisticHandoff && !hasAddressableStoredPost && !hadObservedAddressableStoredPost && routePost?.index === normalizedAccountCommentIndex
      ? routePost
      : undefined;
  const post = hasAddressableStoredPost ? storedPost : optimisticRoutePost || storedPost;
  const postCommunityAddress = getCommentCommunityAddress(post);
  const hasAddressablePost = Boolean(post?.cid || postCommunityAddress);
  const navigate = useNavigate();
  const directories = useDirectories();
  const routeBoardPath = getPendingPostRouteBoardPath(location.state);
  const postBoardPath = postCommunityAddress ? getBoardPath(postCommunityAddress, directories) : undefined;
  const pendingBoardPath = postBoardPath || routeBoardPath;
  const hasActiveChallenge = useChallengesStore((state) => state.challenges.length > 0);
  const retryingAccountCommentIndex = useFailedPostRetryStore((state) => state.retryingAccountCommentIndex);
  const isRetryingThisPendingPost = retryingAccountCommentIndex !== null && retryingAccountCommentIndex === normalizedAccountCommentIndex;
  const lastPendingBoardRef = useRef<{ accountCommentIndex: number; boardPath: string } | null>(null);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    if (hasAddressableStoredPost && typeof normalizedAccountCommentIndex === 'number') {
      observedAddressableStoredPostIndexRef.current = normalizedAccountCommentIndex;
      usePendingPostNavigationStore.getState().clearPendingPostHandoff(normalizedAccountCommentIndex);
    }
  }, [hasAddressableStoredPost, normalizedAccountCommentIndex]);

  useEffect(() => {
    if (typeof normalizedAccountCommentIndex === 'number' && pendingBoardPath) {
      lastPendingBoardRef.current = { accountCommentIndex: normalizedAccountCommentIndex, boardPath: pendingBoardPath };
    }
  }, [normalizedAccountCommentIndex, pendingBoardPath]);

  const isValidAccountCommentIndex =
    !accountCommentIndex ||
    (hasNormalizedAccountCommentIndex &&
      (Boolean(optimisticRoutePost) || accountCommentsState !== 'succeeded' || hasPendingAccountCommentIndex(accountComments, normalizedAccountCommentIndex)));

  const lastPendingBoard = lastPendingBoardRef.current;
  const hasAuthoritativeMissingPost =
    accountCommentsState === 'succeeded' && hasNormalizedAccountCommentIndex && !hasPendingAccountCommentIndex(accountComments, normalizedAccountCommentIndex);
  const abandonedBoardPath =
    !hasActiveChallenge && !hasAddressablePost && (hasAuthoritativeMissingPost || hadObservedAddressableStoredPost)
      ? pendingBoardPath || (lastPendingBoard && lastPendingBoard.accountCommentIndex === normalizedAccountCommentIndex ? lastPendingBoard.boardPath : undefined)
      : undefined;

  useEffect(() => {
    if (!isNavigatingToPendingPost) return;

    let secondFrameId: number | undefined;
    const firstFrameId = window.requestAnimationFrame(() => {
      secondFrameId = window.requestAnimationFrame(() => usePendingPostNavigationStore.getState().completePendingPostNavigation());
    });

    return () => {
      window.cancelAnimationFrame(firstFrameId);
      if (typeof secondFrameId === 'number') window.cancelAnimationFrame(secondFrameId);
      usePendingPostNavigationStore.getState().completePendingPostNavigation();
    };
  }, [isNavigatingToPendingPost]);

  useEffect(() => {
    // A retry deletes this pending row before republishing, briefly invalidating the index. Stay put;
    // useDeleteFailedPost redirects to the new pending row once the republished comment is created.
    if (isRetryingThisPendingPost) {
      return;
    }
    if (hasActiveChallenge) {
      return;
    }
    if (!isValidAccountCommentIndex) {
      navigate(abandonedBoardPath ? `/${abandonedBoardPath}` : '/not-found', { replace: true });
    }
  }, [abandonedBoardPath, hasActiveChallenge, isRetryingThisPendingPost, isValidAccountCommentIndex, navigate]);

  useEffect(() => {
    if (post?.cid && postBoardPath) {
      navigate(`/${postBoardPath}/thread/${post.cid}`, { replace: true });
    }
  }, [post?.cid, postBoardPath, navigate]);

  useEffect(() => {
    if (isRetryingThisPendingPost || hasAddressablePost || !isValidAccountCommentIndex) {
      return;
    }

    if (abandonedBoardPath) {
      usePendingPostNavigationStore.getState().clearPendingPostNavigation(normalizedAccountCommentIndex);
      navigate(`/${abandonedBoardPath}`, { replace: true });
    }
  }, [abandonedBoardPath, hasAddressablePost, isRetryingThisPendingPost, isValidAccountCommentIndex, navigate, normalizedAccountCommentIndex]);

  return abandonedBoardPath ? null : <Post post={post} />;
};

export default PendingPost;
