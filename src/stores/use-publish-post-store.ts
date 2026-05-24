import { ChallengeVerification, Comment, PublishCommentOptions } from '@bitsocial/bitsocial-react-hooks';
import { create } from 'zustand';
import { alertChallengeVerificationFailed } from '../lib/utils/challenge-utils';
import { getCommentCommunityAddress } from '../lib/utils/comment-utils';
import { normalizePublishURL } from '../lib/utils/url-utils';

type SubmitState = {
  author?: any | undefined;
  displayName?: string | undefined;
  communityAddress: string | undefined;
  title: string | undefined;
  content: string | undefined;
  link: string | undefined;
  flairs: Comment['flairs'] | undefined;
  spoiler: boolean | undefined;
  challengeRequest: Record<string, unknown> | undefined;
  publishCommentOptions: PublishCommentOptions;
  setPublishPostStore: (data: Partial<SubmitState>) => void;
  resetPublishPostStore: () => void;
};

const usePublishPostStore = create<SubmitState>((set) => ({
  author: undefined,
  displayName: undefined,
  communityAddress: undefined,
  title: undefined,
  content: undefined,
  link: undefined,
  flairs: undefined,
  spoiler: undefined,
  challengeRequest: undefined,
  publishCommentOptions: {},
  setPublishPostStore: (comment: Comment) =>
    set(() => {
      const { author, challengeRequest, content, flairs, spoiler, title } = comment;
      const link = comment.link ? normalizePublishURL(comment.link) : undefined;
      const communityAddress = getCommentCommunityAddress(comment);

      const displayName = 'displayName' in comment ? comment.displayName || undefined : author?.displayName;

      const baseAuthor = author ? { ...author } : {};
      delete baseAuthor.displayName;

      const updatedAuthor = displayName ? { ...baseAuthor, displayName } : baseAuthor;

      const publishCommentOptions: PublishCommentOptions = {
        communityAddress,
        title,
        content,
        link,
        flairs,
        spoiler,
        ...(challengeRequest ? { challengeRequest } : {}),
        onChallengeVerification: (challengeVerification: ChallengeVerification, comment: Comment) => {
          alertChallengeVerificationFailed(challengeVerification, comment);
        },
        onError: (error: Error) => {
          console.error(error);
          alert(error.message);
        },
      };

      if (Object.keys(updatedAuthor).length > 0) {
        publishCommentOptions.author = updatedAuthor;
      }

      return {
        author: updatedAuthor,
        displayName,
        communityAddress,
        title,
        content,
        link,
        flairs,
        spoiler,
        challengeRequest,
        publishCommentOptions,
      };
    }),
  resetPublishPostStore: () =>
    set({
      author: undefined,
      displayName: undefined,
      communityAddress: undefined,
      title: undefined,
      content: undefined,
      link: undefined,
      flairs: undefined,
      spoiler: undefined,
      challengeRequest: undefined,
      publishCommentOptions: {},
    }),
}));

export default usePublishPostStore;
