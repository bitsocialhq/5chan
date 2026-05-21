import directoryListsData from '../../data/5chan-directory-lists.json';
import { normalizeDirectoryList, type DirectoryList, type DirectoryListBoard } from './directory-list-utils';

const DIRECTORY_ALIAS_SUFFIXES = ['.bso', '.eth'] as const;

let vendoredDirectoryListsCache: DirectoryList[] | null = null;

export const normalizeBoardAddress = (address: string): string => {
  for (const suffix of DIRECTORY_ALIAS_SUFFIXES) {
    if (address.endsWith(suffix)) {
      return address.slice(0, -suffix.length);
    }
  }

  return address;
};

export const getVendoredDirectoryLists = (): DirectoryList[] => {
  if (vendoredDirectoryListsCache) return vendoredDirectoryListsCache;

  const directories = Array.isArray(directoryListsData.directories) ? directoryListsData.directories : [];
  vendoredDirectoryListsCache = directories.flatMap((directory) => {
    const directoryCode = typeof directory.directoryCode === 'string' ? directory.directoryCode : undefined;
    if (!directoryCode) return [];
    const normalized = normalizeDirectoryList(directory, directoryCode);
    return normalized ? [normalized] : [];
  });

  return vendoredDirectoryListsCache;
};

export const getVendoredDirectoryList = (directoryCode: string): DirectoryList | null =>
  getVendoredDirectoryLists().find((directory) => directory.directoryCode === directoryCode) ?? null;

const findBoardInList = (list: DirectoryList, address: string): DirectoryListBoard | undefined => {
  const normalizedAddress = normalizeBoardAddress(address);
  return list.boards.find((board) => normalizeBoardAddress(board.address) === normalizedAddress || board.publicKey === address);
};

export const getDirectoryCandidateBoardByAddress = (address: string | undefined): DirectoryListBoard | undefined => {
  if (!address) return undefined;

  for (const directory of getVendoredDirectoryLists()) {
    const board = findBoardInList(directory, address);
    if (board) return board;
  }

  return undefined;
};

export const getDirectoryCodeForBoardAddress = (address: string | undefined): string | undefined => {
  if (!address) return undefined;

  return getVendoredDirectoryLists().find((directory) => findBoardInList(directory, address))?.directoryCode;
};
