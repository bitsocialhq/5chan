import { getExpiringMediaLinkHostname, getPublishURLFilename } from './url-utils';
import { getLinkMediaInfo } from './media-utils';

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
