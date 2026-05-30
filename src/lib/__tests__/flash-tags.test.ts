import { describe, expect, it } from 'vitest';
import { FLASH_TAG_OPTIONS, getFlashTagOption, getFlashTagOptionFromComment, getFlashTagPublishOptionsForDirectoryCode, isFlashDirectory } from '../flash-tags';

describe('flash-tags', () => {
  it('defines the classic /f/ tag options with text-only post flairs', () => {
    expect(FLASH_TAG_OPTIONS.map((option) => option.label)).toEqual(['Hentai', 'Porn', 'Japanese', 'Anime', 'Game', 'Loop', 'Other']);
    expect(FLASH_TAG_OPTIONS.map((option) => option.flair)).toEqual([
      { text: 'flash:hentai' },
      { text: 'flash:porn' },
      { text: 'flash:japanese' },
      { text: 'flash:anime' },
      { text: 'flash:game' },
      { text: 'flash:loop' },
      { text: 'flash:other' },
    ]);
  });

  it('publishes a flash tag only on /f/', () => {
    expect(getFlashTagPublishOptionsForDirectoryCode('f', 'loop')).toEqual({
      flairs: [{ text: 'flash:loop' }],
    });
    expect(getFlashTagPublishOptionsForDirectoryCode('b', 'loop')).toEqual({
      flairs: undefined,
    });
  });

  it('does not publish a flair for missing or invalid selections', () => {
    expect(getFlashTagOption(undefined)).toBeUndefined();
    expect(getFlashTagOption('bad')).toBeUndefined();
    expect(getFlashTagPublishOptionsForDirectoryCode('f', undefined)).toEqual({ flairs: undefined });
    expect(getFlashTagPublishOptionsForDirectoryCode('f', 'bad')).toEqual({ flairs: undefined });
  });

  it('detects flash directories from code or title', () => {
    expect(isFlashDirectory({ directoryCode: 'f' })).toBe(true);
    expect(isFlashDirectory({ title: '/f/ - Flash' })).toBe(true);
    expect(isFlashDirectory({ directoryCode: 'b' })).toBe(false);
  });

  it('extracts display tags from comment flairs', () => {
    expect(getFlashTagOptionFromComment({ flairs: [{ text: 'flash:loop' }] })?.shortLabel).toBe('L');
    expect(getFlashTagOptionFromComment({ flairs: [{ text: 'flag:country:US' }] })).toBeUndefined();
    expect(getFlashTagOptionFromComment({ flairs: [{ text: 'flash:bad' }] })).toBeUndefined();
  });
});
