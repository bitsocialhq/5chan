import { copyToClipboard } from './clipboard-utils';

export const QUOTE_NUMBER_REGEX = /(?<![>/\w])>>(\d+)/g;

export const getHostname = (url: string) => {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
};

export const isValidURL = (url: string) => {
  return parseHttpUrl(url) !== null;
};

export const parseHttpUrl = (url: string): URL | null => {
  try {
    const parsedUrl = new URL(url);
    return parsedUrl.protocol === 'http:' || parsedUrl.protocol === 'https:' ? parsedUrl : null;
  } catch {
    return null;
  }
};

export const isPrivateNetworkHostname = (hostname: string): boolean => {
  const normalizedHostname = hostname.toLowerCase().replace(/^\[|\]$/g, '');

  if (
    normalizedHostname === 'localhost' ||
    normalizedHostname.endsWith('.localhost') ||
    normalizedHostname.endsWith('.local') ||
    normalizedHostname === '0.0.0.0' ||
    normalizedHostname === '::1' ||
    normalizedHostname === '::' ||
    normalizedHostname.startsWith('::ffff:')
  ) {
    return true;
  }

  const ipv4Parts = normalizedHostname.split('.').map((part) => Number(part));
  if (ipv4Parts.length === 4 && ipv4Parts.every((part) => Number.isInteger(part) && part >= 0 && part <= 255)) {
    const [first, second] = ipv4Parts;
    return first === 10 || first === 127 || (first === 169 && second === 254) || (first === 172 && second >= 16 && second <= 31) || (first === 192 && second === 168);
  }

  if (!normalizedHostname.includes(':')) {
    return false;
  }

  return normalizedHostname.startsWith('fc') || normalizedHostname.startsWith('fd') || normalizedHostname.startsWith('fe80:');
};

export const normalizePublishURL = (url: string) => {
  const trimmedUrl = url.trim();

  try {
    const parsedUrl = new URL(trimmedUrl);
    if (parsedUrl.protocol === 'http:') {
      parsedUrl.protocol = 'https:';
      return parsedUrl.toString();
    }
  } catch {
    return trimmedUrl;
  }

  return trimmedUrl;
};

const EXPIRING_MEDIA_LINK_HOSTNAMES = [
  // 4chan CDN media disappears when threads are pruned, usually after a few hours or days.
  'i.4cdn.org',
  // Litterbox temporary uploads are served from litter.catbox.moe and can expire after 1 hour, 12 hours, 1 day, or 3 days.
  'litter.catbox.moe',
  'litterbox.catbox.moe',
  // tmpfiles.org uploads expire after 60 minutes, 6 hours, 12 hours, or 24 hours.
  'tmpfiles.org',
  // Filebin uploads are deleted automatically after about 6 days.
  'filebin.net',
  // temp.sh files expire after 3 days.
  'temp.sh',
  // Termbin pastes are automatically deleted after 1 week.
  'termbin.com',
  // Uguu files expire after 3 hours.
  'uguu.se',
  // file.kiwi encrypted files are deleted after about 4 days by default.
  'file.kiwi',
  // These upload services delete anonymous or free uploads automatically by default.
  '0x0.st',
  'bashupload.app',
  'file.io',
  'upload.ee',
  'wetransfer.com',
  'we.tl',
  'filemail.com',
  'send.vis.ee',
  'oshi.at',
  'gofile.io',
  'hotimg.com',
  'uploadir.com',
  'sendspace.com',
] as const;

const DISCORD_ATTACHMENT_HOSTNAMES = ['cdn.discordapp.com', 'media.discordapp.net'] as const;
const AZURE_STORAGE_HOSTNAME_SUFFIXES = ['blob.core.windows.net', 'dfs.core.windows.net', 'file.core.windows.net'] as const;

const normalizeHostnameForMatching = (hostname: string) => hostname.toLowerCase().replace(/^www\./, '');

const hostnameMatches = (hostname: string, expectedHostname: string) => hostname === expectedHostname || hostname.endsWith(`.${expectedHostname}`);

const getLowercaseSearchParamNames = (searchParams: URLSearchParams) => new Set([...searchParams.keys()].map((name) => name.toLowerCase()));

