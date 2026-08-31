import { describe, expect, it } from 'vitest';
import {
  deriveCommunityNsfw,
  directoryListToCommunity,
  normalizeDirectoryList,
  sortDirectoryBoardsByRank,
  sortDirectoryLists,
  type DirectoryCommunity,
} from '../directory-list-utils';
import { vendoredDirectoryLists } from '../../../data/vendored-directory-lists';

describe('directory-list-utils', () => {
  it('preserves board scores and uses them for ranking', () => {
    const list = normalizeDirectoryList(
      {
        directoryCode: 'biz',
        boards: [
          { address: 'lower-score.bso', score: 1, addedAt: 1 },
          { address: 'higher-score.bso', score: 10, addedAt: 2 },
        ],
      },
      'biz',
    );

    expect(list?.boards).toEqual([
      { address: 'lower-score.bso', score: 1, addedAt: 1 },
      { address: 'higher-score.bso', score: 10, addedAt: 2 },
    ]);
    expect(sortDirectoryBoardsByRank(list?.boards ?? [])[0]?.address).toBe('higher-score.bso');
  });

  it('orders the Flash directory with the classic board set', () => {
    expect(
      sortDirectoryLists([
        { directoryCode: 'co', boards: [{ address: 'comics.bso' }] },
        { directoryCode: 'f', boards: [{ address: 'flash-posting.bso' }] },
        { directoryCode: 'a', boards: [{ address: 'anime.bso' }] },
      ]).map((list) => list.directoryCode),
    ).toEqual(['a', 'f', 'co']);
  });

  it('preserves rules from the directory list', () => {
    const list = normalizeDirectoryList(
      {
        directoryCode: 'f',
        rules: ['Tag uploaded files.'],
        boards: [{ address: 'flash-posting.bso' }],
      },
      'f',
      {
        directories: {
          f: {
            directoryCode: 'f',
            title: '/f/ - Flash',
            rules: ['Ignored because defaults rules are not vendored.'],
          },
        },
      },
    );

    expect(list?.rules).toEqual(['Tag uploaded files.']);
  });
});

describe('deriveCommunityNsfw', () => {
  it('inverts the protocol safeForWork setting exactly once', () => {
    expect(deriveCommunityNsfw({ features: { safeForWork: false } })).toBe(true);
    expect(deriveCommunityNsfw({ features: { safeForWork: true } })).toBe(false);
  });

  it('falls back to the directory verdict for communities that have not resolved', () => {
    expect(deriveCommunityNsfw(undefined, { nsfw: true })).toBe(true);
    expect(deriveCommunityNsfw(undefined, { nsfw: false })).toBe(false);
    expect(deriveCommunityNsfw({}, { nsfw: true })).toBe(true);
    expect(deriveCommunityNsfw({ features: {} }, { nsfw: false })).toBe(false);
  });

  it('lets the live community promote a board the directory left SFW or undeclared', () => {
    expect(deriveCommunityNsfw({ features: { safeForWork: false } }, { nsfw: false })).toBe(true);
    expect(deriveCommunityNsfw({ features: { safeForWork: false } }, undefined)).toBe(true);
    expect(deriveCommunityNsfw({ features: { safeForWork: false } }, {})).toBe(true);
  });

  it('never lets the live community demote a directory-declared NSFW board', () => {
    expect(deriveCommunityNsfw({ features: { safeForWork: true } }, { nsfw: true })).toBe(true);
    expect(deriveCommunityNsfw({ features: {} }, { nsfw: true })).toBe(true);
    expect(deriveCommunityNsfw(undefined, { nsfw: true })).toBe(true);
    expect(deriveCommunityNsfw(null, { nsfw: true })).toBe(true);
  });

  it('returns undefined when nothing declares the setting', () => {
    expect(deriveCommunityNsfw()).toBeUndefined();
    expect(deriveCommunityNsfw({}, {})).toBeUndefined();
    expect(deriveCommunityNsfw({ features: {} }, {})).toBeUndefined();
    expect(deriveCommunityNsfw({ features: null }, undefined)).toBeUndefined();
  });

  it('treats non-boolean safeForWork values as undeclared rather than true', () => {
    for (const safeForWork of ['true', 'false', null, 0, 1, {}, []] as unknown[]) {
      expect(deriveCommunityNsfw({ features: { safeForWork } })).toBeUndefined();
      expect(deriveCommunityNsfw({ features: { safeForWork } }, { nsfw: true })).toBe(true);
      expect(deriveCommunityNsfw({ features: { safeForWork } }, { nsfw: false })).toBe(false);
    }
  });

  it('treats non-boolean directory nsfw values as undeclared rather than true', () => {
    for (const nsfw of ['true', null, 0, 1, {}] as unknown[]) {
      expect(deriveCommunityNsfw(undefined, { nsfw })).toBeUndefined();
    }
  });
});

/**
 * The directory codes 5chan.app treats as NSFW today, from `bitsocialnet/lists`. Pinning them
 * keeps a change to the derivation or the vendored data from silently un-NSFW-ing a board.
 * `/r/` is in the upstream lists but is not vendored yet, so the assertion is scoped to the codes
 * this build actually ships.
 */
const NSFW_DIRECTORY_CODES = ['b', 'bant', 'f', 'gif', 'i', 'pol', 'r', 'r9k', 's5s', 'soc', 't', 'wg'] as const;

describe('shipped directory NSFW verdicts', () => {
  const shippedCommunities = vendoredDirectoryLists.directories.map(directoryListToCommunity).filter((community): community is DirectoryCommunity => community !== null);
  const shippedCodes = new Set(shippedCommunities.map((community) => community.directoryCode));

  it('marks exactly the known NSFW directory codes as NSFW', () => {
    const derivedNsfwCodes = shippedCommunities
      .filter((community) => deriveCommunityNsfw(undefined, community) === true)
      .map((community) => community.directoryCode)
      .sort();

    expect(derivedNsfwCodes).toEqual(NSFW_DIRECTORY_CODES.filter((code) => shippedCodes.has(code)));
    expect(derivedNsfwCodes.length).toBeGreaterThanOrEqual(11);
  });

  it('keeps /b/ and /pol/ NSFW even when a live community claims to be safe for work', () => {
    for (const code of ['b', 'pol'] as const) {
      const community = shippedCommunities.find((entry) => entry.directoryCode === code);
      expect(community, `/${code}/ is missing from the shipped directories`).toBeDefined();
      expect(deriveCommunityNsfw(undefined, community)).toBe(true);
      expect(deriveCommunityNsfw({ features: { safeForWork: true } }, community)).toBe(true);
    }
  });
});
