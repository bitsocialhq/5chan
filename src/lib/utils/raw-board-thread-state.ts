import type { Comment, CommunitiesPages, Community } from '@bitsocial/bitsocial-react-hooks';
import { getCommunityFirstPageCid, getCommunityPages } from '@bitsocial/bitsocial-react-hooks/dist/stores/communities-pages';

export type RawBoardThreadState = {
  isFullyLoaded: boolean;
  rootThreadCids: Set<string>;
};

const EMPTY_RAW_BOARD_THREAD_STATE: RawBoardThreadState = {
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

export const getRawBoardThreadState = ({
  accountId,
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

  const firstPageCid = getCommunityFirstPageCid(community, sortType, 'posts');
  const pages = firstPageCid ? getCommunityPages(community, sortType, communitiesPages, 'posts', accountId) : [];
  for (const page of pages) {
    addRootThreadCids(rootThreadCids, page?.comments);
  }

  if (pages.length > 0) {
    return {
      isFullyLoaded: !pages[pages.length - 1]?.nextCid,
      rootThreadCids,
    };
  }

  const hasPageCid = Boolean(community.posts?.pageCids?.[sortType]);
  const preloadedPages = (preloadedSortPage ? [preloadedSortPage] : []) as Array<{ comments?: Comment[]; nextCid?: string }>;
  const hasCompletePreloadedPage = !hasPageCid && preloadedPages.some((page) => Array.isArray(page?.comments)) && preloadedPages.every((page) => !page?.nextCid);

  if (hasCompletePreloadedPage) {
    for (const page of preloadedPages) {
      addRootThreadCids(rootThreadCids, page?.comments);
    }
  }

  return {
    isFullyLoaded: hasCompletePreloadedPage,
    rootThreadCids,
  };
};
