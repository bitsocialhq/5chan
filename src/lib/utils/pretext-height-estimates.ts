import type { Comment } from '@bitsocial/bitsocial-react-hooks';
import { layout, layoutNextLine, prepare, prepareWithSegments } from '@chenglou/pretext';
import { getCommentMediaInfo, getHasThumbnail } from './media-utils';
import { EXPANDED_MEDIA_DATA_ATTRIBUTE } from './measurement-attributes';
import { CATALOG_PREVIEW_MARKDOWN_OPTIONS, removeMarkdown, type RemoveMarkdownOptions } from './post-utils';
import { getRenderableMobileBacklinks } from './reply-backlink-utils';

export type ReplyVirtualizationMode = 'off' | 'estimates' | 'item-size';
export type CatalogImageSize = 'Small' | 'Large';
type ReplyEstimateContext = 'preview' | 'thread';

type ReplyHeightAuditSample = {
  actual: number;
  cid: string;
  diff: number;
  estimate: number;
};

type ReplyHeightAuditStore = {
  getSummary: () => { maxAbsoluteError: number; meanAbsoluteError: number; sampleCount: number };
  record: (sample: ReplyHeightAuditSample) => void;
  reset: () => void;
  samples: Map<string, ReplyHeightAuditSample>;
};

const PT_TO_PX = 96 / 72;
const DESKTOP_REPLY_BASE_HEIGHT = 46;
const DESKTOP_REPLY_FILE_TEXT_HEIGHT = 18;
const DESKTOP_REPLY_FLOAT_MARGIN_WIDTH = 40;
const DESKTOP_REPLY_FLOAT_MARGIN_HEIGHT = 8;
const DESKTOP_REPLY_SIDE_ARROWS_WIDTH = 24;
const DESKTOP_REPLY_CONTENT_PADDING_X = 80;
const DESKTOP_FEED_CARD_BASE_HEIGHT = 56;
const DESKTOP_FEED_CARD_HR_HEIGHT = 14;
const DESKTOP_FEED_CARD_BOARD_LABEL_HEIGHT = 18;
const DESKTOP_FEED_CARD_SUMMARY_HEIGHT = 25;
const DESKTOP_FEED_CARD_BASE_CALIBRATION = -59;
const DESKTOP_POST_MESSAGE_VERTICAL_PADDING = 26;
const DESKTOP_PREVIEW_REPLY_TEXT_CALIBRATION = 6;
const DESKTOP_PREVIEW_REPLY_MEDIA_CALIBRATION = -17;
const MOBILE_REPLY_BASE_HEIGHT = 64;
const MOBILE_REPLY_MEDIA_EXTRA_HEIGHT = 26;
const MOBILE_REPLY_CONTENT_PADDING_X = 20;
const MOBILE_FEED_CARD_BASE_HEIGHT = 84;
const MOBILE_FEED_CARD_OUTER_GAP_HEIGHT = 60;
const MOBILE_FEED_CARD_LINK_BAR_HEIGHT = 36;
const MOBILE_FEED_CARD_PREVIEW_COUNT_CALIBRATIONS = [105, 85, 95, 120, 150, 180] as const;
const DESKTOP_THREAD_REPLY_CALIBRATION = 0;
const CATALOG_ROW_PADDING_TOP = 20;
const CATALOG_CARD_MARGIN_Y = 4;
const CATALOG_CARD_PADDING_TOP = 10;
const CATALOG_CARD_PADDING_BOTTOM = 3;
const CATALOG_CARD_MEDIA_GAP_HEIGHT = 5;
const CATALOG_CARD_META_HEIGHT = 14;
const CATALOG_CARD_MAX_HEIGHT = 320;
const CATALOG_CARD_TEXT_PADDING_X = 30;
const SMALL_CATALOG_CARD_WIDTH = 180;
const LARGE_CATALOG_CARD_WIDTH = 270;
const SMALL_CATALOG_MEDIA_SIZE = 150;
const LARGE_CATALOG_MEDIA_SIZE = 250;
const DEFAULT_DESKTOP_HEIGHT = 140;
const DEFAULT_MOBILE_HEIGHT = 180;
const DEFAULT_CATALOG_ROW_HEIGHT = 220;
const MIN_ESTIMATE_HEIGHT = 72;
const MIN_TEXT_WIDTH = 48;
const MOBILE_BACKLINK_FULL_COST_COUNT = 16;
const MOBILE_BACKLINK_TAIL_COST = 14;
const COMMENT_TOO_LONG_NOTICE = 'Comment too long. Click here to view the full text.';
const DEFAULT_REPLY_VIRTUALIZATION_MODE: ReplyVirtualizationMode = 'item-size';
const REPLY_VIRTUALIZATION_MODES: ReplyVirtualizationMode[] = ['off', 'estimates', 'item-size'];

const REPLY_HEIGHT_DATA_ATTRIBUTE = 'data-pretext-height';

type PreparedText = ReturnType<typeof prepare>;
type PreparedTextWithSegments = ReturnType<typeof prepareWithSegments>;

interface ReplyTypographyMetrics {
  abbrFontSizePx: number;
  bodyFontFamily: string;
  bodyFontSizePx: number;
  mobileContentFontSizePx: number;
}

interface MediaMetrics {
  blockHeight: number;
  floatHeight: number;
  floatWidth: number;
}

