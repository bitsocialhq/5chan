import { describe, it, expect } from 'vitest';
import { highlightCode, type CodeToken } from '../code-highlight';

// Adjacent plain tokens (including whitespace) are merged, like Prettify, so match by trimmed value.
const classOf = (tokens: CodeToken[], value: string): string | undefined => tokens.find((token) => token.value.trim() === value)?.cls;

const reassemble = (tokens: CodeToken[]): string => tokens.map((token) => token.value).join('');

describe('highlightCode', () => {
  it('preserves the source exactly when tokens are concatenated', () => {
    const source = '.element {\n  animation-delay: calc((sibling-index() - 1) * 100ms);\n}';
    expect(reassemble(highlightCode(source))).toBe(source);
  });

  it('classifies the 4chan CSS example like Prettify (punctuation, plain, literals)', () => {
    const tokens = highlightCode('.element {\n  animation-delay: calc((sibling-index() - 1) * 100ms);\n}');
    // Numbers (incl. CSS units) are literals.
    expect(classOf(tokens, '1')).toBe('lit');
    expect(classOf(tokens, '100ms')).toBe('lit');
    // Hyphenated CSS identifiers split on punctuation, exactly as Prettify renders them.
    expect(classOf(tokens, 'animation')).toBe('pln');
    expect(classOf(tokens, 'delay')).toBe('pln');
    expect(tokens.some((token) => token.cls === 'pun' && token.value.includes('{'))).toBe(true);
  });

  it('highlights keywords from the union of languages (like Prettify with no language)', () => {
    const tokens = highlightCode('select string body');
    expect(classOf(tokens, 'select')).toBe('kwd');
    expect(classOf(tokens, 'string')).toBe('kwd');
    expect(classOf(tokens, 'body')).toBe('pln');
  });

  it('highlights strings, including unterminated ones', () => {
    expect(classOf(highlightCode('font-family: "Consolas";'), '"Consolas"')).toBe('str');
    expect(classOf(highlightCode("x = 'hi'"), "'hi'")).toBe('str');
    expect(highlightCode('s = "unterminated').some((token) => token.cls === 'str' && token.value === '"unterminated')).toBe(true);
  });

  it('highlights line, block, and hash comments', () => {
    expect(classOf(highlightCode('x = 1 // note'), '// note')).toBe('com');
    expect(classOf(highlightCode('a /* mid */ b'), '/* mid */')).toBe('com');
    expect(classOf(highlightCode('x = 1 # python'), '# python')).toBe('com');
  });

  it('does not treat CSS hex colors as comments', () => {
    const tokens = highlightCode('color: #fff;');
    expect(tokens.some((token) => token.cls === 'com')).toBe(false);
    expect(classOf(tokens, '#')).toBe('pun');
    expect(classOf(tokens, 'fff')).toBe('pln');
  });

  it('treats keywords individually and merges adjacent plain runs', () => {
    const tokens = highlightCode('const x');
    expect(classOf(tokens, 'const')).toBe('kwd');
    // " x" (leading space + identifier) merges into a single plain token.
    expect(tokens.find((token) => token.value === ' x')?.cls).toBe('pln');
  });

  it('returns no tokens for empty input', () => {
    expect(highlightCode('')).toEqual([]);
  });
});
