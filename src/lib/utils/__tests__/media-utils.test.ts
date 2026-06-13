import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const testState = vi.hoisted(() => ({
  cachedThumbnails: new Map<string, string>(),
  canEmbedHosts: new Set<string>(),
  capacitorHttpGetMock: vi.fn(),
  capacitorHttpRequestMock: vi.fn(),
  consoleErrorMock: vi.fn(),
  fetchMock: vi.fn(),
  isNativePlatform: false,
  localForageGetItemMock: vi.fn(),
  localForageSetItemMock: vi.fn(),
}));

vi.mock('@bitsocial/bitsocial-react-hooks/dist/lib/localforage-lru/index.js', () => ({
  default: {
    createInstance: () => ({
      getItem: (url: string) => testState.localForageGetItemMock(url),
      setItem: (url: string, thumbnail: string) => testState.localForageSetItemMock(url, thumbnail),
    }),
  },
}));

vi.mock('../../../components/embed/embed-utils', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../components/embed/embed-utils')>();
  return {
    ...actual,
    canEmbed: (url: URL) => testState.canEmbedHosts.has(url.hostname),
  };
});

vi.mock('@capacitor/core', () => ({
  Capacitor: {
    isNativePlatform: () => testState.isNativePlatform,
  },
  CapacitorHttp: {
    get: (options: unknown) => testState.capacitorHttpGetMock(options),
    request: (options: unknown) => testState.capacitorHttpRequestMock(options),
  },
}));

import {
  getBestAvailableYouTubeThumbnailUrlFromLink,
  fetchWebpageThumbnailIfNeeded,
  getCommentMediaInfo,
  getDisplayMediaInfoType,
  getHasThumbnail,
  getLinkMediaInfo,
  getMediaDimensions,
  getPostMediaTypeLabel,
  getTwimgMediaFilePublishUrl,
  getYouTubeEmbedPostMediaFileLink,
  getYouTubeThumbnailCandidateUrlsFromLink,
  getYouTubeThumbnailFallbackUrls,
  getYouTubeThumbnailUrlFromLink,
  isMissingYouTubeThumbnailImage,
} from '../media-utils';

const clearMemoizedCache = (fn: unknown) => {
  const memoized = fn as { clear?: () => void };
  memoized.clear?.();
};

const createFetchResponse = (html: string, ok = true) => {
  let sent = false;

  return {
    body: {
      getReader: () => ({
        read: async () => {
          if (sent) {
            return { done: true, value: undefined };
          }

          sent = true;
          return {
            done: false,
            value: new TextEncoder().encode(html),
          };
        },
      }),
    },
    ok,
  };
};

const createHeadResponse = (ok: boolean, contentLength = '12345') => ({
  headers: {
    get: (name: string) => (name.toLowerCase() === 'content-length' ? contentLength : null),
  },
  ok,
});

const createNativeHeadResponse = (status: number, contentLength = '12345') => ({
  headers: {
    'Content-Length': contentLength,
  },
  status,
});

