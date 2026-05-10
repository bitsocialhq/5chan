import { useEffect, useMemo, useRef, useState } from 'react';
import { Virtuoso, type SizeFunction } from 'react-virtuoso';
import type { Comment } from '@bitsocial/bitsocial-react-hooks';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import CatalogRow from '../components/catalog-row';
import { Post } from '../views/post';
import PostDesktop from '../components/post-desktop';
import PostMobile from '../components/post-mobile';
import {
  getCatalogRowHeightEstimates,
  getFeedPostHeightEstimate,
  getPretextItemSizeFromElement,
  getReplyHeightEstimates,
  getTypicalCatalogRowHeight,
  readReplyTypographyMetrics,
  type CatalogImageSize,
  type ReplyVirtualizationMode,
} from '../lib/utils/pretext-height-estimates';
import useCatalogStyleStore from '../stores/use-catalog-style-store';

type BenchmarkMode = 'dom' | 'estimates' | 'item-size';
type BenchmarkVariant = 'production' | 'synthetic';
type BenchmarkSurface = 'board' | 'catalog' | 'replies';
type SyntheticReply = Comment & {
  benchmarkQuotedCids?: string[];
};
type SyntheticBoardItem = {
  post: SyntheticReply;
  previewReplies: SyntheticReply[];
};

type BenchmarkMetrics = {
  durationMs: number;
  itemSizeCalls: number;
  itemCount: number;
  longTasks: number;
  maxFrameMs: number;
  mode: BenchmarkMode;
  visibleMeanAbsoluteError: number;
  visibleMaxAbsoluteError: number;
  rectCalls: number;
  renderedItems: number;
  scrollHeight: number;
  slowFrames16: number;
  slowFrames32: number;
  surface: BenchmarkSurface;
  variant: BenchmarkVariant;
  viewportHeight: number;
};

type BenchmarkApi = {
  getMetrics: () => BenchmarkMetrics | null;
  runScenario: () => Promise<BenchmarkMetrics>;
};

declare global {
  interface Window {
    __PRETEXT_BENCH__?: BenchmarkApi;
    __PRETEXT_BENCH_RECT_COUNTER__?: {
      count: number;
      reset: () => void;
    };
    __getReactScanReport?: () => unknown;
  }
}

const THREAD_CID = 'thread-root';
const DESKTOP_MEDIA_SIZE = 125;
const MOBILE_MEDIA_SIZE = 180;
const NOOP = () => {};
const WORD_BANK = [
  'anon',
  'feed',
  'thread',
  'archive',
  'reply',
  'catalog',
  'signal',
  'latency',
  'render',
  'virtualization',
  'scroll',
  'layout',
  'poster',
  'board',
  'quote',
  'merkle',
  'overlay',
  'cursor',
  'client',
  'browser',
  'canvas',
  'bundle',
  'observer',
  'window',
  'pretext',
  'measurement',
  'comment',
  'media',
  'thumbnail',
  'protocol',
];

const parseIntegerSearchParam = (params: URLSearchParams, key: string, fallbackValue: number) => {
  const parsedValue = Number.parseInt(params.get(key) || '', 10);
  return Number.isFinite(parsedValue) && parsedValue > 0 ? parsedValue : fallbackValue;
};

const resolveBenchmarkMode = (params: URLSearchParams): BenchmarkMode => {
  const mode = params.get('mode');
  return mode === 'estimates' || mode === 'item-size' ? mode : 'dom';
};

const resolveBenchmarkVariant = (params: URLSearchParams): BenchmarkVariant => {
  return params.get('variant') === 'synthetic' ? 'synthetic' : 'production';
};

const resolveBenchmarkSurface = (params: URLSearchParams): BenchmarkSurface => {
  const surface = params.get('surface');
  return surface === 'board' || surface === 'catalog' ? surface : 'replies';
};

const resolveCatalogImageSize = (params: URLSearchParams): CatalogImageSize => (params.get('catalogImageSize') === 'Large' ? 'Large' : 'Small');

const resolveCatalogShowOpComment = (params: URLSearchParams): boolean => params.get('showOPComment') !== '0';

const createRandom = (seed: number) => {
  let currentSeed = seed >>> 0;
  return () => {
    currentSeed = (currentSeed * 1664525 + 1013904223) >>> 0;
    return currentSeed / 4294967296;
  };
};