const isIdentifiablyExpiringSignedUrl = (parsedUrl: URL, hostname: string): boolean => {
  const searchParamNames = getLowercaseSearchParamNames(parsedUrl.searchParams);
  const hasSearchParams = (...names: string[]) => names.every((name) => searchParamNames.has(name));

  const isDiscordAttachment =
    DISCORD_ATTACHMENT_HOSTNAMES.some((candidate) => hostname === candidate) &&
    (parsedUrl.pathname.startsWith('/attachments/') || parsedUrl.pathname.startsWith('/ephemeral-attachments/')) &&
    hasSearchParams('ex', 'hm');

  const isAwsSignedUrl = hasSearchParams('x-amz-expires', 'x-amz-signature');
  const isGoogleCloudSignedUrl = hasSearchParams('x-goog-expires', 'x-goog-signature');
  const isAzureSignedUrl = AZURE_STORAGE_HOSTNAME_SUFFIXES.some((suffix) => hostnameMatches(hostname, suffix)) && hasSearchParams('se', 'sig');

  return isDiscordAttachment || isAwsSignedUrl || isGoogleCloudSignedUrl || isAzureSignedUrl;
};

export const getExpiringMediaLinkHostname = (url: string): string | null => {
  try {
    const parsedUrl = new URL(normalizePublishURL(url));
    if (parsedUrl.protocol !== 'https:') {
      return null;
    }

    const hostname = normalizeHostnameForMatching(parsedUrl.hostname);
    const expiringHostname = EXPIRING_MEDIA_LINK_HOSTNAMES.find((candidate) => hostnameMatches(hostname, candidate));
    if (expiringHostname) {
      return expiringHostname;
    }

    return isIdentifiablyExpiringSignedUrl(parsedUrl, hostname) ? hostname : null;
  } catch {
    return null;
  }
};

export const isValidPublishURL = (url: string) => {
  try {
    return new URL(normalizePublishURL(url)).protocol === 'https:';
  } catch {
    return false;
  }
};

export const getPublishURLFilename = (url: string): string | null => {
  if (!isValidPublishURL(url)) {
    return null;
  }

  const parsedUrl = new URL(normalizePublishURL(url));
  const filename = parsedUrl.pathname.split('/').filter(Boolean).pop();
  if (!filename) {
    return null;
  }

  try {
    return decodeURIComponent(filename);
  } catch {
    return filename;
  }
};

// Dedicated subdomain that serves shared posts. Its server renders social-media link
// previews (OpenGraph/Twitter cards) for the shared post before handing off to the app.
const SHARE_HOSTNAME = 's.5chan.app';

const CHAN_5_HOSTNAMES = ['5chan.app', SHARE_HOSTNAME, '5chan.eth.limo', '5chan.eth.link', '5chan.eth.sucks', '5chan.netlify.app'];

function getShareBaseUrl(): string {
  return `https://${SHARE_HOSTNAME}`;
}

export type ShareLinkType = 'thread' | 'catalog';

// Copies a share link to clipboard for a board, thread, description, or rules page
export function copyShareLinkToClipboard(boardIdentifier: string, linkType: 'thread', cid: string): Promise<void>;
export function copyShareLinkToClipboard(boardIdentifier: string, linkType: Exclude<ShareLinkType, 'thread'>): Promise<void>;
export async function copyShareLinkToClipboard(boardIdentifier: string, linkType: ShareLinkType, cid?: string): Promise<void> {
  // Share links are path-based (no HashRouter `#/`) so the share server can read the post
  // from the request path and render its preview; URL fragments never reach the server.
  if (linkType === 'thread') {
    if (!cid) {
      throw new Error('copyShareLinkToClipboard: thread links require a cid');
    }
    const shareLink = `${getShareBaseUrl()}/${boardIdentifier}/thread/${cid}`;
    await copyToClipboard(shareLink);
    return;
  }

  const shareLink = `${getShareBaseUrl()}/${boardIdentifier}/${linkType}`;
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
      // Must match exactly: /p/{communityAddress}/c/{cid}
      // Allow redirect parameter since these are still valid internal links
      return /^\/p\/[^/]+\/c\/[^/]+$/.test(routePath);
    }

    // For other 5chan hostnames, support both old and new formats:
    // Old format (for backward compatibility):
    // - /p/{communityAddress}
    // - /p/{communityAddress}/c/{commentCid}
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

  // Check if it's a directory + catalog search pattern: >>>/biz/test
  const directoryCatalogSearchMatch = pathPart.match(/^([a-zA-Z0-9]{1,10})\/([a-zA-Z0-9_-]+)$/);
  if (directoryCatalogSearchMatch) {
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

  // Check if it's a full address + catalog search pattern: >>>/board.eth/test
  const addressCatalogSearchMatch = pathPart.match(/^([^/]+)\/([a-zA-Z0-9_-]+)$/);
  if (addressCatalogSearchMatch) {
    const [, address] = addressCatalogSearchMatch;
    return isValidDomain(address) || isValidIPNSKey(address);
  }

  // Check if it's just a full address pattern: >>>/board.eth
  return isValidDomain(pathPart) || isValidIPNSKey(pathPart);
};
