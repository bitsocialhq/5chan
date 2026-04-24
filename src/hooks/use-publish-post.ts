import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Comment, usePublishComment } from '@bitsocial/bitsocial-react-hooks';
import { useShallow } from 'zustand/react/shallow';
import usePublishPostStore from '../stores/use-publish-post-store';
import useChallengesStore from '../stores/use-challenges-store';
import usePublishAuthorDomainGuard, { getPublishAuthorDomainErrorMessage } from './use-publish-author-domain-guard';

type UsePublishPostOptions = {
  communityAddress?: string;
};

const usePublishPost = ({ communityAddress }: UsePublishPostOptions) => {
  const { author, title, content, link, spoiler, publishCommentOptions } = usePublishPostStore(
    useShallow((state) => ({
      author: state.author,
      title: state.title || undefined,
      content: state.content || undefined,
      link: state.link || undefined,
      spoiler: state.spoiler || false,
      publishCommentOptions: state.publishCommentOptions,
    })),
  );

  const setPublishPostStore = usePublishPostStore((state) => state.setPublishPostStore);
  const resetPublishPostStore = usePublishPostStore((state) => state.resetPublishPostStore);
  const addChallenge = useChallengesStore((state) => state.addChallenge);
  const abandonPublishRef = useRef<(() => Promise<void>) | undefined>();
  const [publishPostError, setPublishPostError] = useState<string | null>(null);
  const { blockedReason } = usePublishAuthorDomainGuard();
  const abandonCurrentPublish = useCallback(async () => {
    await abandonPublishRef.current?.();
  }, []);

  const createBaseOptions = useCallback(() => {
    const baseOptions: Comment = {
      communityAddress,
      title,
      content,
      link,
      spoiler,
    };

    const displayName = author?.displayName;
    if (displayName) {
      baseOptions.author = { displayName };
    }

    return baseOptions;
  }, [author, content, link, spoiler, communityAddress, title]);

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
      onChallenge: async (...args: any[]) => {
        addChallenge(args, abandonCurrentPublish);
      },
    }),
    [abandonCurrentPublish, addChallenge, publishCommentOptions],
  );

  const { index, publishComment, abandonPublish } = usePublishComment(publishOptionsWithAbandon);
  abandonPublishRef.current = abandonPublish;

  useEffect(() => {
    setPublishPostError(null);
  }, [author?.displayName, blockedReason, communityAddress, content, link, spoiler, title]);

  const publishPost = useCallback(() => {
    if (blockedReason) {
      setPublishPostError(getPublishAuthorDomainErrorMessage(blockedReason));
      return;
    }

    setPublishPostError(null);
    return publishComment();
  }, [blockedReason, publishComment]);

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
