import { describe, expect, it } from 'vitest';
import type { TFunction } from 'i18next';
import {
  getEffectivePostLinkFeatures,
  getEffectiveReplyLinkFeatures,
  getNoReplyLinks,
  getPublishLinkValidationError,
  getRequirePostLink,
  getRequirePostLinkIsMedia,
  getRequireReplyLink,
  getRequireReplyLinkIsMedia,
} from '../publish-link-requirements';

const t = ((key: string) => key) as TFunction;

describe('getEffectivePostLinkFeatures', () => {
  it('uses live community feature values before directory defaults', () => {
    expect(getEffectivePostLinkFeatures({ requirePostLink: false }, { requirePostLink: true, requirePostLinkIsMedia: true })).toEqual({
      requirePostLink: false,
      requirePostLinkIsMedia: true,
    });
  });

  it('falls back per feature when live community features are partial', () => {
    expect(getEffectivePostLinkFeatures({ requirePostLinkIsMedia: false }, { requirePostLink: true, requirePostLinkIsMedia: true })).toEqual({
      requirePostLink: true,
      requirePostLinkIsMedia: false,
    });
  });
});

describe('getEffectiveReplyLinkFeatures', () => {
  it('uses reply features separately from post features', () => {
    expect(
      getEffectiveReplyLinkFeatures(
        { requirePostLink: true, requirePostLinkIsMedia: true, requireReplyLink: false, noReplyLinks: true },
        { requireReplyLink: true, requireReplyLinkIsMedia: true, noReplyLinks: false },
      ),
    ).toEqual({
      requireReplyLink: false,
      requireReplyLinkIsMedia: true,
      noReplyLinks: true,
    });
  });
});

describe('getPublishLinkValidationError', () => {
  it('does not require an empty link when only media links are enabled', () => {
    expect(
      getPublishLinkValidationError({
        link: '',
        requireLink: false,
        requireMedia: true,
        requiredLinkAlertKey: 'post_link_required_alert',
        requiredMediaLinkAlertKey: 'post_media_link_required_alert',
        t,
      }),
    ).toBeNull();
  });

  it('requires a media link when both link and media requirements are enabled', () => {
    expect(
      getPublishLinkValidationError({
        link: '',
        requireLink: true,
        requireMedia: true,
        requiredLinkAlertKey: 'post_link_required_alert',
        requiredMediaLinkAlertKey: 'post_media_link_required_alert',
        t,
      }),
    ).toBe('error: post_media_link_required_alert');
  });

  it('rejects reply links when links are disabled', () => {
    expect(
      getPublishLinkValidationError({
        link: 'https://example.com/reply.png',
        noLinks: true,
        requireLink: false,
        requireMedia: true,
        requiredLinkAlertKey: 'reply_link_required_alert',
        requiredMediaLinkAlertKey: 'reply_media_link_required_alert',
        noLinksAlertKey: 'reply_links_not_allowed_alert',
        t,
      }),
    ).toBe('error: reply_links_not_allowed_alert');
  });
});

describe('publish link feature helpers', () => {
  it('does not treat media-only validation as a required link', () => {
    const features = getEffectivePostLinkFeatures({ requirePostLink: false, requirePostLinkIsMedia: true }, undefined);

    expect(getRequirePostLink(features)).toBe(false);
    expect(getRequirePostLinkIsMedia(features, false)).toBe(true);
  });

  it('does not treat post link requirements as reply link requirements', () => {
    const features = getEffectiveReplyLinkFeatures({ requirePostLink: true, requirePostLinkIsMedia: true }, undefined);

    expect(getRequireReplyLink(features)).toBe(false);
    expect(getRequireReplyLinkIsMedia(features, false)).toBe(false);
    expect(getNoReplyLinks(features)).toBe(false);
  });
});