const waitForFrames = async (frameCount: number) =>
  new Promise<void>((resolve) => {
    let remainingFrames = frameCount;
    const handleFrame = () => {
      remainingFrames -= 1;
      if (remainingFrames <= 0) {
        resolve();
        return;
      }
      window.requestAnimationFrame(handleFrame);
    };
    window.requestAnimationFrame(handleFrame);
  });

const installRectCounter = () => {
  if (window.__PRETEXT_BENCH_RECT_COUNTER__) {
    return window.__PRETEXT_BENCH_RECT_COUNTER__;
  }

  const originalGetBoundingClientRect = Element.prototype.getBoundingClientRect;
  let count = 0;

  Element.prototype.getBoundingClientRect = function getBoundingClientRectPatched(...args) {
    count += 1;
    return originalGetBoundingClientRect.apply(this, args as []);
  };

  window.__PRETEXT_BENCH_RECT_COUNTER__ = {
    get count() {
      return count;
    },
    reset() {
      count = 0;
    },
  };

  return window.__PRETEXT_BENCH_RECT_COUNTER__;
};

const buildText = (random: () => number, replyIndex: number) => {
  const sentenceCount = 2 + Math.floor(random() * 14);
  const sentences: string[] = [];

  for (let sentenceIndex = 0; sentenceIndex < sentenceCount; sentenceIndex += 1) {
    const wordCount = 8 + Math.floor(random() * 36);
    const words = Array.from({ length: wordCount }, () => WORD_BANK[Math.floor(random() * WORD_BANK.length)]);
    const sentence = `${words.join(' ')} ${replyIndex + 1}-${sentenceIndex + 1}.`;
    sentences.push(sentence);
  }

  if (random() < 0.2) {
    sentences.splice(Math.max(1, Math.floor(sentences.length / 2)), 0, '');
  }

  return sentences.join('\n');
};

const buildReplies = (count: number, seed: number): SyntheticReply[] => {
  const random = createRandom(seed);
  const replies: SyntheticReply[] = [];

  for (let index = 0; index < count; index += 1) {
    const quotedTargets: string[] = [];
    const quotedTargetSet = new Set<string>();
    const quoteTargetCount = replies.length === 0 ? 0 : Math.floor(random() * 3);
    for (let quoteIndex = 0; quoteIndex < quoteTargetCount; quoteIndex += 1) {
      const targetReply = replies[Math.floor(random() * replies.length)];
      if (targetReply?.cid && !quotedTargetSet.has(targetReply.cid)) {
        quotedTargets.push(targetReply.cid);
        quotedTargetSet.add(targetReply.cid);
      }
    }

    const directParent = replies.length > 12 && random() < 0.16 ? replies[Math.floor(random() * Math.min(replies.length, 40))]?.cid || THREAD_CID : THREAD_CID;

    const hasMedia = random() < 0.35;
    const landscapeBias = random() < 0.5;
    const linkWidth = hasMedia ? (landscapeBias ? 720 + Math.floor(random() * 960) : 320 + Math.floor(random() * 480)) : undefined;
    const linkHeight = hasMedia ? (landscapeBias ? 360 + Math.floor(random() * 640) : 680 + Math.floor(random() * 1120)) : undefined;

    replies.push({
      author: {
        address: `0x${(index + 1).toString(16).padStart(4, '0')}`,
        shortAddress: `${(index + 1).toString(16).padStart(4, '0')}`,
      },
      benchmarkQuotedCids: quotedTargets,
      cid: `reply-${index + 1}`,
      content: `${quotedTargets.map((cid) => `>>${cid.split('-').at(-1)}`).join(' ')} ${buildText(random, index)}`.trim(),
      communityAddress: 'music-posting.eth',
      link: hasMedia ? `https://example.com/media-${index + 1}.jpg` : undefined,
      linkHeight,
      linkWidth,
      number: index + 1,
      parentCid: directParent,
      postCid: THREAD_CID,
      reason: undefined,
      spoiler: hasMedia ? random() < 0.08 : false,
      state: 'succeeded',
      timestamp: 1700000000 + index * 60,
      thumbnailUrl: hasMedia ? `https://example.com/thumb-${index + 1}.jpg` : undefined,
      title: random() < 0.18 ? `Synthetic reply ${index + 1}` : undefined,
    } as SyntheticReply);
  }

  return replies;
};

