import type { Comment } from '@bitsocial/bitsocial-react-hooks';
import { feedsStore, repliesStore, feedOptionsToFeedName, communitiesPagesStore } from '../bitsocial-internals/stores';
import type { DirectoryCommunity } from '../../hooks/use-directories';
import usePostNumberStore from '../../stores/use-post-number-store';
import type { ExternalQuoteReference, ExternalQuoteSearchStatus } from './external-quote-utils';
import { getExternalQuoteBoardAddress, getExternalQuoteBoardLabel } from './external-quote-utils';
import { getCommentCommunityAddress } from './comment-utils';
import { getBoardPath } from './route-utils';

const BOARD_FEED_SORT_TYPE = 'new';
const BOARD_SEARCH_POSTS_PER_PAGE = 25;
const THREAD_REPLIES_SORT_TYPE = 'best';
const THREAD_SEARCH_REPLIES_PER_PAGE = 25;
const WAIT_FOR_STORE_TIMEOUT_MS = 30000;
const WAIT_FOR_STORE_INTERVAL_MS = 100;

type ResolverAccount = {
  id?: string;
  [key: string]: unknown;
};

type ResolvedExternalQuoteTarget = {
  boardPath: string;
  cid: string;
  comment?: Comment;
  isUnavailable: boolean;
  route: string;
  communityAddress: string;
};

const waitFor = async <T>(callback: () => T | undefined | false, timeoutMs = WAIT_FOR_STORE_TIMEOUT_MS) => {
  const startedAt = Date.now();

  while (Date.now() - startedAt <= timeoutMs) {
    const result = callback();
    if (result) {
      return result;
    }

    await new Promise((resolve) => window.setTimeout(resolve, WAIT_FOR_STORE_INTERVAL_MS));
  }

  throw new Error('Timed out while resolving external quote');
};

const isUnavailableComment = (
  comment?: {
    commentModeration?: {
      purged?: boolean;
    };
    deleted?: boolean;
    removed?: boolean;
  } | null,
) => Boolean(comment?.deleted || comment?.removed || comment?.commentModeration?.purged);

const getBoardFeedName = (accountId: string, communityAddress: string) =>
  `external-quote-board-${accountId}-${communityAddress}-${BOARD_FEED_SORT_TYPE}-${BOARD_SEARCH_POSTS_PER_PAGE}`;

const getCachedComment = (cid?: string) => (cid ? communitiesPagesStore.getState().comments[cid] : undefined);

const findLoadedCommentByNumber = ({ number, communityAddress }: { number: number; communityAddress: string }) => {
  const comments = Object.values(communitiesPagesStore.getState().comments) as Array<Comment | undefined>;

  return comments.find((comment) => {
    const address = getCommentCommunityAddress(comment);
    return address === communityAddress && comment?.number === number && comment?.cid;
  });
};

const buildResolvedTarget = ({
  cid,
  comment,
  directories,
  communityAddress,
}: {
  cid: string;
  comment?: Comment;
  directories: DirectoryCommunity[];
  communityAddress: string;
}): ResolvedExternalQuoteTarget => {
  const boardPath = getBoardPath(communityAddress, directories);
  return {
    boardPath,
    cid,
    comment,
    isUnavailable: isUnavailableComment(comment),
    route: `/${boardPath}/thread/${cid}`,
    communityAddress,
  };
};

const registerComments = (comments: Comment[]) => {
  if (!comments.length) {
    return;
  }

  usePostNumberStore.getState().registerComments(comments);
};

const waitForBoardFeedPage = async (feedName: string, previousLength: number, expectedPageNumber: number) =>
  waitFor(() => {
    const state = feedsStore.getState();
    const feed = state.loadedFeeds[feedName] ?? [];
    const hasMore = state.feedsHaveMore[feedName];
    const pageNumber = state.feedsOptions[feedName]?.pageNumber ?? 0;

    if (pageNumber < expectedPageNumber) {
      return false;
    }

    if (feed.length > previousLength || feed.length >= expectedPageNumber * BOARD_SEARCH_POSTS_PER_PAGE || hasMore === false) {
      return { feed, hasMore };
    }

    return false;
  });

const loadBoardThreads = async ({
  account,
  number,
  onStatus,
  quoteDisplay,
  communityAddress,
  directories,
}: {
  account: ResolverAccount;
  directories: DirectoryCommunity[];
  number: number;
  onStatus?: (status: ExternalQuoteSearchStatus) => void;
  quoteDisplay: string;
  communityAddress: string;
}) => {
  const accountId = account.id;
  if (!accountId) {
    throw new Error('Missing account id while resolving external quote');
  }

  const boardLabel = getExternalQuoteBoardLabel(
    {
      kind: 'same-board',
      number,
      raw: quoteDisplay,
      communityAddress,
    },
    directories,
  );

  onStatus?.({
    phase: 'search-board',
    boardLabel,
    quoteDisplay,
  });

  const feedName = getBoardFeedName(accountId, communityAddress);
  const feedState = feedsStore.getState();
  if (!feedState.feedsOptions[feedName]) {
    await feedState.addFeedToStore(feedName, [{ address: communityAddress }], [communityAddress], BOARD_FEED_SORT_TYPE, account, false, BOARD_SEARCH_POSTS_PER_PAGE);
  }

  await waitForBoardFeedPage(feedName, 0, 1);

  while (true) {
    const state = feedsStore.getState();
    const feed = (state.loadedFeeds[feedName] ?? []) as Comment[];
    const hasMore = state.feedsHaveMore[feedName];
    const pageNumber = state.feedsOptions[feedName]?.pageNumber ?? 1;

    registerComments(feed);

    const matchingThread = feed.find((thread) => thread.number === number);
    if (matchingThread?.cid) {
      return {
        match: matchingThread,
        threads: feed,
      };
    }

    if (!hasMore) {
      return {
        match: undefined,
        threads: feed,
      };
    }

    const previousLength = feed.length;
    state.incrementFeedPageNumber(feedName);
    await waitForBoardFeedPage(feedName, previousLength, pageNumber + 1);
  }
};

