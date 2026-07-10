import { describe, expect, it } from 'vitest';
import {
  isAllView,
  isArchiveView,
  isBoardView,
  isCatalogView,
  isHomeView,
  isModQueueView,
  isModView,
  isNotFoundView,
  isPendingPostView,
  isPostPageView,
  isSettingsView,
  isSubscriptionsView,
} from '../view-utils';

describe('view-utils', () => {
  it('classifies aggregate routes and special app views', () => {
    expect(isAllView('/all')).toBe(true);
    expect(isHomeView('/')).toBe(true);
    expect(isModView('/mod/queue')).toBe(true);
    expect(isModQueueView('/music.eth/mod/queue')).toBe(true);
    expect(isSubscriptionsView('/subs/catalog/settings', {})).toBe(true);
    expect(isPendingPostView('/pending/42/settings', { accountCommentIndex: '42' })).toBe(true);
    expect(isNotFoundView('/faq', {})).toBe(false);
    expect(isNotFoundView('/pass', {})).toBe(false);
    expect(isNotFoundView('/rules', {})).toBe(false);
    expect(isNotFoundView('/blotter', {})).toBe(false);
    expect(isNotFoundView('/settings/account-data', {})).toBe(false);
    expect(isNotFoundView('/not-allowed', {})).toBe(false);
    expect(isNotFoundView('/not-found', {})).toBe(true);
    expect(isNotFoundView('/faq/missing', {})).toBe(true);
  });

  it.each(['/mod', '/mod/settings', '/mod/catalog', '/mod/catalog/settings', '/mod/queue', '/mod/queue/settings', '/mod/'])(
    'keeps canonical mod route %s out of the not-found view',
    (pathname) => {
      expect(isNotFoundView(pathname, {})).toBe(false);
    },
  );

  it('keeps invalid mod routes in the not-found view', () => {
    expect(isNotFoundView('/mod/asdf', {})).toBe(true);
    expect(isNotFoundView('/mod/modqueue', {})).toBe(true);
  });

  it('detects board, catalog, post, and settings routes using board params', () => {
    const params = {
      boardIdentifier: 'music.eth',
      commentCid: 'cid-123',
      accountCommentIndex: '42',
    };

    expect(isBoardView('/music.eth', params)).toBe(true);
    expect(isBoardView('/all', params)).toBe(false);
    expect(isCatalogView('/music.eth/catalog', params)).toBe(true);
    expect(isPostPageView('/music.eth/thread/cid-123', params)).toBe(true);
    expect(isSettingsView('/music.eth/thread/cid-123/settings', params)).toBe(true);
  });

  it('supports emoji board identifiers and marks unknown routes as not found', () => {
    const params = {
      boardIdentifier: 'emoji-🎵.eth',
      commentCid: 'cid-123',
    };

    expect(isBoardView('/emoji-%F0%9F%8E%B5.eth', params)).toBe(true);
    expect(isCatalogView('/emoji-%F0%9F%8E%B5.eth/catalog/settings', params)).toBe(true);
    expect(isPostPageView('/emoji-%F0%9F%8E%B5.eth/thread/cid-123', params)).toBe(true);
    expect(isNotFoundView('/definitely-not-a-route', params)).toBe(true);
    expect(isNotFoundView('/emoji-%F0%9F%8E%B5.eth/thread/cid-123', params)).toBe(false);
    expect(isArchiveView('/music.eth/archive', { boardIdentifier: 'music.eth' })).toBe(true);
    expect(isArchiveView('/music.eth/archive/settings', { boardIdentifier: 'music.eth' })).toBe(true);
    expect(isBoardView('/music.eth/archive', { boardIdentifier: 'music.eth' })).toBe(false);
    expect(isNotFoundView('/music.eth/archive', { boardIdentifier: 'music.eth' })).toBe(false);
    expect(isNotFoundView('/music.eth/archive/settings/', { boardIdentifier: 'music.eth' })).toBe(false);
  });

  it.each(['/faq/', '/pass/', '/rules/', '/blotter/', '/settings/account-data/', '/not-allowed/', '/subs/', '/subs/catalog/settings/'])(
    'normalizes the valid trailing-slash route %s',
    (pathname) => {
      expect(isNotFoundView(pathname, {})).toBe(false);
    },
  );
});