const buildBacklinkMaps = (replies: SyntheticReply[]) => {
  const directRepliesByParentCid = new Map<string, SyntheticReply[]>();
  const quotedByMap = new Map<string, SyntheticReply[]>();

  for (const reply of replies) {
    if (reply.parentCid && reply.parentCid !== THREAD_CID) {
      const directReplies = directRepliesByParentCid.get(reply.parentCid) || [];
      directReplies.push(reply);
      directRepliesByParentCid.set(reply.parentCid, directReplies);
    }

    for (const quotedCid of reply.benchmarkQuotedCids || []) {
      const quotedReplies = quotedByMap.get(quotedCid) || [];
      quotedReplies.push(reply);
      quotedByMap.set(quotedCid, quotedReplies);
    }
  }

  return { directRepliesByParentCid, quotedByMap };
};

const getMediaBox = (reply: SyntheticReply, isMobile: boolean) => {
  if (!reply.link) {
    return null;
  }

  const maxSize = isMobile ? MOBILE_MEDIA_SIZE : DESKTOP_MEDIA_SIZE;
  const width = reply.spoiler ? Math.min(maxSize, 100) : reply.linkWidth || maxSize;
  const height = reply.spoiler ? Math.min(maxSize, 100) : reply.linkHeight || maxSize;
  const scale = Math.min(1, maxSize / Math.max(width, height));

  return {
    height: Math.max(40, Math.round(height * scale)),
    width: Math.max(56, Math.round(width * scale)),
  };
};

const getBacklinkLabels = (reply: SyntheticReply, directRepliesByParentCid: Map<string, SyntheticReply[]>, quotedByMap: Map<string, SyntheticReply[]>) => {
  const directReplies = directRepliesByParentCid.get(reply.cid || '') || [];
  const quotedReplies = quotedByMap.get(reply.cid || '') || [];
  return [...directReplies, ...quotedReplies].map((candidateReply) => `>>${candidateReply.number}`);
};

const summarizeRenderReport = () => {
  const report = window.__getReactScanReport?.();
  if (!report || typeof report !== 'object') {
    return null;
  }

  const reportValues = Array.isArray(report) ? report : Object.values(report as Record<string, unknown>);
  return {
    componentCount: reportValues.length,
  };
};

const buildThreadRoot = (replies: SyntheticReply[]): SyntheticReply =>
  ({
    author: {
      address: '0xop',
      shortAddress: '0xop',
    },
    cid: THREAD_CID,
    communityAddress: 'music-posting.eth',
    content: 'Synthetic OP body for the production-path benchmark.',
    number: 1,
    replyCount: replies.length,
    state: 'succeeded',
    timestamp: 1699999000,
    title: 'Synthetic benchmark thread',
  }) as SyntheticReply;

