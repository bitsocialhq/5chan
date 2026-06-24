export const normalizeAccountCommentIndex = (commentIndex: number | string | null | undefined): number | undefined => {
  if (commentIndex === undefined || commentIndex === null || commentIndex === '') {
    return undefined;
  }

  const normalizedCommentIndex = Number(commentIndex);
  return Number.isInteger(normalizedCommentIndex) && normalizedCommentIndex >= 0 ? normalizedCommentIndex : undefined;
};
