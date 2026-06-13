import localForageLru from '@bitsocial/bitsocial-react-hooks/dist/lib/localforage-lru/index.js';
import { canEmbed, getYouTubeVideoId, youtubeHosts } from '../../components/embed/embed-utils';
import memoize from 'memoizee';
import { isPrivateNetworkHostname, isValidURL, parseHttpUrl } from './url-utils';
import { Capacitor, CapacitorHttp } from '@capacitor/core';

export interface CommentMediaInfo {
  url: string;
  type: string;
  thumbnail?: string;
  thumbnailWidth?: number;
  thumbnailHeight?: number;
  patternThumbnailUrl?: string;
  linkWidth?: number;
  linkHeight?: number;
}

type Translate = (key: string) => string;

export const getDisplayMediaInfoType = (type: string, t: Translate) => {
  switch (type) {
    case 'image':
      return t('image');
    case 'gif':
      return t('gif');
    case 'animated gif':
      return t('animated_gif');
    case 'static gif':
      return t('gif');
    case 'iframe':
      return t('iframe');
    case 'video':
      return t('video');
    case 'audio':
      return t('audio');
    case 'swf':
      return 'SWF';
    default:
      return t('webpage');
  }
};

export const getYouTubeEmbedPostMediaFileLink = (commentMediaInfo: CommentMediaInfo | undefined): string | undefined => {
  if (!commentMediaInfo || commentMediaInfo.type !== 'iframe' || !commentMediaInfo.url) {
    return undefined;
  }

  const parsedUrl = parseHttpUrl(commentMediaInfo.url);
  if (!parsedUrl || !getYouTubeVideoId(parsedUrl)) {
    return undefined;
  }

  return commentMediaInfo.patternThumbnailUrl || getPatternThumbnailUrl(parsedUrl);
};

export const getPostMediaTypeLabel = (commentMediaInfo: CommentMediaInfo | undefined, resolvedType: string | undefined, t: Translate): string => {
  if (getYouTubeEmbedPostMediaFileLink(commentMediaInfo)) {
    return t('youtube_video');
  }

  if (!resolvedType) {
    return '';
  }

  return getDisplayMediaInfoType(resolvedType, t);
};

const isYouTubeLikeUrl = (url: URL): boolean => youtubeHosts.has(url.host) || url.host.startsWith('yt.');
const YOUTUBE_THUMBNAIL_FILENAMES = ['maxresdefault.jpg', 'sddefault.jpg', 'mqdefault.jpg', 'hqdefault.jpg'] as const;
const YOUTUBE_MISSING_THUMBNAIL_CONTENT_LENGTH = '1097';
const YOUTUBE_MISSING_THUMBNAIL_HEIGHT = 90;
const YOUTUBE_MISSING_THUMBNAIL_WIDTH = 120;
const YOUTUBE_THUMBNAIL_RESOLUTION_TIMEOUT_MS = 3000;
const youtubeThumbnailResolutionPromises = new Map<string, Promise<string | undefined>>();

const getHeaderValue = (headers: Record<string, string>, headerName: string): string | undefined => {
  const matchingHeader = Object.entries(headers).find(([name]) => name.toLowerCase() === headerName);
  return matchingHeader?.[1];
};

const getYouTubeThumbnailUrlFromVideoId = (videoId: string, filename: (typeof YOUTUBE_THUMBNAIL_FILENAMES)[number]): string => {
  return `https://img.youtube.com/vi/${videoId}/${filename}`;
};

const getYouTubeThumbnailVideoId = (url: URL): string | undefined => {
  const hostname = url.hostname.toLowerCase();
  if (hostname !== 'img.youtube.com' && hostname !== 'i.ytimg.com' && !/^i\d+\.ytimg\.com$/.test(hostname)) {
    return undefined;
  }

  const pathParts = url.pathname.split('/').filter(Boolean);
  if (pathParts.length !== 3 || pathParts[0] !== 'vi') {
    return undefined;
  }

  return pathParts[1];
};

export const getYouTubeThumbnailCandidateUrls = (url: URL): string[] => {
  if (!isYouTubeLikeUrl(url)) {
    return [];
  }

  const videoId = getYouTubeVideoId(url);
  return videoId ? YOUTUBE_THUMBNAIL_FILENAMES.map((filename) => getYouTubeThumbnailUrlFromVideoId(videoId, filename)) : [];
};

