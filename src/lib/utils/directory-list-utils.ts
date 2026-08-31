import { isKnown5chanDeveloper } from './author-display-utils';

interface DirectoryFeatures {
  postsPerPage?: number;
  pseudonymityMode?: string;
  nsfw?: boolean;
  noSpoilers?: boolean;
  noSpoilerReplies?: boolean;
  hasFlags?: boolean;
  requirePostLink?: boolean;
  requirePostLinkIsMedia?: boolean;
  requireReplyLink?: boolean;
  requireReplyLinkIsMedia?: boolean;
  noReplyLinks?: boolean;
  [key: string]: unknown;
}

export interface DirectoryCommunity {
  title?: string;
  address: string;
  name?: string;
  publicKey?: string;
  nsfw?: boolean;
  directoryCode?: string;
  features?: DirectoryFeatures;
}

export interface DirectoriesData {
  title: string;
  description: string;
  createdAt: number;
  updatedAt: number;
  communities: DirectoryCommunity[];
}

export interface DirectoryListBoard {
  address: string;
  publicKey?: string;
  owner?: string;
  score?: number;
  addedAt?: number;
  nsfw?: boolean;
  features?: DirectoryFeatures;
}

export interface DirectoryList {
  directoryCode: string;
  title?: string;
  description?: string;
  features?: DirectoryFeatures;
  rules?: string[];
  createdAt?: number;
  updatedAt?: number;
  boards: DirectoryListBoard[];
}

interface DirectoryDefaultsEntry {
  directoryCode?: string;
  title?: string;
  features?: DirectoryFeatures;
  rules?: string[];
}

export interface DirectoryDefaultsData {
  title?: string;
  description?: string;
  createdAt?: number;
  updatedAt?: number;
  directories: Record<string, DirectoryDefaultsEntry>;
}

const DIRECTORY_CODE_ORDER = [
  'a',
  'f',
  'co',
  'ck',
  'pol',
  'biz',
  'sci',
  'g',
  'v',
  'vg',
  'vr',
  'fit',
  'sp',
  'tg',
  'adv',
  'wsg',
  'diy',
  'out',
  'i',
  'ic',
  'mu',
  'int',
  'lit',
  'his',
  'tv',
  't',
  'x',
  'vip',
  'gif',
  'bant',
  'b',
  'an',
] as const;

const DIRECTORY_CODE_ORDER_INDEX: ReadonlyMap<string, number> = new Map(DIRECTORY_CODE_ORDER.map((code, index) => [code, index]));

export const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;

const toNumber = (value: unknown): number | undefined => (typeof value === 'number' && Number.isFinite(value) ? value : undefined);

export const toString = (value: unknown): string | undefined => (typeof value === 'string' && value.length > 0 ? value : undefined);

const normalizeFeatures = (value: unknown): DirectoryFeatures | undefined => {
  if (!isRecord(value)) {
    return undefined;
  }

  const normalizedFeatures = Object.entries(value).reduce<DirectoryFeatures>((acc, [key, featureValue]) => {
    if (typeof featureValue === 'string' || typeof featureValue === 'boolean' || typeof featureValue === 'number') {
      acc[key] = featureValue;
    }
    return acc;
  }, {});

  return Object.keys(normalizedFeatures).length > 0 ? normalizedFeatures : undefined;
};

const normalizeRules = (value: unknown): string[] | undefined => {
  if (!Array.isArray(value)) {
    return undefined;
  }

  const rules = value.filter((rule): rule is string => typeof rule === 'string' && rule.length > 0);
  return rules.length > 0 ? rules : undefined;
};

const normalizeDirectoryDefaultsEntry = (code: string, raw: unknown): DirectoryDefaultsEntry => {
  if (!isRecord(raw)) {
    return { directoryCode: code };
  }

  const directoryCode = toString(raw.directoryCode) ?? code;
  const features = normalizeFeatures(raw.features);
  const rules = normalizeRules(raw.rules);
  return {
    directoryCode,
    ...(toString(raw.title) ? { title: toString(raw.title)! } : {}),
    ...(features ? { features } : {}),
    ...(rules ? { rules } : {}),
  };
};

