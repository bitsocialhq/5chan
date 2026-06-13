import type { ChallengeVerification, Comment } from '@bitsocial/bitsocial-react-hooks';
import { getFallbackDirectoriesData } from '../../hooks/use-directories';
import { getCommentCommunityAddress } from './comment-utils';
import { getBoardPath } from './route-utils';
import { stripGeneratedFortuneMarkup } from './post-options-utils';

const resolveBoardIdentifier = (communityAddress: unknown): string => {
  if (typeof communityAddress !== 'string' || !communityAddress) {
    return 'unknown board';
  }

  const boardPath = getBoardPath(communityAddress, getFallbackDirectoriesData().communities);
  return boardPath === communityAddress ? communityAddress : `/${boardPath}/`;
};

type ChallengeAnswersInput = string[] | { challengeAnswers?: string[] };

export type ChallengePublication = Partial<Omit<Comment, 'publishChallengeAnswers'>> & {
  author?: unknown;
  commentCid?: string;
  communityAddress?: string;
  content?: string;
  link?: string;
  parentCid?: string;
  publishChallengeAnswers?: (challengeAnswers?: ChallengeAnswersInput) => Promise<void> | void;
  shortCommunityAddress?: string;
  subplebbitAddress?: string;
  title?: string;
  vote?: number;
};

export const publishPublicationChallengeAnswers = async (publication: ChallengePublication | undefined, challengeAnswers: string[]) => {
  const publishChallengeAnswers = publication?.publishChallengeAnswers;
  if (typeof publishChallengeAnswers !== 'function') return;
  await publishChallengeAnswers.call(publication, { challengeAnswers });
};

export const redactGeneratedFortuneFromPublication = <T>(publication: T): T => {
  if (!publication || typeof publication !== 'object') {
    return publication;
  }

  const content = (publication as { content?: unknown }).content;
  if (typeof content !== 'string') {
    return publication;
  }

  const redactedContent = stripGeneratedFortuneMarkup(content);
  if (redactedContent === content) {
    return publication;
  }

  const redactedPublication = Object.create(Object.getPrototypeOf(publication)) as T & { content?: string; publishChallengeAnswers?: unknown };
  Object.assign(redactedPublication, publication, { content: redactedContent || undefined });

  const publishChallengeAnswers = (publication as { publishChallengeAnswers?: unknown }).publishChallengeAnswers;
  if (typeof publishChallengeAnswers === 'function') {
    Object.defineProperty(redactedPublication, 'publishChallengeAnswers', {
      configurable: true,
      value: publishChallengeAnswers.bind(publication),
    });
  }

  return redactedPublication as T;
};

export const redactGeneratedFortuneFromChallenge = <T>(challenge: T): T => {
  if (!Array.isArray(challenge)) {
    return challenge;
  }

  const redactedChallenge = [...challenge];
  if (redactedChallenge.length > 1) {
    redactedChallenge[1] = redactGeneratedFortuneFromPublication(redactedChallenge[1]);
  }
  if (redactedChallenge.length > 2) {
    redactedChallenge[2] = redactGeneratedFortuneFromPublication(redactedChallenge[2]);
  }
  return redactedChallenge as T;
};

export const alertChallengeVerificationFailed = (challengeVerification: ChallengeVerification, publication: ChallengePublication | undefined) => {
  if (challengeVerification?.challengeSuccess === false) {
    console.warn('Challenge Verification Failed:', challengeVerification, 'Publication:', redactGeneratedFortuneFromPublication(publication));

    let errorMessages: string[] = [];
    if (challengeVerification?.challengeErrors) {
      if (
        typeof challengeVerification.challengeErrors === 'object' &&
        challengeVerification.challengeErrors !== null &&
        !Array.isArray(challengeVerification.challengeErrors)
      ) {
        errorMessages = Object.values(challengeVerification.challengeErrors).filter((val): val is string => typeof val === 'string');
      } else if (Array.isArray(challengeVerification.challengeErrors)) {
        errorMessages = [...challengeVerification.challengeErrors];
      } else {
        console.warn('challengeVerification.challengeErrors is not an object or array:', challengeVerification.challengeErrors);
      }
    }

    if (challengeVerification?.reason) {
      errorMessages.push(challengeVerification.reason);
    }

    const finalMessage = errorMessages.filter(Boolean).join(' ');
    const publicationCommunityAddress = getCommentCommunityAddress(publication);

    alert(`Error from ${resolveBoardIdentifier(publicationCommunityAddress)}: ${finalMessage || 'unknown error'}`);
  } else {
    console.log('Challenge verification succeeded:', challengeVerification);
  }
};

export const getPublicationType = (publication: ChallengePublication | undefined) => {
  if (!publication) {
    return;
  }
  if (typeof publication.vote === 'number') {
    return 'vote';
  }
  if (publication.parentCid) {
    return 'reply';
  }
  if (publication.commentCid) {
    return 'edit';
  }
  return 'post';
};

export const getVotePreview = (publication: ChallengePublication | undefined) => {
  if (typeof publication?.vote !== 'number') {
    return '';
  }
  let votePreview = '';
  if (publication.vote === -1) {
    votePreview += ' -1';
  } else {
    votePreview += ` +${publication.vote}`;
  }
  return votePreview;
};

export const getPublicationPreview = (publication: ChallengePublication | undefined) => {
  if (!publication) {
    return '';
  }
  let publicationPreview = '';
  if (publication.title) {
    publicationPreview += publication.title;
  }
  const content = publication.content ? stripGeneratedFortuneMarkup(publication.content) : '';
  if (content) {
    if (publicationPreview) {
      publicationPreview += ': ';
    }
    publicationPreview += content;
  }
  if (!publicationPreview && publication.link) {
    publicationPreview += publication.link;
  }

  if (publicationPreview.length > 50) {
    publicationPreview = publicationPreview.substring(0, 50) + '...';
  }
  return publicationPreview;
};