export const getYouTubeThumbnailCandidateUrlsFromLink = (link: string): string[] => {
  const parsedUrl = parseHttpUrl(link.trim());
  return parsedUrl ? getYouTubeThumbnailCandidateUrls(parsedUrl) : [];
};

export const getYouTubeThumbnailFallbackUrls = (thumbnailUrl: string | undefined): string[] => {
  if (!thumbnailUrl) {
    return [];
  }

  const parsedUrl = parseHttpUrl(thumbnailUrl);
  const videoId = parsedUrl ? getYouTubeThumbnailVideoId(parsedUrl) : undefined;
  if (!videoId) {
    return [thumbnailUrl];
  }

  const currentFilename = parsedUrl?.pathname.split('/').filter(Boolean)[2];
  const startIndex = YOUTUBE_THUMBNAIL_FILENAMES.findIndex((filename) => filename === currentFilename);
  const filenames = startIndex >= 0 ? YOUTUBE_THUMBNAIL_FILENAMES.slice(startIndex) : YOUTUBE_THUMBNAIL_FILENAMES;

  return filenames.map((filename) => (filename === currentFilename ? thumbnailUrl : getYouTubeThumbnailUrlFromVideoId(videoId, filename)));
};

export const isMissingYouTubeThumbnailImage = (thumbnailUrl: string, width: number, height: number): boolean => {
  const parsedUrl = parseHttpUrl(thumbnailUrl);
  return Boolean(parsedUrl && getYouTubeThumbnailVideoId(parsedUrl) && width === YOUTUBE_MISSING_THUMBNAIL_WIDTH && height === YOUTUBE_MISSING_THUMBNAIL_HEIGHT);
};

export const getYouTubeThumbnailUrl = (url: URL): string | undefined => {
  return getYouTubeThumbnailCandidateUrls(url)[0];
};

export const getYouTubeThumbnailUrlFromLink = (link: string): string | undefined => {
  return getYouTubeThumbnailCandidateUrlsFromLink(link)[0];
};

const isAvailableYouTubeThumbnailUrl = async (thumbnailUrl: string): Promise<boolean> => {
  if (Capacitor.isNativePlatform()) {
    try {
      const response = await CapacitorHttp.request({
        url: thumbnailUrl,
        method: 'HEAD',
        readTimeout: YOUTUBE_THUMBNAIL_RESOLUTION_TIMEOUT_MS,
        connectTimeout: YOUTUBE_THUMBNAIL_RESOLUTION_TIMEOUT_MS,
      });

      return response.status >= 200 && response.status < 300 && getHeaderValue(response.headers, 'content-length') !== YOUTUBE_MISSING_THUMBNAIL_CONTENT_LENGTH;
    } catch {
      return false;
    }
  }

  if (typeof fetch !== 'function') {
    return false;
  }

  const controller = new AbortController();
  const timeoutId = globalThis.setTimeout(() => controller.abort(), YOUTUBE_THUMBNAIL_RESOLUTION_TIMEOUT_MS);

  try {
    const response = await fetch(thumbnailUrl, {
      method: 'HEAD',
      signal: controller.signal,
    });

    return response.ok && response.headers.get('content-length') !== YOUTUBE_MISSING_THUMBNAIL_CONTENT_LENGTH;
  } catch {
    return false;
  } finally {
    globalThis.clearTimeout(timeoutId);
  }
};

export const getBestAvailableYouTubeThumbnailUrlFromLink = (link: string): Promise<string | undefined> => {
  const candidateUrls = getYouTubeThumbnailCandidateUrlsFromLink(link);
  if (!candidateUrls.length) {
    return Promise.resolve(undefined);
  }

  const cacheKey = candidateUrls.join('\n');
  const cachedPromise = youtubeThumbnailResolutionPromises.get(cacheKey);
  if (cachedPromise) {
    return cachedPromise;
  }

  const resolutionPromise = (async () => {
    for (const candidateUrl of candidateUrls) {
      if (await isAvailableYouTubeThumbnailUrl(candidateUrl)) {
        return candidateUrl;
      }
    }
    return undefined;
  })().then((thumbnailUrl) => {
    if (!thumbnailUrl) {
      youtubeThumbnailResolutionPromises.delete(cacheKey);
    }
    return thumbnailUrl;
  });

  youtubeThumbnailResolutionPromises.set(cacheKey, resolutionPromise);
  return resolutionPromise;
};

