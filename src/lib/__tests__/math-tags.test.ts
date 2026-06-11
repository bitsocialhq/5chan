import { describe, expect, it } from 'vitest';
import { HAS_MATH_TAG_REGEX, isMathDirectoryCode, splitMathSegments } from '../math-tags';

describe('math-tags', () => {
  it('enables math tags only for /sci/', () => {
    expect(isMathDirectoryCode('sci')).toBe(true);
    expect(isMathDirectoryCode('SCI')).toBe(true);
    expect(isMathDirectoryCode('g')).toBe(false);
    expect(isMathDirectoryCode('b')).toBe(false);
    expect(isMathDirectoryCode(undefined)).toBe(false);
  });

  it('detects closed math and eqn tags', () => {
    expect(HAS_MATH_TAG_REGEX.test('[math]x[/math]')).toBe(true);
    expect(HAS_MATH_TAG_REGEX.test('[eqn]\\int x dx[/eqn]')).toBe(true);
    expect(HAS_MATH_TAG_REGEX.test('[math]unclosed')).toBe(false);
    expect(HAS_MATH_TAG_REGEX.test('[math]mismatch[/eqn]')).toBe(false);
    expect(HAS_MATH_TAG_REGEX.test('no tags at all')).toBe(false);
  });

  it('splits text and math segments with offsets, keeping the delimiters', () => {
    expect(splitMathSegments('a [math]x_1[/math] b')).toEqual([
      { type: 'text', value: 'a ', start: 0 },
      { type: 'math', value: '[math]x_1[/math]', start: 2 },
      { type: 'text', value: ' b', start: 18 },
    ]);
  });

  it('keeps multi-line eqn content in one math segment', () => {
    const raw = 'before\n[eqn]\\begin{pmatrix}a & b\\\\c & d\\end{pmatrix}[/eqn]\nafter';
    const segments = splitMathSegments(raw);
    expect(segments.map((segment) => segment.type)).toEqual(['text', 'math', 'text']);
    expect(segments[1].value).toContain('pmatrix');
    expect(segments[1].value).toContain('\\\\');
  });

  it('leaves unclosed or mismatched tags as plain text', () => {
    expect(splitMathSegments('[math]x')).toEqual([{ type: 'text', value: '[math]x', start: 0 }]);
    expect(splitMathSegments('[math]x[/eqn]')).toEqual([{ type: 'text', value: '[math]x[/eqn]', start: 0 }]);
  });

  it('handles back-to-back and repeated math segments', () => {
    expect(splitMathSegments('[math]a[/math][eqn]b[/eqn]')).toEqual([
      { type: 'math', value: '[math]a[/math]', start: 0 },
      { type: 'math', value: '[eqn]b[/eqn]', start: 14 },
    ]);
  });

  it('does not extract math inside spoilers so spoiler parsing keeps working', () => {
    expect(splitMathSegments('[spoiler]a [math]x[/math][/spoiler]')).toEqual([
      { type: 'text', value: '[spoiler]a [math]x[/math][/spoiler]', start: 0 },
    ]);
    const mixed = splitMathSegments('[spoiler][math]a[/math][/spoiler] [math]b[/math]');
    expect(mixed.map((segment) => segment.type)).toEqual(['text', 'math']);
    expect(mixed[1].value).toBe('[math]b[/math]');
  });
});
