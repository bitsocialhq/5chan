import { type DirectoryCommunity, findDirectoryByAddress } from '../hooks/use-directories';
import { getSpecialBoardByAddress, getSpecialBoardByCode } from './special-boards';
import { getBoardPath } from './utils/route-utils';

const BOARD_ADDRESS_SUFFIX = /\.(?:bso|eth|sol)$/i;
const MAX_SEARCH_QUERY_LENGTH = 200;

const normalizeBoardInput = (value: string): string => {
  const trimmed = value.trim();
  const match = trimmed.match(/^\/([^/]+)\/$/);
  return match?.[1] ?? trimmed;
};

const isBoardInput = (value: string, directories: DirectoryCommunity[]): boolean => {
  if (/\s/.test(value)) return false;
  if (getSpecialBoardByCode(value) || getSpecialBoardByAddress(value)) return true;
  if (findDirectoryByAddress(directories, value)) return true;
  if (directories.some((directory) => directory.directoryCode === value)) return true;
  return BOARD_ADDRESS_SUFFIX.test(value) || value.startsWith('12D3Koo') || value.length > 40;
};

export const getSearchDestination = (input: string, directories: DirectoryCommunity[]): string | null => {
  const value = normalizeBoardInput(input);
  if (!value) return null;
  if (isBoardInput(value, directories)) return `/${getBoardPath(value, directories)}`;
  return `/search?q=${encodeURIComponent(value.slice(0, MAX_SEARCH_QUERY_LENGTH))}`;
};