interface ReplyBacklinkMaps {
  directRepliesByParentCid?: Map<string, Comment[]>;
  quotedByMap?: Map<string, Comment[]>;
}

interface ReplyHeightEstimateOptions extends ReplyBacklinkMaps {
  context?: ReplyEstimateContext;
  isMobile: boolean;
  maxContentChars?: number;
  metrics: ReplyTypographyMetrics;
  replies: Comment[];
  windowWidth: number;
}

interface FeedPostHeightEstimateOptions extends ReplyBacklinkMaps {
  isMobile: boolean;
  metrics: ReplyTypographyMetrics;
  post: Comment | undefined;
  previewReplies: Comment[];
  previewReplyEstimates?: number[];
  showBoardLabel?: boolean;
  showSummary?: boolean;
  windowWidth: number;
}

interface CatalogPostHeightEstimateOptions {
  imageSize: CatalogImageSize;
  metrics: ReplyTypographyMetrics;
  post: Comment | undefined;
  showOPComment: boolean;
}

interface CatalogSingleRowHeightEstimateOptions {
  imageSize: CatalogImageSize;
  metrics: ReplyTypographyMetrics;
  row: Comment[];
  showOPComment: boolean;
}

interface CatalogRowHeightEstimateOptions {
  imageSize: CatalogImageSize;
  metrics: ReplyTypographyMetrics;
  rows: Comment[][];
  showOPComment: boolean;
}

const preparedTextCache = new Map<string, PreparedText>();
const preparedSegmentCache = new Map<string, PreparedTextWithSegments>();
const paragraphHeightCache = new WeakMap<PreparedText, Map<string, number>>();
const paragraphFloatHeightCache = new WeakMap<PreparedTextWithSegments, Map<string, number>>();
const nestedPretextElementCache = new WeakMap<HTMLElement, HTMLElement | null>();
const catalogPostHeightEstimateCache = new Map<string, number>();
const catalogRowHeightEstimateCache = new Map<string, number>();
const feedPostHeightEstimateCache = new Map<string, number>();
const FEED_POST_HEIGHT_ESTIMATE_CACHE_LIMIT = 2000;

let pretextSupport: boolean | undefined;

const parseCssLengthToPx = (value: string | null | undefined, fallbackPx: number): number => {
  const trimmedValue = value?.trim();
  if (!trimmedValue) {
    return fallbackPx;
  }

  if (trimmedValue.endsWith('px')) {
    const parsedValue = parseFloat(trimmedValue);
    return Number.isFinite(parsedValue) ? parsedValue : fallbackPx;
  }

  if (trimmedValue.endsWith('pt')) {
    const parsedValue = parseFloat(trimmedValue);
    return Number.isFinite(parsedValue) ? parsedValue * PT_TO_PX : fallbackPx;
  }

  const parsedValue = parseFloat(trimmedValue);
  return Number.isFinite(parsedValue) ? parsedValue : fallbackPx;
};

const getPreparedText = (text: string, font: string, usePreWrap: boolean): PreparedText => {
  const cacheKey = `${font}\u0000${usePreWrap ? 'pre-wrap' : 'normal'}\u0000${text}`;
  const cachedPreparedText = preparedTextCache.get(cacheKey);
  if (cachedPreparedText) {
    return cachedPreparedText;
  }

  const preparedText = prepare(text, font, usePreWrap ? { whiteSpace: 'pre-wrap' } : undefined);
  preparedTextCache.set(cacheKey, preparedText);
  return preparedText;
};

const getPreparedSegmentText = (text: string, font: string, usePreWrap: boolean): PreparedTextWithSegments => {
  const cacheKey = `${font}\u0000${usePreWrap ? 'pre-wrap' : 'normal'}\u0000${text}`;
  const cachedPreparedText = preparedSegmentCache.get(cacheKey);
  if (cachedPreparedText) {
    return cachedPreparedText;
  }

  const preparedText = prepareWithSegments(text, font, usePreWrap ? { whiteSpace: 'pre-wrap' } : undefined);
  preparedSegmentCache.set(cacheKey, preparedText);
  return preparedText;
};

const getCachedParagraphHeight = (preparedText: PreparedText, cacheKey: string, compute: () => number): number => {
  const cachedByMeasurement = paragraphHeightCache.get(preparedText);
  const cachedHeight = cachedByMeasurement?.get(cacheKey);
  if (cachedHeight !== undefined) {
    return cachedHeight;
  }

  const measuredHeight = compute();
  const nextCache = cachedByMeasurement ?? new Map<string, number>();
  nextCache.set(cacheKey, measuredHeight);
  if (!cachedByMeasurement) {
    paragraphHeightCache.set(preparedText, nextCache);
  }
  return measuredHeight;
};

const getCachedParagraphFloatHeight = (preparedText: PreparedTextWithSegments, cacheKey: string, compute: () => number): number => {
  const cachedByMeasurement = paragraphFloatHeightCache.get(preparedText);
  const cachedHeight = cachedByMeasurement?.get(cacheKey);
  if (cachedHeight !== undefined) {
    return cachedHeight;
  }

  const measuredHeight = compute();
  const nextCache = cachedByMeasurement ?? new Map<string, number>();
  nextCache.set(cacheKey, measuredHeight);
  if (!cachedByMeasurement) {
    paragraphFloatHeightCache.set(preparedText, nextCache);
  }
  return measuredHeight;
};

