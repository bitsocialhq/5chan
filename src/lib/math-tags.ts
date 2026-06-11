// [math]/[eqn] TeX tags are a /sci/ feature (like 4chan): typeset client-side with MathJax,
// enabled only when the post's board or the current route resolves to /sci/.
export const MATH_DIRECTORY_CODE = 'sci';

export const isMathDirectoryCode = (directoryCode: string | undefined): boolean => directoryCode?.toLowerCase() === MATH_DIRECTORY_CODE;

// Tags are matched case-sensitively and must be properly closed, like 4chan's MathJax delimiters.
// [\s\S] lets a single [math]/[eqn] region span multiple lines (e.g. pmatrix rows).
const MATH_SEGMENT_REGEX = /\[(math|eqn)\]([\s\S]*?)\[\/\1\]/g;
export const HAS_MATH_TAG_REGEX = /\[(math|eqn)\][\s\S]*?\[\/\1\]/;

// Math is not extracted inside [spoiler] regions so existing spoiler parsing keeps working there.
const SPOILER_RANGE_REGEX = /\[[sS][pP][oO][iI][lL][eE][rR]\][\s\S]*?\[\/[sS][pP][oO][iI][lL][eE][rR]\]/g;

export type MathSegment = { type: 'text' | 'math'; value: string; start: number };

const getSpoilerRanges = (raw: string): { start: number; end: number }[] => {
  const ranges: { start: number; end: number }[] = [];
  const regex = new RegExp(SPOILER_RANGE_REGEX.source, 'g');
  let match: RegExpExecArray | null;
  while ((match = regex.exec(raw)) !== null) {
    ranges.push({ start: match.index, end: regex.lastIndex });
  }
  return ranges;
};

// Splits content into text segments (normal markdown pipeline) and math segments (typeset as-is,
// delimiters included). Unclosed tags stay plain text.
export const splitMathSegments = (raw: string): MathSegment[] => {
  const segments: MathSegment[] = [];
  const spoilerRanges = getSpoilerRanges(raw);
  const regex = new RegExp(MATH_SEGMENT_REGEX.source, 'g');
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(raw)) !== null) {
    const matchStart = match.index;
    const matchEnd = regex.lastIndex;

    if (spoilerRanges.some((range) => matchStart >= range.start && matchEnd <= range.end)) {
      continue;
    }

    if (matchStart > lastIndex) {
      segments.push({ type: 'text', value: raw.slice(lastIndex, matchStart), start: lastIndex });
    }
    segments.push({ type: 'math', value: match[0], start: matchStart });
    lastIndex = matchEnd;
  }

  if (lastIndex < raw.length) {
    segments.push({ type: 'text', value: raw.slice(lastIndex), start: lastIndex });
  }

  return segments;
};
