import { afterEach, describe, expect, it, vi } from 'vitest';
import { canLoadMediaLinkInBrowser, requiresBrowserMediaLoadValidation } from '../media-link-validation-utils';

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('browser media link validation', () => {
  it('only probes direct image and GIF links', () => {
    expect(requiresBrowserMediaLoadValidation('https://example.com/image.jpg')).toBe(true);
    expect(requiresBrowserMediaLoadValidation('https://example.com/animation.gif')).toBe(true);
    expect(requiresBrowserMediaLoadValidation('https://example.com/video.mp4')).toBe(false);
    expect(requiresBrowserMediaLoadValidation('https://example.com/page')).toBe(false);
    expect(requiresBrowserMediaLoadValidation('not-a-url')).toBe(false);
  });

  it('resolves image links from the browser load result', async () => {
    class LoadableImage {
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;

      set src(_value: string) {
        queueMicrotask(() => this.onload?.());
      }
    }

    vi.stubGlobal('Image', LoadableImage);
    await expect(canLoadMediaLinkInBrowser('https://example.com/image.jpg')).resolves.toBe(true);

    class BlockedImage extends LoadableImage {
      override set src(_value: string) {
        queueMicrotask(() => this.onerror?.());
      }
    }

    vi.stubGlobal('Image', BlockedImage);
    await expect(canLoadMediaLinkInBrowser('https://example.com/blocked.jpg')).resolves.toBe(false);
  });

  it('skips browser probes for ordinary links', async () => {
    await expect(canLoadMediaLinkInBrowser('https://example.com/page')).resolves.toBe(true);
  });
});
