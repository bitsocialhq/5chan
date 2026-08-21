import type { ContestTally } from '@bitsocial/pubsub-voting';
import { type DirectoryListBoard, sortByDirectoryRank, sortDirectoryBoardsByRank } from './utils/directory-list-utils';

export interface RankedDirectoryVoteBoard {
  board: DirectoryListBoard;
  chainVerified?: boolean;
  nameResolved?: boolean;
  weight?: bigint;
}

/** Rank only allowlisted directory boards; a tally row is identified by its public key. */
export const rankDirectoryBoardsByVoteTally = (boards: DirectoryListBoard[], tally: ContestTally | undefined): RankedDirectoryVoteBoard[] => {
  if (!tally) return sortDirectoryBoardsByRank(boards).map((board) => ({ board }));

  const fallbackOrder = sortByDirectoryRank(boards, (board) => ({ id: board.address, owner: board.owner, addedAt: board.addedAt }));
  const fallbackIndex = new Map(fallbackOrder.map((board, index) => [board, index]));
  const tallyByPublicKey = new Map(tally.ranking.map((row) => [row.community.publicKey, row]));

  return boards
    .map<RankedDirectoryVoteBoard>((board) => {
      const row = board.publicKey ? tallyByPublicKey.get(board.publicKey) : undefined;
      return row ? { board, weight: row.weight, chainVerified: row.chainVerified, nameResolved: row.nameResolved } : { board, weight: BigInt(0), chainVerified: true };
    })
    .sort((first, second) => {
      if (first.weight! !== second.weight!) return first.weight! > second.weight! ? -1 : 1;
      return fallbackIndex.get(first.board)! - fallbackIndex.get(second.board)!;
    });
};
