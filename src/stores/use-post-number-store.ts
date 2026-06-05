import { create } from 'zustand';
import type { Comment } from '@bitsocial/bitsocial-react-hooks';
import { normalizeBoardAddress } from '../hooks/use-directories';
import { getCommentCommunityAddress } from '../lib/utils/comment-utils';

interface PostNumberState {
  // Post numbers are only unique within a board, so scope by canonical community address.
  numberToCid: Record<string, Record<number, string>>;
  cidToNumber: Record<string, number>;
  // Thread (post) cid each comment lives under, so replies only publish same-thread quotedCids.
  cidToPostCid: Record<string, string>;
  registerComments: (comments: Comment[]) => void;
}

export const getScopedNumberToCidMap = (numberToCid: Record<string, Record<number, string>>, communityAddress?: string) => {
  if (!communityAddress) {
    return undefined;
  }

  const normalizedCommunityAddress = normalizeBoardAddress(communityAddress);
  const exactMatch = numberToCid[communityAddress];
  const matchingEntries = Object.entries(numberToCid).filter(([address]) => normalizeBoardAddress(address) === normalizedCommunityAddress);

  if (matchingEntries.length === 0) {
    return exactMatch;
  }

  if (!exactMatch && matchingEntries.length === 1) {
    return matchingEntries[0][1];
  }

  if (!exactMatch) {
    return matchingEntries.reduce<Record<number, string>>((mergedMap, [, scopedMap]) => ({ ...mergedMap, ...scopedMap }), {});
  }

  if (matchingEntries.length === 1) {
    return exactMatch;
  }

  const aliasEntries = matchingEntries.filter(([address]) => address !== communityAddress);
  return aliasEntries.reduce<Record<number, string>>((mergedMap, [, scopedMap]) => ({ ...mergedMap, ...scopedMap }), { ...exactMatch });
};

export const getCidForPostNumber = (numberToCid: Record<string, Record<number, string>>, communityAddress: string | undefined, postNumber: number) =>
  getScopedNumberToCidMap(numberToCid, communityAddress)?.[postNumber];

const usePostNumberStore = create<PostNumberState>((set) => ({
  numberToCid: {},
  cidToNumber: {},
  cidToPostCid: {},
  registerComments: (comments: Comment[]) => {
    if (!comments?.length) return;

    set((state) => {
      let nextNumberToCid = state.numberToCid;
      let nextCidToNumber = state.cidToNumber;
      let nextCidToPostCid = state.cidToPostCid;
      let hasUpdates = false;

      const ensureCloned = () => {
        if (hasUpdates) return;
        nextNumberToCid = { ...state.numberToCid };
        nextCidToNumber = { ...state.cidToNumber };
        nextCidToPostCid = { ...state.cidToPostCid };
        hasUpdates = true;
      };

      for (const c of comments) {
        const num = c?.number;
        const cid = c?.cid;
        const addr = getCommentCommunityAddress(c);
        if (typeof num !== 'number' || !cid || !addr) continue;

        const existingCid = nextNumberToCid[addr]?.[num];
        if (existingCid !== cid || nextCidToNumber[cid] !== num) {
          ensureCloned();
          if (!nextNumberToCid[addr] || nextNumberToCid[addr] === state.numberToCid[addr]) {
            nextNumberToCid[addr] = { ...nextNumberToCid[addr] };
          }
          nextNumberToCid[addr][num] = cid;
          nextCidToNumber[cid] = num;
        }

        // OPs are their own thread (no postCid); replies always carry their thread's postCid.
        const postCid = c?.postCid || cid;
        if (nextCidToPostCid[cid] !== postCid) {
          ensureCloned();
          nextCidToPostCid[cid] = postCid;
        }
      }

      if (!hasUpdates) {
        return state;
      }

      return { numberToCid: nextNumberToCid, cidToNumber: nextCidToNumber, cidToPostCid: nextCidToPostCid };
    });
  },
}));

export default usePostNumberStore;
