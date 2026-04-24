type CommentWithCommunityAddress = {
  communityAddress?: string;
  replies?: {
    pages?: Record<
      string,
      | {
          comments?: unknown[];
        }
      | undefined
    >;
  };
};

export const getCommentCommunityAddress = (comment?: unknown) => {
  if (!comment || typeof comment !== 'object') {
    return undefined;
  }

  const record = comment as { communityAddress?: unknown };
  if (typeof record.communityAddress === 'string' && record.communityAddress) {
    return record.communityAddress;
  }

  return undefined;
};

const withResolvedReplyPages = <T>(replies: T): T => {
  const replyCollection = replies as CommentWithCommunityAddress['replies'];
  if (!replyCollection?.pages) {
    return replies;
  }

  let nextPages = replyCollection.pages;
  let pagesChanged = false;

  for (const [sortType, page] of Object.entries(replyCollection.pages)) {
    if (!page?.comments?.length) {
      continue;
    }

    let nextComments = page.comments;
    let commentsChanged = false;

    page.comments.forEach((reply, index) => {
      const normalizedReply = withResolvedCommentCommunityAddress(reply);
      if (normalizedReply === reply) {
        return;
      }

      if (!commentsChanged) {
        nextComments = [...(page.comments ?? [])];
        commentsChanged = true;
      }
      nextComments[index] = normalizedReply;
    });

    if (!commentsChanged) {
      continue;
    }

    if (!pagesChanged) {
      nextPages = { ...replyCollection.pages };
      pagesChanged = true;
    }

    nextPages[sortType] = {
      ...page,
      comments: nextComments,
    };
  }

  if (!pagesChanged) {
    return replies;
  }

  return {
    ...replyCollection,
    pages: nextPages,
  } as T;
};

export const withResolvedCommentCommunityAddress = <T>(comment: T): T => {
  if (!comment || typeof comment !== 'object') {
    return comment;
  }

  const commentRecord = comment as CommentWithCommunityAddress;
  const communityAddress = getCommentCommunityAddress(commentRecord);
  const replies = withResolvedReplyPages(commentRecord.replies);
  const needsResolvedCommunityAddress = !!communityAddress && commentRecord.communityAddress !== communityAddress;

  if (!needsResolvedCommunityAddress && replies === commentRecord.replies) {
    return comment;
  }

  return {
    ...commentRecord,
    ...(needsResolvedCommunityAddress ? { communityAddress } : {}),
    ...(replies !== commentRecord.replies ? { replies } : {}),
  } as T;
};
