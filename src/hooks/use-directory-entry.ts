import { findDirectoryByAddress, type DirectoryCommunity, useDirectories } from './use-directories';
import { getDirectoryCodeForBoardAddress, normalizeBoardAddress } from '../lib/utils/directory-list-lookup-utils';
import { type DirectoryList, type DirectoryListBoard } from '../lib/utils/directory-list-utils';
import { useDirectoryList } from './use-directory-list';

const DIRECTORY_CODE_HINT_PATTERN = /^[a-z0-9]+$/i;

const getDirectoryCode = (directory: DirectoryCommunity | undefined): string | undefined =>
  directory?.directoryCode ?? directory?.title?.match(/^\/([^/]+)\//)?.[1]?.toLowerCase();

const findDirectoryByCode = (directories: DirectoryCommunity[], directoryCode: string | undefined): DirectoryCommunity | undefined =>
  directoryCode ? directories.find((directory) => getDirectoryCode(directory) === directoryCode) : undefined;

const getDirectoryCodeFromHint = (directoryCodeHint: string | undefined, directories: DirectoryCommunity[]): string | undefined => {
  if (!directoryCodeHint) return undefined;
  return (
    getDirectoryCode(findDirectoryByCode(directories, directoryCodeHint)) ??
    (DIRECTORY_CODE_HINT_PATTERN.test(directoryCodeHint) ? directoryCodeHint.toLowerCase() : undefined)
  );
};

const isSameBoardAddress = (left: string | undefined, right: string | undefined): boolean => {
  if (!left || !right) return false;
  return left === right || normalizeBoardAddress(left) === normalizeBoardAddress(right);
};

const findBoardInDirectoryList = (list: DirectoryList | null, address: string | undefined): DirectoryListBoard | undefined =>
  address ? list?.boards.find((board) => isSameBoardAddress(board.address, address) || board.publicKey === address) : undefined;

const getCandidateDirectoryEntry = ({
  address,
  directory,
  list,
}: {
  address: string | undefined;
  directory: DirectoryCommunity | undefined;
  list: DirectoryList | null;
}): DirectoryCommunity | undefined => {
  const board = findBoardInDirectoryList(list, address);
  if (!board || !list) return undefined;
  const features = list.features ?? directory?.features ?? board.features;
  const nsfw = board.nsfw ?? directory?.nsfw;

  return {
    address: board.address,
    name: board.address,
    ...(board.publicKey ? { publicKey: board.publicKey } : {}),
    ...((list.title ?? directory?.title) ? { title: list.title ?? directory?.title } : {}),
    directoryCode: list.directoryCode,
    ...(features ? { features } : {}),
    ...(nsfw !== undefined ? { nsfw } : {}),
  };
};

export const useDirectoryEntry = (address: string | undefined, directoryCodeHint?: string): DirectoryCommunity | undefined => {
  const directories = useDirectories();
  const directEntry = findDirectoryByAddress(directories, address);
  const directoryCode = getDirectoryCodeFromHint(directoryCodeHint, directories) ?? getDirectoryCode(directEntry) ?? getDirectoryCodeForBoardAddress(address);
  const { list } = useDirectoryList(directoryCode);

  return getDirectoryEntryForAddress({ address, directories, directoryCodeHint: directoryCode, list });
};

export const getDirectoryEntryForAddress = ({
  address,
  directories,
  directoryCodeHint,
  list,
}: {
  address: string | undefined;
  directories: DirectoryCommunity[];
  directoryCodeHint?: string;
  list?: DirectoryList | null;
}): DirectoryCommunity | undefined => {
  const directEntry = findDirectoryByAddress(directories, address);
  const hintedDirectoryCode = getDirectoryCodeFromHint(directoryCodeHint, directories);
  const directoryCode = hintedDirectoryCode ?? getDirectoryCode(directEntry) ?? list?.directoryCode ?? getDirectoryCodeForBoardAddress(address);
  const directory = findDirectoryByCode(directories, directoryCode);
  return getCandidateDirectoryEntry({ address, directory, list: list ?? null }) ?? directEntry;
};
