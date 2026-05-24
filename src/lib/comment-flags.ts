import { COUNTRY_FLAG_HEIGHT, COUNTRY_FLAG_WIDTH, getCountryFlagPosition, getCountryLabel, normalizeCountryCode } from './country-flags';
import { getBoardFlagDefinition, normalizeBoardFlagKind, type BoardFlagKind } from './board-flags';

const COUNTRY_FLAG_SPRITE_PATH = 'assets/icons/flags-1.png';
const FLAG_TEXT_PATTERN = /^flag:([a-z-]+):([a-z0-9-]+)$/i;
const SHORT_FLAG_TEXT_PATTERN = /^(country|geo|pol|political|meme|memeflag|memeflags|pony|mlp):([a-z0-9-]+)$/i;
const COUNTRY_EMOJI_TEXT_PATTERN = /^([a-z]{2}|catalonia|eu|fam|xe|xs|xw|xk|xx)-emoji$/i;

type FlagSource =
  | { type: 'country'; code: string }
  | {
      type: BoardFlagKind;
      code: string;
    };

interface AuthorFlairLike {
  text?: unknown;
  code?: unknown;
  country?: unknown;
  type?: unknown;
  kind?: unknown;
  expiresAt?: unknown;
}

interface AuthorLike {
  flairs?: unknown;
  community?: {
    flairs?: unknown;
  };
  subplebbit?: {
    flairs?: unknown;
  };
}

interface CommentLike {
  '5chan'?: unknown;
  author?: unknown;
  flairs?: unknown;
  raw?: {
    comment?: unknown;
  };
}

export interface AuthorFlagViewModel {
  key: string;
  type: 'country' | BoardFlagKind;
  code: string;
  label: string;
  spritePath: string;
  width: number;
  height: number;
  x: number;
  y: number;
}

const toString = (value: unknown): string | undefined => (typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined);

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);

const normalizeFlairsContainer = (flairs: unknown): unknown => {
  if (Array.isArray(flairs)) return flairs;
  return isRecord(flairs) && Array.isArray(flairs.author) ? flairs.author : undefined;
};

export const getAuthorFlagFlairs = (author: unknown): unknown => {
  if (!isRecord(author)) return undefined;

  const authorLike = author as AuthorLike;
  return normalizeFlairsContainer(authorLike.community?.flairs) ?? normalizeFlairsContainer(authorLike.subplebbit?.flairs) ?? normalizeFlairsContainer(authorLike.flairs);
};

const getFiveChanFlagFlair = (comment: unknown): AuthorFlairLike | undefined => {
  if (!isRecord(comment)) return undefined;

  const fiveChan = (comment as CommentLike)['5chan'];
  if (!isRecord(fiveChan) || !isRecord(fiveChan.flag)) return undefined;

  const flag = fiveChan.flag;
  const text = toString(flag.text);
  const type = toString(flag.type);
  const code = toString(flag.code) ?? toString(fiveChan.country);
  const country = toString(fiveChan.country);

  if (!text && (!type || !code)) {
    return undefined;
  }

  return {
    text,
    type,
    code,
    country,
  };
};

export const getCommentFlagFlairs = (comment: unknown, author?: unknown): unknown => {
  if (!isRecord(comment)) return getAuthorFlagFlairs(author);

  const commentLike = comment as CommentLike;
  const fiveChanFlagFlair = getFiveChanFlagFlair(comment) ?? getFiveChanFlagFlair(commentLike.raw?.comment);
  if (fiveChanFlagFlair) {
    return [fiveChanFlagFlair];
  }

  return getAuthorFlagFlairs(author ?? commentLike.author) ?? normalizeFlairsContainer(commentLike.flairs);
};

const isFreshFlair = (flair: AuthorFlairLike, nowSeconds: number) =>
  typeof flair.expiresAt !== 'number' || !Number.isFinite(flair.expiresAt) || flair.expiresAt > nowSeconds;

