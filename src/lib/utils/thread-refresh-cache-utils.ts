import type { Comment, RepliesPages } from '@bitsocial/bitsocial-react-hooks';
import { repliesPagesStore } from '../bitsocial-internals/stores';
import { localForageLru } from '../bitsocial-internals/utils';

const commentsDatabase = localForageLru.createInstance({ name: 'bitsocialReactHooks-comments' });
const repliesPagesDatabase = localForageLru.createInstance({ name: 'bitsocialReactHooks-repliesPages' });

const getReplyPageSortTypes = (comment: Comment): string[] => {
  const pageCids = comment.replies?.pageCids && typeof comment.replies.pageCids === 'object' ? comment.replies.pageCids : {};
  const pages = comment.replies?.pages && typeof comment.replies.pages === 'object' ? comment.replies.pages : {};
  return [...new Set([...Object.keys(pageCids), ...Object.keys(pages)])];
};

const getPersistedReplyPageStartCids = (comment: Comment, sortType: string): string[] => {
  const pageCids = new Set<string>();
  const firstPageCid = comment.replies?.pageCids?.[sortType];
  const preloadedNextCid = comment.replies?.pages?.[sortType]?.nextCid;

  if (typeof firstPageCid === 'string') pageCids.add(firstPageCid);
  if (typeof preloadedNextCid === 'string') pageCids.add(preloadedNextCid);

  return [...pageCids];
};

const collectReplyPageCids = (comment: Comment, repliesPages: RepliesPages): string[] => {
  const pageCids = new Set<string>();

  for (const sortType of getReplyPageSortTypes(comment)) {
    for (const startPageCid of getPersistedReplyPageStartCids(comment, sortType)) {
      let pageCid: string | undefined = startPageCid;
      while (pageCid && !pageCids.has(pageCid)) {
        pageCids.add(pageCid);
        pageCid = repliesPages[pageCid]?.nextCid;
      }
    }
  }

  return [...pageCids];
};

const removeReplyPagesFromStore = (pageCids: string[]) => {
  repliesPagesStore.setState((state) => {
    const repliesPages = { ...state.repliesPages };
    const comments = { ...state.comments };
    let changed = false;

    for (const pageCid of pageCids) {
      const page = repliesPages[pageCid];
      if (!page) continue;

      for (const comment of page.comments || []) {
        if (comment?.cid && comments[comment.cid]) {
          delete comments[comment.cid];
        }
      }

      delete repliesPages[pageCid];
      changed = true;
    }

    return changed ? { repliesPages, comments } : {};
  });
};

export const evictThreadRefreshCaches = async (comments: Array<Comment | undefined>) => {
  const commentsToRefresh = comments.filter((comment): comment is Comment => Boolean(comment?.cid));
  if (commentsToRefresh.length === 0) return;

  const commentCids = [...new Set(commentsToRefresh.map((comment) => comment.cid as string))];
  const currentReplyPages = repliesPagesStore.getState().repliesPages;
  const replyPageCids = [...new Set(commentsToRefresh.flatMap((comment) => collectReplyPageCids(comment, currentReplyPages)))];

  removeReplyPagesFromStore(replyPageCids);

  await Promise.all([
    ...commentCids.map((commentCid) => commentsDatabase.removeItem(commentCid)),
    ...replyPageCids.map((pageCid) => repliesPagesDatabase.removeItem(pageCid)),
  ]);
};
