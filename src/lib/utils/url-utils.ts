import { copyToClipboard } from './clipboard-utils';

export const QUOTE_NUMBER_REGEX = /(?<![>/\w])>>(\d+)/g;

export const getHostname = (url: string) => {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch (e) {
    return '';
  }
};

export const isValidURL = (url: string) => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

const CHAN_5_HOSTNAMES = ['5chan.app', '5chan.eth.limo', '5chan.eth.link', '5chan.eth.sucks', '5chan.netlify.app'];

function getShareBaseUrl(): string {
  return `https://${CHAN_5_HOSTNAMES[0]}`;
}

export type ShareLinkType = 'thread' | 'catalog';

// Copies a share link to clipboard for a board, thread, description, or rules page
export function copyShareLinkToClipboard(boardIdentifier: string, linkType: 'thread', cid: string): Promise<void>;
export function copyShareLinkToClipboard(boardIdentifier: string, linkType: Exclude<ShareLinkType, 'thread'>): Promise<void>;
export async function copyShareLinkToClipboard(boardIdentifier: string, linkType: ShareLinkType, cid?: string): Promise<void> {
  if (linkType === 'thread') {
    if (!cid) {
      throw new Error('copyShareLinkToClipboard: thread links require a cid');
    }
    const shareLink = `${getShareBaseUrl()}/#/${boardIdentifier}/thread/${cid}`;
    await copyToClipboard(shareLink);
    return;
  }

  const shareLink = `${getShareBaseUrl()}/#/${boardIdentifier}/${linkType}`;
  await copyToClipboard(shareLink);
}

// Check if a URL is a valid 5chan link that should be handled internally
export const is5chanLink = (url: string): boolean => {
  try {
    const parsedUrl = new URL(url);
    const hostname = parsedUrl.hostname.replace(/^www\./, '');

    if (!CHAN_5_HOSTNAMES.includes(hostname)) {
      return false;
    }

    // Check both pathname and hash for the route pattern
    let routePath = parsedUrl.pathname;

    // If there's a hash that starts with #/, use that as the route path
    if (parsedUrl.hash && parsedUrl.hash.startsWith('#/')) {
      routePath = parsedUrl.hash.substring(1); // Remove the # to get the path
    }

    // For pleb.bz, only support the exact sharelink format (legacy /p/... format)
    if (hostname === 'pleb.bz') {
      // Must match exactly: /p/{subplebbitAddress}/c/{cid}
      // Allow redirect parameter since these are still valid internal links
      return /^\/p\/[^/]+\/c\/[^/]+$/.test(routePath);
    }

    // For other 5chan hostnames, support both old and new formats:
    // Old format (for backward compatibility):
    // - /p/{subplebbitAddress}
    // - /p/{subplebbitAddress}/c/{commentCid}
    // New format:
    // - /{boardIdentifier} (directory code or address)
    // - /{boardIdentifier}/thread/{commentCid}
    // - /{boardIdentifier}/catalog
    // - /{boardIdentifier}/mod/queue
    // - /all, /subs, /mod, /pending/{index}
    return (
      /^\/p\/[^/]+(\/c\/[^/]+)?$/.test(routePath) ||
      /^\/[^/]+(\/thread\/[^/]+|\/catalog|\/mod\/queue)?$/.test(routePath) ||
      /^\/(all|subscriptions|mod)(\/catalog|\/thread\/[^/]+)?(\/[^/]+)?$/.test(routePath) ||
      /^\/pending\/[^/]+$/.test(routePath)
    );
  } catch {
    return false;
  }
};