export const getHasThumbnail = memoize(
  (commentMediaInfo: CommentMediaInfo | undefined, link: string | undefined): boolean => {
    if (!link || !commentMediaInfo) return false;

    const { type, thumbnail, patternThumbnailUrl } = commentMediaInfo;

    if (type === 'image' || type === 'video' || type === 'audio' || type === 'gif' || type === 'swf') return true;
    if (type === 'webpage' && thumbnail) return true;
    if (type === 'iframe' && (patternThumbnailUrl || thumbnail)) return true;

    return false;
  },
  { max: 1000 },
);

const getPatternThumbnailUrl = (url: URL): string | undefined => {
  const youtubeThumbnailUrl = getYouTubeThumbnailUrl(url);
  if (youtubeThumbnailUrl) return youtubeThumbnailUrl;

  if (url.host.includes('streamable.com')) {
    const videoId = url.pathname.split('/')[1];
    return `https://cdn-cf-east.streamable.com/image/${videoId}.jpg`;
  }
};

// Known media file extensions - only these will be classified as media files
const KNOWN_IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'jpe', 'jfif', 'jif', 'png', 'apng', 'gif', 'webp', 'avif', 'svg', 'bmp', 'ico', 'tiff'];
const KNOWN_VIDEO_EXTENSIONS = ['mp4', 'webm', 'mov', 'avi', 'mkv', 'flv', 'wmv', 'm4v'];
const KNOWN_AUDIO_EXTENSIONS = ['mp3', 'wav', 'ogg', 'flac', 'aac', 'm4a', 'wma'];
const KNOWN_SWF_EXTENSIONS = ['swf'];
const KNOWN_MEDIA_EXTENSIONS = new Set([...KNOWN_IMAGE_EXTENSIONS, ...KNOWN_VIDEO_EXTENSIONS, ...KNOWN_AUDIO_EXTENSIONS, ...KNOWN_SWF_EXTENSIONS]);
const TWIMG_MEDIA_FORMAT_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'webp', 'gif']);

// some sites don't show thumbnails, so the backend-side thumbnail fetching needs to be  disabled, or it might fetch non-thumbnails such as emojis
const THUMBNAIL_BLACKLISTED_DOMAINS = ['twitter.com', 'x.com'];

const isThumbnailDomainBlacklisted = (link: string | undefined): boolean => {
  if (!link) {
    return false;
  }

  try {
    const hostname = new URL(link).hostname.toLowerCase();
    return THUMBNAIL_BLACKLISTED_DOMAINS.some((domain) => hostname === domain || hostname.endsWith(`.${domain}`));
  } catch (error) {
    console.error('Error parsing link while checking thumbnail blacklist:', error);
    return false;
  }
};

const parseAllowedThumbnailFetchUrl = (value: string): URL | undefined => {
  const parsedUrl = parseHttpUrl(value);
  if (!parsedUrl || parsedUrl.protocol !== 'https:' || isPrivateNetworkHostname(parsedUrl.hostname)) {
    return undefined;
  }
  return parsedUrl;
};

const getAllowedThumbnailUrl = (value: string, baseUrl: string): string | undefined => {
  try {
    const parsedUrl = new URL(value, baseUrl);
    return parsedUrl.protocol === 'https:' && !isPrivateNetworkHostname(parsedUrl.hostname) ? parsedUrl.href : undefined;
  } catch {
    return undefined;
  }
};

const getDirectMediaExtension = (url: URL): string => {
  const format = url.searchParams.get('format')?.toLowerCase() ?? '';
  if (KNOWN_MEDIA_EXTENSIONS.has(format)) {
    return format;
  }

  const pathParts = url.pathname.toLowerCase().split('.');
  return pathParts.length > 1 ? pathParts[pathParts.length - 1] : '';
};

