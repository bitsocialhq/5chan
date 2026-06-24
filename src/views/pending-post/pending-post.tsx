import { useEffect, useRef } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useAccountComment, useAccountComments } from '@bitsocial/bitsocial-react-hooks';
import { useDirectories } from '../../hooks/use-directories';
import { normalizeAccountCommentIndex } from '../../lib/utils/account-comment-index-utils';
import { getCommentCommunityAddress } from '../../lib/utils/comment-utils';
import { getBoardPath } from '../../lib/utils/route-utils';
import useChallengesStore from '../../stores/use-challenges-store';
import useFailedPostRetryStore from '../../stores/use-failed-post-retry-store';
import { Post } from '../post';

type PendingAccountComment = {
  index?: number;
};

const hasPendingAccountCommentIndex = (accountComments: PendingAccountComment[] | undefined, accountCommentIndex: number) => {
  if (!accountComments || accountComments.length === 0) {
    return true;
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

const getPendingRouteBoardPath = (state: unknown): string | undefined => {
  if (!state || typeof state !== 'object') {
    return undefined;
  }

  const boardPath = (state as { boardPath?: unknown }).boardPath;
  return typeof boardPath === 'string' && boardPath ? boardPath : undefined;
};

const PendingPost = () => {
  const { accountComments } = useAccountComments();
  const { accountCommentIndex } = useParams<{ accountCommentIndex?: string }>();
  const location = useLocation();
  const normalizedAccountCommentIndex = normalizeAccountCommentIndex(accountCommentIndex);
  const hasNormalizedAccountCommentIndex = normalizedAccountCommentIndex !== undefined;
  const post = useAccountComment({ commentIndex: normalizedAccountCommentIndex });
  const postCommunityAddress = getCommentCommunityAddress(post);
  const hasAddressablePost = Boolean(post?.cid || postCommunityAddress);
  const navigate = useNavigate();
  const directories = useDirectories();
  const routeBoardPath = getPendingRouteBoardPath(location.state);
  const postBoardPath = postCommunityAddress ? getBoardPath(postCommunityAddress, directories) : undefined;
  const pendingBoardPath = postBoardPath || routeBoardPath;
  const hasActiveChallenge = useChallengesStore((state) => state.challenges.length > 0);
  const retryingAccountCommentIndex = useFailedPostRetryStore((state) => state.retryingAccountCommentIndex);
  const isRetryingThisPendingPost = retryingAccountCommentIndex !== null && retryingAccountCommentIndex === normalizedAccountCommentIndex;
  const lastPendingBoardRef = useRef<{ accountCommentIndex: number; boardPath: string } | null>(null);

  useEffect(() => window.scrollTo(0, 0), []);

  useEffect(() => {
    if (typeof normalizedAccountCommentIndex === 'number' && pendingBoardPath) {
      lastPendingBoardRef.current = { accountCommentIndex: normalizedAccountCommentIndex, boardPath: pendingBoardPath };
    }
  }, [normalizedAccountCommentIndex, pendingBoardPath]);

  const isValidAccountCommentIndex =
    !accountCommentIndex || (hasNormalizedAccountCommentIndex && hasPendingAccountCommentIndex(accountComments, normalizedAccountCommentIndex));

  useEffect(() => {
    // A retry deletes this pending row before republishing, briefly invalidating the index. Stay put;
    // useDeleteFailedPost redirects to the new pending row once the republished comment is created.
    if (isRetryingThisPendingPost) {
      return;
    }
    if (!isValidAccountCommentIndex) {
      const lastPendingBoard = lastPendingBoardRef.current;
      const abandonedBoardPath =
        !hasActiveChallenge && lastPendingBoard && lastPendingBoard.accountCommentIndex === normalizedAccountCommentIndex ? lastPendingBoard.boardPath : undefined;
      navigate(abandonedBoardPath ? `/${abandonedBoardPath}` : '/not-found', { replace: true });
    }
  }, [hasActiveChallenge, isRetryingThisPendingPost, isValidAccountCommentIndex, navigate, normalizedAccountCommentIndex]);

  useEffect(() => {
    if (post?.cid && postBoardPath) {
      navigate(`/${postBoardPath}/thread/${post.cid}`, { replace: true });
    }
  }, [post?.cid, postBoardPath, navigate]);

  useEffect(() => {
    if (isRetryingThisPendingPost || hasAddressablePost || !isValidAccountCommentIndex) {
      return;
    }

    const lastPendingBoard = lastPendingBoardRef.current;
    const abandonedBoardPath =
      !hasActiveChallenge && lastPendingBoard && lastPendingBoard.accountCommentIndex === normalizedAccountCommentIndex ? lastPendingBoard.boardPath : undefined;
    if (abandonedBoardPath) {
      navigate(`/${abandonedBoardPath}`, { replace: true });
    }
  }, [hasActiveChallenge, hasAddressablePost, isRetryingThisPendingPost, isValidAccountCommentIndex, navigate, normalizedAccountCommentIndex]);

  return <Post post={post} />;
};

export default PendingPost;
