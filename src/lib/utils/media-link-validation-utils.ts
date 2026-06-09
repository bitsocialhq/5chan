import { Comment } from '@bitsocial/bitsocial-react-hooks';
import { getExpiringMediaLinkHostname, getPublishURLFilename } from './url-utils';
import { getLinkMediaInfo, getTwimgMediaFilePublishUrl } from './media-utils';

type TranslateFn = (key: string, options?: Record<string, unknown>) => string;

const PUBLISH_FILE_MEDIA_TYPES = new Set(['gif', 'image', 'video']);

export const getExpiringMediaLinkAlert = (url: string, t: TranslateFn): string | null => {
  const expiringMediaLinkHostname = getExpiringMediaLinkHostname(url);
  return expiringMediaLinkHostname ? `${t('error')}: ${t('expiring_media_link_alert', { domain: expiringMediaLinkHostname })}` : null;
};

export const isPublishFileMediaType = (type: string | undefined): boolean => Boolean(type && PUBLISH_FILE_MEDIA_TYPES.has(type));

export const isPublishFileMediaLink = (link: string): boolean => isPublishFileMediaType(getLinkMediaInfo(link)?.type);

export const getPublishFileDisplayName = (url: string, uploadedFileName: string | null | undefined, requireFile: boolean): string | null => {
  if (!url) {
    return uploadedFileName || null;
  }
  if (requireFile && !isPublishFileMediaLink(url)) {
    return null;
  }
  return getPublishURLFilename(url) || uploadedFileName || null;
};

// Build the published comment's `link`, normalizing pbs.twimg.com `?format=` media URLs to their
// direct `.jpg`/`.png` form. `includeCurrentLink` carries through a link that another conversion
// (e.g. the YouTube thumbnail conversion) has already written into the field. Shared by the inline
// post form and the reply modal so the two publish paths cannot drift apart.
export const getPublishLinkOptions = (link: string, includeCurrentLink: boolean): Partial<Pick<Comment, 'link'>> => {
  const twimgPublishUrl = getTwimgMediaFilePublishUrl(link);
  if (twimgPublishUrl) {
    return { link: twimgPublishUrl };
  }

  return includeCurrentLink && link ? { link } : {};
};