const waitForRepliesPage = async (feedName: string, previousLength: number, expectedPageNumber: number) =>
  waitFor(() => {
    const state = repliesStore.getState();
    const replies = state.loadedFeeds[feedName] ?? [];
    const hasMore = state.feedsHaveMore[feedName];
    const pageNumber = state.feedsOptions[feedName]?.pageNumber ?? 0;

    if (pageNumber < expectedPageNumber) {
      return false;
    }

    if (replies.length > previousLength || replies.length >= expectedPageNumber * THREAD_SEARCH_REPLIES_PER_PAGE || hasMore === false) {
      return { hasMore, replies };
    }

    return false;
  });

const searchThreadReplies = async ({
  account,
  directories,
  number,
  onStatus,
  quoteDisplay,
  communityAddress,
  threads,
}: {
  account: ResolverAccount;
  directories: DirectoryCommunity[];
  number: number;
  onStatus?: (status: ExternalQuoteSearchStatus) => void;
  quoteDisplay: string;
  communityAddress: string;
  threads: Comment[];
}) => {
  const accountId = account.id;
  if (!accountId) {
    throw new Error('Missing account id while resolving external quote');
  }

  const boardLabel = getExternalQuoteBoardLabel(
    {
      kind: 'same-board',
      number,
      raw: quoteDisplay,
      communityAddress,
    },
    directories,
  );

  const candidateThreads = threads.filter((thread) => thread?.cid && thread.replyCount !== 0);

  for (const [index, thread] of candidateThreads.entries()) {
    onStatus?.({
      phase: 'search-thread',
      boardLabel,
      currentThread: index + 1,
      quoteDisplay,
      totalThreads: candidateThreads.length,
    });

    const feedOptions = {
      accountId,
      commentCid: thread.cid,
      commentDepth: thread.depth,
      flat: true,
      postCid: thread.postCid ?? thread.cid,
      repliesPerPage: THREAD_SEARCH_REPLIES_PER_PAGE,
      sortType: THREAD_REPLIES_SORT_TYPE,
      streamPage: true,
    };
    const feedName = feedOptionsToFeedName(feedOptions);
    await repliesStore.getState().addFeedToStoreOrUpdateComment(thread, feedOptions);
    await waitForRepliesPage(feedName, 0, 1);

    while (true) {
      const state = repliesStore.getState();
      const replies = (state.loadedFeeds[feedName] ?? []) as Comment[];
      const hasMore = state.feedsHaveMore[feedName];
      const pageNumber = state.feedsOptions[feedName]?.pageNumber ?? 1;

      registerComments(replies);

      const matchingReply = replies.find((reply) => reply.number === number);
      if (matchingReply?.cid) {
        return matchingReply;
      }

      if (!hasMore) {
        break;
      }

      const previousLength = replies.length;
      state.incrementFeedPageNumber(feedName);
      await waitForRepliesPage(feedName, previousLength, pageNumber + 1);
    }
  }

  return undefined;
};

export const resolveExternalQuoteTarget = async ({
  account,
  directories,
  onStatus,
  reference,
}: {
  account?: ResolverAccount | null;
  directories: DirectoryCommunity[];
  onStatus?: (status: ExternalQuoteSearchStatus) => void;
  reference: ExternalQuoteReference;
}): Promise<ResolvedExternalQuoteTarget | null> => {
  if (!account?.id) {
    throw new Error('Missing active account while resolving external quote');
  }

  const targetCommunityAddress = getExternalQuoteBoardAddress(reference, directories);
  const quoteDisplay = reference.raw;
  const cachedCid = usePostNumberStore.getState().numberToCid[targetCommunityAddress]?.[reference.number];
  if (cachedCid) {
    return buildResolvedTarget({
      cid: cachedCid,
      comment: getCachedComment(cachedCid),
      directories,
      communityAddress: targetCommunityAddress,
    });
  }

  const loadedComment = findLoadedCommentByNumber({
    number: reference.number,
    communityAddress: targetCommunityAddress,
  });
  if (loadedComment?.cid) {
    registerComments([loadedComment]);
    return buildResolvedTarget({
      cid: loadedComment.cid,
      comment: loadedComment,
      directories,
      communityAddress: targetCommunityAddress,
    });
  }

  const { match: matchingThread, threads } = await loadBoardThreads({
    account,
    directories,
    number: reference.number,
    onStatus,
    quoteDisplay,
    communityAddress: targetCommunityAddress,
  });

  if (matchingThread?.cid) {
    registerComments([matchingThread]);
    return buildResolvedTarget({
      cid: matchingThread.cid,
      comment: matchingThread,
      directories,
      communityAddress: targetCommunityAddress,
    });
  }

  const matchingReply = await searchThreadReplies({
    account,
    directories,
    number: reference.number,
    onStatus,
    quoteDisplay,
    communityAddress: targetCommunityAddress,
    threads,
  });

  if (!matchingReply?.cid) {
    return null;
  }

  registerComments([matchingReply]);
  return buildResolvedTarget({
    cid: matchingReply.cid,
    comment: matchingReply,
    directories,
    communityAddress: targetCommunityAddress,
  });
};
