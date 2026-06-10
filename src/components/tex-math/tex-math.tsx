import { memo, useEffect, useRef } from 'react';
import { clearMathElement, typesetMathElement } from '../../lib/mathjax/mathjax-typeset';

// Renders a [math]/[eqn] segment. The raw TeX source (delimiters included) stays visible until
// MathJax lazy-loads and typesets it in place, like 4chan. MathJax owns this span's subtree after
// typesetting, so React must never re-render children inside it: the source text is rendered once
// and the effect below (a legit external-DOM-library sync, not data fetching) hands the node over.
const TexMath = ({ source }: { source: string }) => {
  const elementRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) {
      return;
    }
    typesetMathElement(element, source);
    return () => clearMathElement(element);
  }, [source]);

  return <span ref={elementRef}>{source}</span>;
};

export default memo(TexMath);
