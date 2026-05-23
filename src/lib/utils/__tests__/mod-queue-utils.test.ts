import { describe, expect, it } from 'vitest';
import {
  filterVisibleModQueueFeed,
  getModQueueBoardFilterGroups,
  getModQueueCommentRoute,
  getModQueueSelectedBoardAddresses,
  getModeratedCommunityAddresses,
  getQueuedCommentRouteState,
  getVisibleQueuedCommentHistory,
  shouldKeepQueuedCommentHistory,
} from '../mod-queue-utils';

describe('mod queue utils', () => {
  const directories = [
    { address: 'anime-primary.bso', publicKey: 'a-primary', directoryCode: 'a', title: '/a/ - Anime & Manga' },
    { address: 'anime-backup.bso', publicKey: 'a-backup', directoryCode: 'a', title: '/a/ - Anime & Manga' },
    { address: 'tech-primary.bso', publicKey: 'g-primary', directoryCode: 'g', title: '/g/ - Technology' },
  ];

  it('keeps all queue comments unless they were locally dismissed', () => {
    const feed = [
      { cid: 'pending', communityAddress: 'tech.eth', pendingApproval: true },
      { cid: 'approved', approved: true, communityAddress: 'tech.eth', pendingApproval: true },
      { cid: 'rejected', approved: false, communityAddress: 'tech.eth', pendingApproval: true },
      { cid: 'removed', communityAddress: 'tech.eth', pendingApproval: true, removed: true },
      { cid: 'published', communityAddress: 'tech.eth', pendingApproval: false },
    ];

    expect(filterVisibleModQueueFeed(feed, null, new Set(['approved']))).toEqual([
      { cid: 'pending', communityAddress: 'tech.eth', pendingApproval: true },
      { cid: 'rejected', approved: false, communityAddress: 'tech.eth', pendingApproval: true },
      { cid: 'removed', communityAddress: 'tech.eth', pendingApproval: true, removed: true },
      { cid: 'published', communityAddress: 'tech.eth', pendingApproval: false },
    ]);
  });

  it('applies the selected board filter after removing dismissed items', () => {
    const feed = [
      { cid: 'tech-pending', communityAddress: 'tech.eth', pendingApproval: true },
      { cid: 'g-pending', communityAddress: 'g.eth', pendingApproval: true },
      { cid: 'tech-approved', approved: true, communityAddress: 'tech.eth', pendingApproval: true },
    ];

    expect(filterVisibleModQueueFeed(feed, 'tech.eth', new Set(['tech-pending']))).toEqual([
      { cid: 'tech-approved', approved: true, communityAddress: 'tech.eth', pendingApproval: true },
    ]);
  });

  it('applies grouped board filters to all directory aliases', () => {
    const feed = [
      { cid: 'a-primary-pending', communityAddress: 'a-primary', pendingApproval: true },
      { cid: 'a-backup-pending', communityAddress: 'a-backup', pendingApproval: true },
      { cid: 'g-pending', communityAddress: 'g-primary', pendingApproval: true },
    ];

    expect(filterVisibleModQueueFeed(feed, 'a', new Set(['a-primary-pending']), ['a-primary', 'a-backup'])).toEqual([
      { cid: 'a-backup-pending', communityAddress: 'a-backup', pendingApproval: true },
    ]);
  });

  it('dedupes mod queue board filters by directory path', () => {
    expect(getModQueueBoardFilterGroups(['a-backup', 'custom.eth', 'g-primary', 'a-primary'], directories, [['g', 'a']])).toEqual([
      {
        addresses: ['g-primary'],
        boardPath: 'g',
        filterKey: 'g',
        isDirectory: true,
      },
      {
        addresses: ['a-backup', 'a-primary'],
        boardPath: 'a',
        filterKey: 'a',
        isDirectory: true,
      },
      {
        addresses: ['custom.eth'],
        boardPath: 'custom.eth',
        filterKey: 'custom.eth',
        isDirectory: false,
      },
    ]);
  });

  it('expands selected directory filters to every matching moderated address', () => {
    expect(getModQueueSelectedBoardAddresses(['a-primary', 'g-primary', 'a-backup'], 'a', directories)).toEqual(['a-primary', 'a-backup']);
    expect(getModQueueSelectedBoardAddresses(['a-primary', 'g-primary', 'a-backup'], 'a-primary', directories)).toEqual(['a-primary', 'a-backup']);
  });

  it('adds live role communities that are not cached on the account', () => {
    expect(
      getModeratedCommunityAddresses({
        accountAddress: 'plebeius.bso',
        accountCommunityAddresses: ['tech-primary.bso'],
        candidateCommunityAddresses: ['tech-primary.bso', 'paranormal-posting.bso', 'viewer-board.bso'],
        communities: [undefined, { roles: { 'plebeius.bso': { role: 'moderator' } } }, { roles: { 'plebeius.bso': { role: 'viewer' } } }],
      }),
    ).toEqual(['tech-primary.bso', 'paranormal-posting.bso']);
  });

  it('keeps only terminal local moderation states in queue history', () => {
    expect(shouldKeepQueuedCommentHistory({ cid: 'pending', pendingApproval: true })).toBe(false);
    expect(shouldKeepQueuedCommentHistory({ cid: 'published', pendingApproval: false })).toBe(false);
    expect(shouldKeepQueuedCommentHistory({ cid: 'approved', approved: true, pendingApproval: false })).toBe(true);
    expect(shouldKeepQueuedCommentHistory({ cid: 'rejected', approved: false, pendingApproval: false })).toBe(true);
    expect(shouldKeepQueuedCommentHistory({ cid: 'removed', pendingApproval: true, removed: true })).toBe(true);
  });

  it('does not resurface stale pending history after the live feed drops it', () => {
    const feed = [{ cid: 'live-pending', communityAddress: 'tech.eth', pendingApproval: true }];
    const history = [
      { cid: 'stale-pending', communityAddress: 'tech.eth', pendingApproval: true },
      { cid: 'live-pending', communityAddress: 'tech.eth', pendingApproval: true },
      { cid: 'approved', approved: true, communityAddress: 'tech.eth', pendingApproval: false },
      { cid: 'rejected', approved: false, communityAddress: 'tech.eth', pendingApproval: false },
      { cid: 'other-board-approved', approved: true, communityAddress: 'g.eth', pendingApproval: false },
    ];

    expect(getVisibleQueuedCommentHistory(feed, history, ['tech.eth'])).toEqual([
      { cid: 'approved', approved: true, communityAddress: 'tech.eth', pendingApproval: false },
      { cid: 'rejected', approved: false, communityAddress: 'tech.eth', pendingApproval: false },
    ]);
  });

  it('builds excerpt routes from the comment permalink cid', () => {
    expect(getModQueueCommentRoute('g', 'reply-cid')).toBe('/g/thread/reply-cid');
    expect(getModQueueCommentRoute('g', undefined)).toBeUndefined();
    expect(getModQueueCommentRoute(undefined, 'reply-cid')).toBeUndefined();
  });

  it('serializes queued comment route state for reply links', () => {
    expect(
      getQueuedCommentRouteState({
        cid: 'reply-cid',
        communityAddress: 'g.eth',
        content: 'pending reply body',
        parentCid: 'thread-cid',
        pendingApproval: true,
        postCid: 'thread-cid',
      }),
    ).toEqual({
      queuedComment: {
        approved: undefined,
        author: undefined,
        cid: 'reply-cid',
        commentModeration: undefined,
        communityAddress: 'g.eth',
        content: 'pending reply body',
        deleted: undefined,
        link: undefined,
        linkHeight: undefined,
        linkWidth: undefined,
        number: undefined,
        parentCid: 'thread-cid',
        pendingApproval: true,
        postCid: 'thread-cid',
        reason: undefined,
        removed: undefined,
        replyCount: undefined,
        threadCid: undefined,
        thumbnailUrl: undefined,
        timestamp: undefined,
        title: undefined,
      },
    });
  });
});
