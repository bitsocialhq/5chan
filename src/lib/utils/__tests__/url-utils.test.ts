import { beforeEach, describe, expect, it, vi } from 'vitest';

const testState = vi.hoisted(() => ({
  copyToClipboardMock: vi.fn(),
}));

vi.mock('../clipboard-utils', () => ({
  copyToClipboard: (text: string) => testState.copyToClipboardMock(text),
}));

import {
  copyShareLinkToClipboard,
  getExpiringMediaLinkHostname,
  getHostname,
  getPublishURLFilename,
  is5chanLink,
  isPrivateNetworkHostname,
  isValidCrossboardPattern,
  isValidPublishURL,
  isValidURL,
  normalizePublishURL,
  transform5chanLinkToInternal,
} from '../url-utils';

describe('url-utils', () => {
  beforeEach(() => {
    testState.copyToClipboardMock.mockReset();
  });

  it('extracts hostnames and validates urls', () => {
    expect(getHostname('https://www.5chan.app/#/music.eth')).toBe('5chan.app');
    expect(getHostname('not-a-url')).toBe('');
    expect(isValidURL('https://5chan.app')).toBe(true);
    expect(isValidURL('http://5chan.app')).toBe(true);
    expect(isValidURL('javascript:alert(1)')).toBe(false);
    expect(isValidURL('data:text/html,hello')).toBe(false);
    expect(isValidURL('file:///tmp/pic.png')).toBe(false);
    expect(isValidURL('not-a-url')).toBe(false);
  });

  it('detects private network hostnames used by URL safety checks', () => {
    expect(isPrivateNetworkHostname('localhost')).toBe(true);
    expect(isPrivateNetworkHostname('branch.localhost')).toBe(true);
    expect(isPrivateNetworkHostname('127.0.0.1')).toBe(true);
    expect(isPrivateNetworkHostname('192.168.1.1')).toBe(true);
    expect(isPrivateNetworkHostname('[::1]')).toBe(true);
    expect(isPrivateNetworkHostname('[::ffff:7f00:1]')).toBe(true);
    expect(isPrivateNetworkHostname('fc00::1')).toBe(true);
    expect(isPrivateNetworkHostname('fd12:3456:789a::1')).toBe(true);
    expect(isPrivateNetworkHostname('fcbarcelona.com')).toBe(false);
    expect(isPrivateNetworkHostname('fdic.gov')).toBe(false);
    expect(isPrivateNetworkHostname('example.com')).toBe(false);
  });

  it('normalizes publish links to the https URLs accepted by communities', () => {
    expect(normalizePublishURL(' http://i.imgur.com/YpB7qfa.jpg ')).toBe('https://i.imgur.com/YpB7qfa.jpg');
    expect(normalizePublishURL('https://i.imgur.com/YpB7qfa.jpg')).toBe('https://i.imgur.com/YpB7qfa.jpg');
    expect(isValidPublishURL('http://i.imgur.com/YpB7qfa.jpg')).toBe(true);
    expect(isValidPublishURL('https://i.imgur.com/YpB7qfa.jpg')).toBe(true);
    expect(isValidPublishURL('ftp://example.com/file.jpg')).toBe(false);
    expect(isValidPublishURL('not-a-url')).toBe(false);
    expect(getPublishURLFilename('https://example.com/images/file%20name.jpg?size=large')).toBe('file name.jpg');
    expect(getPublishURLFilename('not-a-url')).toBeNull();
  });

  it('detects publish media hosts with temporary links', () => {
    expect(getExpiringMediaLinkHostname('https://i.4cdn.org/gif/1712345678900.jpg')).toBe('i.4cdn.org');
    expect(getExpiringMediaLinkHostname('http://litterbox.catbox.moe/u/example.png')).toBe('litterbox.catbox.moe');
    expect(getExpiringMediaLinkHostname('https://www.tmpfiles.org/dl/123/file.mp4')).toBe('tmpfiles.org');
    expect(getExpiringMediaLinkHostname('https://cdn.file.kiwi/example')).toBe('file.kiwi');
    expect(getExpiringMediaLinkHostname('https://example.com/file.png')).toBeNull();
    expect(getExpiringMediaLinkHostname('not-a-url')).toBeNull();
  });

  it('copies path-based share links for threads and catalog pages using the share subdomain', async () => {
    await copyShareLinkToClipboard('music.eth', 'thread', 'cid-123');
    expect(testState.copyToClipboardMock).toHaveBeenCalledWith('https://s.5chan.app/music.eth/thread/cid-123');

    await copyShareLinkToClipboard('music.eth', 'catalog');
    expect(testState.copyToClipboardMock).toHaveBeenCalledWith('https://s.5chan.app/music.eth/catalog');

    const copyThreadWithoutCid = copyShareLinkToClipboard as (boardIdentifier: string, linkType: 'thread', cid?: string) => Promise<void>;
    await expect(copyThreadWithoutCid('music.eth', 'thread')).rejects.toThrow('copyShareLinkToClipboard: thread links require a cid');
  });

  it('recognizes supported 5chan urls and rejects unrelated domains', () => {
    expect(is5chanLink('https://5chan.app/music.eth')).toBe(true);
    expect(is5chanLink('https://5chan.app/music.eth/thread/cid-123')).toBe(true);
    expect(is5chanLink('https://5chan.app/#/music.eth/catalog')).toBe(true);
    expect(is5chanLink('https://5chan.app/p/music.eth/c/cid-123')).toBe(true);
    expect(is5chanLink('https://5chan.app/all/catalog')).toBe(true);
    expect(is5chanLink('https://s.5chan.app/music.eth/thread/cid-123')).toBe(true);
    expect(is5chanLink('https://s.5chan.app/music.eth/catalog')).toBe(true);
    expect(is5chanLink('https://example.com/music.eth')).toBe(false);
  });

  it('transforms legacy and hash-based share links into internal routes', () => {
    expect(transform5chanLinkToInternal('https://5chan.app/p/music.eth/c/cid-123?redirect=https://example.com')).toBe('/music.eth/thread/cid-123');
    expect(transform5chanLinkToInternal('https://5chan.app/p/music.eth?foo=1')).toBe('/music.eth?foo=1');
    expect(transform5chanLinkToInternal('https://5chan.app/#/music.eth/catalog')).toBe('/music.eth/catalog');
    expect(transform5chanLinkToInternal('https://example.com/music.eth')).toBeNull();
  });

  it('validates cross-board quote patterns for board codes, domains, and ipns keys', () => {
    const ipnsKey = `12D3KooW${'a'.repeat(44)}`;

    expect(isValidCrossboardPattern('>>>/biz/')).toBe(true);
    expect(isValidCrossboardPattern(`>>>/biz/${'a'.repeat(46)}`)).toBe(true);
    expect(isValidCrossboardPattern('>>>/biz/123')).toBe(true);
    expect(isValidCrossboardPattern('>>>/biz/test')).toBe(true);
    expect(isValidCrossboardPattern(`>>>/board.eth/${'b'.repeat(46)}`)).toBe(true);
    expect(isValidCrossboardPattern('>>>/board.eth/123')).toBe(true);
    expect(isValidCrossboardPattern('>>>/board.eth/test')).toBe(true);
    expect(isValidCrossboardPattern(`>>>/${ipnsKey}`)).toBe(true);
    expect(isValidCrossboardPattern('>>>/invalid/thread/extra')).toBe(false);
    expect(isValidCrossboardPattern('>>/biz/')).toBe(false);
  });
});
