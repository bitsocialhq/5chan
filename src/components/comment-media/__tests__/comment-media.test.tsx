import * as React from 'react';
import { createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import CommentMedia from '../comment-media';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
const act = (React as { act?: (cb: () => void | Promise<void>) => void | Promise<void> }).act as (cb: () => void | Promise<void>) => void | Promise<void>;

const testState = vi.hoisted(() => ({
  canEmbed: false,
  fitExpandedImagesToScreen: false,
  getHasThumbnailResult: true,
  gifFrameStatus: 'idle' as 'failed' | 'idle' | 'loading' | 'ready',
  gifFrameUrl: null as string | null,
  hostname: 'example.com',
  isMobile: false,
  unmuteExpandedVideoSound: false,
  ruffleLoadMock: vi.fn(),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: { host?: string }) => (options?.host ? `${key}:${options.host}` : key),
  }),
}));

vi.mock('../../../lib/utils/media-utils', () => ({
  getDisplayMediaInfoType: (type: string) => type,
  getHasThumbnail: () => testState.getHasThumbnailResult,
  getMediaDimensions: () => '640x480',
}));

vi.mock('../../../lib/utils/url-utils', () => ({
  getHostname: () => testState.hostname,
  parseHttpUrl: (value: string) => {
    try {
      const parsedUrl = new URL(value);
      return parsedUrl.protocol === 'http:' || parsedUrl.protocol === 'https:' ? parsedUrl : null;
    } catch {
      return null;
    }
  },
}));

vi.mock('../../../stores/use-expanded-media-store', () => {
  const getState = () => ({
    fitExpandedImagesToScreen: testState.fitExpandedImagesToScreen,
    unmuteExpandedVideoSound: testState.unmuteExpandedVideoSound,
  });
  return {
    default: (selector?: (s: ReturnType<typeof getState>) => unknown) => (selector ? selector(getState()) : getState()),
  };
});

vi.mock('../../../hooks/use-fetch-gif-first-frame', () => ({
  default: () => ({
    frameUrl: testState.gifFrameUrl,
    status: testState.gifFrameStatus,
  }),
}));

vi.mock('../../../hooks/use-is-mobile', () => ({
  default: () => testState.isMobile,
}));

vi.mock('../../embed', () => ({
  __esModule: true,
  canEmbed: () => testState.canEmbed,
  default: ({ url }: { url: string }) => createElement('div', { 'data-testid': 'embed' }, url),
}));

vi.mock('@ruffle-rs/ruffle', () => ({}));

let container: HTMLDivElement;
let root: Root;
let setShowThumbnailMock: ReturnType<typeof vi.fn>;

const renderMedia = async (props: Record<string, unknown>) => {
  await act(async () => {
    root.render(createElement(CommentMedia, props as any));
  });
};

