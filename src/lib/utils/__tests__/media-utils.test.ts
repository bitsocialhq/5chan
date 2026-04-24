import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const testState = vi.hoisted(() => ({
  cachedThumbnails: new Map<string, string>(),
  canEmbedHosts: new Set<string>(),
  capacitorHttpGetMock: vi.fn(),
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

vi.mock('../../../components/embed', () => ({
  canEmbed: (url: URL) => testState.canEmbedHosts.has(url.hostname),
}));

vi.mock('@capacitor/core', () => ({
  Capacitor: {
    isNativePlatform: () => testState.isNativePlatform,
  },
  CapacitorHttp: {
    get: (options: unknown) => testState.capacitorHttpGetMock(options),
  },
}));

import { fetchWebpageThumbnailIfNeeded, getCommentMediaInfo, getDisplayMediaInfoType, getHasThumbnail, getLinkMediaInfo, getMediaDimensions } from '../media-utils';

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
    expect(getDisplayMediaInfoType('unknown', t)).toBe('translated:webpage');
  });

  it('recognizes which media types expose thumbnails', () => {
    expect(getHasThumbnail(undefined, 'https://example.com/file.png')).toBe(false);
    expect(getHasThumbnail({ type: 'image', url: 'https://example.com/file.png' }, 'https://example.com/file.png')).toBe(true);
    expect(getHasThumbnail({ type: 'video', url: 'https://example.com/file.mp4' }, 'https://example.com/file.mp4')).toBe(true);
    expect(getHasThumbnail({ type: 'audio', url: 'https://example.com/file.mp3' }, 'https://example.com/file.mp3')).toBe(true);
    expect(getHasThumbnail({ type: 'gif', url: 'https://example.com/file.gif' }, 'https://example.com/file.gif')).toBe(true);
    expect(getHasThumbnail({ thumbnail: 'https://example.com/thumb.png', type: 'webpage', url: 'https://example.com' }, 'https://example.com')).toBe(true);
    expect(
      getHasThumbnail(
        { patternThumbnailUrl: 'https://img.youtube.com/vi/abc/0.jpg', type: 'iframe', url: 'https://www.youtube.com/watch?v=abc' },
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
    expect(getLinkMediaInfo('https://example.com/file.png')).toMatchObject({ type: 'image' });
    expect(getLinkMediaInfo('https://example.com/file.mp4')).toMatchObject({ type: 'video' });
    expect(getLinkMediaInfo('https://example.com/file.mp3')).toMatchObject({ type: 'audio' });
    expect(getLinkMediaInfo('https://example.com/path')).toMatchObject({ type: 'webpage' });
    expect(getLinkMediaInfo('https://www.youtube.com/watch?v=abc123')).toEqual({
      patternThumbnailUrl: 'https://img.youtube.com/vi/abc123/0.jpg',
      type: 'iframe',
      url: 'https://www.youtube.com/watch?v=abc123',
    });
    expect(getLinkMediaInfo('https://streamable.com/clip123')).toEqual({
      patternThumbnailUrl: 'https://cdn-cf-east.streamable.com/image/clip123.jpg',
      type: 'iframe',
      url: 'https://streamable.com/clip123',
    });
    expect(getLinkMediaInfo('https://yt.example/watch?v=yt123')).toEqual({
      patternThumbnailUrl: 'https://img.youtube.com/vi/yt123/0.jpg',
      type: 'iframe',
      url: 'https://yt.example/watch?v=yt123',
    });
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
      patternThumbnailUrl: 'https://img.youtube.com/vi/abc123/0.jpg',
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