describe('media-utils', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    testState.cachedThumbnails = new Map<string, string>();
    testState.canEmbedHosts = new Set<string>();
    testState.isNativePlatform = false;
    testState.localForageGetItemMock.mockImplementation(async (url: string) => testState.cachedThumbnails.get(url) ?? null);
    testState.localForageSetItemMock.mockImplementation(async (url: string, thumbnail: string) => {
      testState.cachedThumbnails.set(url, thumbnail);
    });
    testState.fetchMock.mockReset();
    testState.capacitorHttpGetMock.mockReset();
    testState.capacitorHttpRequestMock.mockReset();
    vi.stubGlobal('fetch', testState.fetchMock);
    clearMemoizedCache(getHasThumbnail);
    clearMemoizedCache(getLinkMediaInfo);
    clearMemoizedCache(getMediaDimensions);
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(testState.consoleErrorMock);
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
    vi.unstubAllGlobals();
  });

  it('maps media types to translated labels', () => {
    const t = (key: string) => `translated:${key}`;

    expect(getDisplayMediaInfoType('image', t)).toBe('translated:image');
    expect(getDisplayMediaInfoType('gif', t)).toBe('translated:gif');
    expect(getDisplayMediaInfoType('animated gif', t)).toBe('translated:animated_gif');
    expect(getDisplayMediaInfoType('iframe', t)).toBe('translated:iframe');
    expect(getDisplayMediaInfoType('video', t)).toBe('translated:video');
    expect(getDisplayMediaInfoType('audio', t)).toBe('translated:audio');
    expect(getDisplayMediaInfoType('swf', t)).toBe('SWF');
    expect(getDisplayMediaInfoType('unknown', t)).toBe('translated:webpage');
  });

  it('uses the youtube thumbnail url for post media file links and labels', () => {
    const mediaInfo = {
      patternThumbnailUrl: 'https://img.youtube.com/vi/abc123/maxresdefault.jpg',
      type: 'iframe',
      url: 'https://www.youtube.com/watch?v=abc123',
    };

    expect(getYouTubeEmbedPostMediaFileLink(mediaInfo)).toBe('https://img.youtube.com/vi/abc123/maxresdefault.jpg');
    expect(getPostMediaTypeLabel(mediaInfo, 'iframe', (key) => key)).toBe('youtube_video');
    expect(getYouTubeEmbedPostMediaFileLink({ type: 'iframe', url: 'https://streamable.com/clip123' })).toBeUndefined();
    expect(getYouTubeThumbnailUrlFromLink('https://youtu.be/short123')).toBe('https://img.youtube.com/vi/short123/maxresdefault.jpg');
    expect(getYouTubeThumbnailUrlFromLink('https://example.com/watch?v=not-youtube')).toBeUndefined();
  });

  it('builds youtube thumbnail candidates and detects the served missing-thumbnail placeholder', () => {
    expect(getYouTubeThumbnailCandidateUrlsFromLink('https://www.youtube.com/watch?v=abc123')).toEqual([
      'https://img.youtube.com/vi/abc123/maxresdefault.jpg',
      'https://img.youtube.com/vi/abc123/sddefault.jpg',
      'https://img.youtube.com/vi/abc123/mqdefault.jpg',
      'https://img.youtube.com/vi/abc123/hqdefault.jpg',
    ]);
    expect(getYouTubeThumbnailFallbackUrls('https://i3.ytimg.com/vi/abc123/maxresdefault.jpg')).toEqual([
      'https://i3.ytimg.com/vi/abc123/maxresdefault.jpg',
      'https://img.youtube.com/vi/abc123/sddefault.jpg',
      'https://img.youtube.com/vi/abc123/mqdefault.jpg',
      'https://img.youtube.com/vi/abc123/hqdefault.jpg',
    ]);
    expect(getYouTubeThumbnailFallbackUrls('https://i3.ytimg.com/vi/abc123/sddefault.jpg')).toEqual([
      'https://i3.ytimg.com/vi/abc123/sddefault.jpg',
      'https://img.youtube.com/vi/abc123/mqdefault.jpg',
      'https://img.youtube.com/vi/abc123/hqdefault.jpg',
    ]);
    expect(isMissingYouTubeThumbnailImage('https://i3.ytimg.com/vi/abc123/maxresdefault.jpg', 120, 90)).toBe(true);
    expect(isMissingYouTubeThumbnailImage('https://i3.ytimg.com/vi/abc123/maxresdefault.jpg', 1280, 720)).toBe(false);
    expect(isMissingYouTubeThumbnailImage('https://example.com/thumb.jpg', 120, 90)).toBe(false);
  });

  it('resolves the best available youtube thumbnail without accepting the failed placeholder response', async () => {
    testState.fetchMock
      .mockResolvedValueOnce(createHeadResponse(false, '1097'))
      .mockResolvedValueOnce(createHeadResponse(true, '1097'))
      .mockResolvedValueOnce(createHeadResponse(true, '8710'));

    await expect(getBestAvailableYouTubeThumbnailUrlFromLink('https://www.youtube.com/watch?v=resolve123')).resolves.toBe(
      'https://img.youtube.com/vi/resolve123/mqdefault.jpg',
    );
    expect(testState.fetchMock).toHaveBeenNthCalledWith(1, 'https://img.youtube.com/vi/resolve123/maxresdefault.jpg', expect.objectContaining({ method: 'HEAD' }));
    expect(testState.fetchMock).toHaveBeenNthCalledWith(2, 'https://img.youtube.com/vi/resolve123/sddefault.jpg', expect.objectContaining({ method: 'HEAD' }));
    expect(testState.fetchMock).toHaveBeenNthCalledWith(3, 'https://img.youtube.com/vi/resolve123/mqdefault.jpg', expect.objectContaining({ method: 'HEAD' }));
  });

  it('uses native http requests when resolving youtube thumbnails in native builds', async () => {
    testState.isNativePlatform = true;
    testState.capacitorHttpRequestMock.mockResolvedValueOnce(createNativeHeadResponse(404, '1097')).mockResolvedValueOnce(createNativeHeadResponse(200, '8765'));

    await expect(getBestAvailableYouTubeThumbnailUrlFromLink('https://www.youtube.com/watch?v=native123')).resolves.toBe(
      'https://img.youtube.com/vi/native123/sddefault.jpg',
    );
    expect(testState.fetchMock).not.toHaveBeenCalled();
    expect(testState.capacitorHttpRequestMock).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        connectTimeout: 3000,
        method: 'HEAD',
        readTimeout: 3000,
        url: 'https://img.youtube.com/vi/native123/maxresdefault.jpg',
      }),
    );
    expect(testState.capacitorHttpRequestMock).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        method: 'HEAD',
        url: 'https://img.youtube.com/vi/native123/sddefault.jpg',
      }),
    );
  });

  it('returns no youtube thumbnail when every candidate is unavailable', async () => {
    testState.fetchMock.mockResolvedValue(createHeadResponse(false, '1097'));

    await expect(getBestAvailableYouTubeThumbnailUrlFromLink('https://www.youtube.com/watch?v=missing123')).resolves.toBeUndefined();
  });

  it('recognizes which media types expose thumbnails', () => {
    expect(getHasThumbnail(undefined, 'https://example.com/file.png')).toBe(false);
    expect(getHasThumbnail({ type: 'image', url: 'https://example.com/file.png' }, 'https://example.com/file.png')).toBe(true);
    expect(getHasThumbnail({ type: 'video', url: 'https://example.com/file.mp4' }, 'https://example.com/file.mp4')).toBe(true);
    expect(getHasThumbnail({ type: 'audio', url: 'https://example.com/file.mp3' }, 'https://example.com/file.mp3')).toBe(true);
    expect(getHasThumbnail({ type: 'gif', url: 'https://example.com/file.gif' }, 'https://example.com/file.gif')).toBe(true);
    expect(getHasThumbnail({ type: 'swf', url: 'https://example.com/file.swf' }, 'https://example.com/file.swf')).toBe(true);
    expect(getHasThumbnail({ thumbnail: 'https://example.com/thumb.png', type: 'webpage', url: 'https://example.com' }, 'https://example.com')).toBe(true);
    expect(
      getHasThumbnail(
        { patternThumbnailUrl: 'https://img.youtube.com/vi/abc/maxresdefault.jpg', type: 'iframe', url: 'https://www.youtube.com/watch?v=abc' },
        'https://www.youtube.com/watch?v=abc',
      ),
    ).toBe(true);
    expect(getHasThumbnail({ type: 'iframe', url: 'https://example.com/embed' }, 'https://example.com/embed')).toBe(false);
  });

  it('classifies direct media, embeds, imgbb pages, and unknown links', () => {
    testState.canEmbedHosts = new Set(['www.youtube.com', 'streamable.com']);

    expect(getLinkMediaInfo('not-a-url')).toBeUndefined();
    expect(getLinkMediaInfo('https://example.com/_next/image?url=%2Fposter.png')).toMatchObject({ type: 'image' });
    expect(getLinkMediaInfo('https://ibb.co/abc123')).toEqual({
      thumbnail: 'https://i.ibb.co/abc123/thumbnail.jpg',
      type: 'webpage',
      url: 'https://ibb.co/abc123',
    });
    expect(getLinkMediaInfo('https://example.com/file.gif')).toMatchObject({ type: 'gif' });
    expect(getLinkMediaInfo('https://external-preview.redd.it/example.gif?width=480&format=mp4')).toMatchObject({ type: 'video' });
    expect(getLinkMediaInfo('https://example.com/file.jfif')).toMatchObject({ type: 'image' });
    expect(getLinkMediaInfo('https://example.com/file.jpe')).toMatchObject({ type: 'image' });
    expect(getLinkMediaInfo('https://example.com/file.jif')).toMatchObject({ type: 'image' });
    expect(getLinkMediaInfo('https://example.com/file.png')).toMatchObject({ type: 'image' });
    expect(getLinkMediaInfo('https://example.com/file.apng')).toMatchObject({ type: 'image' });
    expect(getLinkMediaInfo('https://example.com/file.avif')).toMatchObject({ type: 'image' });
    expect(getLinkMediaInfo('https://example.com/file.mp4')).toMatchObject({ type: 'video' });
    expect(getLinkMediaInfo('https://example.com/file.mp3')).toMatchObject({ type: 'audio' });
    expect(getLinkMediaInfo('https://example.com/file.swf')).toMatchObject({ type: 'swf' });
    expect(getLinkMediaInfo('https://example.com/path')).toMatchObject({ type: 'webpage' });
    expect(getLinkMediaInfo('https://www.youtube.com/watch?v=abc123')).toEqual({
      patternThumbnailUrl: 'https://img.youtube.com/vi/abc123/maxresdefault.jpg',
      type: 'iframe',
      url: 'https://www.youtube.com/watch?v=abc123',
    });
    expect(getLinkMediaInfo('https://streamable.com/clip123')).toEqual({
      patternThumbnailUrl: 'https://cdn-cf-east.streamable.com/image/clip123.jpg',
      type: 'iframe',
      url: 'https://streamable.com/clip123',
    });
    expect(getLinkMediaInfo('https://yt.example/watch?v=yt123')).toEqual({
      patternThumbnailUrl: 'https://img.youtube.com/vi/yt123/maxresdefault.jpg',
      type: 'iframe',
      url: 'https://yt.example/watch?v=yt123',
    });
    testState.canEmbedHosts = new Set(['yewtu.be']);
    expect(getLinkMediaInfo('https://yewtu.be/invidious123')).toEqual({
      patternThumbnailUrl: 'https://img.youtube.com/vi/invidious123/maxresdefault.jpg',
      type: 'iframe',
      url: 'https://yewtu.be/invidious123',
    });
  });

  it('normalizes known twimg query-format media links for publishing', () => {
    expect(getTwimgMediaFilePublishUrl('https://pbs.twimg.com/media/HJxnhNKWMAAhqFU?format=jpg&name=medium')).toBe('https://pbs.twimg.com/media/HJxnhNKWMAAhqFU.jpg');
    expect(getTwimgMediaFilePublishUrl('http://pbs.twimg.com/media/HJxnhNKWMAAhqFU?format=PNG&name=small')).toBe('https://pbs.twimg.com/media/HJxnhNKWMAAhqFU.png');
    expect(getTwimgMediaFilePublishUrl('https://pbs.twimg.com/media/HJxnhNKWMAAhqFU.jpg?format=png&name=medium')).toBeUndefined();
    expect(getTwimgMediaFilePublishUrl('https://example.com/media/HJxnhNKWMAAhqFU?format=jpg&name=medium')).toBeUndefined();
    expect(getTwimgMediaFilePublishUrl('https://pbs.twimg.com/media/HJxnhNKWMAAhqFU?format=txt&name=medium')).toBeUndefined();
  });

  it('builds comment media info and strips thumbnails for blacklisted domains', () => {
    testState.canEmbedHosts = new Set(['www.youtube.com']);

    expect(getCommentMediaInfo('', '', 0, 0)).toBeUndefined();
    expect(getCommentMediaInfo('https://example.com/file.png', 'https://example.com/thumb.png', 320, 240)).toEqual({
      linkHeight: 240,
      linkWidth: 320,
      thumbnail: 'https://example.com/thumb.png',
      type: 'image',
      url: 'https://example.com/file.png',
    });
    expect(getCommentMediaInfo('https://example.com/file.png', 'http://127.0.0.1/thumb.png', 320, 240)).toEqual({
      linkHeight: 240,
      linkWidth: 320,
      thumbnail: undefined,
      type: 'image',
      url: 'https://example.com/file.png',
    });
    expect(getCommentMediaInfo('https://example.com/post', '//192.168.1.1/thumb.png', 320, 240)).toEqual({
      linkHeight: 240,
      linkWidth: 320,
      thumbnail: undefined,
      type: 'webpage',
      url: 'https://example.com/post',
    });
    expect(getCommentMediaInfo('https://x.com/post/123', 'https://example.com/thumb.png', 100, 50)).toEqual({
      linkHeight: 50,
      linkWidth: 100,
      patternThumbnailUrl: undefined,
      thumbnail: undefined,
      type: 'webpage',
      url: 'https://x.com/post/123',
    });
    expect(getCommentMediaInfo('https://www.youtube.com/watch?v=abc123', '', 800, 450)).toEqual({
      linkHeight: 450,
      linkWidth: 800,
      patternThumbnailUrl: 'https://img.youtube.com/vi/abc123/maxresdefault.jpg',
      thumbnail: undefined,
      type: 'iframe',
      url: 'https://www.youtube.com/watch?v=abc123',
    });
  });

  it('returns expected media dimensions for embeds, audio, and sized media', () => {
    testState.canEmbedHosts = new Set(['www.youtube.com', 'www.reddit.com']);

    expect(getMediaDimensions({ type: 'iframe', url: 'https://www.youtube.com/watch?v=abc123' })).toBe('800x450');
    expect(getMediaDimensions({ type: 'iframe', url: 'https://www.reddit.com/r/example/comments/abc123' })).toBe('500x520');
    expect(getMediaDimensions({ type: 'audio', url: 'https://example.com/file.mp3' })).toBe('700x240');
    expect(getMediaDimensions({ linkHeight: 480, linkWidth: 640, type: 'image', url: 'https://example.com/file.png' })).toBe('640x480');
    expect(getMediaDimensions({ linkHeight: 720, linkWidth: 1280, type: 'video', url: 'https://example.com/file.mp4' })).toBe('1280x720');
    expect(getMediaDimensions({ linkHeight: 480, linkWidth: 640, type: 'swf', url: 'https://example.com/file.swf' })).toBe('640x480');
    expect(getMediaDimensions({ type: 'webpage', url: 'https://example.com' })).toBe('');
  });

  it('uses cached webpage thumbnails before fetching the network', async () => {
    testState.cachedThumbnails.set('https://example.com/cached', 'https://cdn.example/cached.png');

    const result = await fetchWebpageThumbnailIfNeeded({
      type: 'webpage',
      url: 'https://example.com/cached',
    });

    expect(result).toEqual({
      thumbnail: 'https://cdn.example/cached.png',
      type: 'webpage',
      url: 'https://example.com/cached',
    });
    expect(testState.fetchMock).not.toHaveBeenCalled();
  });

  it('fetches og:image thumbnails on web and persists them', async () => {
    testState.fetchMock.mockResolvedValue(
      createFetchResponse(`
        <html>
          <head><meta property="og:image" content="https://cdn.example/og.png" /></head>
          <body></body>
        </html>
      `),
    );

    const result = await fetchWebpageThumbnailIfNeeded({
      type: 'webpage',
      url: 'https://example.com/og-page',
    });

    expect(testState.fetchMock).toHaveBeenCalledWith('https://example.com/og-page', expect.objectContaining({ headers: { Accept: 'text/html' }, redirect: 'manual' }));
    expect(testState.localForageSetItemMock).toHaveBeenCalledWith('https://example.com/og-page', 'https://cdn.example/og.png');
    expect(result).toEqual({
      thumbnail: 'https://cdn.example/og.png',
      type: 'webpage',
      url: 'https://example.com/og-page',
    });
  });

  it('falls back to the first image when og:image is not allowed', async () => {
    testState.fetchMock.mockResolvedValue(
      createFetchResponse(`
        <html>
          <head><meta property="og:image" content="http://127.0.0.1/og.png" /></head>
          <body><img src="https://cdn.example/fallback.png" /></body>
        </html>
      `),
    );

    const result = await fetchWebpageThumbnailIfNeeded({
      type: 'webpage',
      url: 'https://example.com/fallback-page',
    });

    expect(testState.localForageSetItemMock).toHaveBeenCalledWith('https://example.com/fallback-page', 'https://cdn.example/fallback.png');
    expect(result).toEqual({
      thumbnail: 'https://cdn.example/fallback.png',
      type: 'webpage',
      url: 'https://example.com/fallback-page',
    });
  });

  it('fetches first-image thumbnails on native and resolves relative urls', async () => {
    testState.isNativePlatform = true;
    testState.capacitorHttpGetMock.mockResolvedValue({
      data: `
        <html>
          <body><img src="/poster.png" /></body>
        </html>
      `,
    });

    const result = await fetchWebpageThumbnailIfNeeded({
      type: 'webpage',
      url: 'https://example.com/native-page',
    });

    expect(testState.capacitorHttpGetMock).toHaveBeenCalledWith(
      expect.objectContaining({
        connectTimeout: 5000,
        disableRedirects: true,
        headers: { Accept: 'text/html', Range: 'bytes=0-1048575' },
        readTimeout: 5000,
        responseType: 'text',
        url: 'https://example.com/native-page',
      }),
    );
    expect(result).toEqual({
      thumbnail: 'https://example.com/poster.png',
      type: 'webpage',
      url: 'https://example.com/native-page',
    });
  });

  it('returns unchanged media when thumbnails already exist or fetching fails', async () => {
    const existing = {
      thumbnail: 'https://cdn.example/existing.png',
      type: 'webpage',
      url: 'https://example.com/ready',
    } as const;
    expect(await fetchWebpageThumbnailIfNeeded(existing)).toBe(existing);

    testState.fetchMock.mockResolvedValue(createFetchResponse('<html></html>', false));
    const result = await fetchWebpageThumbnailIfNeeded({
      type: 'webpage',
      url: 'https://example.com/failure',
    });

    expect(result).toEqual({
      thumbnail: undefined,
      type: 'webpage',
      url: 'https://example.com/failure',
    });
    expect(consoleErrorSpy).toHaveBeenCalled();
  });
});