const buildBoardItems = (count: number, seed: number): SyntheticBoardItem[] => {
  const random = createRandom(seed ^ 0x5f3759df);

  return Array.from({ length: count }, (_, index) => {
    const cid = `post-${index + 1}`;
    const hasMedia = random() < 0.4;
    const landscapeBias = random() < 0.5;
    const linkWidth = hasMedia ? (landscapeBias ? 960 + Math.floor(random() * 960) : 360 + Math.floor(random() * 480)) : undefined;
    const linkHeight = hasMedia ? (landscapeBias ? 540 + Math.floor(random() * 540) : 900 + Math.floor(random() * 900)) : undefined;
    const previewReplyCount = Math.floor(random() * 4);
    const omittedReplyCount = Math.floor(random() * 9);
    const previewReplies: SyntheticReply[] = [];

    for (let replyIndex = 0; replyIndex < previewReplyCount; replyIndex += 1) {
      const quotedCids = random() < 0.45 ? [cid] : [];
      const quotedCidSet = new Set(quotedCids);
      const priorReply = replyIndex > 0 && random() < 0.3 ? previewReplies[Math.floor(random() * replyIndex)] : undefined;
      if (priorReply?.cid && !quotedCidSet.has(priorReply.cid)) {
        quotedCids.push(priorReply.cid);
        quotedCidSet.add(priorReply.cid);
      }

      const replyText = `${quotedCids.map((quotedCid) => `>>${quotedCid.split('-').at(-1)}`).join(' ')} ${buildText(random, replyIndex)}`.trim();

      previewReplies.push({
        author: {
          address: `0xfeed${index.toString(16).padStart(3, '0')}${replyIndex.toString(16).padStart(2, '0')}`,
          shortAddress: `${index.toString(16).padStart(3, '0')}${replyIndex.toString(16).padStart(2, '0')}`,
        },
        benchmarkQuotedCids: quotedCids,
        cid: `${cid}-reply-${replyIndex + 1}`,
        communityAddress: 'music-posting.eth',
        content: replyText.slice(0, 1200),
        number: replyIndex + 2,
        parentCid: priorReply?.cid || cid,
        postCid: cid,
        state: 'succeeded',
        timestamp: 1700000000 + index * 360 + replyIndex * 60,
        title: replyIndex === 0 && random() < 0.25 ? `Preview ${replyIndex + 1}` : undefined,
      } as SyntheticReply);
    }

    return {
      post: {
        author: {
          address: `0xpost${(index + 1).toString(16).padStart(4, '0')}`,
          shortAddress: `${(index + 1).toString(16).padStart(4, '0')}`,
        },
        cid,
        communityAddress: 'music-posting.eth',
        content: buildText(random, index).slice(0, 2400),
        link: hasMedia ? `https://example.com/feed-${index + 1}.jpg` : undefined,
        linkHeight,
        linkWidth,
        number: index + 1,
        postCid: cid,
        replyCount: previewReplyCount + omittedReplyCount,
        spoiler: hasMedia ? random() < 0.08 : false,
        state: 'succeeded',
        timestamp: 1699999000 + index * 300,
        thumbnailUrl: hasMedia ? `https://example.com/feed-thumb-${index + 1}.jpg` : undefined,
        title: random() < 0.35 ? `Synthetic thread ${index + 1}` : undefined,
      } as SyntheticReply,
      previewReplies,
    };
  });
};

