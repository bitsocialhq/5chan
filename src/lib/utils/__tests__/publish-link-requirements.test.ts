import { describe, expect, it } from 'vitest';
import type { TFunction } from 'i18next';
import { getEffectivePublishLinkFeatures, getPublishLinkValidationError, getRequirePostLink, getRequirePostLinkIsMedia } from '../publish-link-requirements';

const t = ((key: string) => key) as TFunction;

describe('getEffectivePublishLinkFeatures', () => {
  it('uses live community feature values before directory defaults', () => {
    expect(getEffectivePublishLinkFeatures({ requirePostLink: false }, { requirePostLink: true, requirePostLinkIsMedia: true })).toEqual({
      requirePostLink: false,
      requirePostLinkIsMedia: true,
    });
  });

  it('falls back per feature when live community features are partial', () => {
    expect(getEffectivePublishLinkFeatures({ requirePostLinkIsMedia: false }, { requirePostLink: true, requirePostLinkIsMedia: true })).toEqual({
      requirePostLink: true,
      requirePostLinkIsMedia: false,
    });
  });
});

describe('getPublishLinkValidationError', () => {
  it('does not require an empty link when only media links are enabled', () => {
    expect(getPublishLinkValidationError({ link: '', requireLink: false, requireMedia: true, t })).toBeNull();
  });

  it('requires a media link when both link and media requirements are enabled', () => {
    expect(getPublishLinkValidationError({ link: '', requireLink: true, requireMedia: true, t })).toBe('error: post_media_link_required_alert');
  });
});

describe('publish link feature helpers', () => {
  it('does not treat media-only validation as a required link', () => {
    const features = getEffectivePublishLinkFeatures({ requirePostLink: false, requirePostLinkIsMedia: true }, undefined);

    expect(getRequirePostLink(features)).toBe(false);
    expect(getRequirePostLinkIsMedia(features, false)).toBe(true);
  });
});