const canUsePretext = (): boolean => {
  if (typeof pretextSupport === 'boolean') {
    return pretextSupport;
  }

  if (typeof document === 'undefined' || typeof Intl === 'undefined' || typeof Intl.Segmenter === 'undefined') {
    pretextSupport = false;
    return pretextSupport;
  }

  try {
    const canvas = document.createElement('canvas');
    pretextSupport = Boolean(canvas.getContext?.('2d'));
  } catch {
    pretextSupport = false;
  }

  return pretextSupport;
};

const getLineHeight = (fontSizePx: number): number => Math.ceil(fontSizePx * 1.35);

const getCatalogCardWidth = (imageSize: CatalogImageSize): number => (imageSize === 'Large' ? LARGE_CATALOG_CARD_WIDTH : SMALL_CATALOG_CARD_WIDTH);

const getCatalogMediaMaxSize = (imageSize: CatalogImageSize): number => (imageSize === 'Large' ? LARGE_CATALOG_MEDIA_SIZE : SMALL_CATALOG_MEDIA_SIZE);

const getCatalogEstimateCachePrefix = (imageSize: CatalogImageSize, metrics: ReplyTypographyMetrics, showOPComment: boolean): string =>
  [imageSize, showOPComment ? '1' : '0', metrics.bodyFontFamily, metrics.bodyFontSizePx].join('\u0000');

const clampEstimateHeight = (value: number): number => Math.max(MIN_ESTIMATE_HEIGHT, Math.ceil(value));

const getMedianEstimate = (estimates: number[], fallback: number): number => {
  if (estimates.length === 0) {
    return fallback;
  }

  const sortedEstimates = [...estimates].sort((leftValue, rightValue) => leftValue - rightValue);
  return sortedEstimates[Math.floor(sortedEstimates.length / 2)];
};

const isReplyHeightAuditEnabled = (): boolean =>
  import.meta.env.DEV && typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('pretextReplyAudit') === '1';

const getReplyHeightAuditStore = (): ReplyHeightAuditStore | null => {
  if (!isReplyHeightAuditEnabled() || typeof window === 'undefined') {
    return null;
  }

  const auditWindow = window as Window & { __PRETEXT_REPLY_AUDIT__?: ReplyHeightAuditStore };
  if (auditWindow.__PRETEXT_REPLY_AUDIT__) {
    return auditWindow.__PRETEXT_REPLY_AUDIT__;
  }

  const samples = new Map<string, ReplyHeightAuditSample>();
  auditWindow.__PRETEXT_REPLY_AUDIT__ = {
    getSummary: () => {
      const allSamples = [...samples.values()];
      const totalAbsoluteError = allSamples.reduce((sum, sample) => sum + Math.abs(sample.diff), 0);
      return {
        maxAbsoluteError: allSamples.length === 0 ? 0 : Math.max(...allSamples.map((sample) => Math.abs(sample.diff))),
        meanAbsoluteError: allSamples.length === 0 ? 0 : Math.round((totalAbsoluteError / allSamples.length) * 10) / 10,
        sampleCount: allSamples.length,
      };
    },
    record: (sample) => {
      samples.set(sample.cid, sample);
    },
    reset: () => {
      samples.clear();
    },
    samples,
  };

  return auditWindow.__PRETEXT_REPLY_AUDIT__;
};

const isReplyVirtualizationMode = (value: string | null | undefined): value is ReplyVirtualizationMode =>
  value !== null && value !== undefined && REPLY_VIRTUALIZATION_MODES.includes(value as ReplyVirtualizationMode);

const resolveSearchParams = (searchParams: URLSearchParams | string | null | undefined): URLSearchParams | undefined => {
  if (searchParams instanceof URLSearchParams) {
    if ([...searchParams.keys()].length > 0) {
      return searchParams;
    }
  } else if (typeof searchParams === 'string') {
    const trimmedSearch = searchParams.trim();
    if (trimmedSearch && trimmedSearch !== '?') {
      return new URLSearchParams(trimmedSearch.startsWith('?') ? trimmedSearch : `?${trimmedSearch}`);
    }
  } else if (searchParams) {
    return searchParams;
  }

  if (typeof window === 'undefined') {
    return undefined;
  }

  const hashQueryIndex = window.location.hash.indexOf('?');
  if (hashQueryIndex === -1) {
    return undefined;
  }

  return new URLSearchParams(window.location.hash.slice(hashQueryIndex));
};

const getMediaBoxDimensions = (comment: Comment | undefined, maxThumbnailSize: number): { height: number; width: number } | null => {
  if (!comment?.link) {
    return null;
  }

  const mediaInfo = getCommentMediaInfo(comment.link, comment.thumbnailUrl, comment.linkWidth, comment.linkHeight);
  if (!mediaInfo) {
    return null;
  }

  let mediaWidth = maxThumbnailSize;
  let mediaHeight = maxThumbnailSize;

  if (comment.spoiler) {
    mediaWidth = 100;
    mediaHeight = 100;
  } else if (mediaInfo.type === 'audio') {
    mediaHeight = 54;
  } else if (mediaInfo.linkWidth && mediaInfo.linkHeight) {
    const scale = Math.min(1, maxThumbnailSize / Math.max(mediaInfo.linkWidth, mediaInfo.linkHeight));
    mediaWidth = Math.max(MIN_TEXT_WIDTH, Math.round(mediaInfo.linkWidth * scale));
    mediaHeight = Math.max(40, Math.round(mediaInfo.linkHeight * scale));
  }

  return { height: mediaHeight, width: mediaWidth };
};

