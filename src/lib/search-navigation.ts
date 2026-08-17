import { type DirectoryCommunity, findDirectoryByAddress } from '../hooks/use-directories';
import { getSpecialBoardByAddress, getSpecialBoardByCode } from './special-boards';
import { getBoardNameFromDirectoryTitle, getBoardPath } from './utils/route-utils';

const BOARD_ADDRESS_SUFFIX = /\.(?:bso|eth|sol)$/i;

export const MAX_SEARCH_QUERY_LENGTH = 200;
export const SEARCH_PATH = '/search';
export const SEARCH_CATALOG_PATH = '/search/catalog';
export const SEARCH_DIRECTORY_PATH = '/search/directory';

export const getSearchPageHref = (basePath: string, query: string, page = 1): { pathname: string; search: string } => {
  const params = new URLSearchParams({ q: query });
  if (page > 1) params.set('page', String(page));
  return { pathname: basePath, search: `?${params.toString()}` };
};

export const getSearchPath = (query: string, page = 1): string => {
  const { pathname, search } = getSearchPageHref(SEARCH_PATH, query, page);
  return `${pathname}${search}`;
};

/** Keeps the current query out of the provider directory URL while still allowing a return to it. */
export const getSearchDirectoryLinkState = (query: string) => (query ? { returnPath: getSearchPath(query) } : undefined);

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

/** Boards are listed by name on the homepage, so the name opens them too, not just the code or address. */
const findDirectoryByBoardName = (value: string, directories: DirectoryCommunity[]): DirectoryCommunity | undefined => {
  const name = value.toLowerCase();
  return directories.find((directory) => {
    const title = directory.title?.trim();
    if (!title) return false;
    return title.toLowerCase() === name || getBoardNameFromDirectoryTitle(title).toLowerCase() === name;
  });
};

export const getSearchDestination = (input: string, directories: DirectoryCommunity[]): string | null => {
  const value = normalizeBoardInput(input);
  if (!value) return null;
  if (isBoardInput(value, directories)) return `/${getBoardPath(value, directories)}`;

  const namedDirectory = findDirectoryByBoardName(value, directories);
  if (namedDirectory) return `/${getBoardPath(namedDirectory.address, directories)}`;

  return `/search?q=${encodeURIComponent(value.slice(0, MAX_SEARCH_QUERY_LENGTH))}`;
};