const BenchmarkReplyRow = ({
  directRepliesByParentCid,
  estimate,
  isMobile,
  quotedByMap,
  reply,
}: {
  directRepliesByParentCid: Map<string, SyntheticReply[]>;
  estimate?: number;
  isMobile: boolean;
  quotedByMap: Map<string, SyntheticReply[]>;
  reply: SyntheticReply;
}) => {
  const metrics = readReplyTypographyMetrics();
  const mediaBox = getMediaBox(reply, isMobile);
  const backlinks = getBacklinkLabels(reply, directRepliesByParentCid, quotedByMap);
  const contentFontSize = isMobile ? metrics.mobileContentFontSizePx : metrics.bodyFontSizePx;
  const headerStyle = { color: '#789922', fontSize: 12, marginBottom: 6 };
  const mediaStyle = mediaBox
    ? isMobile
      ? {
          alignItems: 'center',
          background: '#ddd',
          border: '1px solid #bbb',
          color: '#555',
          display: 'flex',
          height: mediaBox.height,
          justifyContent: 'center',
          marginBottom: 10,
          width: `min(100%, ${mediaBox.width}px)`,
        }
      : {
          alignItems: 'center',
          background: '#ddd',
          border: '1px solid #bbb',
          color: '#555',
          display: 'flex',
          float: 'left' as const,
          height: mediaBox.height,
          justifyContent: 'center',
          margin: '0 16px 8px 0',
          width: mediaBox.width,
        }
    : undefined;

  return (
    <article
      data-bench-backlink-count={backlinks.length}
      data-bench-content-length={reply.content.length}
      data-bench-has-media={mediaBox ? '1' : '0'}
      data-bench-number={reply.number}
      data-bench-title-length={reply.title?.length || 0}
      data-bench-reply-row=''
      data-pretext-height={estimate}
      style={{
        background: '#fff',
        borderBottom: '1px solid #d6d6d6',
        color: '#111',
        fontFamily: 'Arial, Helvetica, sans-serif',
        minHeight: 72,
        padding: isMobile ? '12px 12px 14px' : '10px 12px 12px',
      }}
    >
      <div style={headerStyle}>Anonymous 03/30/26 No.{reply.number}</div>
      {mediaStyle && <div style={mediaStyle}>{reply.spoiler ? 'Spoiler' : 'Media'}</div>}
      {reply.title ? <div style={{ fontSize: contentFontSize, fontWeight: 700, marginBottom: 6 }}>{reply.title}</div> : null}
      <div style={{ fontSize: contentFontSize, lineHeight: 1.35, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{reply.content}</div>
      {backlinks.length > 0 ? (
        <div style={{ clear: mediaStyle && !isMobile ? 'both' : undefined, color: '#789922', fontSize: 12, marginTop: 8 }}>{backlinks.join(' ')}</div>
      ) : mediaStyle && !isMobile ? (
        <div style={{ clear: 'both' }} />
      ) : null}
    </article>
  );
};

const Harness = () => {
  const searchParams = useMemo(() => new URLSearchParams(window.location.search), []);
  const [latestMetrics, setLatestMetrics] = useState<BenchmarkMetrics | null>(null);
  const isMobile = typeof window !== 'undefined' ? window.innerWidth < 768 : false;
  const mode = resolveBenchmarkMode(searchParams);
  const variant = resolveBenchmarkVariant(searchParams);
  const surface = resolveBenchmarkSurface(searchParams);
  const catalogImageSize = resolveCatalogImageSize(searchParams);
  const showCatalogOpComment = resolveCatalogShowOpComment(searchParams);
  const effectiveVariant: BenchmarkVariant = surface === 'replies' ? variant : 'production';
  const replyCount = parseIntegerSearchParam(searchParams, 'count', 1200);
  const seed = parseIntegerSearchParam(searchParams, 'seed', 42);
  const itemSizeCallCountRef = useRef(0);
  const windowWidth = typeof window !== 'undefined' ? window.innerWidth : 1280;
  const replies = useMemo(() => buildReplies(replyCount, seed), [replyCount, seed]);
  const boardItems = useMemo(() => buildBoardItems(replyCount, seed), [replyCount, seed]);
  const threadRoot = useMemo(() => buildThreadRoot(replies), [replies]);
  const { directRepliesByParentCid, quotedByMap } = useMemo(() => buildBacklinkMaps(replies), [replies]);
  const metrics = useMemo(() => readReplyTypographyMetrics(), []);
  const heightEstimates = useMemo(
    () =>
      getReplyHeightEstimates({
        directRepliesByParentCid,
        isMobile,
        metrics,
        quotedByMap,
        replies,
        windowWidth,
      }),
    [directRepliesByParentCid, isMobile, metrics, quotedByMap, replies, windowWidth],
  );
  const boardReplyPaginationOverrides = useMemo(
    () =>
      boardItems.map(({ previewReplies }) => ({
        hasMore: false,
        loadMore: NOOP,
        replies: previewReplies,
      })),
    [boardItems],
  );
  const boardHeightEstimates = useMemo(
    () =>
      boardItems.map(({ post, previewReplies }) => {
        const { directRepliesByParentCid: previewDirectRepliesByParentCid, quotedByMap: previewQuotedByMap } = buildBacklinkMaps(previewReplies);
        const previewReplyEstimates = getReplyHeightEstimates({
          directRepliesByParentCid: previewDirectRepliesByParentCid,
          isMobile,
          maxContentChars: 1000,
          metrics,
          quotedByMap: previewQuotedByMap,
          replies: previewReplies,
          windowWidth,
        });

        return getFeedPostHeightEstimate({
          directRepliesByParentCid: previewDirectRepliesByParentCid,
          isMobile,
          metrics,
          post,
          previewReplies,
          previewReplyEstimates,
          quotedByMap: previewQuotedByMap,
          showSummary: post.replyCount !== undefined && post.replyCount > previewReplies.length,
          windowWidth,
        });
      }),
    [boardItems, isMobile, metrics, windowWidth],
  );
  const catalogPosts = useMemo(() => boardItems.map(({ post }) => post), [boardItems]);
  const catalogRows = useMemo(() => {
    const cardWidth = catalogImageSize === 'Large' ? 270 : 180;
    const columnCount = Math.max(1, Math.floor(windowWidth / cardWidth));
    const nextRows: SyntheticReply[][] = [];

    for (let index = 0; index < catalogPosts.length; index += columnCount) {
      nextRows.push(catalogPosts.slice(index, index + columnCount));
    }

    return nextRows;
  }, [catalogImageSize, catalogPosts, windowWidth]);
  const catalogRowHeightEstimates = useMemo(
    () =>
      getCatalogRowHeightEstimates({
        imageSize: catalogImageSize,
        metrics,
        rows: catalogRows,
        showOPComment: showCatalogOpComment,
      }),
    [catalogImageSize, catalogRows, metrics, showCatalogOpComment],
  );
  const currentHeightEstimates = surface === 'board' ? boardHeightEstimates : surface === 'catalog' ? catalogRowHeightEstimates : heightEstimates;
  const itemCount = surface === 'board' ? boardItems.length : surface === 'catalog' ? catalogRows.length : replies.length;

  const defaultItemHeight = useMemo(() => {
    if (surface === 'catalog') {
      return getTypicalCatalogRowHeight(catalogRowHeightEstimates, catalogImageSize);
    }

    if (currentHeightEstimates.length === 0) {
      return undefined;
    }
    const sortedEstimates = currentHeightEstimates.slice().sort((leftValue, rightValue) => leftValue - rightValue);
    return sortedEstimates[Math.floor(sortedEstimates.length / 2)];
  }, [catalogImageSize, catalogRowHeightEstimates, currentHeightEstimates, surface]);

  const itemSize = useMemo<SizeFunction | undefined>(() => {
    if (mode !== 'item-size') {
      return undefined;
    }

    return (element, field) => {
      itemSizeCallCountRef.current += 1;
      return getPretextItemSizeFromElement(element, field);
    };
  }, [mode]);
  const virtuosoSizingProps = useMemo(() => {
    const sizingProps: { defaultItemHeight?: number; heightEstimates?: number[]; itemSize?: SizeFunction } = {};
    if (mode !== 'dom') {
      sizingProps.defaultItemHeight = defaultItemHeight;
      sizingProps.heightEstimates = currentHeightEstimates;
    }
    if (itemSize) {
      sizingProps.itemSize = itemSize;
    }
    return sizingProps;
  }, [currentHeightEstimates, defaultItemHeight, itemSize, mode]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [mode, surface, effectiveVariant]);

  useEffect(() => {
    const previousBodyClassName = document.body.className;
    if (!previousBodyClassName.trim()) {
      document.body.className = 'yotsuba';
    }

    return () => {
      document.body.className = previousBodyClassName;
    };
  }, []);

  useEffect(() => {
    const previousCatalogStyle = useCatalogStyleStore.getState();
    useCatalogStyleStore.setState({
      imageSize: catalogImageSize,
      showOPComment: showCatalogOpComment,
    });

    return () => {
      useCatalogStyleStore.setState({
        imageSize: previousCatalogStyle.imageSize,
        showOPComment: previousCatalogStyle.showOPComment,
      });
    };
  }, [catalogImageSize, showCatalogOpComment]);

  useEffect(() => {
    const rectCounter = installRectCounter();
    const runScenario = async (): Promise<BenchmarkMetrics> => {
      rectCounter.reset();
      itemSizeCallCountRef.current = 0;
      await waitForFrames(3);

      let longTasks = 0;
      let frameCount = 0;
      let slowFrames16 = 0;
      let slowFrames32 = 0;
      let maxFrameMs = 0;
      let lastFrameTime = performance.now();
      let animationFrameId = 0;

      const performanceObserver =
        typeof PerformanceObserver === 'undefined'
          ? null
          : new PerformanceObserver((entryList) => {
              longTasks += entryList.getEntries().length;
            });

      try {
        performanceObserver?.observe({ entryTypes: ['longtask'] });
      } catch {
        performanceObserver?.disconnect();
      }

      const trackFrame = (timestamp: number) => {
        const delta = timestamp - lastFrameTime;
        frameCount += 1;
        maxFrameMs = Math.max(maxFrameMs, delta);
        if (delta > 16.7) {
          slowFrames16 += 1;
        }
        if (delta > 32) {
          slowFrames32 += 1;
        }
        lastFrameTime = timestamp;
        animationFrameId = window.requestAnimationFrame(trackFrame);
      };
      animationFrameId = window.requestAnimationFrame(trackFrame);

      const scrollTargets: number[] = [];
      const totalScrollableHeight = Math.max(document.documentElement.scrollHeight - window.innerHeight, 0);
      const scrollStep = Math.max(window.innerHeight * 3, 1200);
      for (let offset = 0; offset <= totalScrollableHeight; offset += scrollStep) {
        scrollTargets.push(offset);
      }
      if (scrollTargets.at(-1) !== totalScrollableHeight) {
        scrollTargets.push(totalScrollableHeight);
      }
      scrollTargets.push(...[...scrollTargets].reverse());

      const scenarioStartTime = performance.now();
      for (const targetScrollTop of scrollTargets) {
        window.scrollTo({ top: targetScrollTop });
        await waitForFrames(2);
      }
      const durationMs = performance.now() - scenarioStartTime;

      window.cancelAnimationFrame(animationFrameId);
      performanceObserver?.disconnect();

      const visibleRowMetrics = Array.from(document.querySelectorAll<HTMLElement>('[data-pretext-height]')).map((element) => {
        const estimatedHeight = Number.parseFloat(element.dataset.pretextHeight || '');
        const actualHeight = element.offsetHeight;
        return Number.isFinite(estimatedHeight) ? Math.abs(actualHeight - estimatedHeight) : 0;
      });
      const totalVisibleError = visibleRowMetrics.reduce((sum, value) => sum + value, 0);
      const visibleMeanAbsoluteError = visibleRowMetrics.length === 0 ? 0 : totalVisibleError / visibleRowMetrics.length;
      const visibleMaxAbsoluteError = visibleRowMetrics.length === 0 ? 0 : Math.max(...visibleRowMetrics);

      const nextMetrics = {
        durationMs: Math.round(durationMs),
        itemSizeCalls: itemSizeCallCountRef.current,
        itemCount,
        longTasks,
        maxFrameMs: Math.round(maxFrameMs * 10) / 10,
        mode,
        visibleMeanAbsoluteError: Math.round(visibleMeanAbsoluteError * 10) / 10,
        visibleMaxAbsoluteError: Math.round(visibleMaxAbsoluteError * 10) / 10,
        rectCalls: rectCounter.count,
        renderedItems: document.querySelectorAll('[data-pretext-height]').length,
        scrollHeight: document.documentElement.scrollHeight,
        slowFrames16,
        slowFrames32,
        surface,
        variant: effectiveVariant,
        viewportHeight: window.innerHeight,
      } satisfies BenchmarkMetrics;

      summarizeRenderReport();
      setLatestMetrics(nextMetrics);
      return nextMetrics;
    };

    window.__PRETEXT_BENCH__ = {
      getMetrics: () => latestMetrics,
      runScenario,
    };

    return () => {
      delete window.__PRETEXT_BENCH__;
    };
  }, [effectiveVariant, itemCount, latestMetrics, mode, surface]);

  const virtualizationMode: ReplyVirtualizationMode = mode === 'dom' ? 'off' : mode;
  const buildBenchmarkHref = ({
    nextCount = replyCount,
    nextMode = mode,
    nextSeed = seed,
    nextSurface = surface,
    nextVariant = effectiveVariant,
  }: {
    nextCount?: number;
    nextMode?: BenchmarkMode;
    nextSeed?: number;
    nextSurface?: BenchmarkSurface;
    nextVariant?: BenchmarkVariant;
  }) => `?e2e=pretext-benchmark&surface=${nextSurface}&variant=${nextVariant}&mode=${nextMode}&count=${nextCount}&seed=${nextSeed}`;

  return (
    <main style={{ background: '#f2f2f2', minHeight: '100vh' }}>
      <section style={{ margin: '0 auto', maxWidth: 960, padding: '24px 16px 12px' }}>
        <h1 style={{ fontFamily: 'Arial, Helvetica, sans-serif', fontSize: 28, margin: 0 }}>Pretext Virtualization Benchmark</h1>
        <p style={{ color: '#444', fontFamily: 'Arial, Helvetica, sans-serif', margin: '8px 0 16px' }}>
          Deterministic 5chan-style corpora for benchmarking the real Virtuoso paths before wiring them into production views.
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
          {(['replies', 'board', 'catalog'] as BenchmarkSurface[]).map((candidateSurface) => (
            <a
              key={candidateSurface}
              className='button'
              href={buildBenchmarkHref({
                nextSurface: candidateSurface,
                nextVariant: candidateSurface === 'replies' ? effectiveVariant : 'production',
              })}
              style={{ opacity: candidateSurface === surface ? 1 : 0.7 }}
            >
              {candidateSurface}
            </a>
          ))}
          {(['dom', 'estimates', 'item-size'] as BenchmarkMode[]).map((candidateMode) => (
            <a key={candidateMode} className='button' href={buildBenchmarkHref({ nextMode: candidateMode })} style={{ opacity: candidateMode === mode ? 1 : 0.7 }}>
              {candidateMode}
            </a>
          ))}
          {surface === 'replies' &&
            (['production', 'synthetic'] as BenchmarkVariant[]).map((candidateVariant) => (
              <a
                key={candidateVariant}
                className='button'
                href={buildBenchmarkHref({ nextVariant: candidateVariant })}
                style={{ opacity: candidateVariant === effectiveVariant ? 1 : 0.7 }}
              >
                {candidateVariant}
              </a>
            ))}
          <button
            className='button'
            onClick={() => {
              void window.__PRETEXT_BENCH__?.runScenario();
            }}
          >
            Run scroll scenario
          </button>
        </div>
        <div data-testid='bench-summary' style={{ color: '#333', display: 'grid', fontFamily: 'monospace', gap: 4 }}>
          <div>surface: {surface}</div>
          <div>variant: {effectiveVariant}</div>
          <div>mode: {mode}</div>
          <div>item count: {itemCount}</div>
          {surface === 'catalog' ? (
            <div>
              catalog: {catalogImageSize} / showOPComment={showCatalogOpComment ? '1' : '0'}
            </div>
          ) : null}
          <div>sizing mode: {virtualizationMode}</div>
          <div>last run: {latestMetrics ? JSON.stringify(latestMetrics) : 'not run yet'}</div>
        </div>
      </section>
      {surface === 'replies' ? (
        effectiveVariant === 'production' ? (
          <MemoryRouter initialEntries={['/mu/thread/thread-root']}>
            <Routes>
              <Route
                path='/:boardIdentifier/thread/:commentCid'
                element={
                  isMobile ? (
                    <PostMobile
                      post={threadRoot}
                      replyPaginationOverride={{ hasMore: true, loadMore: NOOP, replies }}
                      replyVirtualizationModeOverride={virtualizationMode}
                      roles={{} as never}
                      showAllReplies={true}
                      showReplies={true}
                    />
                  ) : (
                    <PostDesktop
                      post={threadRoot}
                      replyPaginationOverride={{ hasMore: true, loadMore: NOOP, replies }}
                      replyVirtualizationModeOverride={virtualizationMode}
                      roles={{} as never}
                      showAllReplies={true}
                      showReplies={true}
                    />
                  )
                }
              />
            </Routes>
          </MemoryRouter>
        ) : (
          <Virtuoso
            {...virtuosoSizingProps}
            data={replies}
            increaseViewportBy={{ bottom: 1200, top: 1200 }}
            itemContent={(index, reply) => (
              <BenchmarkReplyRow
                directRepliesByParentCid={directRepliesByParentCid}
                estimate={heightEstimates[index]}
                isMobile={isMobile}
                quotedByMap={quotedByMap}
                reply={reply}
              />
            )}
            totalCount={replies.length}
            useWindowScroll={true}
          />
        )
      ) : surface === 'board' ? (
        <MemoryRouter initialEntries={['/mu']}>
          <Virtuoso
            {...virtuosoSizingProps}
            computeItemKey={(index, item) => item.post.cid || `post-${index}`}
            data={boardItems}
            increaseViewportBy={{ bottom: 1200, top: 1200 }}
            itemContent={(index, item) => <Post post={item.post} replyPaginationOverride={boardReplyPaginationOverrides[index]} replyVirtualizationModeOverride='off' />}
            totalCount={boardItems.length}
            useWindowScroll={true}
          />
        </MemoryRouter>
      ) : (
        <MemoryRouter initialEntries={['/mu/catalog']}>
          <Virtuoso
            {...virtuosoSizingProps}
            computeItemKey={(index, row) => row[0]?.cid || `catalog-row-${index}`}
            data={catalogRows}
            increaseViewportBy={{ bottom: 1200, top: 1200 }}
            itemContent={(index, row) => <CatalogRow estimatedHeight={catalogRowHeightEstimates[index]} row={row} />}
            totalCount={catalogRows.length}
            useWindowScroll={true}
          />
        </MemoryRouter>
      )}
    </main>
  );
};

export default Harness;