const getReplyMediaMetrics = (reply: Comment | undefined): MediaMetrics | null => {
  const mediaBox = getMediaBoxDimensions(reply, 125);
  if (!mediaBox) {
    return null;
  }

  return {
    blockHeight: mediaBox.height + MOBILE_REPLY_MEDIA_EXTRA_HEIGHT,
    floatHeight: mediaBox.height + DESKTOP_REPLY_FLOAT_MARGIN_HEIGHT,
    floatWidth: mediaBox.width + DESKTOP_REPLY_FLOAT_MARGIN_WIDTH,
  };
};

const getFeedPostMediaMetrics = (post: Comment | undefined, isMobile: boolean): MediaMetrics | null => {
  const mediaBox = getMediaBoxDimensions(post, isMobile ? 125 : 250);
  if (!mediaBox) {
    return null;
  }

  return {
    blockHeight: mediaBox.height + MOBILE_REPLY_MEDIA_EXTRA_HEIGHT,
    floatHeight: mediaBox.height + DESKTOP_REPLY_FLOAT_MARGIN_HEIGHT,
    floatWidth: mediaBox.width + DESKTOP_REPLY_FLOAT_MARGIN_WIDTH,
  };
};

const getCatalogPostMediaHeight = (post: Comment | undefined, imageSize: CatalogImageSize): number => {
  if (!post?.link) {
    return 0;
  }

  const mediaInfo = getCommentMediaInfo(post.link, post.thumbnailUrl, post.linkWidth, post.linkHeight);
  if (!getHasThumbnail(mediaInfo, post.link)) {
    return 0;
  }

  const mediaBox = getMediaBoxDimensions(post, getCatalogMediaMaxSize(imageSize));
  return mediaBox ? mediaBox.height + CATALOG_CARD_MEDIA_GAP_HEIGHT : 0;
};

const normalizeRenderedCommentText = (rawContent: string, markdownOptions?: RemoveMarkdownOptions): string =>
  removeMarkdown(rawContent, markdownOptions)
    .replace(/\n&nbsp;\n/g, '\n\n')
    .replace(/\n{3,}/g, '\n\n')
    .split('\n')
    .map((line) => line.replace(/\s{2,}/g, ' ').trimEnd())
    .join('\n')
    .trim();

const getVisibleCommentBodyText = (comment: Comment | undefined, maxContentChars: number, markdownOptions?: RemoveMarkdownOptions): string => {
  if (!comment) {
    return '';
  }

  const purged = comment.commentModeration?.purged;
  const deleted = comment.deleted;
  const removed = comment.removed;
  const reason = comment.reason?.trim();
  const rawContent = comment.content || '';
  const content = normalizeRenderedCommentText(rawContent.slice(0, maxContentChars), markdownOptions);

  if (purged) {
    return 'This post was purged';
  }

  if (removed) {
    return reason ? `This post was removed. Reason: ${reason}` : 'This post was removed.';
  }

  if (deleted) {
    return reason ? `User deleted this post. Reason: ${reason}` : 'User deleted this post';
  }

  if (rawContent.length > maxContentChars && content) {
    return `${content}\n\n${COMMENT_TOO_LONG_NOTICE}`;
  }

  return content;
};

const getVisibleCommentText = (comment: Comment | undefined, maxContentChars: number, markdownOptions?: RemoveMarkdownOptions): string => {
  if (!comment) {
    return '';
  }

  const title = comment.title?.trim();
  const content = getVisibleCommentBodyText(comment, maxContentChars, markdownOptions);

  if (title && content) {
    return `${title}: ${content}`;
  }

  return title || content;
};

const getVisibleReplyText = (reply: Comment | undefined, maxContentChars: number = 2000): string => getVisibleCommentText(reply, maxContentChars);

const getVisibleCatalogText = (post: Comment | undefined, showOPComment: boolean, hasThumbnail: boolean): string => {
  if (!post || !(showOPComment || !hasThumbnail)) {
    return '';
  }

  return getVisibleCommentText(post, 1600, CATALOG_PREVIEW_MARKDOWN_OPTIONS);
};

const getMobileBacklinkCount = (reply: Comment, backlinkMaps: ReplyBacklinkMaps): number => {
  const backlinkCount = getRenderableMobileBacklinks({
    cid: reply.cid,
    parentCid: reply.parentCid,
    directRepliesByParentCid: backlinkMaps.directRepliesByParentCid,
    quotedByMap: backlinkMaps.quotedByMap,
  });

  return backlinkCount.directReplyBacklinks.length + backlinkCount.opBacklinks.length + backlinkCount.quotedReplyBacklinks.length;
};

const getMobileBacklinksHeight = (totalBacklinkCount: number, metrics: ReplyTypographyMetrics): number => {
  const backlinkLineHeight = Math.ceil(metrics.abbrFontSizePx * 2);
  const fullCostCount = Math.min(totalBacklinkCount, MOBILE_BACKLINK_FULL_COST_COUNT);
  const tailCount = Math.max(totalBacklinkCount - MOBILE_BACKLINK_FULL_COST_COUNT, 0);

  return fullCostCount * backlinkLineHeight + tailCount * MOBILE_BACKLINK_TAIL_COST;
};

