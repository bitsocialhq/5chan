import { useMemo } from 'react';
import { highlightCode } from '../../lib/utils/code-highlight';
import styles from './code-block.module.css';

/**
 * Renders a [code] block the way 4chan does on /g/: a flat, square, monospaced box
 * that preserves whitespace and syntax-highlights tokens using a Prettify-style palette.
 * Uses a block-level <code> element (phrasing content) so it nests validly inside the
 * inline markdown <span>.
 */
const CodeBlock = ({ source }: { source: string }) => {
  const tokens = useMemo(() => highlightCode(source), [source]);

  return (
    <code className={styles.code}>
      {tokens.map((token) => (
        <span key={token.start} className={styles[token.cls]}>
          {token.value}
        </span>
      ))}
    </code>
  );
};

export default CodeBlock;
