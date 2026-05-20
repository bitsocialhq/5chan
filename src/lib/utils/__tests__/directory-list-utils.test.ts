import { describe, expect, it } from 'vitest';
import { normalizeDirectoryList, sortDirectoryBoardsByRank } from '../directory-list-utils';

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
});