const getMobileThreadReplyCalibration = (hasMedia: boolean, totalBacklinkCount: number): number => {
  let calibration = hasMedia ? -200 : -145;

  if (totalBacklinkCount >= 4) {
    calibration -= hasMedia ? 80 : 140;
  }

  return calibration;
};

const measureParagraphHeight = (text: string, font: string, width: number, lineHeight: number): number => {
  if (!text.trim()) {
    return 0;
  }

  const safeWidth = Math.max(MIN_TEXT_WIDTH, Math.floor(width));
  const usePreWrap = text.includes('\n');
  const preparedText = getPreparedText(text, font, usePreWrap);
  return getCachedParagraphHeight(preparedText, `${safeWidth}:${lineHeight}`, () => layout(preparedText, safeWidth, lineHeight).height);
};

const measureParagraphWithFloatHeight = (text: string, font: string, width: number, floatWidth: number, floatHeight: number, lineHeight: number): number => {
  if (!text.trim()) {
    return 0;
  }

  const safeWidth = Math.max(MIN_TEXT_WIDTH, Math.floor(width));
  const safeFloatWidth = Math.max(0, Math.floor(floatWidth));
  const safeFloatHeight = Math.max(0, Math.floor(floatHeight));
  const usePreWrap = text.includes('\n');
  const preparedText = getPreparedSegmentText(text, font, usePreWrap);
  return getCachedParagraphFloatHeight(preparedText, `${safeWidth}:${safeFloatWidth}:${safeFloatHeight}:${lineHeight}`, () => {
    let cursor = { graphemeIndex: 0, segmentIndex: 0 };
    let currentHeight = 0;

    while (true) {
      const currentLineWidth = currentHeight < safeFloatHeight ? Math.max(MIN_TEXT_WIDTH, safeWidth - safeFloatWidth) : safeWidth;
      const line = layoutNextLine(preparedText, cursor, currentLineWidth);
      if (line === null) {
        break;
      }
      cursor = line.end;
      currentHeight += lineHeight;
    }

    return currentHeight;
  });
};

const estimateDesktopReplyHeight = (
  reply: Comment,
  metrics: ReplyTypographyMetrics,
  windowWidth: number,
  backlinkMaps: ReplyBacklinkMaps,
  maxContentChars: number,
  context: ReplyEstimateContext,
): number => {
  const fontSizePx = metrics.bodyFontSizePx;
  const font = `${fontSizePx}px ${metrics.bodyFontFamily}`;
  const lineHeight = getLineHeight(fontSizePx);
  const replyText = getVisibleReplyText(reply, maxContentChars);
  const mediaMetrics = getReplyMediaMetrics(reply);
  const contentWidth = Math.max(MIN_TEXT_WIDTH, windowWidth - DESKTOP_REPLY_SIDE_ARROWS_WIDTH - DESKTOP_REPLY_CONTENT_PADDING_X);
  const textHeight = mediaMetrics
    ? measureParagraphWithFloatHeight(replyText, font, contentWidth, mediaMetrics.floatWidth, mediaMetrics.floatHeight, lineHeight)
    : measureParagraphHeight(replyText, font, contentWidth, lineHeight);
  const mediaHeight = mediaMetrics ? mediaMetrics.floatHeight + DESKTOP_REPLY_FILE_TEXT_HEIGHT : 0;
  const previewCalibration = mediaMetrics ? DESKTOP_PREVIEW_REPLY_MEDIA_CALIBRATION : DESKTOP_PREVIEW_REPLY_TEXT_CALIBRATION;

  return clampEstimateHeight(
    DESKTOP_REPLY_BASE_HEIGHT + Math.max(textHeight, mediaHeight) + (context === 'thread' ? DESKTOP_THREAD_REPLY_CALIBRATION : previewCalibration),
  );
};

const estimateMobileReplyHeight = (
  reply: Comment,
  metrics: ReplyTypographyMetrics,
  windowWidth: number,
  backlinkMaps: ReplyBacklinkMaps,
  maxContentChars: number,
  context: ReplyEstimateContext,
): number => {
  const fontSizePx = metrics.mobileContentFontSizePx;
  const font = `${fontSizePx}px ${metrics.bodyFontFamily}`;
  const lineHeight = getLineHeight(fontSizePx);
  const replyText = getVisibleReplyText(reply, maxContentChars);
  const mediaMetrics = getReplyMediaMetrics(reply);
  const contentWidth = Math.max(MIN_TEXT_WIDTH, windowWidth - MOBILE_REPLY_CONTENT_PADDING_X);
  const textHeight = measureParagraphHeight(replyText, font, contentWidth, lineHeight);
  const totalBacklinkCount = getMobileBacklinkCount(reply, backlinkMaps);
  const backlinksHeight = getMobileBacklinksHeight(totalBacklinkCount, metrics);
  const threadCalibration = context === 'thread' ? getMobileThreadReplyCalibration(Boolean(mediaMetrics), totalBacklinkCount) : 0;

  return clampEstimateHeight(MOBILE_REPLY_BASE_HEIGHT + (mediaMetrics?.blockHeight || 0) + textHeight + backlinksHeight + threadCalibration);
};

export const getTypicalReplyHeight = (estimates: number[], isMobile: boolean): number => {
  return getMedianEstimate(estimates, isMobile ? DEFAULT_MOBILE_HEIGHT : DEFAULT_DESKTOP_HEIGHT);
};

