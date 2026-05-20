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
  createdAt?: number;
  updatedAt?: number;
  boards: DirectoryListBoard[];
}

interface DirectoryDefaultsEntry {
  directoryCode?: string;
  title?: string;
  features?: DirectoryFeatures;
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

const normalizeDirectoryDefaultsEntry = (code: string, raw: unknown): DirectoryDefaultsEntry => {
  if (!isRecord(raw)) {
    return { directoryCode: code };
  }

  const directoryCode = toString(raw.directoryCode) ?? code;
  const features = normalizeFeatures(raw.features);
  return {
    directoryCode,
    ...(toString(raw.title) ? { title: toString(raw.title)! } : {}),
    ...(features ? { features } : {}),
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

const deriveNsfw = (value: { nsfw?: unknown; features?: { nsfw?: boolean; safeForWork?: boolean } }): boolean | undefined => {
  const features = value.features;
  const safeForWork = typeof features?.safeForWork === 'boolean' ? features.safeForWork : undefined;
  if (safeForWork !== undefined) {
    return !safeForWork;
  }
  const featuresNsfw = typeof features?.nsfw === 'boolean' ? features.nsfw : undefined;
  const topLevelNsfw = typeof value.nsfw === 'boolean' ? value.nsfw : undefined;
  return topLevelNsfw ?? featuresNsfw;
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

  return {
    directoryCode,
    ...(toString(defaultEntry?.title) ? { title: toString(defaultEntry?.title)! } : toString(raw.title) ? { title: toString(raw.title)! } : {}),
    ...(toString(raw.description) ? { description: toString(raw.description)! } : {}),
    ...(features ? { features } : {}),
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

/**
 * Sort boards by future score data when present. Static list ties break in favor
 * of known 5chan developer owners, then `addedAt` asc.
 * Final tie-break is address for deterministic rendering.
 */
export const sortDirectoryBoardsByRank = (boards: DirectoryListBoard[]): DirectoryListBoard[] =>
  [...boards].sort((a, b) => {
    if ((b.score ?? 0) !== (a.score ?? 0)) return (b.score ?? 0) - (a.score ?? 0);
    const aDeveloperOwned = isKnown5chanDeveloper(a.owner);
    const bDeveloperOwned = isKnown5chanDeveloper(b.owner);
    if (aDeveloperOwned !== bDeveloperOwned) return aDeveloperOwned ? -1 : 1;
    if ((a.addedAt ?? Number.MAX_SAFE_INTEGER) !== (b.addedAt ?? Number.MAX_SAFE_INTEGER)) {
      return (a.addedAt ?? Number.MAX_SAFE_INTEGER) - (b.addedAt ?? Number.MAX_SAFE_INTEGER);
    }
    return a.address.localeCompare(b.address);
  });

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
