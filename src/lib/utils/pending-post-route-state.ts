import type { Comment } from '@bitsocial/bitsocial-react-hooks';

export const getPendingPostRouteBoardPath = (state: unknown): string | undefined => {
  if (!state || typeof state !== 'object') {
    return undefined;
  }

  const boardPath = (state as { boardPath?: unknown }).boardPath;
  return typeof boardPath === 'string' && boardPath ? boardPath : undefined;
};

export const getPendingPostRoutePost = (state: unknown): Comment | undefined => {
  if (!state || typeof state !== 'object') {
    return undefined;
  }

  const pendingPost = (state as { pendingPost?: unknown }).pendingPost;
  return pendingPost && typeof pendingPost === 'object' ? (pendingPost as Comment) : undefined;
};