export const getReplyHeightEstimates = ({
  context = 'preview',
  directRepliesByParentCid,
  isMobile,
  maxContentChars,
  metrics,
  quotedByMap,
  replies,
  windowWidth,
}: ReplyHeightEstimateOptions): number[] => {
  if (!canUsePretext() || replies.length === 0) {
    return [];
  }

  const backlinkMaps = { directRepliesByParentCid, quotedByMap };
  const effectiveMaxContentChars = maxContentChars ?? (isMobile ? 1000 : 2000);

  return replies.map((reply) =>
    isMobile
      ? estimateMobileReplyHeight(reply, metrics, windowWidth, backlinkMaps, effectiveMaxContentChars, context)
      : estimateDesktopReplyHeight(reply, metrics, windowWidth, backlinkMaps, effectiveMaxContentChars, context),
  );
};

const getDesktopOpBacklinkLabels = (post: Comment | undefined, quotedByMap?: Map<string, Comment[]>): string[] => {
  const cid = post?.cid;
  if (!cid) {
    return [];
  }

  return (quotedByMap?.get(cid) || [])
    .filter((candidateReply) => candidateReply?.cid && typeof candidateReply.number === 'number' && !(candidateReply.deleted || candidateReply.removed))
    .map((candidateReply) => `>>${candidateReply.number}`);
};

const getMobileFeedCardCalibration = (previewReplyCount: number): number => {
  const calibrationIndex = Math.max(0, Math.min(previewReplyCount, MOBILE_FEED_CARD_PREVIEW_COUNT_CALIBRATIONS.length - 1));
  return MOBILE_FEED_CARD_PREVIEW_COUNT_CALIBRATIONS[calibrationIndex];
};

export const getFeedPostHeightEstimate = ({
  directRepliesByParentCid,
  isMobile,
  metrics,
  post,
  previewReplies,
  previewReplyEstimates,
  quotedByMap,
  showBoardLabel = false,
  showSummary = false,
  windowWidth,
}: FeedPostHeightEstimateOptions): number => {
  if (!canUsePretext() || !post) {
    return isMobile ? DEFAULT_MOBILE_HEIGHT : DEFAULT_DESKTOP_HEIGHT;
  }

  const previewHeights =
    previewReplyEstimates && previewReplyEstimates.length === previewReplies.length
      ? previewReplyEstimates
      : getReplyHeightEstimates({
          directRepliesByParentCid,
          isMobile,
          maxContentChars: 1000,
          metrics,
          quotedByMap,
          replies: previewReplies,
          windowWidth,
        });

  const previewRepliesHeight = previewHeights.reduce((sum, value) => sum + value, 0);
  const previewReplyCount = previewReplies.length;

  const cacheKey = post.cid
    ? [
        isMobile ? '1' : '0',
        windowWidth,
        showBoardLabel ? '1' : '0',
        showSummary ? '1' : '0',
        metrics.bodyFontFamily,
        metrics.bodyFontSizePx,
        metrics.mobileContentFontSizePx,
        metrics.abbrFontSizePx,
        post.cid,
        post.updatedAt || 0,
        previewReplyCount,
        previewRepliesHeight,
      ].join('\u0000')
    : undefined;

  if (cacheKey) {
    const cached = feedPostHeightEstimateCache.get(cacheKey);
    if (cached !== undefined) {
      return cached;
    }
  }

  if (isMobile) {
    const fontSizePx = metrics.mobileContentFontSizePx;
    const font = `${fontSizePx}px ${metrics.bodyFontFamily}`;
    const lineHeight = getLineHeight(fontSizePx);
    const postText = getVisibleCommentText(post, 1000);
    const mediaMetrics = getFeedPostMediaMetrics(post, true);
    const contentWidth = Math.max(MIN_TEXT_WIDTH, windowWidth - MOBILE_REPLY_CONTENT_PADDING_X);
    const textHeight = measureParagraphHeight(postText, font, contentWidth, lineHeight);
    const backlinksHeight = getMobileBacklinksHeight(getMobileBacklinkCount(post, { directRepliesByParentCid, quotedByMap }), metrics);
    const rawEstimate =
      MOBILE_FEED_CARD_OUTER_GAP_HEIGHT +
      MOBILE_FEED_CARD_BASE_HEIGHT +
      MOBILE_FEED_CARD_LINK_BAR_HEIGHT +
      (mediaMetrics?.blockHeight || 0) +
      textHeight +
      backlinksHeight +
      previewRepliesHeight;
    // Mobile board cards render preview replies more compactly than the thread-reply estimator assumes.
    const mobileCalibration = getMobileFeedCardCalibration(previewReplyCount);

    const mobileResult = clampEstimateHeight(rawEstimate - mobileCalibration);
    if (cacheKey) {
      if (feedPostHeightEstimateCache.size >= FEED_POST_HEIGHT_ESTIMATE_CACHE_LIMIT) {
        const firstKey = feedPostHeightEstimateCache.keys().next().value;
        if (firstKey !== undefined) feedPostHeightEstimateCache.delete(firstKey);
      }
      feedPostHeightEstimateCache.set(cacheKey, mobileResult);
    }
    return mobileResult;
  }

  const fontSizePx = metrics.bodyFontSizePx;
  const font = `${fontSizePx}px ${metrics.bodyFontFamily}`;
  const lineHeight = getLineHeight(fontSizePx);
  const postText = getVisibleCommentBodyText(post, 1000);
  const mediaMetrics = getFeedPostMediaMetrics(post, false);
  const contentWidth = Math.max(MIN_TEXT_WIDTH, windowWidth - DESKTOP_REPLY_CONTENT_PADDING_X);
  const textHeight =
    (mediaMetrics
      ? measureParagraphWithFloatHeight(postText, font, contentWidth, mediaMetrics.floatWidth, mediaMetrics.floatHeight, lineHeight)
      : measureParagraphHeight(postText, font, contentWidth, lineHeight)) + (postText.trim().length > 0 ? DESKTOP_POST_MESSAGE_VERTICAL_PADDING : 0);
  const mediaHeight = mediaMetrics ? mediaMetrics.floatHeight + DESKTOP_REPLY_FILE_TEXT_HEIGHT : 0;
  const opBacklinks = getDesktopOpBacklinkLabels(post, quotedByMap);
  const backlinkFontSizePx = metrics.abbrFontSizePx;
  const backlinkLineHeight = getLineHeight(backlinkFontSizePx);
  const backlinksHeight = Math.max(
    0,
    measureParagraphHeight(opBacklinks.join(' '), `${backlinkFontSizePx}px ${metrics.bodyFontFamily}`, contentWidth, backlinkLineHeight) - backlinkLineHeight,
  );
  const boardLabelHeight = showBoardLabel && !post.link && !post.parentCid && post.communityAddress ? DESKTOP_FEED_CARD_BOARD_LABEL_HEIGHT : 0;

  const rawEstimate =
    DESKTOP_FEED_CARD_HR_HEIGHT +
    DESKTOP_FEED_CARD_BASE_HEIGHT +
    Math.max(textHeight, mediaHeight) +
    backlinksHeight +
    boardLabelHeight +
    (showSummary ? DESKTOP_FEED_CARD_SUMMARY_HEIGHT : 0) +
    previewRepliesHeight;

  const desktopResult = clampEstimateHeight(rawEstimate + DESKTOP_FEED_CARD_BASE_CALIBRATION);
  if (cacheKey) {
    if (feedPostHeightEstimateCache.size >= FEED_POST_HEIGHT_ESTIMATE_CACHE_LIMIT) {
      const firstKey = feedPostHeightEstimateCache.keys().next().value;
      if (firstKey !== undefined) feedPostHeightEstimateCache.delete(firstKey);
    }
    feedPostHeightEstimateCache.set(cacheKey, desktopResult);
  }
  return desktopResult;
};