const parseTextFlagSource = (text: string | undefined): FlagSource | undefined => {
  if (!text) return undefined;

  const flagMatch = text.match(FLAG_TEXT_PATTERN);
  if (flagMatch) {
    const [, kindValue, code] = flagMatch;
    const normalizedKindValue = kindValue.toLowerCase();
    if (normalizedKindValue === 'country' || normalizedKindValue === 'geo') {
      return { type: 'country', code };
    }
    const kind = normalizeBoardFlagKind(normalizedKindValue);
    return kind ? { type: kind, code } : undefined;
  }

  const shortMatch = text.match(SHORT_FLAG_TEXT_PATTERN);
  if (shortMatch) {
    const [, kindValue, code] = shortMatch;
    const normalizedKindValue = kindValue.toLowerCase();
    if (normalizedKindValue === 'country' || normalizedKindValue === 'geo') {
      return { type: 'country', code };
    }
    const kind = normalizeBoardFlagKind(normalizedKindValue);
    return kind ? { type: kind, code } : undefined;
  }

  const countryEmojiMatch = text.match(COUNTRY_EMOJI_TEXT_PATTERN);
  return countryEmojiMatch ? { type: 'country', code: countryEmojiMatch[1] } : undefined;
};

const parseStructuredFlagSource = (flair: AuthorFlairLike): FlagSource | undefined => {
  const typeValue = toString(flair.type) ?? toString(flair.kind);
  if (!typeValue) return undefined;

  const normalizedTypeValue = typeValue.toLowerCase();
  if (normalizedTypeValue === 'country' || normalizedTypeValue === 'geo') {
    const code = toString(flair.country) ?? toString(flair.code);
    return code ? { type: 'country', code } : undefined;
  }

  const kind = normalizeBoardFlagKind(normalizedTypeValue);
  const code = toString(flair.code);
  return kind && code ? { type: kind, code } : undefined;
};

const toCountryFlagViewModel = (codeValue: string): AuthorFlagViewModel | undefined => {
  const code = normalizeCountryCode(codeValue);
  const position = getCountryFlagPosition(code);
  if (!code || !position) return undefined;

  return {
    key: `country:${code}`,
    type: 'country',
    code,
    label: getCountryLabel(code) ?? code.toUpperCase(),
    spritePath: COUNTRY_FLAG_SPRITE_PATH,
    width: COUNTRY_FLAG_WIDTH,
    height: COUNTRY_FLAG_HEIGHT,
    x: position.x,
    y: position.y,
  };
};

const toBoardFlagViewModel = (type: BoardFlagKind, code: string): AuthorFlagViewModel | undefined => {
  const flag = getBoardFlagDefinition(type, code);
  return flag
    ? {
        key: `${flag.kind}:${flag.code}`,
        type: flag.kind,
        code: flag.code,
        label: flag.label,
        spritePath: flag.spritePath,
        width: flag.width,
        height: flag.height,
        x: flag.x,
        y: flag.y,
      }
    : undefined;
};

const toFlagViewModel = (source: FlagSource | undefined): AuthorFlagViewModel | undefined => {
  if (!source) return undefined;
  return source.type === 'country' ? toCountryFlagViewModel(source.code) : toBoardFlagViewModel(source.type, source.code);
};

export const getAuthorFlagViewModels = (flairs: unknown, nowSeconds = Date.now() / 1000): AuthorFlagViewModel[] => {
  if (!Array.isArray(flairs)) return [];

  const seenKeys = new Set<string>();
  const flags: AuthorFlagViewModel[] = [];

  for (const flair of flairs) {
    if (typeof flair !== 'object' || flair === null) {
      continue;
    }

    const flairRecord = flair as AuthorFlairLike;
    if (!isFreshFlair(flairRecord, nowSeconds)) {
      continue;
    }

    const flag = toFlagViewModel(parseStructuredFlagSource(flairRecord) ?? parseTextFlagSource(toString(flairRecord.text)));
    if (!flag || seenKeys.has(flag.key)) {
      continue;
    }

    seenKeys.add(flag.key);
    flags.push(flag);
  }

  return flags;
};
