import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChallengeVerification, Comment, usePublishComment } from '@bitsocial/bitsocial-react-hooks';
import { useShallow } from 'zustand/react/shallow';
import usePublishPostStore from '../stores/use-publish-post-store';
import useChallengesStore from '../stores/use-challenges-store';
import usePublishAuthorDomainGuard, { getPublishAuthorDomainErrorMessage } from './use-publish-author-domain-guard';
import usePendingPublishRequest from './use-pending-publish-request';
import { getDuplicateMediaChallengeError } from '../lib/utils/challenge-utils';

type UsePublishPostOptions = {
  communityAddress?: string;
  onAbandonPost?: () => void;
  onDuplicateMediaRejected?: (error: string) => void;
  onPublishAccepted?: () => void;
  onPublishError?: (error: Error) => void;
  onPendingPost?: (accountCommentIndex: number, pendingPost: Comment) => void;
};

const usePublishPost = ({ communityAddress, onAbandonPost, onDuplicateMediaRejected, onPublishAccepted, onPublishError, onPendingPost }: UsePublishPostOptions) => {
  const { author, title, content, link, flairs, spoiler, publishCommentOptions } = usePublishPostStore(
    useShallow((state) => ({
      author: state.author,
      title: state.title || undefined,
      content: state.content || undefined,
      link: state.link || undefined,
      flairs: state.flairs,
      spoiler: state.spoiler || false,
      publishCommentOptions: state.publishCommentOptions,
    })),
  );

  const setPublishPostStore = usePublishPostStore((state) => state.setPublishPostStore);
  const resetPublishPostStore = usePublishPostStore((state) => state.resetPublishPostStore);
  const addChallenge = useChallengesStore((state) => state.addChallenge);
  const abandonPublishRef = useRef<(() => Promise<void>) | undefined>(undefined);
  const [publishPostError, setPublishPostError] = useState<string | null>(null);
  const [pendingPublishRequestId, setPendingPublishRequestId] = useState(0);
  const startedPublishRequestIdRef = useRef(0);
  const { blockedReason } = usePublishAuthorDomainGuard();
  const { finishPendingPublishRequest, startPendingPublishRequest } = usePendingPublishRequest();
  const abandonCurrentPublish = useCallback(async () => {
    onAbandonPost?.();
    await abandonPublishRef.current?.();
  }, [onAbandonPost]);

  const createBaseOptions = useCallback(() => {
    const baseOptions: Comment = {
      communityAddress,
      title,
      content,
      link,
      flairs,
      spoiler,
      ...(publishCommentOptions.challengeRequest ? { challengeRequest: publishCommentOptions.challengeRequest } : {}),
    };

    const displayName = author?.displayName;
    if (displayName) {
      baseOptions.author = { displayName };
    }

    return baseOptions;
  }, [author, content, flairs, link, spoiler, communityAddress, title, publishCommentOptions.challengeRequest]);

  const setPublishPostOptions = useCallback(
    (options: Partial<Comment>) => {
      const baseOptions = createBaseOptions();
      const sanitizedOptions = Object.entries(options).reduce(
        (acc, [key, value]) => {
          acc[key] = value === '' ? undefined : value;
          return acc;
        },
        {} as Partial<Comment>,
      );

      const { communityAddress: nextCommunityAddress, ...restOptions } = sanitizedOptions;
      const resolvedCommunityAddress = nextCommunityAddress ?? baseOptions.communityAddress;
      const newOptions = {
        ...baseOptions,
        ...restOptions,
        ...(resolvedCommunityAddress ? { communityAddress: resolvedCommunityAddress } : {}),
      };
      setPublishPostStore(newOptions);
    },
    [createBaseOptions, setPublishPostStore],
  );

  const resetPublishPostOptions = useCallback(() => resetPublishPostStore(), [resetPublishPostStore]);

  const publishOptionsWithAbandon = useMemo(
    () => ({
      ...publishCommentOptions,
      onPendingComment: onPendingPost,
      onError: (error: Error) => {
        onPublishError?.(error);
        publishCommentOptions.onError?.(error);
      },
      onChallengeVerification: async (challengeVerification: ChallengeVerification, comment: Comment) => {
        const duplicateMediaError = getDuplicateMediaChallengeError(challengeVerification);
        if (duplicateMediaError) {
          onDuplicateMediaRejected?.(duplicateMediaError);
          await abandonCurrentPublish();
          return;
        }
        if (challengeVerification.challengeSuccess === true) {
          onPublishAccepted?.();
        }
        publishCommentOptions.onChallengeVerification?.(challengeVerification, comment);
      },
      onChallenge: async (...args: any[]) => {
        addChallenge(args, abandonCurrentPublish);
      },
    }),
    [abandonCurrentPublish, addChallenge, onDuplicateMediaRejected, onPendingPost, onPublishAccepted, onPublishError, publishCommentOptions],
  );

  const { index, publishComment, abandonPublish } = usePublishComment(publishOptionsWithAbandon);
  abandonPublishRef.current = abandonPublish;

  useEffect(() => {
    setPublishPostError(null);
  }, [author?.displayName, blockedReason, communityAddress, content, flairs, link, spoiler, title]);

  const startPublishPost = useCallback(async () => {
    if (blockedReason) {
      setPublishPostError(getPublishAuthorDomainErrorMessage(blockedReason));
      return;
    }

    setPublishPostError(null);
    await publishComment();
  }, [blockedReason, publishComment]);

  useEffect(() => {
    if (pendingPublishRequestId === 0 || pendingPublishRequestId === startedPublishRequestIdRef.current) {
      return;
    }

    const requestId = pendingPublishRequestId;
    startedPublishRequestIdRef.current = requestId;
    void startPublishPost()
      .catch(() => undefined)
      .finally(() => finishPendingPublishRequest(requestId));
  }, [finishPendingPublishRequest, pendingPublishRequestId, startPublishPost]);

  const publishPost = useCallback(
    (options?: Partial<Comment>) => {
      const pendingRequest = startPendingPublishRequest();
      if (!pendingRequest.started) {
        return pendingRequest.request.promise;
      }

      if (options) {
        setPublishPostOptions(options);
        setPendingPublishRequestId(pendingRequest.request.id);
        return pendingRequest.request.promise;
      }

      void startPublishPost()
        .catch(() => undefined)
        .finally(() => finishPendingPublishRequest(pendingRequest.request.id));
      return pendingRequest.request.promise;
    },
    [finishPendingPublishRequest, setPublishPostOptions, startPendingPublishRequest, startPublishPost],
  );

  return {
    setPublishPostOptions,
    resetPublishPostOptions,
    postIndex: index,
    publishPost,
    publishPostError,
    publishPostOptions: publishCommentOptions,
  };
};

export default usePublishPost;
