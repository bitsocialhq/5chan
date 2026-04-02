import { useMemo } from 'react';
import type { Comment } from '@bitsocialnet/bitsocial-react-hooks';
import type { SizeFunction } from 'react-virtuoso';
import useWindowWidth from './use-window-width';
import {
  getReplyHeightEstimates,
  getReplyItemSizeFromElement,
  getTypicalReplyHeight,
  readReplyTypographyMetrics,
  resolveReplyVirtualizationMode,
  type ReplyVirtualizationMode,
} from '../lib/utils/pretext-height-estimates';

interface UseReplyHeightEstimatesOptions {
  directRepliesByParentCid?: Map<string, Comment[]>;
  enabled?: boolean;
  isMobile: boolean;
  maxContentChars?: number;
  mode?: ReplyVirtualizationMode;
  quotedByMap?: Map<string, Comment[]>;
  replies: Comment[];
}

const useReplyHeightEstimates = ({ directRepliesByParentCid, enabled = true, isMobile, maxContentChars, mode, quotedByMap, replies }: UseReplyHeightEstimatesOptions) => {
  const windowWidth = useWindowWidth();
  const themeKey = typeof document !== 'undefined' ? document.body.className : '';
  const effectiveMode = useMemo(() => mode ?? resolveReplyVirtualizationMode(typeof window !== 'undefined' ? window.location.search : undefined), [mode]);

  const metrics = useMemo(() => readReplyTypographyMetrics(), [themeKey, windowWidth]);

  const rawHeightEstimates = useMemo(
    () =>
      !enabled
        ? []
        : getReplyHeightEstimates({
            context: 'thread',
            directRepliesByParentCid,
            isMobile,
            maxContentChars,
            metrics,
            quotedByMap,
            replies,
            windowWidth,
          }),
    [directRepliesByParentCid, enabled, isMobile, maxContentChars, metrics, quotedByMap, replies, windowWidth],
  );

  const heightEstimates = effectiveMode === 'off' ? undefined : rawHeightEstimates;
  const defaultItemHeight = useMemo(() => getTypicalReplyHeight(rawHeightEstimates, isMobile), [rawHeightEstimates, isMobile]);
  const itemSize = useMemo<SizeFunction | undefined>(() => (effectiveMode === 'item-size' ? getReplyItemSizeFromElement : undefined), [effectiveMode]);

  return { defaultItemHeight, heightEstimates, itemSize, metrics, mode: effectiveMode, windowWidth };
};

export default useReplyHeightEstimates;
