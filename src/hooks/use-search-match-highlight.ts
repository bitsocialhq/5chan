import { useEffect, type RefObject } from 'react';

const HIGHLIGHT_NAME = 'search-match';
const MIN_TERM_LENGTH = 2;

type HighlightRegistry = Map<string, Highlight>;

const getHighlightRegistry = (): HighlightRegistry | undefined => {
  if (typeof CSS === 'undefined' || typeof Highlight === 'undefined') return undefined;
  return (CSS as unknown as { highlights?: HighlightRegistry }).highlights;
};

const getSearchTerms = (query: string): string[] =>
  [...new Set(query.toLowerCase().split(/\s+/))].filter((term) => term.length >= MIN_TERM_LENGTH).sort((a, b) => b.length - a.length);

const getMatchRanges = (container: HTMLElement, terms: string[]): Range[] => {
  const ranges: Range[] = [];
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);

  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const text = node.nodeValue?.toLowerCase();
    if (!text) continue;

    for (const term of terms) {
      for (let index = text.indexOf(term); index !== -1; index = text.indexOf(term, index + term.length)) {
        const range = document.createRange();
        range.setStart(node, index);
        range.setEnd(node, index + term.length);
        ranges.push(range);
      }
    }
  }

  return ranges;
};

/**
 * Paints the searched terms inside the results with the CSS custom highlight API, which marks up
 * the rendered posts without touching the post components or their DOM. Browsers without the API
 * simply render the results unhighlighted.
 */
const useSearchMatchHighlight = (containerRef: RefObject<HTMLElement | null>, query: string): void => {
  useEffect(() => {
    const highlights = getHighlightRegistry();
    const container = containerRef.current;
    const terms = getSearchTerms(query);
    if (!highlights || !container || terms.length === 0) return;

    let frame = 0;
    const paint = () => {
      frame = 0;
      highlights.set(HIGHLIGHT_NAME, new Highlight(...getMatchRanges(container, terms)));
    };
    // Posts keep rendering after the first paint (media, replies, moderation state), so the
    // ranges are rebuilt whenever the results change.
    const observer = new MutationObserver(() => {
      if (frame) return;
      frame = requestAnimationFrame(paint);
    });

    paint();
    observer.observe(container, { characterData: true, childList: true, subtree: true });

    return () => {
      observer.disconnect();
      if (frame) cancelAnimationFrame(frame);
      highlights.delete(HIGHLIGHT_NAME);
    };
  }, [containerRef, query]);
};

export default useSearchMatchHighlight;
