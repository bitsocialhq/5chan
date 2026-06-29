import type { TFunction } from 'i18next';
import { isPublishFileMediaLink } from './media-link-validation-utils';
import { isValidPublishURL } from './url-utils';

interface PublishLinkFeatures {
  requirePostLink?: unknown;
  requirePostLinkIsMedia?: unknown;
  requireReplyLink?: unknown;
  requireReplyLinkIsMedia?: unknown;
  noReplyLinks?: unknown;
}

interface EffectivePostLinkFeatures {
  requirePostLink?: unknown;
  requirePostLinkIsMedia?: unknown;
}

interface EffectiveReplyLinkFeatures {
  requireReplyLink?: unknown;
  requireReplyLinkIsMedia?: unknown;
  noReplyLinks?: unknown;
}

export const getEffectivePostLinkFeatures = (
  communityFeatures: PublishLinkFeatures | undefined,
  directoryFeatures: PublishLinkFeatures | undefined,
): EffectivePostLinkFeatures | undefined => {
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

export const getEffectiveReplyLinkFeatures = (
  communityFeatures: PublishLinkFeatures | undefined,
  directoryFeatures: PublishLinkFeatures | undefined,
): EffectiveReplyLinkFeatures | undefined => {
  const requireReplyLink = communityFeatures?.requireReplyLink ?? directoryFeatures?.requireReplyLink;
  const requireReplyLinkIsMedia = communityFeatures?.requireReplyLinkIsMedia ?? directoryFeatures?.requireReplyLinkIsMedia;
  const noReplyLinks = communityFeatures?.noReplyLinks ?? directoryFeatures?.noReplyLinks;

  if (requireReplyLink === undefined && requireReplyLinkIsMedia === undefined && noReplyLinks === undefined) {
    return undefined;
  }

  return {
    requireReplyLink,
    requireReplyLinkIsMedia,
    noReplyLinks,
  };
};

export const getRequirePostLink = (features: EffectivePostLinkFeatures | undefined): boolean => Boolean(features?.requirePostLink);

export const getRequirePostLinkIsMedia = (features: EffectivePostLinkFeatures | undefined, useMediaDefault: boolean): boolean =>
  Boolean(features?.requirePostLinkIsMedia) || (features?.requirePostLinkIsMedia === undefined && useMediaDefault);

export const getRequireReplyLink = (features: EffectiveReplyLinkFeatures | undefined): boolean => Boolean(features?.requireReplyLink);

export const getRequireReplyLinkIsMedia = (features: EffectiveReplyLinkFeatures | undefined, useMediaDefault: boolean): boolean =>
  Boolean(features?.requireReplyLinkIsMedia) || (features?.requireReplyLinkIsMedia === undefined && useMediaDefault);

export const getNoReplyLinks = (features: EffectiveReplyLinkFeatures | undefined): boolean => Boolean(features?.noReplyLinks);

export const getPublishLinkValidationError = ({
  link,
  noLinks = false,
  requireLink,
  requireMedia,
  requiredLinkAlertKey,
  requiredMediaLinkAlertKey,
  noLinksAlertKey,
  t,
}: {
  link: string;
  noLinks?: boolean;
  requireLink: boolean;
  requireMedia: boolean;
  requiredLinkAlertKey: string;
  requiredMediaLinkAlertKey: string;
  noLinksAlertKey?: string;
  t: TFunction;
}): string | null => {
  if (link && noLinks && noLinksAlertKey) {
    return `${t('error')}: ${t(noLinksAlertKey)}`;
  }
  if (!link && requireLink) {
    return `${t('error')}: ${t(requireMedia ? requiredMediaLinkAlertKey : requiredLinkAlertKey)}`;
  }
  if (link && !isValidPublishURL(link)) {
    return `${t('error')}: ${t('invalid_url_alert')}`;
  }
  if (link && requireMedia && !isPublishFileMediaLink(link)) {
    return `${t('error')}: ${t('link_not_image_or_video_alert')}`;
  }

  return null;
};
