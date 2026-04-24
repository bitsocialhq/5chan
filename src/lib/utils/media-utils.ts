import localForageLru from '@bitsocial/bitsocial-react-hooks/dist/lib/localforage-lru/index.js';
import { canEmbed } from '../../components/embed';
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
    default:
      return t('webpage');
  }
};

export const getHasThumbnail = memoize(
  (commentMediaInfo: CommentMediaInfo | undefined, link: string | undefined): boolean => {
    if (!link || !commentMediaInfo) return false;

    const { type, thumbnail, patternThumbnailUrl } = commentMediaInfo;

    if (type === 'image' || type === 'video' || type === 'audio' || type === 'gif') return true;
    if (type === 'webpage' && thumbnail) return true;
    if (type === 'iframe' && (patternThumbnailUrl || thumbnail)) return true;

    return false;
  },
  { max: 1000 },
);

const getYouTubeVideoId = (url: URL): string | null => {
  if (url.host.includes('youtu.be')) {
    return url.pathname.slice(1);
  } else if (url.pathname.includes('/shorts/')) {
    return url.pathname.split('/shorts/')[1].split('/')[0];
  } else if (url.searchParams.has('v')) {
    return url.searchParams.get('v');
  }
  return null;
};

const getPatternThumbnailUrl = (url: URL): string | undefined => {
  const videoId = getYouTubeVideoId(url);
  if (videoId) {
    return `https://img.youtube.com/vi/${videoId}/0.jpg`;
  }
  if (url.host.includes('streamable.com')) {
    const videoId = url.pathname.split('/')[1];
    return `https://cdn-cf-east.streamable.com/image/${videoId}.jpg`;
  }
};

// Known media file extensions - only these will be classified as media files
const KNOWN_IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico', 'tiff'];
const KNOWN_VIDEO_EXTENSIONS = ['mp4', 'webm', 'mov', 'avi', 'mkv', 'flv', 'wmv', 'm4v'];
const KNOWN_AUDIO_EXTENSIONS = ['mp3', 'wav', 'ogg', 'flac', 'aac', 'm4a', 'wma'];

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
      // Extract file extension
      const pathParts = url.pathname.toLowerCase().split('.');
      const extension = pathParts.length > 1 ? pathParts[pathParts.length - 1] : '';

      // Only classify as media if we explicitly know the extension
      if (KNOWN_IMAGE_EXTENSIONS.includes(extension)) {
        type = extension === 'gif' ? 'gif' : 'image';
      } else if (KNOWN_VIDEO_EXTENSIONS.includes(extension)) {
        type = 'video';
      } else if (KNOWN_AUDIO_EXTENSIONS.includes(extension)) {
        type = 'audio';
      }
      // Unknown extensions remain as 'webpage'

      if (!url.pathname.includes('.')) {
        type = 'webpage';
      }

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
    } else if (type === 'image' || type === 'video' || type === 'gif') {
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
