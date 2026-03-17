import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { copyToClipboard } from '../clipboard-utils';
import { hashStringToColor, getTextColorForBackground, removeMarkdown } from '../post-utils';
import { preloadReplyModal, preloadThemeAssets, resolveAssetUrl } from '../preload-utils';
import { computeOmittedCount, filterRepliesForDisplay, getPreviewDisplayReplies, getTotalReplyCount } from '../replies-preview-utils';
import { getQuotedCidsFromContent, mergeQuotedCids } from '../reply-quote-utils';
import { formatUserIDForDisplay, truncateWithEllipsisInMiddle } from '../string-utils';
import { getFormattedDate, getFormattedTimeAgo, isChristmas } from '../time-utils';

const testState = vi.hoisted(() => ({
  language: 'en',
  translateMock: vi.fn((key: string, options?: { count?: number }) => (typeof options?.count === 'number' ? `${key}:${options.count}` : key)),
}));

vi.mock('i18next', () => ({
  default: {
    get language() {
      return testState.language;
    },
    t: (key: string, options?: { count?: number }) => testState.translateMock(key, options),
  },
}));

vi.mock('../../../generated/asset-manifest', () => ({
  THEME_BUTTON_IMAGES: ['buttons/default.png', 'buttons/hover.png'],
  THEME_BACKGROUND_IMAGES: ['backgrounds/wallpaper.png'],
}));

