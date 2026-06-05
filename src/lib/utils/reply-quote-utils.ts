import { QUOTE_NUMBER_REGEX } from './url-utils';

export const getQuotedCidsFromContent = (content: string | undefined, numberToCid: Record<number, string> | undefined) => {
  if (!content || !numberToCid) return undefined;
  const cids = new Set<string>();
  for (const match of content.matchAll(new RegExp(QUOTE_NUMBER_REGEX.source, 'g'))) {
    const num = parseInt(match[1], 10);
    const cid = numberToCid[num];
    if (cid) cids.add(cid);
  }
  return cids.size > 0 ? [...cids] : undefined;
};

// The protocol only accepts a reply whose quotedCids all live under the same post/thread
// (ERR_QUOTED_CID_NOT_UNDER_POST), so drop cross-thread quotes here. The >>number text stays
// in the content and still renders/navigates as a quotelink; only the published metadata changes.
export const filterSameThreadQuotedCids = (
  quotedCids: string[] | undefined,
  cidToPostCid: Record<string, string> | undefined,
  threadPostCid: string | undefined,
): string[] | undefined => {
  if (!quotedCids?.length || !cidToPostCid || !threadPostCid) return undefined;
  const sameThread = quotedCids.filter((cid) => cidToPostCid[cid] === threadPostCid);
  return sameThread.length > 0 ? sameThread : undefined;
};

export const mergeQuotedCids = (publishCommentOptions: Record<string, any> | undefined, quotedCids: string[] | undefined) => {
  if (!publishCommentOptions || !quotedCids?.length) return publishCommentOptions;
  const currentQuotedCids = publishCommentOptions.quotedCids ?? [];
  const mergedQuotedCids = [...new Set([...currentQuotedCids, ...quotedCids])];

  return {
    ...publishCommentOptions,
    quotedCids: mergedQuotedCids,
  };
};
