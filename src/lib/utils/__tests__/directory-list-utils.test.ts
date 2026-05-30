import { describe, expect, it } from 'vitest';
import { normalizeDirectoryList, sortDirectoryBoardsByRank, sortDirectoryLists } from '../directory-list-utils';

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
