import * as React from 'react';
import { createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { useYouTubeThumbnailFallback } from '../use-youtube-thumbnail-fallback';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
const act = (React as { act?: (cb: () => void | Promise<void>) => void | Promise<void> }).act as (cb: () => void | Promise<void>) => void | Promise<void>;

let container: HTMLDivElement;
let root: Root;
let latestValue: ReturnType<typeof useYouTubeThumbnailFallback>;

const HookHarness = ({ thumbnailUrl }: { thumbnailUrl: string | undefined }) => {
  latestValue = useYouTubeThumbnailFallback(thumbnailUrl);
  return null;
};

const renderFallback = async (thumbnailUrl: string | undefined) => {
  await act(async () => {
    root.render(createElement(HookHarness, { thumbnailUrl }));
  });
};

const getPlaceholderImage = () => ({ naturalHeight: 90, naturalWidth: 120 }) as HTMLImageElement;

describe('useYouTubeThumbnailFallback', () => {
  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  it('advances to the next YouTube fallback when a placeholder loads before the final candidate', async () => {
    await renderFallback('https://img.youtube.com/vi/missing-max/maxresdefault.jpg');

    let handled = false;
    await act(async () => {
      handled = latestValue.handleThumbnailLoad(getPlaceholderImage());
    });

    expect(handled).toBe(true);
    expect(latestValue.isUnavailable).toBe(false);
    expect(latestValue.thumbnailUrl).toBe('https://img.youtube.com/vi/missing-max/sddefault.jpg');
  });

  it('marks the thumbnail unavailable when the last YouTube candidate is a placeholder', async () => {
    await renderFallback('https://img.youtube.com/vi/missing-hq/hqdefault.jpg');

    let handled = false;
    await act(async () => {
      handled = latestValue.handleThumbnailLoad(getPlaceholderImage());
    });

    expect(handled).toBe(true);
    expect(latestValue.isUnavailable).toBe(true);
    expect(latestValue.thumbnailUrl).toBeUndefined();
  });
});
