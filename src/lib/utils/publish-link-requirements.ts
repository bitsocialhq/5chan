import type { TFunction } from 'i18next';
import { isPublishFileMediaLink } from './media-link-validation-utils';
import { isValidPublishURL } from './url-utils';

interface PublishLinkFeatures {
  requirePostLink?: unknown;
  requirePostLinkIsMedia?: unknown;
}

export const getEffectivePublishLinkFeatures = (
  communityFeatures: PublishLinkFeatures | undefined,
  directoryFeatures: PublishLinkFeatures | undefined,
): PublishLinkFeatures | undefined => {
  const requirePostLink = communityFeatures?.requirePostLink ?? directoryFeatures?.requirePostLink;
  const requirePostLinkIsMedia = communityFeatures?.requirePostLinkIsMedia ?? directoryFeatures?.requirePostLinkIsMedia;

  if (requirePostLink === undefined && requirePostLinkIsMedia === undefined) {
    return undefined;
  }

  return {
    requirePostLink,
    requirePostLinkIsMedia,
  };
};

export const getRequirePostLink = (features: PublishLinkFeatures | undefined): boolean => Boolean(features?.requirePostLink);

export const getRequirePostLinkIsMedia = (features: PublishLinkFeatures | undefined, useMediaDefault: boolean): boolean =>
  Boolean(features?.requirePostLinkIsMedia) || (features?.requirePostLinkIsMedia === undefined && useMediaDefault);

export const getPublishLinkValidationError = ({
  link,
  requireLink,
  requireMedia,
  t,
}: {
  link: string;
  requireLink: boolean;
  requireMedia: boolean;
  t: TFunction;
}): string | null => {
  if (!link && requireLink) {
    return `${t('error')}: ${t(requireMedia ? 'post_media_link_required_alert' : 'post_link_required_alert')}`;
  }
  if (link && !isValidPublishURL(link)) {
    return `${t('error')}: ${t('invalid_url_alert')}`;
  }
  if (link && requireMedia && !isPublishFileMediaLink(link)) {
    return `${t('error')}: ${t('link_not_image_or_video_alert')}`;
  }

  return null;
};