export const getTwimgMediaFilePublishUrl = (link: string): string | undefined => {
  const url = parseHttpUrl(link.trim());
  if (!url || url.hostname.toLowerCase() !== 'pbs.twimg.com') {
    return undefined;
  }

  const pathParts = url.pathname.split('/').filter(Boolean);
  const [mediaPath, mediaId] = pathParts;
  if (pathParts.length !== 2 || mediaPath !== 'media' || !mediaId || mediaId.includes('.')) {
    return undefined;
  }

  const format = url.searchParams.get('format')?.toLowerCase();
  if (!format || !TWIMG_MEDIA_FORMAT_EXTENSIONS.has(format)) {
    return undefined;
  }

  url.protocol = 'https:';
  return `${url.origin}/media/${mediaId}.${format}`;
};

export const getLinkMediaInfo = memoize(
  (link: string): CommentMediaInfo | undefined => {
    if (!isValidURL(link)) {
      return;
    }
    const url = new URL(link);
    let patternThumbnailUrl: string | undefined;
    let type: string = 'webpage';

    if (url.pathname === '/_next/image' && url.search.startsWith('?url=')) {
      return { url: link, type: 'image' };
    }

    // Non-direct imgbb links can return lower res thumbnails on web. On native, the full image can be fetched later.
    if (url.host === 'ibb.co' && !Capacitor.isNativePlatform()) {
      const imageId = url.pathname.split('/')[1];
      return { url: link, type: 'webpage', thumbnail: `https://i.ibb.co/${imageId}/thumbnail.jpg` };
    }

    try {
      const extension = getDirectMediaExtension(url);

      // Only classify as media if we explicitly know the extension
      if (KNOWN_IMAGE_EXTENSIONS.includes(extension)) {
        type = extension === 'gif' ? 'gif' : 'image';
      } else if (KNOWN_VIDEO_EXTENSIONS.includes(extension)) {
        type = 'video';
      } else if (KNOWN_AUDIO_EXTENSIONS.includes(extension)) {
        type = 'audio';
      } else if (KNOWN_SWF_EXTENSIONS.includes(extension)) {
        type = 'swf';
      }
      // Unknown extensions remain as 'webpage'

      if (canEmbed(url) || url.host.startsWith('yt.')) {
        type = 'iframe';
        patternThumbnailUrl = getPatternThumbnailUrl(url);
      }
    } catch (e) {
      console.error(e);
    }

    return { url: link, type, patternThumbnailUrl };
  },
  { max: 1000 },
);

const fetchWebpageThumbnail = async (url: string): Promise<string | undefined> => {
  try {
    const parsedUrl = parseAllowedThumbnailFetchUrl(url);
    if (!parsedUrl) return undefined;

    let html: string;
    const MAX_HTML_SIZE = 1024 * 1024;
    const TIMEOUT = 5000;

    if (Capacitor.isNativePlatform()) {
      // in the native app, the Capacitor HTTP plugin is used to fetch the thumbnail
      const response = await CapacitorHttp.get({
        url: parsedUrl.href,
        readTimeout: TIMEOUT,
        connectTimeout: TIMEOUT,
        responseType: 'text',
        disableRedirects: true,
        headers: { Accept: 'text/html', Range: `bytes=0-${MAX_HTML_SIZE - 1}` },
      });
      html = response.data.slice(0, MAX_HTML_SIZE);
    } else {
      // some sites have CORS access, so the thumbnail can be fetched client-side when community thumbnail fetching is disabled
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), TIMEOUT);

      const response = await fetch(parsedUrl.href, {
        signal: controller.signal,
        redirect: 'manual',
        headers: { Accept: 'text/html' },
      });

      clearTimeout(timeoutId);

      if (!response.ok) throw new Error('Network response was not ok');

      const reader = response.body?.getReader();
      if (!reader) return undefined;
      let result = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done || result.length >= MAX_HTML_SIZE) break;
        result += new TextDecoder().decode(value);
      }
      html = result.slice(0, MAX_HTML_SIZE);
    }

    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    // Try to find Open Graph image
    const ogImage = doc.querySelector('meta[property="og:image"]');
    const ogImageContent = ogImage?.getAttribute('content');
    if (ogImageContent) {
      const ogImageUrl = getAllowedThumbnailUrl(ogImageContent, parsedUrl.href);
      if (ogImageUrl) return ogImageUrl;
    }

    // If no Open Graph image, try to find the first image
    const firstImage = doc.querySelector('img');
    const firstImageSrc = firstImage?.getAttribute('src');
    if (firstImageSrc) {
      return getAllowedThumbnailUrl(firstImageSrc, parsedUrl.href);
    }

    return undefined;
  } catch (error) {
    console.error('Error fetching webpage thumbnail:', error);
    return undefined;
  }
};