export const normalizeDirectoryDefaultsData = (raw: unknown): DirectoryDefaultsData => {
  const directoriesRaw = isRecord(raw) && isRecord(raw.directories) ? raw.directories : {};
  const directories = Object.fromEntries(Object.entries(directoriesRaw).map(([code, value]) => [code, normalizeDirectoryDefaultsEntry(code, value)]));

  return {
    ...(isRecord(raw) && toString(raw.title) ? { title: toString(raw.title)! } : {}),
    ...(isRecord(raw) && toString(raw.description) ? { description: toString(raw.description)! } : {}),
    ...(isRecord(raw) && toNumber(raw.createdAt) !== undefined ? { createdAt: toNumber(raw.createdAt) } : {}),
    ...(isRecord(raw) && toNumber(raw.updatedAt) !== undefined ? { updatedAt: toNumber(raw.updatedAt) } : {}),
    directories,
  };
};

/**
 * The one place `features.safeForWork` is read and inverted into `nsfw` polarity.
 * Only a real boolean declares the setting, so `'true'`, `null`, `0` and `{}` all mean undeclared
 * and yield `undefined`. Callers decide what an undeclared community means.
 */
const deriveNsfw = (value: { nsfw?: unknown; features?: unknown }): boolean | undefined => {
  const features = isRecord(value.features) ? value.features : undefined;
  const safeForWork = typeof features?.safeForWork === 'boolean' ? features.safeForWork : undefined;
  if (safeForWork !== undefined) {
    return !safeForWork;
  }
  const featuresNsfw = typeof features?.nsfw === 'boolean' ? features.nsfw : undefined;
  const topLevelNsfw = typeof value.nsfw === 'boolean' ? value.nsfw : undefined;
  return topLevelNsfw ?? featuresNsfw;
};

/**
 * Three-state NSFW verdict for one community: `true`, `false`, or `undefined` when neither the
 * protocol nor the curated directory declared it.
 *
 * `community` is a live community resolved from the protocol; `directoryEntry` is the curated
 * verdict already derived from `5chan-directories-defaults.json`. Both go through `deriveNsfw`,
 * so the `typeof === 'boolean'` guard and the `safeForWork -> nsfw` inversion exist exactly once.
 *
 * NSFW only escalates: whichever side says NSFW wins, and the live setting is the fallback only
 * where the directory has nothing to say. `features.safeForWork` is an editable community setting,
 * so letting it override the curated directory would let a board opt itself out of the NSFW theme,
 * favicon and feed filter. Escalation still works in the useful direction: a board the directory
 * does not cover, or covers as SFW, becomes NSFW as soon as the protocol says so.
 */
export const deriveCommunityNsfw = (community?: { features?: unknown } | null, directoryEntry?: { nsfw?: unknown } | null): boolean | undefined => {
  const communityNsfw = deriveNsfw({ features: community?.features });
  const directoryNsfw = deriveNsfw({ nsfw: directoryEntry?.nsfw });
  if (communityNsfw === true || directoryNsfw === true) {
    return true;
  }
  return communityNsfw ?? directoryNsfw;
};

export const toCanonicalCommunity = (value: {
  address?: unknown;
  communityAddress?: unknown;
  name?: unknown;
  publicKey?: unknown;
  title?: unknown;
  nsfw?: unknown;
  directoryCode?: unknown;
  features?: unknown;
}): DirectoryCommunity | null => {
  const name = toString(value.name) ?? toString(value.address) ?? toString(value.communityAddress);
  if (!name) {
    return null;
  }

  const features = normalizeFeatures(value.features);
  const nsfw = deriveNsfw({ nsfw: value.nsfw, features });

  return {
    address: name,
    name,
    ...(typeof value.publicKey === 'string' ? { publicKey: value.publicKey } : {}),
    ...(typeof value.title === 'string' ? { title: value.title } : {}),
    ...(typeof value.directoryCode === 'string' ? { directoryCode: value.directoryCode } : {}),
    ...(features ? { features } : {}),
    ...(nsfw !== undefined ? { nsfw } : {}),
  };
};

const normalizeDirectoryListBoard = (raw: unknown): DirectoryListBoard | null => {
  if (!isRecord(raw)) return null;
  const address = toString(raw.address) ?? toString(raw.name);
  if (!address) return null;
  const features = normalizeFeatures(raw.features);
  const nsfw = deriveNsfw({ nsfw: raw.nsfw, features });
  const score = toNumber(raw.score);

  return {
    address,
    ...(toString(raw.publicKey) ? { publicKey: toString(raw.publicKey)! } : {}),
    ...(toString(raw.owner) ? { owner: toString(raw.owner)! } : {}),
    ...(score !== undefined ? { score } : {}),
    ...(toNumber(raw.addedAt) !== undefined ? { addedAt: toNumber(raw.addedAt) } : {}),
    ...(features ? { features } : {}),
    ...(nsfw !== undefined ? { nsfw } : {}),
  };
};

