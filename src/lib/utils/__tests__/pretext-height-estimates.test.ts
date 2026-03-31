import { describe, expect, it } from 'vitest';
import {
  getReplyItemSizeFromElement,
  resolveCatalogVirtualizationMode,
  resolveFeedVirtualizationMode,
  resolveReplyVirtualizationMode,
} from '../pretext-height-estimates';

describe('pretext-height-estimates', () => {
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
});