describe('CommentMedia', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    testState.canEmbed = false;
    testState.fitExpandedImagesToScreen = false;
    testState.getHasThumbnailResult = true;
    testState.gifFrameStatus = 'idle';
    testState.gifFrameUrl = null;
    testState.hostname = 'example.com';
    testState.isMobile = false;
    testState.unmuteExpandedVideoSound = false;
    testState.ruffleLoadMock = vi.fn();
    const player = document.createElement('ruffle-player') as HTMLElement & {
      ruffle: () => { load: (source: string | Record<string, unknown>) => void };
    };
    player.ruffle = () => ({ load: testState.ruffleLoadMock });
    window.RufflePlayer = {
      newest: () => ({
        createPlayer: () => player,
      }),
    };
    setShowThumbnailMock = vi.fn();

    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    delete window.RufflePlayer;
  });

  it('toggles image expansion on mobile and renders the media metadata', async () => {
    testState.isMobile = true;

    await renderMedia({
      commentMediaInfo: {
        linkHeight: 300,
        linkWidth: 600,
        type: 'image',
        url: 'https://cdn.example.com/image.jpg',
      },
      setShowThumbnail: setShowThumbnailMock,
      showThumbnail: true,
    });

    const image = container.querySelector('img[src="https://cdn.example.com/image.jpg"]');
    expect(image).toBeTruthy();
    expect(container.textContent).toContain('image');

    await act(async () => {
      image?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(container.textContent).toContain('https://cdn.example.com/image');
    expect(container.textContent).toContain('640x480');
  });

  it('marks expanded reply images so virtualized feed rows use live height', async () => {
    await renderMedia({
      commentMediaInfo: {
        linkHeight: 300,
        linkWidth: 600,
        type: 'image',
        url: 'https://cdn.example.com/reply-image.jpg',
      },
      parentCid: 'parent-cid',
      setShowThumbnail: setShowThumbnailMock,
      showThumbnail: true,
    });

    expect(container.querySelector('[data-expanded-media="true"]')).toBeNull();

    const image = container.querySelector('img[src="https://cdn.example.com/reply-image.jpg"]');
    await act(async () => {
      image?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(container.querySelector('[data-expanded-media="true"]')).toBeTruthy();
  });

  it('shows a media-load warning when an image fails to load', async () => {
    testState.hostname = 'files.catbox.moe';
    const onMediaLoadFailureChange = vi.fn();

    await renderMedia({
      commentMediaInfo: {
        type: 'image',
        url: 'https://files.catbox.moe/missing.jpg',
      },
      onMediaLoadFailureChange,
      setShowThumbnail: setShowThumbnailMock,
      showThumbnail: true,
    });

    const image = container.querySelector('img[src="https://files.catbox.moe/missing.jpg"]');
    expect(image).toBeTruthy();

    await act(async () => {
      image?.dispatchEvent(new Event('error', { bubbles: true }));
    });

    expect(container.querySelector('img[src="assets/filedeleted-res.gif"]')).toBeTruthy();
    expect(onMediaLoadFailureChange).toHaveBeenCalledWith('https://files.catbox.moe/missing.jpg');
    const status = container.querySelector('[role="status"]');
    expect(status?.textContent).toContain('media_failed_to_load_inline:files.catbox.moe');
    expect(status?.textContent).toContain('media_failed_to_load_open_source');
    expect(status?.textContent).not.toContain('media_failed_to_load_hint');
    expect(status?.getAttribute('aria-label')).toBe(
      'media_failed_to_load. media_failed_to_load_source:files.catbox.moe. media_failed_to_load_hint. media_failed_to_load_open_source.',
    );
    expect(status?.getAttribute('title')).toBe(
      'media_failed_to_load. media_failed_to_load_source:files.catbox.moe. media_failed_to_load_hint. media_failed_to_load_open_source.',
    );
    expect(container.querySelector<HTMLAnchorElement>('a[href="https://files.catbox.moe/missing.jpg"]')?.textContent).toBe('media_failed_to_load_open_source');
  });

  it('moves media-load guidance below failed image thumbnails on mobile', async () => {
    testState.hostname = 'files.catbox.moe';
    testState.isMobile = true;
    const onMediaLoadFailureChange = vi.fn();

    await renderMedia({
      commentMediaInfo: {
        type: 'image',
        url: 'https://files.catbox.moe/missing.jpg',
      },
      onMediaLoadFailureChange,
      setShowThumbnail: setShowThumbnailMock,
      showThumbnail: true,
    });

    const image = container.querySelector('img[src="https://files.catbox.moe/missing.jpg"]');
    expect(image).toBeTruthy();

    await act(async () => {
      image?.dispatchEvent(new Event('error', { bubbles: true }));
    });

    const status = container.querySelector('[role="status"]');
    expect(status?.textContent).toBe('');
    expect(status?.getAttribute('aria-label')).toBe(
      'media_failed_to_load. media_failed_to_load_source:files.catbox.moe. media_failed_to_load_hint. media_failed_to_load_open_source.',
    );
    expect(onMediaLoadFailureChange).toHaveBeenCalledWith('https://files.catbox.moe/missing.jpg');
    expect(container.textContent).not.toContain('media_failed_to_load_inline:files.catbox.moe');
    expect(container.textContent).not.toContain('media_failed_to_load_open_source');
    expect(container.textContent).toContain('image');
  });

  it('renders GIF thumbnail states and toggles the media view from the placeholder', async () => {
    testState.isMobile = true;
    testState.gifFrameStatus = 'loading';

    await renderMedia({
      commentMediaInfo: {
        type: 'gif',
        url: 'https://cdn.example.com/animated.gif',
      },
      setShowThumbnail: setShowThumbnailMock,
      showThumbnail: true,
    });

    const placeholder = container.querySelector('[aria-label="Loading GIF thumbnail"]');
    expect(placeholder).toBeTruthy();

    await act(async () => {
      placeholder?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(setShowThumbnailMock).toHaveBeenCalledWith(false);

    testState.gifFrameStatus = 'ready';
    testState.gifFrameUrl = 'https://cdn.example.com/frame.png';
    await renderMedia({
      commentMediaInfo: {
        type: 'gif',
        url: 'https://cdn.example.com/animated.gif',
      },
      setShowThumbnail: setShowThumbnailMock,
      showThumbnail: true,
    });

    expect(container.textContent).toContain('animated gif');
    expect(container.querySelector('img[src="https://cdn.example.com/frame.png"]')).toBeTruthy();
  });

  it('renders fallback embedded webpage links when there is no thumbnail', async () => {
    testState.canEmbed = true;
    testState.getHasThumbnailResult = false;
    testState.isMobile = true;

    await renderMedia({
      commentMediaInfo: {
        type: 'webpage',
        url: 'https://example.com/article',
      },
      setShowThumbnail: setShowThumbnailMock,
      showThumbnail: true,
    });

    expect(container.textContent).toContain('example.com');

    const fallbackButton = Array.from(container.querySelectorAll('span')).find((node) => node.textContent === 'example.com' && node.getAttribute('role') === 'button');
    await act(async () => {
      fallbackButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(setShowThumbnailMock).toHaveBeenCalledWith(false);
  });

  it('renders the expanded embed view with a close button on mobile', async () => {
    testState.isMobile = true;

    await renderMedia({
      commentMediaInfo: {
        patternThumbnailUrl: 'https://cdn.example.com/thumb.jpg',
        type: 'iframe',
        url: 'https://youtu.be/test',
      },
      setShowThumbnail: setShowThumbnailMock,
      showThumbnail: false,
    });

    expect(container.querySelector('[data-testid="embed"]')?.textContent).toContain('https://youtu.be/test');

    const closeButton = Array.from(container.querySelectorAll('span')).find((node) => node.textContent === 'close');
    expect(closeButton).toBeTruthy();

    await act(async () => {
      closeButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(setShowThumbnailMock).toHaveBeenCalledWith(true);
  });

  it('renders deleted and spoiler thumbnails instead of the original media', async () => {
    await renderMedia({
      commentMediaInfo: {
        type: 'video',
        url: 'https://cdn.example.com/video.mp4',
      },
      deleted: true,
      setShowThumbnail: setShowThumbnailMock,
      showThumbnail: true,
    });

    expect(container.querySelector('img[alt="File deleted"]')).toBeTruthy();

    await renderMedia({
      commentMediaInfo: {
        type: 'video',
        url: 'https://cdn.example.com/video.mp4',
      },
      setShowThumbnail: setShowThumbnailMock,
      showThumbnail: true,
      spoiler: true,
    });

    const spoiler = container.querySelector('img[src="assets/spoiler.png"]');
    expect(spoiler).toBeTruthy();

    await act(async () => {
      spoiler?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(setShowThumbnailMock).toHaveBeenCalledWith(false);
  });

  it('unmutes expanded videos when the preference is enabled', async () => {
    testState.unmuteExpandedVideoSound = true;

    await renderMedia({
      commentMediaInfo: {
        type: 'video',
        url: 'https://cdn.example.com/video.mp4',
      },
      setShowThumbnail: setShowThumbnailMock,
      showThumbnail: false,
    });

    const video = container.querySelector<HTMLVideoElement>('video[src="https://cdn.example.com/video.mp4"]');
    expect(video).toBeTruthy();
    expect(video?.muted).toBe(false);
  });

  it('keeps expanded videos muted when the preference is disabled', async () => {
    await renderMedia({
      commentMediaInfo: {
        type: 'video',
        url: 'https://cdn.example.com/video.mp4',
      },
      setShowThumbnail: setShowThumbnailMock,
      showThumbnail: false,
    });

    const video = container.querySelector<HTMLVideoElement>('video[src="https://cdn.example.com/video.mp4"]');
    expect(video).toBeTruthy();
    expect(video?.muted).toBe(true);
  });

  it('renders collapsed SWF media as a compact placeholder and expands through Ruffle', async () => {
    await renderMedia({
      commentMediaInfo: {
        type: 'swf',
        url: 'https://cdn.example.com/movie.swf',
      },
      setShowThumbnail: setShowThumbnailMock,
      showThumbnail: true,
    });

    const placeholder = Array.from(container.querySelectorAll('span')).find((node) => node.textContent === '[SWF]' && node.getAttribute('role') === 'button');
    expect(placeholder).toBeTruthy();
    expect(container.querySelector('object')).toBeNull();
    expect(container.querySelector('embed')).toBeNull();

    await act(async () => {
      placeholder?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(setShowThumbnailMock).toHaveBeenCalledWith(false);

    await renderMedia({
      commentMediaInfo: {
        type: 'swf',
        url: 'https://cdn.example.com/movie.swf',
      },
      setShowThumbnail: setShowThumbnailMock,
      showThumbnail: false,
    });

    await act(async () => {
      await Promise.resolve();
    });

    expect(container.querySelector('[data-testid="ruffle-player"]')).toBeTruthy();
    expect(testState.ruffleLoadMock).toHaveBeenCalledWith(
      expect.objectContaining({
        allowNetworking: 'internal',
        allowScriptAccess: false,
        autoplay: 'off',
        openUrlMode: 'confirm',
        url: 'https://cdn.example.com/movie.swf',
      }),
    );
    expect(container.querySelector('object')).toBeNull();
    expect(container.querySelector('embed')).toBeNull();
  });
});
