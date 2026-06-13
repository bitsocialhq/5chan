import { useCallback, useEffect, useRef, useState } from 'react';
import { getBestAvailableYouTubeThumbnailUrlFromLink, getYouTubeThumbnailUrlFromLink } from '../lib/utils/media-utils';

const YOUTUBE_THUMBNAIL_LINK_CONVERSION_DELAY_SECONDS = 3;
const YOUTUBE_THUMBNAIL_LINK_CONVERSION_INTERVAL_MS = 1000;

type ElementRef<T extends HTMLElement> = {
  readonly current: T | null;
};

interface PendingYouTubeThumbnailLinkConversion {
  thumbnailLinkPromise: Promise<string | undefined>;
  youtubeLink: string;
}

interface UseYouTubeThumbnailLinkConversionOptions {
  enabled: boolean;
  onContentChange: (content: string) => void;
  onLinkChange: (link: string) => void;
  textRef: ElementRef<HTMLTextAreaElement>;
  urlRef: ElementRef<HTMLInputElement>;
}

const getContentWithYouTubeLinkAtTop = (content: string, youtubeLink: string): string => {
  if (!content) return youtubeLink;
  if (content === youtubeLink || content.startsWith(`${youtubeLink}\n`) || content.startsWith(`${youtubeLink}\r\n`)) return content;
  return `${youtubeLink}\n${content}`;
};

const getPendingConversion = (link: string): PendingYouTubeThumbnailLinkConversion | null => {
  const youtubeLink = link.trim();
  const preferredThumbnailLink = getYouTubeThumbnailUrlFromLink(youtubeLink);

  if (!youtubeLink || !preferredThumbnailLink || youtubeLink === preferredThumbnailLink) {
    return null;
  }

  return { thumbnailLinkPromise: getBestAvailableYouTubeThumbnailUrlFromLink(youtubeLink), youtubeLink };
};

export const useYouTubeThumbnailLinkConversion = ({ enabled, onContentChange, onLinkChange, textRef, urlRef }: UseYouTubeThumbnailLinkConversionOptions) => {
  const [noticeCountdown, setNoticeCountdown] = useState<number | null>(null);
  const pendingConversionRef = useRef<PendingYouTubeThumbnailLinkConversion | null>(null);
  const timeoutRef = useRef<number | null>(null);

  const clearCountdownTimer = useCallback(() => {
    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const cancelPendingConversion = useCallback(() => {
    clearCountdownTimer();
    pendingConversionRef.current = null;
    setNoticeCountdown(null);
  }, [clearCountdownTimer]);

  const applyPendingConversion = useCallback(async () => {
    if (!enabled) {
      cancelPendingConversion();
      return false;
    }

    const currentLink = urlRef.current?.value.trim() || '';
    const pendingConversion = pendingConversionRef.current ?? getPendingConversion(currentLink);
    if (!pendingConversion || currentLink !== pendingConversion.youtubeLink) {
      cancelPendingConversion();
      return false;
    }

    const thumbnailLink = await pendingConversion.thumbnailLinkPromise;
    const latestLink = urlRef.current?.value.trim() || '';
    if (!thumbnailLink || latestLink !== pendingConversion.youtubeLink) {
      cancelPendingConversion();
      return false;
    }

    clearCountdownTimer();
    pendingConversionRef.current = null;
    setNoticeCountdown(null);

    const currentContent = textRef.current?.value || '';
    const nextContent = getContentWithYouTubeLinkAtTop(currentContent, pendingConversion.youtubeLink);

    if (textRef.current) {
      textRef.current.value = nextContent;
    }
    if (urlRef.current) {
      urlRef.current.value = thumbnailLink;
    }

    onContentChange(nextContent);
    onLinkChange(thumbnailLink);
    return true;
  }, [cancelPendingConversion, clearCountdownTimer, enabled, onContentChange, onLinkChange, textRef, urlRef]);

  const scheduleConversionCountdown = useCallback(
    (remainingSeconds: number) => {
      clearCountdownTimer();

      const tick = (seconds: number) => {
        if (!pendingConversionRef.current) {
          setNoticeCountdown(null);
          return;
        }

        if (seconds <= 0) {
          void applyPendingConversion();
          return;
        }

        setNoticeCountdown(seconds);
        timeoutRef.current = window.setTimeout(() => tick(seconds - 1), YOUTUBE_THUMBNAIL_LINK_CONVERSION_INTERVAL_MS);
      };

      tick(remainingSeconds);
    },
    [applyPendingConversion, clearCountdownTimer],
  );

  const queueLinkConversion = useCallback(
    (link: string) => {
      if (!enabled) {
        cancelPendingConversion();
        return false;
      }

      const pendingConversion = getPendingConversion(link);
      if (!pendingConversion) {
        cancelPendingConversion();
        return false;
      }

      if (pendingConversionRef.current?.youtubeLink === pendingConversion.youtubeLink) {
        return true;
      }

      pendingConversionRef.current = pendingConversion;
      scheduleConversionCountdown(YOUTUBE_THUMBNAIL_LINK_CONVERSION_DELAY_SECONDS);
      return true;
    },
    [cancelPendingConversion, enabled, scheduleConversionCountdown],
  );

  useEffect(() => {
    if (!enabled) {
      cancelPendingConversion();
    }
  }, [cancelPendingConversion, enabled]);

  useEffect(
    () => () => {
      clearCountdownTimer();
      pendingConversionRef.current = null;
    },
    [clearCountdownTimer],
  );

  return {
    applyPendingConversion,
    cancelPendingConversion,
    noticeCountdown,
    queueLinkConversion,
  };
};
