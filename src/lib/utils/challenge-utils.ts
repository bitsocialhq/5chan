import type { ChallengeVerification, Comment } from '@bitsocial/bitsocial-react-hooks';
import { getFallbackDirectoriesData } from '../../hooks/use-directories';
import { getCommentCommunityAddress } from './comment-utils';
import { getBoardPath } from './route-utils';

const resolveBoardIdentifier = (communityAddress: unknown): string => {
  if (typeof communityAddress !== 'string' || !communityAddress) {
    return 'unknown board';
  }

  const boardPath = getBoardPath(communityAddress, getFallbackDirectoriesData().communities);
  return boardPath === communityAddress ? communityAddress : `/${boardPath}/`;
};

export type ChallengePublication = Partial<Comment> & {
  author?: unknown;
  commentCid?: string;
  communityAddress?: string;
  content?: string;
  link?: string;
  parentCid?: string;
  shortCommunityAddress?: string;
  subplebbitAddress?: string;
  title?: string;
  vote?: number;
};

export const alertChallengeVerificationFailed = (challengeVerification: ChallengeVerification, publication: ChallengePublication | undefined) => {
  if (challengeVerification?.challengeSuccess === false) {
    console.warn('Challenge Verification Failed:', challengeVerification, 'Publication:', publication);

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
  if (publication.content) {
    if (publicationPreview) {
      publicationPreview += ': ';
    }
    publicationPreview += publication.content;
  }
  if (!publicationPreview && publication.link) {
    publicationPreview += publication.link;
  }

  if (publicationPreview.length > 50) {
    publicationPreview = publicationPreview.substring(0, 50) + '...';
  }
  return publicationPreview;
};
