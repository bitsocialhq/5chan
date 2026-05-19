import { beforeEach, describe, expect, it } from 'vitest';
import {
  areSameBoardAddress,
  extractDirectoryFromTitle,
  getBoardPath,
  getFeedCacheKey,
  getFeedType,
  getPageFromFeedPath,
  getCommunityAddress,
  isArchiveRoute,
  isBoardModRoute,
  isDirectoryBoard,
  isDirectoryListRoute,
  isDirectoryRoute,
  isFeedRoute,
  isLegacyBoardModQueueRoute,
  isModQueueRoute,
  isPendingPostRoute,
  isPostRoute,
  isValidBoardModRoute,
  isValidModRoute,
  normalizeMultiboardFeedPath,
  stripPageFromFeedPath,
} from '../route-utils';
import { clearStableLastVisitTimeFilterName, LAST_VISIT_STORAGE_KEY, touchLastVisitTimestamp } from '../time-filter-utils';

const communities = [
  { address: 'business.eth', title: '/biz/ - Business & Finance' },
  {
    address: 'music-posting.bso',
    name: 'music-posting.bso',
    publicKey: '12D3KooWQdQ6TkVA1Xe9zzaFP6vXBgsLeMAewpLpLwbsAYKivnQy',
    title: '/mu/ - Music',
  },
  { address: 'random.eth', directoryCode: 'b', title: 'Random' },
];

beforeEach(() => {
  clearStableLastVisitTimeFilterName();
  localStorage.setItem(LAST_VISIT_STORAGE_KEY, String(Date.now()));
});

describe('directory mapping helpers', () => {
  it('extracts short codes from titled directories', () => {
    expect(extractDirectoryFromTitle('/biz/ - Business & Finance')).toBe('biz');
    expect(extractDirectoryFromTitle('Business & Finance')).toBeNull();
  });

  it('maps addresses to canonical board paths and back', () => {
    expect(getBoardPath('business.eth', communities)).toBe('biz');
    expect(getBoardPath('music-posting.eth', communities)).toBe('mu');
    expect(getBoardPath('12D3KooWQdQ6TkVA1Xe9zzaFP6vXBgsLeMAewpLpLwbsAYKivnQy', communities)).toBe('mu');
    expect(getBoardPath('unknown.example', communities)).toBe('unknown.example');

    expect(getCommunityAddress('biz', communities)).toBe('business.eth');
    expect(getCommunityAddress('b', communities)).toBe('random.eth');
    expect(getCommunityAddress('unknown.example', communities)).toBe('unknown.example');
  });

  it('compares aliases and directory identifiers correctly', () => {
    expect(areSameBoardAddress('music-posting.eth', 'music-posting.bso')).toBe(true);
    expect(areSameBoardAddress('music-posting.eth', 'business.eth')).toBe(false);
    expect(areSameBoardAddress(undefined, 'business.eth')).toBe(false);

    expect(isDirectoryRoute('biz', communities)).toBe(true);
    expect(isDirectoryRoute('business.eth', communities)).toBe(false);
    expect(isDirectoryBoard('biz', communities)).toBe(true);
    expect(isDirectoryBoard('business.eth', communities)).toBe(false);
  });
});

describe('normalizeMultiboardFeedPath', () => {
  it('normalizes /all/3 -> /all', () => {
    expect(normalizeMultiboardFeedPath('/all/3')).toBe('/all');
  });

  it('normalizes /subs/2/settings -> /subs/settings', () => {
    expect(normalizeMultiboardFeedPath('/subs/2/settings')).toBe('/subs/settings');
  });

  it('normalizes /mod/catalog/4 -> /mod/catalog', () => {
    expect(normalizeMultiboardFeedPath('/mod/catalog/4')).toBe('/mod/catalog');
  });

  it('leaves non-multiboard paths unchanged', () => {
    expect(normalizeMultiboardFeedPath('/biz')).toBe('/biz');
    expect(normalizeMultiboardFeedPath('/biz/3')).toBe('/biz/3');
    expect(normalizeMultiboardFeedPath('/biz/catalog/4')).toBe('/biz/catalog/4');
    expect(normalizeMultiboardFeedPath('/pending/0')).toBe('/pending/0');
    expect(normalizeMultiboardFeedPath('/')).toBe('/');
  });
});

