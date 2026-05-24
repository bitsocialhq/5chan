import { ChallengeVerification, Comment, PublishCommentOptions } from '@bitsocial/bitsocial-react-hooks';
import { create } from 'zustand';
import { alertChallengeVerificationFailed } from '../lib/utils/challenge-utils';
import { getCommentCommunityAddress } from '../lib/utils/comment-utils';
import { normalizePublishURL } from '../lib/utils/url-utils';

type ReplyState = {
  author: { [parentCid: string]: any | undefined };
  displayName: { [parentCid: string]: string | undefined };
  content: { [parentCid: string]: string | undefined };
  link: { [parentCid: string]: string | undefined };
  flairs: { [parentCid: string]: Comment['flairs'] | undefined };
  spoiler: { [parentCid: string]: boolean | undefined };
  challengeRequest: { [parentCid: string]: Record<string, unknown> | undefined };
  publishCommentOptions: { [parentCid: string]: PublishCommentOptions | undefined };
  setPublishReplyStore: (comment: Comment) => void;
  resetPublishReplyStore: (parentCid: string) => void;
};

const usePublishReplyStore = create<ReplyState>((set) => ({
  author: {},
  displayName: {},
  content: {},
  link: {},
  flairs: {},
  spoiler: {},
  challengeRequest: {},
  publishCommentOptions: {},

  setPublishReplyStore: (comment: Comment) =>
    set((state) => {
      const { parentCid, author, challengeRequest, content, flairs, spoiler } = comment;
      const link = comment.link ? normalizePublishURL(comment.link) : undefined;
      const communityAddress = getCommentCommunityAddress(comment);

      const displayName = 'displayName' in comment ? comment.displayName || undefined : author?.displayName;

      const baseAuthor = author ? { ...author } : {};
      delete baseAuthor.displayName;

      const updatedAuthor = displayName ? { ...baseAuthor, displayName } : baseAuthor;

      const publishCommentOptions: PublishCommentOptions = {
        communityAddress,
        parentCid,
        postCid: comment?.postCid || parentCid,
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
        author: { ...state.author, [parentCid]: updatedAuthor },
        displayName: { ...state.displayName, [parentCid]: displayName },
        content: { ...state.content, [parentCid]: content },
        link: { ...state.link, [parentCid]: link },
        flairs: { ...state.flairs, [parentCid]: flairs },
        spoiler: { ...state.spoiler, [parentCid]: spoiler },
        challengeRequest: { ...state.challengeRequest, [parentCid]: challengeRequest },
        publishCommentOptions: { ...state.publishCommentOptions, [parentCid]: publishCommentOptions },
      };
    }),

  resetPublishReplyStore: (parentCid) =>
    set((state) => ({
      author: { ...state.author, [parentCid]: undefined },
      displayName: { ...state.displayName, [parentCid]: undefined },
      content: { ...state.content, [parentCid]: undefined },
      link: { ...state.link, [parentCid]: undefined },
      flairs: { ...state.flairs, [parentCid]: undefined },
      spoiler: { ...state.spoiler, [parentCid]: undefined },
      challengeRequest: { ...state.challengeRequest, [parentCid]: undefined },
      publishCommentOptions: { ...state.publishCommentOptions, [parentCid]: undefined },
    })),
}));

export default usePublishReplyStore;
