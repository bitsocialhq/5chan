import { describe, expect, it } from 'vitest';
import {
  filterVisibleModQueueFeed,
  getModQueueCommentRoute,
  getQueuedCommentRouteState,
  getVisibleQueuedCommentHistory,
  shouldKeepQueuedCommentHistory,
} from '../mod-queue-utils';

describe('mod queue utils', () => {
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