describe('isFeedRoute', () => {
  it('returns true for canonical multiboard paths', () => {
    expect(isFeedRoute('/all')).toBe(true);
    expect(isFeedRoute('/all/catalog')).toBe(true);
    expect(isFeedRoute('/subs')).toBe(true);
    expect(isFeedRoute('/subs/catalog')).toBe(true);
    expect(isFeedRoute('/mod')).toBe(true);
    expect(isFeedRoute('/mod/catalog')).toBe(true);
    expect(isFeedRoute('/all/3')).toBe(true);
    expect(isFeedRoute('/subs/2')).toBe(true);
    expect(isFeedRoute('/mod/catalog/4')).toBe(true);
  });

  it('returns false for time-filter paths', () => {
    expect(isFeedRoute('/all/24h')).toBe(false);
    expect(isFeedRoute('/subs/catalog/1w')).toBe(false);
    expect(isFeedRoute('/all/1w/3')).toBe(false);
  });

  it('returns false for board-scoped mod namespace paths', () => {
    expect(isFeedRoute('/biz/mod')).toBe(false);
    expect(isFeedRoute('/biz/mod/queue')).toBe(false);
  });

  it('returns false for board archive paths', () => {
    expect(isFeedRoute('/biz/archive')).toBe(false);
    expect(isFeedRoute('/biz/archive/settings')).toBe(false);
    expect(isArchiveRoute('/biz/archive')).toBe(true);
    expect(isArchiveRoute('/biz/archive/settings')).toBe(true);
  });

  it('returns false for board directory paths', () => {
    expect(isFeedRoute('/biz/directory')).toBe(false);
    expect(isFeedRoute('/biz/directory/settings')).toBe(false);
    expect(isDirectoryListRoute('/biz/directory')).toBe(true);
    expect(isDirectoryListRoute('/biz/directory/settings')).toBe(true);
    expect(isDirectoryListRoute('/biz/archive')).toBe(false);
    expect(isDirectoryListRoute('/biz')).toBe(false);
  });

  it('returns false for posts and pending items', () => {
    expect(isFeedRoute('/biz/thread/abc')).toBe(false);
    expect(isFeedRoute('/pending/4')).toBe(false);
  });
});

describe('board mod routes', () => {
  it('recognizes canonical mod queue routes', () => {
    expect(isModQueueRoute('/mod/queue')).toBe(true);
    expect(isModQueueRoute('/biz/mod/queue')).toBe(true);
    expect(isModQueueRoute('/biz/mod/queue/settings')).toBe(true);
  });

  it('does not recognize legacy board modqueue routes', () => {
    expect(isModQueueRoute('/biz/modqueue')).toBe(false);
  });

  it('recognizes legacy board modqueue routes for rejection', () => {
    expect(isLegacyBoardModQueueRoute('/biz/modqueue')).toBe(true);
    expect(isLegacyBoardModQueueRoute('/biz/modqueue/settings')).toBe(true);
    expect(isLegacyBoardModQueueRoute('/biz/mod/queue')).toBe(false);
  });

  it('recognizes board mod namespace paths', () => {
    expect(isBoardModRoute('/biz/mod')).toBe(true);
    expect(isBoardModRoute('/biz/mod/queue')).toBe(true);
    expect(isBoardModRoute('/mod/queue')).toBe(false);
  });

  it('validates allowed board mod routes', () => {
    expect(isValidBoardModRoute('/biz/mod/queue')).toBe(true);
    expect(isValidBoardModRoute('/biz/mod/queue/settings')).toBe(true);
    expect(isValidBoardModRoute('/biz/mod')).toBe(false);
    expect(isValidBoardModRoute('/biz/mod/log')).toBe(false);
    expect(isValidBoardModRoute('/biz/modqueue')).toBe(false);
  });

  it('validates allowed top-level mod routes', () => {
    expect(isValidModRoute('/mod')).toBe(true);
    expect(isValidModRoute('/mod/catalog/settings')).toBe(true);
    expect(isValidModRoute('/mod/modqueue')).toBe(false);
  });
});

