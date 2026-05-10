import { DirectoryCommunity, findDirectoryByAddress, normalizeBoardAddress } from '../../hooks/use-directories';
import { getEffectiveTimeFilterName, getSearchWithTimeFilter } from './time-filter-utils';

/**
 * Extract directory short code from title (e.g., "/biz/ - Business & Finance" -> "biz")
 */
export const extractDirectoryFromTitle = (title: string): string | null => {
  const match = title.match(/^\/([^/]+)\//);
  return match ? match[1] : null;
};

// Cache for directory-to-address map
let cachedCommunitiesForDirectory: DirectoryCommunity[] | null = null;
let cachedDirectoryToAddressMap: Map<string, string> | null = null;

// Cache for address-to-directory map
let cachedCommunitiesForAddress: DirectoryCommunity[] | null = null;
let cachedAddressToDirectoryMap: Map<string, string> | null = null;

const getDirectoryCode = (community: DirectoryCommunity): string | null => community.directoryCode ?? extractDirectoryFromTitle(community.title ?? '');

const getCommunityLookupAddresses = (community: DirectoryCommunity): string[] => [
  ...new Set([community.address, community.name, community.publicKey].filter((value): value is string => typeof value === 'string' && value.length > 0)),
];

/**
 * Create a map from directory codes to community addresses
 * Uses caching to avoid recreating the map when communities array hasn't changed
 */
const getDirectoryToAddressMap = (communities: DirectoryCommunity[]): Map<string, string> => {
  // Check if we can use cached map (same array reference)
  if (cachedDirectoryToAddressMap && cachedCommunitiesForDirectory === communities) {
    return cachedDirectoryToAddressMap;
  }

  const map = new Map<string, string>();
  for (const community of communities) {
    if (!community.address) continue;
    const directory = getDirectoryCode(community);
    if (directory) {
      map.set(directory, community.address);
    }
  }

  // Cache the map and array reference
  cachedDirectoryToAddressMap = map;
  cachedCommunitiesForDirectory = communities;
  return map;
};

/**
 * Create a map from community addresses to directory codes
 * Uses caching to avoid recreating the map when communities array hasn't changed
 */
const getAddressToDirectoryMap = (communities: DirectoryCommunity[]): Map<string, string> => {
  // Check if we can use cached map (same array reference)
  if (cachedAddressToDirectoryMap && cachedCommunitiesForAddress === communities) {
    return cachedAddressToDirectoryMap;
  }

  const map = new Map<string, string>();
  for (const community of communities) {
    if (!community.address) continue;
    const directory = getDirectoryCode(community);
    if (directory) {
      for (const address of getCommunityLookupAddresses(community)) {
        map.set(address, directory);
      }
    }
  }

  // Cache the map and array reference
  cachedAddressToDirectoryMap = map;
  cachedCommunitiesForAddress = communities;
  return map;
};

/**
 * Convert community address to URL path (directory code if available, otherwise full address).
 * Uses findDirectoryByAddress for alias resolution (.bso/.eth) so music-posting.eth maps to mu.
 */
export const getBoardPath = (communityAddress: string, communities: DirectoryCommunity[]): string => {
  const addressToDirectory = getAddressToDirectoryMap(communities);
  let directory = addressToDirectory.get(communityAddress);
  if (!directory) {
    const entry = findDirectoryByAddress(communities, communityAddress);
    directory = entry ? (getDirectoryCode(entry) ?? undefined) : undefined;
  }
  return directory || communityAddress;
};

/**
 * Convert URL path (directory code or address) to community address
 */
export const getCommunityAddress = (boardIdentifier: string, communities: DirectoryCommunity[]): string => {
  const directoryToAddress = getDirectoryToAddressMap(communities);

  // Check if it's a directory code
  const address = directoryToAddress.get(boardIdentifier);
  if (address) {
    return address;
  }

  // Otherwise, assume it's already an address
  return boardIdentifier;
};

/**
 * Compare two addresses; returns true if they refer to the same board (handles .bso/.eth aliases).
 */
export const areSameBoardAddress = (a: string | undefined, b: string | undefined): boolean => {
  if (!a || !b) return false;
  if (a === b) return true;
  return normalizeBoardAddress(a) === normalizeBoardAddress(b);
};

/**
 * Check if an identifier is a directory short code
 */
export const isDirectoryBoard = (identifier: string, communities: DirectoryCommunity[]): boolean => {
  const directoryToAddress = getDirectoryToAddressMap(communities);
  return directoryToAddress.has(identifier);
};

export const isArchiveRoute = (pathname: string): boolean => {
  const normalizedPath = pathname.replace(/\/settings$/, '').replace(/\/$/, '');
  return normalizedPath.endsWith('/archive');
};

export const isFeedRoute = (pathname: string): boolean => {
  const normalizedPath = pathname.endsWith('/') ? pathname.slice(0, -1) : pathname;

  if (normalizedPath.includes('/thread/')) return false;
  if (normalizedPath.startsWith('/pending/')) return false;
  if (isArchiveRoute(normalizedPath)) return false;
  if (isBoardModRoute(normalizedPath) || isModQueueRoute(normalizedPath)) return false;

  const pathWithoutSettings = normalizedPath.replace(/\/settings$/, '');
  const segments = pathWithoutSettings.split('/').filter(Boolean);
  if (segments.length >= 1) {
    if (segments.length === 1) return true;
    if (segments.length === 2 && segments[1] === 'catalog') return true;
    if (segments.length === 2 && /^([1-9]|10)$/.test(segments[1])) return true;
    if (segments.length === 3 && segments[1] === 'catalog' && /^([1-9]|10)$/.test(segments[2])) return true;
  }

  return false;
};

export const isPostRoute = (pathname: string): boolean => {
  const normalizedPath = pathname.replace(/\/settings$/, '');

  if (normalizedPath.includes('/thread/')) return true;

  return false;
};

export const isPendingPostRoute = (pathname: string): boolean => {
  const normalizedPath = pathname.replace(/\/settings$/, '');
  return normalizedPath.startsWith('/pending/');
};

export const isBoardModRoute = (pathname: string): boolean => {
  const normalizedPath = pathname.replace(/\/$/, '');
  return /^\/[^/]+\/mod(?:\/.*)?$/.test(normalizedPath);
};

export const isLegacyBoardModQueueRoute = (pathname: string): boolean => {
  const normalizedPath = pathname.replace(/\/$/, '');
  return /^\/[^/]+\/modqueue(?:\/settings)?$/.test(normalizedPath);
};

export const isModQueueRoute = (pathname: string): boolean => {
  const normalizedPath = pathname.replace(/\/settings$/, '').replace(/\/$/, '');
  return normalizedPath === '/mod/queue' || /^\/[^/]+\/mod\/queue$/.test(normalizedPath);
};

const VALID_MOD_PATHS = ['/mod', '/mod/settings', '/mod/catalog', '/mod/catalog/settings', '/mod/queue', '/mod/queue/settings'];
const VALID_BOARD_MOD_SUBPATHS = ['queue', 'queue/settings'];

export const isValidModRoute = (pathname: string): boolean => {
  const normalized = pathname.replace(/\/$/, '');
  return VALID_MOD_PATHS.includes(normalized);
};

export const isValidBoardModRoute = (pathname: string): boolean => {
  const normalizedPath = pathname.replace(/\/$/, '');
  const match = normalizedPath.match(/^\/[^/]+\/mod(?:\/(.*))?$/);
  if (!match) {
    return false;
  }

  const subpath = match[1] ?? '';
  return VALID_BOARD_MOD_SUBPATHS.includes(subpath);
};

/** Page numbers 1–10 for board feed pagination */
const BOARD_PAGE_REGEX = /^([1-9]|10)$/;

const isBoardFeedPageNumber = (segment: string): boolean => BOARD_PAGE_REGEX.test(segment);

/** Internal: check if segment is a multiboard root (all, subs, mod) */
function isMultiboardRoot(segment: string): boolean {
  return segment === 'all' || segment === 'subs' || segment === 'mod';
}

/** Internal: check if pathname is a multiboard feed path (starts with /all, /subs, or /mod) */
function isMultiboardFeedPath(pathname: string): boolean {
  const trimmed = pathname.replace(/\/$/, '');
  const segments = trimmed.split('/').filter(Boolean);
  return segments.length > 0 && isMultiboardRoot(segments[0]);
}

/**
 * Normalize multiboard feed paths by removing trailing page-number segments (1–10)
 * and preserving /settings.
 * Non-multiboard paths are returned unchanged.
 */
export const normalizeMultiboardFeedPath = (pathname: string): string => {
  let path = pathname.replace(/\/$/, '');
  if (!isMultiboardFeedPath(path)) {
    return pathname;
  }

  const hasSettings = path.endsWith('/settings');
  if (hasSettings) {
    path = path.replace(/\/settings$/, '');
  }

  const segments = path.split('/').filter(Boolean);
  if (segments.length > 1 && isBoardFeedPageNumber(segments[segments.length - 1])) {
    const newPath = '/' + segments.slice(0, -1).join('/');
    return hasSettings ? newPath + '/settings' : newPath;
  }

  return hasSettings ? path + '/settings' : path;
};

/** Strip trailing page number (1–10) from path for feed cache key */
export const stripPageFromFeedPath = (path: string): string => {
  const segments = path.split('/').filter(Boolean);
  if (segments.length > 1 && isBoardFeedPageNumber(segments[segments.length - 1])) {
    return '/' + segments.slice(0, -1).join('/');
  }
  return path;
};

/** Parse current page number (1–10) from feed pathname; returns 1 if none */
export const getPageFromFeedPath = (pathname: string): number => {
  const normalized = pathname.replace(/\/settings$/, '').replace(/\/$/, '');
  const segments = normalized.split('/').filter(Boolean);
  const last = segments[segments.length - 1];
  if (last && isBoardFeedPageNumber(last)) {
    const n = parseInt(last, 10);
    return Math.min(10, Math.max(1, n));
  }
  return 1;
};

export const getFeedCacheKey = (pathname: string, search = ''): string | null => {
  let normalizedPath = pathname.endsWith('/') ? pathname.slice(0, -1) : pathname;
  normalizedPath = normalizedPath.replace(/\/settings$/, '');

  if (normalizedPath.includes('/thread/')) {
    const parts = normalizedPath.split('/thread/');
    return parts[0] || null;
  }

  if (normalizedPath.startsWith('/pending/')) {
    return null;
  }

  if (isArchiveRoute(normalizedPath) || isBoardModRoute(normalizedPath) || isModQueueRoute(normalizedPath)) {
    return null;
  }

  if (isFeedRoute(pathname)) {
    const strippedFeedPath = stripPageFromFeedPath(normalizedPath);
    if (isMultiboardFeedPath(strippedFeedPath)) {
      const timeFilterName = getEffectiveTimeFilterName(search);
      return `${strippedFeedPath}${getSearchWithTimeFilter('', timeFilterName)}`;
    }
    return strippedFeedPath;
  }

  return null;
};

export const getFeedType = (pathname: string): 'board' | 'catalog' | null => {
  const normalizedPath = pathname.replace(/\/settings$/, '');

  if (normalizedPath.includes('/catalog')) {
    return 'catalog';
  }

  if (isFeedRoute(pathname)) {
    return 'board';
  }

  if (isPostRoute(pathname)) {
    return 'board';
  }

  return null;
};
