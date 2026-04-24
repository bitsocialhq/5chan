import { isPrivateNetworkHostname } from './utils/url-utils';

const DEFAULT_RELEASE_API_URL = 'https://api.github.com/repos/bitsocialnet/5chan/releases/latest';
const DEFAULT_RELEASES_BASE_URL = 'https://github.com/bitsocialnet/5chan/releases/tag/';

const parseConfiguredHosts = (value: string | undefined): Set<string> =>
  new Set(
    `${value || ''}`
      .split(',')
      .map((host) => host.trim().toLowerCase())
      .filter(Boolean),
  );

const configuredDownloadHosts = parseConfiguredHosts(import.meta.env.VITE_APP_UPDATE_ALLOWED_DOWNLOAD_HOSTS);

const getReleaseApiUrl = (): string => {
  const configuredUrl = import.meta.env.VITE_APP_UPDATE_RELEASE_API_URL;
  return typeof configuredUrl === 'string' && configuredUrl.trim().length > 0 ? configuredUrl.trim() : DEFAULT_RELEASE_API_URL;
};

const getDefaultReleaseUrl = (version: string): string => `${DEFAULT_RELEASES_BASE_URL}v${version.trim().replace(/^v/i, '').split('-')[0]}`;

const isAllowedDownloadUrl = (url: string): boolean => {
  try {
    const parsedUrl = new URL(url);
    const hostname = parsedUrl.hostname.toLowerCase();

    if (parsedUrl.protocol === 'https:' && hostname === 'github.com' && parsedUrl.pathname.startsWith('/bitsocialnet/5chan/releases/download/')) {
      return true;
    }

    if (!configuredDownloadHosts.has(hostname)) {
      return false;
    }

    return parsedUrl.protocol === 'https:' || (parsedUrl.protocol === 'http:' && isPrivateNetworkHostname(hostname));
  } catch {
    return false;
  }
};

export { getDefaultReleaseUrl, getReleaseApiUrl, isAllowedDownloadUrl };
