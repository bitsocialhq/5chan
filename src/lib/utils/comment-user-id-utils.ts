import type { Comment } from '@bitsocial/bitsocial-react-hooks';

// The published comment's author.shortAddress is the pseudonymous per-post User ID.
// author.address can carry the local account identity (overlaid so author edit/delete
// controls keep working), so it must never be used for display.
export function getCommentUserID(comment: Comment | undefined): string {
  return comment?.author?.shortAddress || '';
}

// After local account data (account comment, pending edit) is overlaid on a published
// comment, mirror the published comment's User ID back onto the result so the account
// identity is never displayed.
export function preservePublishedUserID<T extends Comment | undefined>(comment: T, published: Comment | undefined): T {
  if (!comment || !published || comment === published) return comment;

  const publishedShortAddress = published.author?.shortAddress;
  if (comment.author?.shortAddress === publishedShortAddress) return comment;

  const author = { ...comment.author };
  if (publishedShortAddress) {
    author.shortAddress = publishedShortAddress;
  } else {
    delete author.shortAddress;
  }

  return {
    ...comment,
    author,
  } as T;
}
