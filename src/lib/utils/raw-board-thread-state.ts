import type { Comment, CommunitiesPages, Community, CommunityPage } from '@bitsocial/bitsocial-react-hooks';

export type RawBoardThreadState = {
  hasExplicitEmptyPageCids: boolean;
  isFullyLoaded: boolean;
  rootThreadCids: Set<string>;
};

const EMPTY_RAW_BOARD_THREAD_STATE: RawBoardThreadState = {
  hasExplicitEmptyPageCids: false,
  isFullyLoaded: false,
  rootThreadCids: new Set<string>(),
};

const addRootThreadCids = (cids: Set<string>, comments: readonly Comment[] | undefined) => {
  for (const comment of comments || []) {
    if (comment?.cid && !comment.parentCid) {
      cids.add(comment.cid);
    }
  }
};

const getPostsFirstPageCid = (community: Community, sortType: 'active' | 'new') => {
  const preloadedPage = community.posts?.pages?.[sortType];
  if (preloadedPage?.comments) {
    return preloadedPage.nextCid;
  }

  return community.posts?.pageCids?.[sortType];
};

const getPostsPages = (community: Community, sortType: 'active' | 'new', communitiesPages: CommunitiesPages): CommunityPage[] => {
  const pages: CommunityPage[] = [];
  const firstPageCid = getPostsFirstPageCid(community, sortType);

  if (!firstPageCid) {
    return pages;
  }

  const firstPage = communitiesPages[firstPageCid];
  if (!firstPage) {
    return pages;
  }

  pages.push(firstPage);

  while (true) {
    const nextCid = pages[pages.length - 1]?.nextCid;
    const nextPage = nextCid && communitiesPages[nextCid];

    if (!nextPage) {
      return pages;
    }

    pages.push(nextPage);
  }
};

export const getRawBoardThreadState = ({
  communitiesPages,
  community,
  sortType,
}: {
  accountId: string | undefined;
  communitiesPages: CommunitiesPages;
  community: Community | undefined;
  sortType: 'active' | 'new';
}): RawBoardThreadState => {
  if (!community) {
    return EMPTY_RAW_BOARD_THREAD_STATE;
  }

  const rootThreadCids = new Set<string>();
  const preloadedSortPage = community.posts?.pages?.[sortType];
  addRootThreadCids(rootThreadCids, preloadedSortPage?.comments);

  const firstPageCid = getPostsFirstPageCid(community, sortType);
  const pages = firstPageCid ? getPostsPages(community, sortType, communitiesPages) : [];
  for (const page of pages) {
    addRootThreadCids(rootThreadCids, page?.comments);
  }

  if (pages.length > 0) {
    return {
      hasExplicitEmptyPageCids: false,
      isFullyLoaded: !pages[pages.length - 1]?.nextCid,
      rootThreadCids,
    };
  }

  const hasFetchedCommunityUpdate = typeof community.updatedAt === 'number' || typeof community.updateCid === 'string';
  const hasPageCid = Boolean(community.posts?.pageCids?.[sortType]);
  const hasExplicitEmptyPageCids = hasFetchedCommunityUpdate && Boolean(community.posts?.pageCids && !hasPageCid);
  const preloadedPages = (preloadedSortPage ? [preloadedSortPage] : []) as Array<{ comments?: Comment[]; nextCid?: string }>;
  const hasCompletePreloadedChain = !hasPageCid && preloadedPages.some((page) => Array.isArray(page?.comments)) && preloadedPages.every((page) => !page?.nextCid);

  if (hasCompletePreloadedChain) {
    for (const page of preloadedPages) {
      addRootThreadCids(rootThreadCids, page?.comments);
    }
  }

  const hasCompletePreloadedPage = hasCompletePreloadedChain && (rootThreadCids.size > 0 || hasFetchedCommunityUpdate);

  return {
    hasExplicitEmptyPageCids,
    isFullyLoaded: hasCompletePreloadedPage || hasExplicitEmptyPageCids,
    rootThreadCids,
  };
};