describe('route kind helpers', () => {
  it('recognizes post and pending routes with optional settings suffixes', () => {
    expect(isPostRoute('/biz/thread/abc')).toBe(true);
    expect(isPostRoute('/biz/thread/abc/settings')).toBe(true);
    expect(isPostRoute('/biz')).toBe(false);

    expect(isPendingPostRoute('/pending/3')).toBe(true);
    expect(isPendingPostRoute('/pending/3/settings')).toBe(true);
    expect(isPendingPostRoute('/biz')).toBe(false);
  });
});

describe('feed pagination helpers', () => {
  it('strips trailing page numbers from feed paths', () => {
    expect(stripPageFromFeedPath('/biz/3')).toBe('/biz');
    expect(stripPageFromFeedPath('/biz/catalog/4')).toBe('/biz/catalog');
    expect(stripPageFromFeedPath('/biz/catalog')).toBe('/biz/catalog');
  });

  it('parses page numbers and defaults to page 1', () => {
    expect(getPageFromFeedPath('/biz/3')).toBe(3);
    expect(getPageFromFeedPath('/biz/catalog/4/settings')).toBe(4);
    expect(getPageFromFeedPath('/biz/11')).toBe(1);
    expect(getPageFromFeedPath('/biz')).toBe(1);
  });
});

describe('feed cache helpers', () => {
  it('derives cache keys for feeds and threads', () => {
    expect(getFeedCacheKey('/biz')).toBe('/biz');
    expect(getFeedCacheKey('/biz/3/settings')).toBe('/biz');
    expect(getFeedCacheKey('/biz/catalog/4')).toBe('/biz/catalog');
    expect(getFeedCacheKey('/biz/thread/abc')).toBe('/biz');
    expect(getFeedCacheKey('/all')).toBe('/all?t=24h');
    expect(getFeedCacheKey('/all/catalog', '?t=last')).toBe('/all/catalog?t=24h');
    expect(getFeedCacheKey('/all/catalog', '?t=1w&q=cats')).toBe('/all/catalog?t=1w');
    expect(getFeedCacheKey('/biz/archive')).toBeNull();
  });

  it('keeps the last-visit alias stable after the current visit starts updating storage', () => {
    const justOverTwoDaysAgo = Date.now() - (2 * 24 * 60 * 60 * 1000 + 1000);
    localStorage.setItem(LAST_VISIT_STORAGE_KEY, String(justOverTwoDaysAgo));

    expect(getFeedCacheKey('/all/catalog', '?t=last')).toBe('/all/catalog?t=3d');

    touchLastVisitTimestamp();

    expect(getFeedCacheKey('/all/catalog', '?t=last')).toBe('/all/catalog?t=3d');
  });

  it('returns null cache keys for non-feed routes', () => {
    expect(getFeedCacheKey('/pending/3')).toBeNull();
    expect(getFeedCacheKey('/biz/mod/queue')).toBeNull();
  });

  it('classifies board, catalog, and non-feed routes', () => {
    expect(getFeedType('/biz')).toBe('board');
    expect(getFeedType('/biz/thread/abc')).toBe('board');
    expect(getFeedType('/biz/catalog/settings')).toBe('catalog');
    expect(getFeedType('/pending/3')).toBeNull();
    expect(getFeedType('/biz/archive')).toBeNull();
  });
});