export const getCommentMediaInfo = (link: string, thumbnailUrl: string, linkWidth: number, linkHeight: number): CommentMediaInfo | undefined => {
  if (!thumbnailUrl && !link) {
    return;
  }
  const linkInfo = link ? getLinkMediaInfo(link) : undefined;
  if (linkInfo) {
    const safeThumbnailUrl = thumbnailUrl ? getAllowedThumbnailUrl(thumbnailUrl, linkInfo.url) : undefined;
    // Don't show thumbnails for blacklisted domains (e.g., Twitter/X) as they return non-thumbnail images like emojis
    if (isThumbnailDomainBlacklisted(link)) {
      return {
        ...linkInfo,
        thumbnail: undefined,
        patternThumbnailUrl: undefined,
        linkWidth,
        linkHeight,
      };
    }
    return {
      ...linkInfo,
      thumbnail: safeThumbnailUrl || linkInfo.thumbnail,
      linkWidth,
      linkHeight,
    };
  }
  return;
};

const EMBED_DIMENSIONS = {
  'youtube.com': '800x450',
  'youtu.be': '800x450',
  'instagram.com': '360x420',
  'reddit.com': '500x520',
  'tiktok.com': '400x780',
  'x.com': '550x580',
  'twitter.com': '550x580',
  'soundcloud.com': '700x166',
} as const;

export const getMediaDimensions = memoize(
  (commentMediaInfo: CommentMediaInfo | undefined): string => {
    if (!commentMediaInfo) return '';

    const { type, url, linkWidth, linkHeight } = commentMediaInfo;

    if (type === 'iframe' && url) {
      const embedUrl = new URL(url);
      if (canEmbed(embedUrl)) {
        const hostname = embedUrl.hostname;
        for (const [site, dimensions] of Object.entries(EMBED_DIMENSIONS)) {
          if (hostname.includes(site)) {
            return dimensions;
          }
        }
      }
    } else if (type === 'audio') {
      return '700x240';
    } else if (type === 'image' || type === 'video' || type === 'gif' || type === 'swf') {
      if (linkWidth && linkHeight) {
        return `${linkWidth}x${linkHeight}`;
      }
    }

    return '';
  },
  { max: 1000 },
);

const thumbnailUrlsDb = localForageLru.createInstance({ name: '5chanThumbnailUrls', size: 500 });

const getCachedThumbnail = async (url: string): Promise<string | null> => {
  return await thumbnailUrlsDb.getItem(url);
};

const setCachedThumbnail = async (url: string, thumbnail: string): Promise<void> => {
  await thumbnailUrlsDb.setItem(url, thumbnail);
};

export const fetchWebpageThumbnailIfNeeded = async (commentMediaInfo: CommentMediaInfo): Promise<CommentMediaInfo> => {
  if (commentMediaInfo.type === 'webpage' && !commentMediaInfo.thumbnail) {
    const cachedThumbnail = await getCachedThumbnail(commentMediaInfo.url);
    const safeCachedThumbnail = cachedThumbnail ? getAllowedThumbnailUrl(cachedThumbnail, commentMediaInfo.url) : undefined;
    if (safeCachedThumbnail) {
      return { ...commentMediaInfo, thumbnail: safeCachedThumbnail };
    }
    const thumbnail = await fetchWebpageThumbnail(commentMediaInfo.url);
    if (thumbnail) {
      await setCachedThumbnail(commentMediaInfo.url, thumbnail);
    }
    return { ...commentMediaInfo, thumbnail };
  }
  return commentMediaInfo;
};