export const normalizeDirectoryList = (raw: unknown, fallbackCode: string, defaults?: DirectoryDefaultsData): DirectoryList | null => {
  if (!isRecord(raw)) return null;
  const boardsRaw = Array.isArray(raw.boards) ? raw.boards : Array.isArray(raw.communities) ? raw.communities : null;
  if (!boardsRaw) return null;

  const boards = boardsRaw.map(normalizeDirectoryListBoard).filter((board): board is DirectoryListBoard => board !== null);
  if (boards.length === 0) return null;
  const rawCode = toString(raw.directoryCode);
  const defaultEntry = defaults?.directories[rawCode ?? fallbackCode] ?? defaults?.directories[fallbackCode];
  const directoryCode = toString(defaultEntry?.directoryCode) ?? rawCode ?? fallbackCode;
  const features = normalizeFeatures(defaultEntry?.features) ?? normalizeFeatures(raw.features);
  const rules = normalizeRules(raw.rules);

  return {
    directoryCode,
    ...(toString(defaultEntry?.title) ? { title: toString(defaultEntry?.title)! } : toString(raw.title) ? { title: toString(raw.title)! } : {}),
    ...(toString(raw.description) ? { description: toString(raw.description)! } : {}),
    ...(features ? { features } : {}),
    ...(rules ? { rules } : {}),
    ...(toNumber(raw.createdAt) !== undefined ? { createdAt: toNumber(raw.createdAt) } : {}),
    ...(toNumber(raw.updatedAt) !== undefined ? { updatedAt: toNumber(raw.updatedAt) } : {}),
    boards,
  };
};

export const sortDirectoryLists = (lists: DirectoryList[]): DirectoryList[] =>
  [...lists].sort((a, b) => {
    const aIndex = DIRECTORY_CODE_ORDER_INDEX.get(a.directoryCode) ?? Number.MAX_SAFE_INTEGER;
    const bIndex = DIRECTORY_CODE_ORDER_INDEX.get(b.directoryCode) ?? Number.MAX_SAFE_INTEGER;
    if (aIndex !== bIndex) {
      return aIndex - bIndex;
    }
    return a.directoryCode.localeCompare(b.directoryCode);
  });

/** What a directory ranks an entry by, whichever kind of list it is. */
export interface DirectoryRank {
  id: string;
  owner?: string;
  score?: number;
  addedAt?: number;
}

/**
 * Sort entries by future score data when present. Static list ties break in favor
 * of known 5chan developer owners, then `addedAt` asc.
 * Final tie-break is the entry id for deterministic rendering.
 */
export const sortByDirectoryRank = <T>(entries: readonly T[], getRank: (entry: T) => DirectoryRank): T[] =>
  [...entries].sort((first, second) => {
    const a = getRank(first);
    const b = getRank(second);
    if ((b.score ?? 0) !== (a.score ?? 0)) return (b.score ?? 0) - (a.score ?? 0);
    const aDeveloperOwned = isKnown5chanDeveloper(a.owner);
    const bDeveloperOwned = isKnown5chanDeveloper(b.owner);
    if (aDeveloperOwned !== bDeveloperOwned) return aDeveloperOwned ? -1 : 1;
    if ((a.addedAt ?? Number.MAX_SAFE_INTEGER) !== (b.addedAt ?? Number.MAX_SAFE_INTEGER)) {
      return (a.addedAt ?? Number.MAX_SAFE_INTEGER) - (b.addedAt ?? Number.MAX_SAFE_INTEGER);
    }
    return a.id.localeCompare(b.id);
  });

export const sortDirectoryBoardsByRank = (boards: DirectoryListBoard[]): DirectoryListBoard[] =>
  sortByDirectoryRank(boards, (board) => ({ id: board.address, owner: board.owner, score: board.score, addedAt: board.addedAt }));

const getPrimaryDirectoryBoard = (boards: DirectoryListBoard[]): DirectoryListBoard | null => sortDirectoryBoardsByRank(boards)[0] ?? null;

export const directoryListToCommunity = (list: DirectoryList): DirectoryCommunity | null => {
  const board = getPrimaryDirectoryBoard(list.boards);
  if (!board) return null;

  return toCanonicalCommunity({
    address: board.address,
    name: board.address,
    publicKey: board.publicKey,
    title: list.title,
    nsfw: board.nsfw,
    directoryCode: list.directoryCode,
    features: list.features ?? board.features,
  });
};
