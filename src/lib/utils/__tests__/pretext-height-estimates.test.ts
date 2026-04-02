import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  getFeedPostHeightEstimate,
  getReplyHeightEstimates,
  getReplyItemSizeFromElement,
  resolveCatalogVirtualizationMode,
  resolveFeedVirtualizationMode,
  resolveReplyVirtualizationMode,
} from '../pretext-height-estimates';

describe('pretext-height-estimates', () => {
  beforeEach(() => {
    Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
      configurable: true,
      value: vi.fn(() => ({
        font: '',
        measureText: vi.fn((text: string) => ({
          actualBoundingBoxAscent: 10,
          actualBoundingBoxDescent: 3,
          fontBoundingBoxAscent: 10,
          fontBoundingBoxDescent: 3,
          width: text.length * 7,
        })),
      })),
      writable: true,
    });
  });

  it('parses reply virtualization mode from search params', () => {
    expect(resolveReplyVirtualizationMode('?pretextReplies=item-size')).toBe('item-size');
    expect(resolveReplyVirtualizationMode(new URLSearchParams('pretextReplies=off'))).toBe('off');
    expect(resolveReplyVirtualizationMode('?pretextReplies=unknown')).toBe('item-size');
  });

  it('parses feed virtualization mode from search params', () => {
    expect(resolveFeedVirtualizationMode('?pretextFeed=item-size')).toBe('item-size');
    expect(resolveFeedVirtualizationMode(new URLSearchParams('pretextFeed=off'))).toBe('off');
    expect(resolveFeedVirtualizationMode('?pretextFeed=unknown')).toBe('off');
  });

  it('parses catalog virtualization mode from search params', () => {
    expect(resolveCatalogVirtualizationMode('?pretextCatalog=item-size')).toBe('item-size');
    expect(resolveCatalogVirtualizationMode(new URLSearchParams('pretextCatalog=off'))).toBe('off');
    expect(resolveCatalogVirtualizationMode('?pretextCatalog=unknown')).toBe('off');
  });

  it('falls back to hash-fragment query params for hash-routed URLs', () => {
    const previousHref = window.location.href;
    window.history.replaceState({}, '', '/#/mu?pretextFeed=item-size&pretextReplies=off');

    expect(resolveFeedVirtualizationMode(window.location.search)).toBe('item-size');
    expect(resolveReplyVirtualizationMode(window.location.search)).toBe('off');
    expect(resolveCatalogVirtualizationMode(window.location.search)).toBe('off');

    window.history.replaceState({}, '', previousHref);
  });

  it('prefers cached Pretext height when itemSize reads a reply row', () => {
    const element = document.createElement('div');
    Object.defineProperty(element, 'offsetHeight', { configurable: true, value: 321 });
    Object.defineProperty(element, 'offsetWidth', { configurable: true, value: 654 });
    element.dataset.pretextHeight = '123';

    expect(getReplyItemSizeFromElement(element, 'offsetHeight')).toBe(123);
    expect(getReplyItemSizeFromElement(element, 'offsetWidth')).toBe(654);

    delete element.dataset.pretextHeight;
    expect(getReplyItemSizeFromElement(element, 'offsetHeight')).toBe(321);
  });

  it('falls back to a nested Pretext height when the wrapper has none', () => {
    const element = document.createElement('div');
    const child = document.createElement('div');

    Object.defineProperty(element, 'offsetHeight', { configurable: true, value: 321 });
    Object.defineProperty(element, 'offsetWidth', { configurable: true, value: 654 });

    child.dataset.pretextHeight = '222';
    element.appendChild(child);

    expect(getReplyItemSizeFromElement(element, 'offsetHeight')).toBe(222);
  });

  it('adds desktop board-label height for multiboard text posts without media', () => {
    const metrics = {
      abbrFontSizePx: 13,
      bodyFontFamily: 'Arial, Helvetica, sans-serif',
      bodyFontSizePx: 13,
      mobileContentFontSizePx: 15,
    };
    const post = {
      cid: 'post-1',
      communityAddress: 'music-posting.eth',
      content: 'A short desktop board post',
      postCid: 'post-1',
      state: 'succeeded',
    };

    const withoutBoardLabel = getFeedPostHeightEstimate({
      isMobile: false,
      metrics,
      post,
      previewReplies: [],
      windowWidth: 1280,
    });
    const withBoardLabel = getFeedPostHeightEstimate({
      isMobile: false,
      metrics,
      post,
      previewReplies: [],
      showBoardLabel: true,
      windowWidth: 1280,
    });

    expect(withBoardLabel).toBeGreaterThan(withoutBoardLabel);
  });

  it('accounts for the board-view long-comment notice on truncated desktop posts', () => {
    const metrics = {
      abbrFontSizePx: 13,
      bodyFontFamily: 'Arial, Helvetica, sans-serif',
      bodyFontSizePx: 13,
      mobileContentFontSizePx: 15,
    };
    const visiblePrefix = 'word '.repeat(200);
    const shortPost = {
      cid: 'post-short',
      communityAddress: 'music-posting.eth',
      content: visiblePrefix,
      postCid: 'post-short',
      state: 'succeeded',
    };
    const truncatedPost = {
      ...shortPost,
      cid: 'post-long',
      content: `${visiblePrefix}${'overflow '.repeat(40)}`,
      postCid: 'post-long',
    };

    const shortEstimate = getFeedPostHeightEstimate({
      isMobile: false,
      metrics,
      post: shortPost,
      previewReplies: [],
      windowWidth: 1280,
    });
    const truncatedEstimate = getFeedPostHeightEstimate({
      isMobile: false,
      metrics,
      post: truncatedPost,
      previewReplies: [],
      windowWidth: 1280,
    });

    expect(truncatedEstimate).toBeGreaterThan(shortEstimate);
  });

  it('adds desktop preview reply estimates without subtracting a per-reply calibration', () => {
    const metrics = {
      abbrFontSizePx: 13,
      bodyFontFamily: 'Arial, Helvetica, sans-serif',
      bodyFontSizePx: 13,
      mobileContentFontSizePx: 15,
    };
    const post = {
      cid: 'post-preview-parent',
      communityAddress: 'music-posting.eth',
      content: 'A longer desktop board post '.repeat(24),
      postCid: 'post-preview-parent',
      state: 'succeeded',
    };
    const previewReply = {
      cid: 'post-preview-reply',
      communityAddress: 'music-posting.eth',
      content: 'A preview reply',
      parentCid: 'post-preview-parent',
      postCid: 'post-preview-parent',
      state: 'succeeded',
    };

    const previewEstimate = getReplyHeightEstimates({
      isMobile: false,
      metrics,
      replies: [previewReply],
      windowWidth: 1280,
    })[0];

    const withoutPreview = getFeedPostHeightEstimate({
      isMobile: false,
      metrics,
      post,
      previewReplies: [],
      windowWidth: 1280,
    });
    const withPreview = getFeedPostHeightEstimate({
      isMobile: false,
      metrics,
      post,
      previewReplies: [previewReply],
      previewReplyEstimates: [previewEstimate],
      windowWidth: 1280,
    });

    expect(withPreview - withoutPreview).toBe(previewEstimate);
  });

  it('keeps most mobile preview-reply height on board cards', () => {
    const metrics = {
      abbrFontSizePx: 13,
      bodyFontFamily: 'Arial, Helvetica, sans-serif',
      bodyFontSizePx: 13,
      mobileContentFontSizePx: 15,
    };
    const post = {
      cid: 'post-mobile-preview-parent',
      communityAddress: 'music-posting.eth',
      content: 'A mobile board post with preview replies',
      link: 'https://example.com/image.jpg',
      linkHeight: 720,
      linkWidth: 1280,
      postCid: 'post-mobile-preview-parent',
      state: 'succeeded',
    };
    const previewReplies = Array.from({ length: 5 }, (_, index) => ({
      cid: `post-mobile-preview-reply-${index}`,
      communityAddress: 'music-posting.eth',
      content: `Preview reply ${index} ${'text '.repeat(index + 1)}`,
      parentCid: 'post-mobile-preview-parent',
      postCid: 'post-mobile-preview-parent',
      state: 'succeeded',
    }));

    const previewEstimates = getReplyHeightEstimates({
      isMobile: true,
      metrics,
      replies: previewReplies,
      windowWidth: 393,
    });
    const withoutPreview = getFeedPostHeightEstimate({
      isMobile: true,
      metrics,
      post,
      previewReplies: [],
      windowWidth: 393,
    });
    const withPreview = getFeedPostHeightEstimate({
      isMobile: true,
      metrics,
      post,
      previewReplies,
      previewReplyEstimates: previewEstimates,
      windowWidth: 393,
    });

    expect(withPreview).toBeGreaterThan(withoutPreview + 300);
    expect(withPreview - withoutPreview).toBeGreaterThan(previewEstimates.reduce((sum, value) => sum + value, 0) - 220);
  });
});
