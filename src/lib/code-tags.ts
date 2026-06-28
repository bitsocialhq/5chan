import type { DirectoryCommunity } from './utils/directory-list-utils';
import { getDirectoryCodeForBoardAddress, normalizeBoardAddress } from './utils/directory-list-lookup-utils';

const CODE_TAG_DIRECTORY_CODES = new Set(['g', 'q']);
const CODE_TAG_REGEX = /\[code\]([\s\S]*?)\[\/code\]/gi;

export const HAS_CODE_TAG_REGEX = /\[code\]/i;

export type CodeTagSegment = { type: 'text' | 'code'; value: string; start: number };

export const isCodeTagDirectoryCode = (directoryCode: string | undefined): boolean => !!directoryCode && CODE_TAG_DIRECTORY_CODES.has(directoryCode.toLowerCase());

export const splitCodeTagSegments = (raw: string): CodeTagSegment[] => {
  const segments: CodeTagSegment[] = [];
  const regex = new RegExp(CODE_TAG_REGEX.source, 'gi');
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(raw)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ type: 'text', value: raw.slice(lastIndex, match.index), start: lastIndex });
    }
    segments.push({ type: 'code', value: match[1].replace(/^\r?\n/, '').replace(/\r?\n$/, ''), start: match.index });
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < raw.length) {
    segments.push({ type: 'text', value: raw.slice(lastIndex), start: lastIndex });
  }

  return segments;
};

const getDirectoryCodeFromDirectory = (directory: Pick<DirectoryCommunity, 'directoryCode' | 'title'> | undefined): string | undefined =>
  directory?.directoryCode?.trim().toLowerCase() || directory?.title?.match(/^\/([^/]+)\//)?.[1]?.toLowerCase();

export const getRouteBoardIdentifier = (pathname: string): string | undefined => pathname.split('/').filter(Boolean)[0]?.toLowerCase();

const getDirectoryIdentifiers = (directory: DirectoryCommunity): string[] => [
  ...new Set([directory.address, directory.name, directory.publicKey].filter((value): value is string => typeof value === 'string' && value.length > 0)),
];

const findDirectoryByIdentifier = (directories: DirectoryCommunity[], identifier: string): DirectoryCommunity | undefined => {
  const normalizedIdentifier = normalizeBoardAddress(identifier);
  return directories.find((directory) =>
    getDirectoryIdentifiers(directory).some((directoryIdentifier) => normalizeBoardAddress(directoryIdentifier) === normalizedIdentifier),
  );
};

export const getDirectoryCodeForIdentifier = (identifier: string | undefined, directories: DirectoryCommunity[]): string | undefined => {
  if (!identifier) return undefined;

  const normalizedIdentifier = identifier.trim().toLowerCase();
  if (!normalizedIdentifier) return undefined;

  const matchingDirectory = directories.find((directory) => getDirectoryCodeFromDirectory(directory) === normalizedIdentifier);
  if (matchingDirectory) {
    return getDirectoryCodeFromDirectory(matchingDirectory);
  }

  return getDirectoryCodeFromDirectory(findDirectoryByIdentifier(directories, identifier)) ?? getDirectoryCodeForBoardAddress(identifier) ?? normalizedIdentifier;
};

export const isCodeTagsEnabledForContext = (pathname: string, communityAddress: string | undefined, directories: DirectoryCommunity[]): boolean =>
  isCodeTagDirectoryCode(getDirectoryCodeForIdentifier(getRouteBoardIdentifier(pathname), directories)) ||
  isCodeTagDirectoryCode(getDirectoryCodeForIdentifier(communityAddress, directories));
