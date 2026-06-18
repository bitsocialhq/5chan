type PostLoadingStateComment = {
  state?: string;
  timestamp?: number;
  updatedAt?: number;
};

export const shouldSuppressPostLoadingState = (post: PostLoadingStateComment | undefined): boolean =>
  Boolean(post?.timestamp && (!post.updatedAt || post.state === 'initializing'));
