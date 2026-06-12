import { useCallback, useMemo, useState } from 'react';
import { getYouTubeThumbnailFallbackUrls, isMissingYouTubeThumbnailImage } from '../lib/utils/media-utils';

interface YouTubeThumbnailFallbackState {
  sourceUrl?: string;
  index: number;
  unavailable: boolean;
}

export const useYouTubeThumbnailFallback = (thumbnailUrl: string | undefined) => {
  const fallbackUrls = useMemo(() => getYouTubeThumbnailFallbackUrls(thumbnailUrl), [thumbnailUrl]);
  const [state, setState] = useState<YouTubeThumbnailFallbackState>({ index: 0, unavailable: false });
  const index = state.sourceUrl === thumbnailUrl ? state.index : 0;
  const unavailable = state.sourceUrl === thumbnailUrl ? state.unavailable : false;
  const resolvedThumbnailUrl = unavailable ? undefined : (fallbackUrls[index] ?? thumbnailUrl);

  const advance = useCallback(() => {
    if (!thumbnailUrl || !fallbackUrls.length) {
      return false;
    }

    if (index < fallbackUrls.length - 1) {
      setState({ index: index + 1, sourceUrl: thumbnailUrl, unavailable: false });
      return true;
    }

    if (fallbackUrls.length > 1) {
      setState({ index, sourceUrl: thumbnailUrl, unavailable: true });
      return true;
    }

    return false;
  }, [fallbackUrls, index, thumbnailUrl]);

  const handleThumbnailLoad = useCallback(
    (image: HTMLImageElement) => {
      if (!resolvedThumbnailUrl || !isMissingYouTubeThumbnailImage(resolvedThumbnailUrl, image.naturalWidth, image.naturalHeight)) {
        return false;
      }

      return advance();
    },
    [advance, resolvedThumbnailUrl],
  );

  return {
    handleThumbnailError: advance,
    handleThumbnailLoad,
    isUnavailable: unavailable,
    thumbnailUrl: resolvedThumbnailUrl,
  };
};