const getCatalogPostHeightEstimate = ({ imageSize, metrics, post, showOPComment }: CatalogPostHeightEstimateOptions): number => {
  if (!canUsePretext() || !post) {
    return DEFAULT_CATALOG_ROW_HEIGHT - CATALOG_ROW_PADDING_TOP;
  }

  const cacheKey = post.cid ? `${getCatalogEstimateCachePrefix(imageSize, metrics, showOPComment)}\u0000post\u0000${post.cid}` : undefined;
  const cachedHeight = cacheKey ? catalogPostHeightEstimateCache.get(cacheKey) : undefined;
  if (cachedHeight !== undefined) {
    return cachedHeight;
  }

  const cardWidth = getCatalogCardWidth(imageSize);
  const fontSizePx = metrics.bodyFontSizePx;
  const font = `${fontSizePx}px ${metrics.bodyFontFamily}`;
  const lineHeight = getLineHeight(fontSizePx);
  const mediaInfo = post.link ? getCommentMediaInfo(post.link, post.thumbnailUrl, post.linkWidth, post.linkHeight) : undefined;
  const hasThumbnail = getHasThumbnail(mediaInfo, post.link);
  const visibleCatalogText = getVisibleCatalogText(post, showOPComment, hasThumbnail);
  const textHeight =
    visibleCatalogText.trim().length > 0
      ? measureParagraphHeight(visibleCatalogText, font, Math.max(MIN_TEXT_WIDTH, cardWidth - CATALOG_CARD_TEXT_PADDING_X), lineHeight)
      : 0;
  const mediaHeight = getCatalogPostMediaHeight(post, imageSize);
  const rawHeight = Math.min(
    CATALOG_CARD_MAX_HEIGHT,
    CATALOG_CARD_MARGIN_Y + CATALOG_CARD_PADDING_TOP + CATALOG_CARD_PADDING_BOTTOM + mediaHeight + CATALOG_CARD_META_HEIGHT + textHeight,
  );
  const estimatedHeight = Math.max(MIN_ESTIMATE_HEIGHT, Math.ceil(rawHeight));
  if (cacheKey) {
    catalogPostHeightEstimateCache.set(cacheKey, estimatedHeight);
  }
  return estimatedHeight;
};

const getCatalogRowHeightEstimate = ({ imageSize, metrics, row, showOPComment }: CatalogSingleRowHeightEstimateOptions): number => {
  const cacheKey =
    row.length > 0 ? `${getCatalogEstimateCachePrefix(imageSize, metrics, showOPComment)}\u0000row\u0000${row.map((post) => post?.cid || '').join(',')}` : undefined;
  const cachedHeight = cacheKey ? catalogRowHeightEstimateCache.get(cacheKey) : undefined;
  if (cachedHeight !== undefined) {
    return cachedHeight;
  }

  const tallestCardHeight = row.reduce((maxHeight, post) => {
    return Math.max(maxHeight, getCatalogPostHeightEstimate({ imageSize, metrics, post, showOPComment }));
  }, DEFAULT_CATALOG_ROW_HEIGHT - CATALOG_ROW_PADDING_TOP);

  const estimatedHeight = clampEstimateHeight(CATALOG_ROW_PADDING_TOP + tallestCardHeight);
  if (cacheKey) {
    catalogRowHeightEstimateCache.set(cacheKey, estimatedHeight);
  }
  return estimatedHeight;
};

