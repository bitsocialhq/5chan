import { getBoardFlagDefinition, getBoardFlagDefinitions, type BoardFlagKind } from './board-flags';
import type { DirectoryCommunity } from './utils/directory-list-utils';

const GEOGRAPHIC_LOCATION_FLAG_VALUE = 'country:auto';
const NO_FLAG_VALUE = 'none';
const FLAG_CHALLENGE_ANSWER_PREFIX = 'bitsocial-flags:5chan:';

export interface CommentFlagSelectOption {
  value: string;
  label: string;
}

export interface CommentFlagRequest {
  type: 'country' | BoardFlagKind;
  code: string;
  text: string;
}

export interface CommentFlagChallengeRequest {
  challengeAnswers: string[];
}

export interface CommentFlagPublishOptions {
  challengeRequest: CommentFlagChallengeRequest;
  flairs: CommentFlagRequest[];
}

const GEOGRAPHIC_LOCATION_OPTION: CommentFlagSelectOption = {
  value: GEOGRAPHIC_LOCATION_FLAG_VALUE,
  label: 'Geographic Location',
};

const NO_FLAG_OPTION: CommentFlagSelectOption = {
  value: NO_FLAG_VALUE,
  label: 'None',
};

const getDirectoryCode = (directory: Pick<DirectoryCommunity, 'directoryCode' | 'title'> | undefined): string | undefined => {
  const directoryCode = directory?.directoryCode?.trim().toLowerCase();
  return directoryCode || directory?.title?.match(/^\/([^/]+)\//)?.[1]?.toLowerCase();
};

const getBoardFlagOptions = (kind: BoardFlagKind): CommentFlagSelectOption[] =>
  getBoardFlagDefinitions(kind).map((flag) => ({
    value: `${flag.kind}:${flag.code}`,
    label: flag.label,
  }));

export const getCommentFlagOptionsForDirectory = (directory: Pick<DirectoryCommunity, 'directoryCode' | 'features' | 'title'> | undefined): CommentFlagSelectOption[] => {
  if (directory?.features?.hasFlags !== true) {
    return [];
  }

  const directoryCode = getDirectoryCode(directory);
  if (directoryCode === 'mlp') {
    return [NO_FLAG_OPTION, ...getBoardFlagOptions('pony')];
  }

  if (directoryCode === 'pol') {
    return [GEOGRAPHIC_LOCATION_OPTION, ...getBoardFlagOptions('pol')];
  }

  return [GEOGRAPHIC_LOCATION_OPTION];
};

export const getCommentFlagRequestFromSelection = (value: string | undefined): CommentFlagRequest | undefined => {
  if (!value || value === NO_FLAG_VALUE) {
    return undefined;
  }

  if (value === GEOGRAPHIC_LOCATION_FLAG_VALUE) {
    return {
      type: 'country',
      code: 'auto',
      text: 'flag:country:auto',
    };
  }

  const match = value.match(/^(pol|pony):([A-Z0-9]+)$/);
  if (!match) {
    return undefined;
  }

  const [, kind, code] = match;
  const flag = getBoardFlagDefinition(kind, code);
  return flag
    ? {
        type: flag.kind,
        code: flag.code,
        text: `flag:${flag.kind}:${flag.code}`,
      }
    : undefined;
};

export const getCommentFlagChallengeRequestFromSelection = (value: string | undefined): CommentFlagChallengeRequest | undefined => {
  const flag = getCommentFlagRequestFromSelection(value);
  return flag ? { challengeAnswers: [`${FLAG_CHALLENGE_ANSWER_PREFIX}${flag.text}`] } : undefined;
};

export const getCommentFlagPublishOptionsFromSelection = (value: string | undefined): CommentFlagPublishOptions | undefined => {
  const flag = getCommentFlagRequestFromSelection(value);
  return flag
    ? {
        challengeRequest: {
          challengeAnswers: [`${FLAG_CHALLENGE_ANSWER_PREFIX}${flag.text}`],
        },
        flairs: [flag],
      }
    : undefined;
};