describe('misc utils', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
  let dateTimeFormatSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    testState.language = 'en';
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    dateTimeFormatSpy = vi.spyOn(Intl, 'DateTimeFormat').mockImplementation(function MockDateTimeFormat(..._args: unknown[]) {
      return {
        format: () => '01/02/24, Tue, 03:04:05',
      } as Intl.DateTimeFormat;
    } as unknown as typeof Intl.DateTimeFormat);
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
    dateTimeFormatSpy.mockRestore();
    vi.useRealTimers();
  });

  it('copies through Electron first and falls back to the browser clipboard on Electron failure', async () => {
    const electronCopy = vi.fn().mockResolvedValue({ success: true });
    const webCopy = vi.fn().mockResolvedValue(undefined);

    Object.defineProperty(window, 'electronApi', {
      configurable: true,
      value: { copyToClipboard: electronCopy },
    });
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: webCopy },
    });

    await copyToClipboard('hello');
    expect(electronCopy).toHaveBeenCalledWith('hello');
    expect(webCopy).not.toHaveBeenCalled();

    electronCopy.mockResolvedValueOnce({ success: false, error: 'denied' });
    await copyToClipboard('fallback');
    expect(webCopy).toHaveBeenCalledWith('fallback');
    expect(consoleErrorSpy).toHaveBeenCalledWith('Electron clipboard failed:', expect.any(Error));
  });

  it('throws clear clipboard errors when no supported API succeeds', async () => {
    Object.defineProperty(window, 'electronApi', {
      configurable: true,
      value: undefined,
    });
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: vi.fn().mockRejectedValue(new Error('blocked')) },
    });

    await expect(copyToClipboard('hello')).rejects.toThrow('Failed to copy to clipboard. Your browser may not support this feature.');

    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: undefined,
    });

    await expect(copyToClipboard('hello')).rejects.toThrow('Your browser does not support clipboard API');
  });

  it('formats post colors and strips markdown syntax while keeping user-visible text', () => {
    expect(hashStringToColor('abc')).toMatch(/^rgb\(-?\d+, -?\d+, -?\d+\)$/);
    expect(hashStringToColor('')).toBe('');
    expect(getTextColorForBackground('rgb(255, 255, 255)')).toBe('black');
    expect(getTextColorForBackground('rgb(10, 10, 10)')).toBe('white');
    expect(removeMarkdown('[spoiler]secret[/spoiler]\n>greentext\n**bold** [label](https://example.com) `code` ```block``` &nbsp;')).toBe(
      'secret\ngreentext\nbold label code block',
    );
  });

  it('preloads theme asset URLs through Image instances', () => {
    const loadedSources: string[] = [];

    class FakeImage {
      set src(value: string) {
        loadedSources.push(value);
      }
    }

    Object.defineProperty(globalThis, 'Image', {
      configurable: true,
      value: FakeImage,
    });

    preloadThemeAssets();

    expect(loadedSources).toEqual([
      `${import.meta.env.BASE_URL}buttons/default.png`,
      `${import.meta.env.BASE_URL}buttons/hover.png`,
      `${import.meta.env.BASE_URL}backgrounds/wallpaper.png`,
    ]);
  });

  it('resolves theme asset URLs against a non-root base URL', () => {
    expect(resolveAssetUrl('buttons/default.png', 'file:///app/')).toBe('file:///app/buttons/default.png');
    expect(resolveAssetUrl('backgrounds/wallpaper.png', 'file:///app/')).toBe('file:///app/backgrounds/wallpaper.png');
  });

  it('schedules reply modal preload with requestIdleCallback when available', () => {
    const requestIdleCallback = vi.fn();

    Object.defineProperty(window, 'requestIdleCallback', {
      configurable: true,
      value: requestIdleCallback,
    });

    preloadReplyModal();

    expect(requestIdleCallback).toHaveBeenCalledWith(expect.any(Function), { timeout: 1500 });
  });

  it('falls back to setTimeout for reply modal preload when requestIdleCallback is unavailable', () => {
    const originalRequestIdleCallback = window.requestIdleCallback;
    // @ts-expect-error test fallback path
    delete window.requestIdleCallback;
    vi.useFakeTimers();
    const setTimeoutSpy = vi.spyOn(window, 'setTimeout');

    preloadReplyModal();

    expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), 500);

    if (originalRequestIdleCallback) {
      Object.defineProperty(window, 'requestIdleCallback', {
        configurable: true,
        value: originalRequestIdleCallback,
      });
    }
  });

  it('builds reply previews, omitted counts, and fallback reply totals', () => {
    expect(filterRepliesForDisplay([{ cid: 'visible' }, { cid: 'deleted', deleted: true }, { cid: 'removed', deleted: false }])).toEqual([
      { cid: 'visible' },
      { cid: 'removed', deleted: false },
    ]);

    expect(
      getPreviewDisplayReplies(
        [
          { cid: 'old', timestamp: 1 },
          { cid: 'pending', pendingApproval: true },
          { cid: 'middle', timestamp: 5 },
          { cid: 'draft', index: 99 },
          { cid: 'newest', timestamp: 10 },
        ],
        4,
      ),
    ).toEqual([
      { cid: 'middle', timestamp: 5 },
      { cid: 'newest', timestamp: 10 },
      { cid: 'draft', index: 99 },
      { cid: 'pending', pendingApproval: true },
    ]);

    expect(computeOmittedCount({ totalReplyCount: 2, visibleCount: 5 })).toBe(0);
    expect(computeOmittedCount({ totalReplyCount: 9, visibleCount: 5 })).toBe(4);
    expect(getTotalReplyCount({ replyCount: undefined, fullLoadedCount: 7, previewLoadedCount: 5 })).toBe(7);
    expect(getTotalReplyCount({ replyCount: 12, fullLoadedCount: 7, previewLoadedCount: 5 })).toBe(12);
  });

  it('extracts quoted cids and merges quoted cid payloads without duplicates', () => {
    expect(getQuotedCidsFromContent('>>12 >>45 >>12', { 12: 'cid-12', 45: 'cid-45' })).toEqual(['cid-12', 'cid-45']);
    expect(getQuotedCidsFromContent(undefined, { 12: 'cid-12' })).toBeUndefined();
    expect(
      mergeQuotedCids(
        {
          author: { address: '0x123' },
          quotedCids: ['cid-12'],
        },
        ['cid-12', 'cid-45'],
      ),
    ).toEqual({
      author: { address: '0x123' },
      quotedCids: ['cid-12', 'cid-45'],
    });
    expect(mergeQuotedCids(undefined, ['cid-12'])).toBeUndefined();
  });

  it('formats ids, truncates long strings, and localizes time labels', () => {
    expect(formatUserIDForDisplay('board.eth')).toBe('board.eth');
    expect(formatUserIDForDisplay('averyverylongdomainname.eth', 12)).toBe('averyvery...');
    expect(formatUserIDForDisplay('0123456789abcdef')).toBe('01234567');
    expect(truncateWithEllipsisInMiddle('abcdefghijklmnopqrstuvwxyz', 10)).toBe('abc...xyz');
    expect(truncateWithEllipsisInMiddle('abc', 10)).toBe('abc');

    expect(getFormattedDate(1_704_153_600)).toBe('01/02/24(Tue)03:04:05');
    testState.language = 'ar';
    expect(getFormattedDate(1_704_153_600)).toBe('01/02/24, Tue, 03:04:05');

    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-02T00:00:00Z'));

    expect(getFormattedTimeAgo(1_704_153_540)).toBe('time_1_minute_ago');
    expect(getFormattedTimeAgo(1_704_153_200)).toBe('time_x_minutes_ago:6');
    expect(getFormattedTimeAgo(1_704_146_800)).toBe('time_1_hour_ago');
    expect(getFormattedTimeAgo(1_704_139_200)).toBe('time_x_hours_ago:4');
    expect(getFormattedTimeAgo(1_704_067_200)).toBe('time_1_day_ago');
    expect(getFormattedTimeAgo(1_703_980_800)).toBe('time_x_days_ago:2');
    expect(getFormattedTimeAgo(1_701_561_600)).toBe('time_1_month_ago');
    expect(getFormattedTimeAgo(1_698_969_600)).toBe('time_x_months_ago:2');
    expect(getFormattedTimeAgo(1_672_617_600)).toBe('time_1_year_ago');
    expect(getFormattedTimeAgo(1_641_081_600)).toBe('time_x_years_ago:2');

    vi.setSystemTime(new Date('2024-12-24T00:00:00Z'));
    expect(isChristmas()).toBe(true);

    vi.setSystemTime(new Date('2024-07-04T00:00:00Z'));
    expect(isChristmas()).toBe(false);
  });
});
