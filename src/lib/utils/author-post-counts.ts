import type { Comment } from '@bitsocial/bitsocial-react-hooks';
import { getCommentUserID } from './comment-user-id-utils';

export function getThreadPostCountsByAuthor(post: Comment | undefined, replies: Comment[] = []): Map<string, number> {
  const counts = new Map<string, number>();
  const seenCids = new Set<string>();

  for (const comment of [post, ...replies]) {
    const cid = comment?.cid;
    const userID = getCommentUserID(comment);
    if (!cid || !userID || seenCids.has(cid)) continue;

    seenCids.add(cid);
    counts.set(userID, (counts.get(userID) ?? 0) + 1);
  }

  return counts;
}