export const getCatalogRowHeightEstimates = ({ imageSize, metrics, rows, showOPComment }: CatalogRowHeightEstimateOptions): number[] => {
  if (!canUsePretext() || rows.length === 0) {
    return [];
  }

  return rows.map((row) => getCatalogRowHeightEstimate({ imageSize, metrics, row, showOPComment }));
};

export const getTypicalCatalogRowHeight = (estimates: number[], imageSize: CatalogImageSize): number =>
  getMedianEstimate(estimates, imageSize === 'Large' ? 340 : DEFAULT_CATALOG_ROW_HEIGHT);

export const resolveReplyVirtualizationMode = (
  searchParams: URLSearchParams | string | null | undefined,
  fallback: ReplyVirtualizationMode = DEFAULT_REPLY_VIRTUALIZATION_MODE,
): ReplyVirtualizationMode => {
  const params = resolveSearchParams(searchParams);
  const requestedMode = params?.get('pretextReplies');
  return isReplyVirtualizationMode(requestedMode) ? requestedMode : fallback;
};

export const resolveFeedVirtualizationMode = (
  searchParams: URLSearchParams | string | null | undefined,
  fallback: ReplyVirtualizationMode = 'off',
): ReplyVirtualizationMode => {
  const params = resolveSearchParams(searchParams);
  const requestedMode = params?.get('pretextFeed');
  return isReplyVirtualizationMode(requestedMode) ? requestedMode : fallback;
};

export const resolveCatalogVirtualizationMode = (
  searchParams: URLSearchParams | string | null | undefined,
  fallback: ReplyVirtualizationMode = 'off',
): ReplyVirtualizationMode => {
  const params = resolveSearchParams(searchParams);
  const requestedMode = params?.get('pretextCatalog');
  return isReplyVirtualizationMode(requestedMode) ? requestedMode : fallback;
};

export const getPretextItemSizeFromElement = (element: HTMLElement, field: 'offsetHeight' | 'offsetWidth'): number => {
  if (field === 'offsetWidth') {
    return element.offsetWidth;
  }

  if (element.dataset.expandedMedia === 'true' || element.querySelector(`[${EXPANDED_MEDIA_DATA_ATTRIBUTE}="true"]`)) {
    return element.offsetHeight;
  }

  const ownEstimatedHeight = Number.parseFloat(element.dataset.pretextHeight || '');
  if (Number.isFinite(ownEstimatedHeight) && ownEstimatedHeight > 0) {
    return ownEstimatedHeight;
  }

  let nestedElement = nestedPretextElementCache.get(element);
  if (nestedElement && !element.contains(nestedElement)) {
    nestedPretextElementCache.delete(element);
    nestedElement = undefined;
  }
  if (nestedElement === undefined) {
    nestedElement = element.querySelector<HTMLElement>(`[${REPLY_HEIGHT_DATA_ATTRIBUTE}]`) ?? null;
    nestedPretextElementCache.set(element, nestedElement);
  }
  const nestedEstimatedHeight = Number.parseFloat(nestedElement?.dataset.pretextHeight || '');
  return Number.isFinite(nestedEstimatedHeight) && nestedEstimatedHeight > 0 ? nestedEstimatedHeight : element.offsetHeight;
};

export const getReplyItemSizeFromElement = (element: HTMLElement, field: 'offsetHeight' | 'offsetWidth'): number => getPretextItemSizeFromElement(element, field);

export const reportReplyHeightAuditSample = (element: HTMLElement | null, estimate: number | undefined, cid: string | undefined) => {
  if (!element || !cid || !Number.isFinite(estimate)) {
    return;
  }

  const auditStore = getReplyHeightAuditStore();
  if (!auditStore) {
    return;
  }

  window.requestAnimationFrame(() => {
    if (!document.contains(element)) {
      return;
    }

    const actualHeight = element.offsetHeight;
    const numericEstimate = Math.round(estimate as number);
    auditStore.record({
      actual: actualHeight,
      cid,
      diff: actualHeight - numericEstimate,
      estimate: numericEstimate,
    });
  });
};

export const readReplyTypographyMetrics = (): ReplyTypographyMetrics => {
  if (typeof document === 'undefined') {
    return {
      abbrFontSizePx: 13,
      bodyFontFamily: 'Arial, Helvetica, sans-serif',
      bodyFontSizePx: 13,
      mobileContentFontSizePx: 15,
    };
  }

  const bodyStyles = window.getComputedStyle(document.body);
  const bodyFontFamily = bodyStyles.getPropertyValue('--body-font-family').trim() || 'Arial, Helvetica, sans-serif';
  const bodyFontSizePx = parseCssLengthToPx(bodyStyles.getPropertyValue('--body-font-size'), 13);

  return {
    abbrFontSizePx: parseCssLengthToPx(bodyStyles.getPropertyValue('--post-mobile-abbr-font-size'), 13),
    bodyFontFamily,
    bodyFontSizePx,
    mobileContentFontSizePx: parseCssLengthToPx(bodyStyles.getPropertyValue('--post-mobile-content-font-size'), 15),
  };
};
