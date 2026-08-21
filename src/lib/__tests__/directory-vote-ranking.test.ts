import { describe, expect, it } from 'vitest';
import type { ContestTally } from '@bitsocial/pubsub-voting';
import { rankDirectoryBoardsByVoteTally } from '../directory-vote-ranking';

const boards = [
  { address: 'manual-winner.bso', publicKey: '12D3KooWManual', score: 100, addedAt: 2 },
  { address: 'vote-winner.bso', publicKey: '12D3KooWVote', score: 1, addedAt: 1 },
  { address: 'no-votes.bso', publicKey: '12D3KooWNone', score: 50, addedAt: 3 },
];

describe('rankDirectoryBoardsByVoteTally', () => {
  it('keeps static list ranking while no live tally is available', () => {
    const ranked = rankDirectoryBoardsByVoteTally(boards, undefined);

    expect(ranked.map(({ board }) => board.address)).toEqual(['manual-winner.bso', 'no-votes.bso', 'vote-winner.bso']);
    expect(ranked.every(({ weight }) => weight === undefined)).toBe(true);
  });

  it('matches by public key and makes bigint vote weight authoritative', () => {
    const tally: ContestTally = {
      contestId: '5chan-dir-a-vote-test-1',
      ranking: [
        { community: { name: 'untrusted-alias.bso', publicKey: '12D3KooWVote' }, weight: BigInt(9), chainVerified: false, nameResolved: false },
        { community: { name: 'not-allowlisted.bso', publicKey: '12D3KooWOther' }, weight: BigInt(99), chainVerified: true, nameResolved: true },
        { community: { name: 'manual-winner.bso', publicKey: '12D3KooWManual' }, weight: BigInt(2), chainVerified: true, nameResolved: true },
      ],
    };

    const ranked = rankDirectoryBoardsByVoteTally(boards, tally);

    expect(ranked.map(({ board, weight }) => [board.address, weight?.toString()])).toEqual([
      ['vote-winner.bso', '9'],
      ['manual-winner.bso', '2'],
      ['no-votes.bso', '0'],
    ]);
    expect(ranked[0]).toMatchObject({ chainVerified: false, nameResolved: false });
    expect(ranked[2]).toMatchObject({ chainVerified: true, weight: BigInt(0) });
  });

  it('uses the static non-score tie breakers when live weights match', () => {
    const tally: ContestTally = {
      contestId: '5chan-dir-a-vote-test-1',
      ranking: boards.map((board) => ({ community: { publicKey: board.publicKey }, weight: BigInt(1), chainVerified: true })),
    };

    expect(rankDirectoryBoardsByVoteTally(boards, tally).map(({ board }) => board.address)).toEqual(['vote-winner.bso', 'manual-winner.bso', 'no-votes.bso']);
  });
});