// Transform a valid 5chan URL to an internal route
export const transform5chanLinkToInternal = (url: string): string | null => {
  if (!is5chanLink(url)) {
    return null;
  }

  try {
    const parsedUrl = new URL(url);

    // Check if this is a hash-based route
    if (parsedUrl.hash && parsedUrl.hash.startsWith('#/')) {
      // Extract the route from the hash, preserving any query params within the hash
      const hashPath = parsedUrl.hash.substring(1); // Remove the #
      // Transform old /p/... format to new format if needed
      return transformOldPathToNew(hashPath);
    }

    // For regular pathname-based routes, remove redirect parameter from query string
    const searchParams = new URLSearchParams(parsedUrl.search);
    searchParams.delete('redirect'); // Remove redirect parameter for cleaner internal links

    const cleanSearch = searchParams.toString();
    const searchString = cleanSearch ? `?${cleanSearch}` : '';

    // Transform old /p/... format to new format if needed
    const transformedPath = transformOldPathToNew(parsedUrl.pathname);
    return transformedPath + searchString + parsedUrl.hash;
  } catch {
    return null;
  }
};

// Transform old URL format (/p/{address}/c/{cid}) to new format (/{boardIdentifier}/thread/{cid})
// Note: This function doesn't resolve directory codes - that's handled by the routing system
const transformOldPathToNew = (path: string): string => {
  // Transform /p/{address}/c/{cid} to /{address}/thread/{cid}
  const oldPostPattern = /^\/p\/([^/]+)\/c\/([^/]+)$/;
  const postMatch = path.match(oldPostPattern);
  if (postMatch) {
    const [, address, cid] = postMatch;
    return `/${address}/thread/${cid}`;
  }

  // Transform /p/{address} to /{address}
  const oldBoardPattern = /^\/p\/([^/]+)$/;
  const boardMatch = path.match(oldBoardPattern);
  if (boardMatch) {
    const [, address] = boardMatch;
    return `/${address}`;
  }

  // Return path as-is if it doesn't match old patterns
  return path;
};

// Check if a string is a valid IPNS public key (52 chars starting with 12D3KooW)
const isValidIPNSKey = (str: string): boolean => {
  return str.length === 52 && str.startsWith('12D3KooW');
};

// Check if a string is a valid domain (contains a dot)
const isValidDomain = (str: string): boolean => {
  return str.includes('.') && str.split('.').length >= 2 && str.split('.').every((part) => part.length > 0);
};

// Check if a plain text pattern is a valid 5chan cross-board reference (>>>/...)
export const isValidCrossboardPattern = (pattern: string): boolean => {
  // Must start with ">>>/"
  if (!pattern.startsWith('>>>/')) {
    return false;
  }

  const pathPart = pattern.substring(4); // Remove ">>>/"

  // Check if it's a directory pattern with trailing slash: >>>/biz/
  if (/^[a-zA-Z0-9]{1,10}\/$/.test(pathPart)) {
    return true; // Directory codes are always valid (highest-voted boards)
  }

  // Check if it's a directory + thread pattern: >>>/biz/fullCid
  const directoryThreadMatch = pathPart.match(/^([a-zA-Z0-9]{1,10})\/([a-zA-Z0-9]{46})$/);
  if (directoryThreadMatch) {
    return true; // CID is exactly 46 alphanumeric chars
  }

  // Check if it's a directory + post number pattern: >>>/biz/123
  const directoryPostNumberMatch = pathPart.match(/^([a-zA-Z0-9]{1,10})\/(\d+)$/);
  if (directoryPostNumberMatch) {
    return true;
  }

  // Check if it's a full address + thread pattern: >>>/board.eth/fullCid
  const addressThreadMatch = pathPart.match(/^([^/]+)\/([a-zA-Z0-9]{46})$/);
  if (addressThreadMatch) {
    const [, address] = addressThreadMatch;
    // Address must be valid domain or IPNS key
    return isValidDomain(address) || isValidIPNSKey(address);
  }

  // Check if it's a full address + post number pattern: >>>/board.eth/123
  const addressPostNumberMatch = pathPart.match(/^([^/]+)\/(\d+)$/);
  if (addressPostNumberMatch) {
    const [, address] = addressPostNumberMatch;
    return isValidDomain(address) || isValidIPNSKey(address);
  }

  // Check if it's just a full address pattern: >>>/board.eth
  return isValidDomain(pathPart) || isValidIPNSKey(pathPart);
};
