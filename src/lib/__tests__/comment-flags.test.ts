import { describe, expect, it } from 'vitest';
import { getCommentFlagFlairs, getAuthorFlagFlairs, getAuthorFlagViewModels, TOR_AUTHOR_FLAG_LABEL_KEY } from '../comment-flags';

describe('comment-flags', () => {
  it('parses the pkc-js challenge flair example for country flags', () => {
    const [flag] = getAuthorFlagViewModels([{ text: 'US-emoji' }], 1000);

    expect(flag).toMatchObject({
      key: 'country:us',
      type: 'country',
      code: 'us',
      spritePath: 'assets/icons/flags-1.png',
      width: 16,
      height: 11,
      x: 240,
      y: 154,
    });
  });

  it('parses namespaced country, political, and pony flag flairs', () => {
    const flags = getAuthorFlagViewModels([{ text: 'flag:country:DE' }, { text: 'flag:pol:AC' }, { text: 'flag:pony:AJ' }], 1000);

    expect(flags.map((flag) => flag.key)).toEqual(['country:de', 'pol:AC', 'pony:AJ']);
    expect(flags[1]).toMatchObject({ label: 'Anarcho-Capitalist', x: 0, y: 0 });
    expect(flags[2]).toMatchObject({ label: 'Applejack', x: 80, y: 0 });
  });

  it('labels the xx country flag as Tor traffic', () => {
    const [flag] = getAuthorFlagViewModels([{ text: 'flag:country:xx' }], 1000);

    expect(flag).toMatchObject({
      key: 'country:xx',
      label: 'This user is on Tor',
      labelKey: TOR_AUTHOR_FLAG_LABEL_KEY,
    });
  });

  it('normalizes text flag kinds before parsing', () => {
    const flags = getAuthorFlagViewModels([{ text: 'FLAG:COUNTRY:DE' }, { text: 'POL:AC' }, { text: 'flag:MLP:AJ' }], 1000);

    expect(flags.map((flag) => flag.key)).toEqual(['country:de', 'pol:AC', 'pony:AJ']);
  });

  it('parses structured flag flair fields', () => {
    const flags = getAuthorFlagViewModels(
      [
        { text: 'ignored', type: 'Country', country: 'GB' },
        { text: 'ignored', kind: 'MLP', code: 'RD' },
      ],
      1000,
    );

    expect(flags.map((flag) => flag.key)).toEqual(['country:gb', 'pony:RD']);
  });

  it('skips expired, duplicate, and unknown flags', () => {
    const flags = getAuthorFlagViewModels(
      [{ text: 'flag:country:DE', expiresAt: 999 }, { text: 'flag:country:DE' }, { text: 'DE-emoji' }, { text: 'flag:pony:NOPE' }],
      1000,
    );

    expect(flags.map((flag) => flag.key)).toEqual(['country:de']);
  });

  it('prefers trusted challenge-written author community flairs', () => {
    const flairs = getAuthorFlagFlairs({
      flairs: [{ text: 'flag:pol:AC' }],
      community: {
        flairs: [{ text: 'US-emoji' }],
      },
    });

    expect(getAuthorFlagViewModels(flairs).map((flag) => flag.key)).toEqual(['country:us']);
  });

  it('reads the signed 5chan flag assertion from the comment', () => {
    const flairs = getCommentFlagFlairs({
      '5chan': {
        country: 'VN',
        flag: {
          code: 'VN',
          text: 'flag:country:vn',
          type: 'country',
        },
      },
      flairs: [{ code: 'auto', text: 'flag:country:auto', type: 'country' }],
      author: {
        community: {
          flairs: [{ text: 'US-emoji' }],
        },
      },
    });

    expect(getAuthorFlagViewModels(flairs).map((flag) => flag.key)).toEqual(['country:vn']);
  });

  it('falls back to author or post flairs when there is no signed flag assertion', () => {
    expect(
      getAuthorFlagViewModels(
        getCommentFlagFlairs({
          author: {
            subplebbit: {
              flairs: [{ text: 'flag:country:DE' }],
            },
          },
          flairs: [{ text: 'flag:pony:AJ' }],
        }),
      ).map((flag) => flag.key),
    ).toEqual(['country:de']);

    expect(
      getAuthorFlagViewModels(
        getCommentFlagFlairs({
          flairs: [{ text: 'flag:pony:AJ' }],
        }),
      ).map((flag) => flag.key),
    ).toEqual(['pony:AJ']);
  });
});
