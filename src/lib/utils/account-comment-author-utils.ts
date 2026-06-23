import type { Account } from '@bitsocial/bitsocial-react-hooks';

type CommentAuthor = {
  address?: string;
  avatar?: unknown;
  displayName?: string;
  flair?: unknown;
  shortAddress?: string;
  [key: string]: unknown;
};

type AccountCommentWithAuthor = {
  accountId?: string;
  author?: CommentAuthor;
};

export const mergeDefinedFields = <T extends object>(base: T | undefined, override: T | undefined): T | undefined => {
  if (!override) return base;

  const merged = { ...base } as Record<string, unknown>;
  for (const [key, value] of Object.entries(override)) {
    if (value !== undefined) {
      merged[key] = value;
    }
  }

  return merged as T;
};

export function restoreActiveAccountAuthor<T extends object>(accountComment: T, account: Account | undefined): T;
export function restoreActiveAccountAuthor<T extends object>(accountComment: T | undefined, account: Account | undefined): T | undefined;
export function restoreActiveAccountAuthor<T extends object>(accountComment: T | undefined, account: Account | undefined): T | undefined {
  const comment = accountComment as AccountCommentWithAuthor | undefined;

  if (!comment || comment.author?.address || !account?.id || comment.accountId !== account.id || !account.author?.address) {
    return accountComment;
  }

  const accountAuthor = {
    address: account.author.address,
    shortAddress: account.author.shortAddress,
    displayName: account.author.displayName,
    avatar: account.author.avatar,
    flair: account.author.flair,
  };

  return {
    ...accountComment,
    author: mergeDefinedFields(comment.author, accountAuthor),
  } as T;
}
