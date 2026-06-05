import { useMemo } from 'react';
import type { Comment } from '@bitsocial/bitsocial-react-hooks';
import type { SizeFunction } from 'react-virtuoso';
import { useLocation } from 'react-router-dom';
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
  const location = useLocation();
  const windowWidth = useWindowWidth();
  const themeKey = typeof document !== 'undefined' ? document.body.className : '';
  const effectiveMode = mode ?? resolveReplyVirtualizationMode(location.search);

  const metrics = useMemo(() => readReplyTypographyMetrics(), [themeKey, windowWidth]);

  const rawHeightEstimates = !enabled
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
      });

  const heightEstimates = effectiveMode === 'off' ? undefined : rawHeightEstimates;
  const defaultItemHeight = getTypicalReplyHeight(rawHeightEstimates, isMobile);
  const itemSize: SizeFunction | undefined = effectiveMode === 'item-size' ? getReplyItemSizeFromElement : undefined;

  return { defaultItemHeight, heightEstimates, itemSize, metrics, mode: effectiveMode, windowWidth };
};

export default useReplyHeightEstimates;
