import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChallengeVerification, Comment, PublishCommentOptions, deleteComment, usePublishComment } from '@bitsocial/bitsocial-react-hooks';
import { alertChallengeVerificationFailed } from '../lib/utils/challenge-utils';
import useChallengesStore from '../stores/use-challenges-store';
import { getCommentCommunityAddress } from '../lib/utils/comment-utils';

const retryExcludedFields = new Set([
  'accountId',
  'cid',
  'clients',
  'depth',
  'error',
  'errors',
  'index',
  'publishingState',
  'shortCommunityAddress',
  'state',
  'timestamp',
]);

type FailedPost = Partial<Comment> & {
  cid?: string;
  index?: number;
  state?: string;
};

const cloneRetryValue = (value: unknown) => {
  if (Array.isArray(value)) {
    return [...value];
  }

  if (value && typeof value === 'object') {
    return { ...(value as Record<string, unknown>) };
  }

  return value;
};

const getDeleteTarget = (post?: FailedPost) => post?.cid ?? post?.index;

export const getFailedPostRetryPublishOptions = (post?: FailedPost): PublishCommentOptions | undefined => {
  if (post?.state !== 'failed') {
    return undefined;
  }

  const retryOptions = Object.entries(post).reduce((acc, [key, value]) => {
    if (retryExcludedFields.has(key) || typeof value === 'undefined') {
      return acc;
    }

    acc[key] = cloneRetryValue(value);
    return acc;
  }, {} as PublishCommentOptions);

  if (retryOptions.author && typeof retryOptions.author === 'object' && !Array.isArray(retryOptions.author)) {
    const author = { ...retryOptions.author };
    delete author.shortAddress;
    retryOptions.author = author;
  }

  const communityAddress = retryOptions.communityAddress ?? getCommentCommunityAddress(post);
  if (!communityAddress) {
    return undefined;
  }
  retryOptions.communityAddress = communityAddress;

  return retryOptions;
};

const useDeleteFailedPost = (post?: FailedPost, deleteRedirectPath?: string) => {
  const [isDeletingFailedPost, setIsDeletingFailedPost] = useState(false);
  const [isRetryingFailedPost, setIsRetryingFailedPost] = useState(false);
  const [isRetryRedirectPending, setIsRetryRedirectPending] = useState(false);
  const addChallenge = useChallengesStore((state) => state.addChallenge);
  const navigate = useNavigate();
  const abandonPublishRef = useRef<(() => Promise<void>) | undefined>(undefined);
  const abandonCurrentPublish = useCallback(async () => {
    await abandonPublishRef.current?.();
  }, []);

  const canDeleteFailedPost = post?.state === 'failed' && typeof post?.index === 'number';
  const retryPublishOptions = useMemo(() => getFailedPostRetryPublishOptions(post), [post]);
  const publishOptionsWithCallbacks = useMemo<PublishCommentOptions | undefined>(
    () =>
      retryPublishOptions
        ? {
            ...retryPublishOptions,
            onChallenge: async (...args: any[]) => {
              addChallenge(args, abandonCurrentPublish);
            },
            onChallengeVerification: async (challengeVerification: ChallengeVerification, comment: Comment) => {
              alertChallengeVerificationFailed(challengeVerification, comment);
            },
            onError: (error: Error) => {
              console.error('Failed to retry failed post:', error);
              setIsRetryRedirectPending(false);
              alert(`Failed to retry post: ${error.message}`);
            },
          }
        : undefined,
    [abandonCurrentPublish, addChallenge, retryPublishOptions],
  );
  const { abandonPublish, index: retryPostIndex, publishComment } = usePublishComment(publishOptionsWithCallbacks);
  abandonPublishRef.current = abandonPublish;

  useEffect(() => {
    if (!isRetryRedirectPending || typeof retryPostIndex !== 'number') {
      return;
    }

    setIsRetryRedirectPending(false);
    navigate(`/pending/${retryPostIndex}`, { replace: true });
  }, [isRetryRedirectPending, navigate, retryPostIndex]);

  const onDeleteFailedPost = useCallback(() => {
    if (isDeletingFailedPost || isRetryingFailedPost || !canDeleteFailedPost) {
      return;
    }

    const targetComment = getDeleteTarget(post);
    if (typeof targetComment === 'undefined') {
      return;
    }

    setIsDeletingFailedPost(true);
    deleteComment(targetComment)
      .then(() => {
        setIsDeletingFailedPost(false);
        if (deleteRedirectPath) {
          navigate(deleteRedirectPath, { replace: true });
        }
      })
      .catch((error) => {
        console.error('Failed to delete failed post:', error);
        alert(`Failed to delete post: ${error instanceof Error ? error.message : 'Unknown error'}`);
        setIsDeletingFailedPost(false);
      });
  }, [canDeleteFailedPost, deleteRedirectPath, isDeletingFailedPost, isRetryingFailedPost, navigate, post]);

  const canRetryFailedPost = canDeleteFailedPost && Boolean(retryPublishOptions);

  const onRetryFailedPost = useCallback(async () => {
    if (isDeletingFailedPost || isRetryingFailedPost || !canRetryFailedPost) {
      return;
    }

    const targetComment = getDeleteTarget(post);
    if (typeof targetComment === 'undefined') {
      return;
    }

    setIsRetryingFailedPost(true);
    setIsRetryRedirectPending(true);

    try {
      await deleteComment(targetComment);
      await publishComment();
    } catch (error) {
      console.error('Failed to retry failed post:', error);
      setIsRetryRedirectPending(false);
      alert(`Failed to retry post: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsRetryingFailedPost(false);
    }
  }, [canRetryFailedPost, isDeletingFailedPost, isRetryingFailedPost, post, publishComment]);

  return {
    canDeleteFailedPost,
    canRetryFailedPost,
    isDeletingFailedPost,
    isRetryingFailedPost,
    onDeleteFailedPost,
    onRetryFailedPost,
  };
};

export default useDeleteFailedPost;
