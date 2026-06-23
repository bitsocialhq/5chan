import { useEffect, useState } from 'react';
import { localForageLru } from '../lib/bitsocial-internals/utils';

const gifFrameDb = localForageLru.createInstance({ name: '5chanGifFrames', size: 500 });
const failedUrls = new Set<string>();

type GifFirstFrameStatus = 'idle' | 'loading' | 'ready' | 'failed';

interface GifFirstFrameState {
  frameUrl: string | null;
  status: GifFirstFrameStatus;
}

const IDLE_STATE: GifFirstFrameState = { frameUrl: null, status: 'idle' };
const LOADING_STATE: GifFirstFrameState = { frameUrl: null, status: 'loading' };
const FAILED_STATE: GifFirstFrameState = { frameUrl: null, status: 'failed' };

const getCachedGifFrame = async (url: string): Promise<string | null> => {
  return await gifFrameDb.getItem(url);
};

const setCachedGifFrame = async (url: string, frameUrl: string): Promise<void> => {
  await gifFrameDb.setItem(url, frameUrl);
};

const fetchImage = (url: string): Promise<ArrayBuffer> => {
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open('GET', url, true);
    request.responseType = 'arraybuffer';
    request.onloadend = () => {
      if (request.response !== undefined && (request.status === 200 || request.status === 304)) {
        resolve(request.response);
      } else {
        reject(new Error(`XMLHttpRequest, ${request.statusText}`));
      }
    };
    request.send();
  });
};

const readImage = (file: File): Promise<ArrayBuffer> => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => {
      resolve(reader.result as ArrayBuffer);
    };
    reader.readAsArrayBuffer(file);
  });
};

const parseGif = async (buf: ArrayBuffer): Promise<Blob> => {
  const image = new Image();
  const sourceUrl = URL.createObjectURL(new Blob([buf]));

  await new Promise((resolve, reject) => {
    image.onload = () => {
      URL.revokeObjectURL(sourceUrl);
      resolve(undefined);
    };
    image.onerror = () => {
      URL.revokeObjectURL(sourceUrl);
      reject(new Error('Failed to parse GIF'));
    };
    image.src = sourceUrl;
  });

  const canvas = document.createElement('canvas');
  canvas.width = image.width;
  canvas.height = image.height;
  const ctx = canvas.getContext('2d');
  if (ctx === null) throw new Error('Canvas Context null');
  ctx.drawImage(image, 0, 0, image.width, image.height);
  return await new Promise((resolve, reject) =>
    canvas.toBlob((blob) => {
      if (blob === null) {
        reject('Canvas Blob null');
      } else {
        resolve(blob);
      }
    }),
  );
};

const useFetchGifFirstFrame = (url: string | undefined) => {
  const [gifFirstFrame, setGifFirstFrame] = useState<GifFirstFrameState>(IDLE_STATE);

  useEffect(() => {
    if (!url) {
      setGifFirstFrame((prev) => (prev.status === 'idle' ? prev : IDLE_STATE));
      return;
    }

    let isActive = true;
    setGifFirstFrame((prev) => (prev.status === 'loading' ? prev : LOADING_STATE));

    const fetchFrame = async () => {
      if (failedUrls.has(url)) {
        if (isActive) setGifFirstFrame((prev) => (prev.status === 'failed' ? prev : FAILED_STATE));
        return;
      }

      try {
        const cachedFrame = await getCachedGifFrame(url);
        if (cachedFrame) {
          try {
            const response = await fetch(cachedFrame);
            if (response.ok) {
              if (isActive) setGifFirstFrame({ frameUrl: cachedFrame, status: 'ready' });
              return;
            }
          } catch {}
        }

        const blob = typeof url === 'string' ? await parseGif(await fetchImage(url)) : await parseGif(await readImage(url as File));
        const objectUrl = URL.createObjectURL(blob);
        if (isActive) {
          setGifFirstFrame({ frameUrl: objectUrl, status: 'ready' });
          await setCachedGifFrame(url, objectUrl);
        } else {
          URL.revokeObjectURL(objectUrl);
        }
      } catch (error) {
        failedUrls.add(url);
        console.error('Failed to load GIF frame:', error);
        if (isActive) setGifFirstFrame((prev) => (prev.status === 'failed' ? prev : FAILED_STATE));
      }
    };

    fetchFrame();

    return () => {
      isActive = false;
    };
  }, [url]);

  return gifFirstFrame;
};

export default useFetchGifFirstFrame;
