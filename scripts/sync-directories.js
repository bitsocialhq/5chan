// Best-effort sync of per-directory 5chan lists from GitHub.
// Updates the vendored fallback in src/data/ so production builds ship a fresh snapshot.
// Never fails the build: if the fetch fails (offline, rate-limited, etc.), the existing file is kept.

import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'fs';
import { isAbsolute, join, dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const GITHUB_CONTENTS_URL = 'https://api.github.com/repos/bitsocialnet/lists/contents/5chan-directories?ref=master';
const GITHUB_RAW_BASE_URL = 'https://raw.githubusercontent.com/bitsocialnet/lists/master/5chan-directories';
const DIRECTORIES_SOURCE_PATH = process.env.DIRECTORIES_SOURCE_PATH;
const OUTPUT_PATH = join(__dirname, '..', 'src', 'data', '5chan-directory-lists.json');
const TIMEOUT_MS = 5000;
const DEFAULT_METADATA = {
  title: '5chan directories',
  description: 'Directory assignments built from per-directory candidate lists in https://github.com/bitsocialnet/lists/tree/master/5chan-directories',
  createdAt: 0,
  updatedAt: 0,
};

const DEFAULTS_FILE_NAME = '5chan-directories-defaults.json';
const DIRECTORY_LIST_FILE_RE = /^5chan-.+-directory\.json$/;
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
];
const DIRECTORY_CODE_ORDER_INDEX = new Map(DIRECTORY_CODE_ORDER.map((code, index) => [code, index]));

const isRecord = (value) => typeof value === 'object' && value !== null;
const isDirectoryListFile = (fileName) => DIRECTORY_LIST_FILE_RE.test(fileName);
const toNumber = (value) => (typeof value === 'number' && Number.isFinite(value) ? value : undefined);
const toString = (value) => (typeof value === 'string' && value.length > 0 ? value : undefined);

const normalizeFeatures = (value) => {
  if (!isRecord(value)) {
    return undefined;
  }

  const normalizedFeatures = Object.entries(value).reduce((acc, [key, featureValue]) => {
    if (typeof featureValue === 'string' || typeof featureValue === 'boolean' || typeof featureValue === 'number') {
      acc[key] = featureValue;
    }
    return acc;
  }, {});

  return Object.keys(normalizedFeatures).length > 0 ? normalizedFeatures : undefined;
};

const deriveNsfw = ({ nsfw, features }) => {
  const safeForWork = typeof features?.safeForWork === 'boolean' ? features.safeForWork : undefined;
  if (safeForWork !== undefined) {
    return !safeForWork;
  }
  const featuresNsfw = typeof features?.nsfw === 'boolean' ? features.nsfw : undefined;
  return typeof nsfw === 'boolean' ? nsfw : featuresNsfw;
};

const normalizeBoard = (raw) => {
  if (!isRecord(raw)) return null;
  const address = toString(raw.address) || toString(raw.name);
  if (!address) return null;
  const features = normalizeFeatures(raw.features);
  const nsfw = deriveNsfw({ nsfw: raw.nsfw, features });
  const score = toNumber(raw.score);

  return {
    address,
    ...(toString(raw.publicKey) ? { publicKey: toString(raw.publicKey) } : {}),
    ...(toString(raw.owner) ? { owner: toString(raw.owner) } : {}),
    ...(score !== undefined ? { score } : {}),
    ...(toNumber(raw.addedAt) !== undefined ? { addedAt: toNumber(raw.addedAt) } : {}),
    ...(features ? { features } : {}),
    ...(nsfw !== undefined ? { nsfw } : {}),
  };
};

const normalizeDirectoryDefaultsEntry = (code, raw) => {
  if (!isRecord(raw)) {
    return { directoryCode: code };
  }

  const features = normalizeFeatures(raw.features);
  return {
    directoryCode: toString(raw.directoryCode) || code,
    ...(toString(raw.title) ? { title: toString(raw.title) } : {}),
    ...(features ? { features } : {}),
  };
};

const normalizeDirectoryDefaultsData = (raw) => {
  const directoriesRaw = isRecord(raw) && isRecord(raw.directories) ? raw.directories : {};
  const directories = Object.fromEntries(Object.entries(directoriesRaw).map(([code, value]) => [code, normalizeDirectoryDefaultsEntry(code, value)]));
  return {
    ...(isRecord(raw) && toString(raw.title) ? { title: toString(raw.title) } : {}),
    ...(isRecord(raw) && toString(raw.description) ? { description: toString(raw.description) } : {}),
    ...(isRecord(raw) && toNumber(raw.createdAt) !== undefined ? { createdAt: toNumber(raw.createdAt) } : {}),
    ...(isRecord(raw) && toNumber(raw.updatedAt) !== undefined ? { updatedAt: toNumber(raw.updatedAt) } : {}),
    directories,
  };
};

const normalizeDirectoryList = (raw, fallbackCode, defaults) => {
  if (!isRecord(raw)) return null;
  const boardsRaw = Array.isArray(raw.boards) ? raw.boards : Array.isArray(raw.communities) ? raw.communities : null;
  if (!boardsRaw) return null;

  const boards = boardsRaw.map(normalizeBoard).filter(Boolean);
  if (boards.length === 0) return null;
  const rawCode = toString(raw.directoryCode);
  const defaultEntry = defaults?.directories?.[rawCode || fallbackCode] || defaults?.directories?.[fallbackCode];
  const features = normalizeFeatures(defaultEntry?.features) || normalizeFeatures(raw.features);

  return {
    directoryCode: toString(defaultEntry?.directoryCode) || rawCode || fallbackCode,
    ...(toString(defaultEntry?.title) ? { title: toString(defaultEntry.title) } : toString(raw.title) ? { title: toString(raw.title) } : {}),
    ...(toString(raw.description) ? { description: toString(raw.description) } : {}),
    ...(features ? { features } : {}),
    ...(toNumber(raw.createdAt) !== undefined ? { createdAt: toNumber(raw.createdAt) } : {}),
    ...(toNumber(raw.updatedAt) !== undefined ? { updatedAt: toNumber(raw.updatedAt) } : {}),
    boards,
  };
};

const getCodeFromFileName = (fileName) => fileName.replace(/^5chan-/, '').replace(/-directory\.json$/, '');

const sortDirectoryLists = (lists) =>
  [...lists].sort((a, b) => {
    const aIndex = DIRECTORY_CODE_ORDER_INDEX.get(a.directoryCode) ?? Number.MAX_SAFE_INTEGER;
    const bIndex = DIRECTORY_CODE_ORDER_INDEX.get(b.directoryCode) ?? Number.MAX_SAFE_INTEGER;
    if (aIndex !== bIndex) {
      return aIndex - bIndex;
    }
    return a.directoryCode.localeCompare(b.directoryCode);
  });

const toDirectoryListsData = (directories, fallbackMetadata = DEFAULT_METADATA) => {
  const timestamps = [fallbackMetadata.createdAt, fallbackMetadata.updatedAt, ...directories.flatMap((list) => [list.createdAt, list.updatedAt])].filter(
    (value) => typeof value === 'number',
  );
  return {
    title: fallbackMetadata.title || DEFAULT_METADATA.title,
    description: fallbackMetadata.description || DEFAULT_METADATA.description,
    createdAt: timestamps.length > 0 ? Math.min(...timestamps) : fallbackMetadata.createdAt,
    updatedAt: timestamps.length > 0 ? Math.max(...timestamps) : fallbackMetadata.updatedAt,
    directories: sortDirectoryLists(directories),
  };
};

const normalizeDirectoryListsData = (value, fallbackMetadata = DEFAULT_METADATA, defaults) => {
  if (!isRecord(value) || !Array.isArray(value.directories)) {
    return null;
  }

  const directories = value.directories
    .map((directory, index) => {
      if (!isRecord(directory)) {
        return null;
      }
      const fallbackCode = toString(directory.directoryCode) || Object.keys(defaults?.directories || {})[index];
      return fallbackCode ? normalizeDirectoryList(directory, fallbackCode, defaults) : null;
    })
    .filter(Boolean);

  const metadata = {
    title: toString(value.title) || fallbackMetadata.title,
    description: toString(value.description) || fallbackMetadata.description,
    createdAt: toNumber(value.createdAt) ?? fallbackMetadata.createdAt,
    updatedAt: toNumber(value.updatedAt) ?? fallbackMetadata.updatedAt,
  };

  return directories.length > 0 ? toDirectoryListsData(directories, metadata) : null;
};

const getErrorMessage = (error) => (error instanceof Error ? error.message : String(error));

const fetchJson = async (url) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    return await response.json();
  } finally {
    clearTimeout(timeout);
  }
};

const loadFromLocalDirectory = (directoryPath) => {
  console.log(`ℹ️  Syncing vendored directories from local directory: ${directoryPath}`);
  const defaultsPath = join(directoryPath, DEFAULTS_FILE_NAME);
  const defaults = existsSync(defaultsPath) ? normalizeDirectoryDefaultsData(JSON.parse(readFileSync(defaultsPath, 'utf8'))) : normalizeDirectoryDefaultsData({});
  const directories = readdirSync(directoryPath)
    .filter(isDirectoryListFile)
    .map((fileName) => {
      const raw = JSON.parse(readFileSync(join(directoryPath, fileName), 'utf8'));
      return normalizeDirectoryList(raw, getCodeFromFileName(fileName), defaults);
    })
    .filter(Boolean);

  return toDirectoryListsData(directories, {
    title: DEFAULT_METADATA.title,
    description: DEFAULT_METADATA.description,
    createdAt: defaults.createdAt ?? DEFAULT_METADATA.createdAt,
    updatedAt: defaults.updatedAt ?? DEFAULT_METADATA.updatedAt,
  });
};

const loadDirectoriesSource = async () => {
  if (DIRECTORIES_SOURCE_PATH) {
    const resolvedSourcePath = isAbsolute(DIRECTORIES_SOURCE_PATH) ? DIRECTORIES_SOURCE_PATH : resolve(process.cwd(), DIRECTORIES_SOURCE_PATH);
    if (!existsSync(resolvedSourcePath)) {
      throw new Error(`Local directories source not found: ${resolvedSourcePath}`);
    }

    if (statSync(resolvedSourcePath).isDirectory()) {
      return loadFromLocalDirectory(resolvedSourcePath);
    }

    console.log(`ℹ️  Syncing vendored directories from local file: ${resolvedSourcePath}`);
    return JSON.parse(readFileSync(resolvedSourcePath, 'utf8'));
  }

  console.log(`ℹ️  Syncing vendored directories from GitHub folder: ${GITHUB_CONTENTS_URL}`);
  const contents = await fetchJson(GITHUB_CONTENTS_URL);
  if (!Array.isArray(contents)) {
    throw new Error('Invalid GitHub directory listing');
  }

  const fileNames = contents.map((entry) => (isRecord(entry) ? entry.name : undefined)).filter((name) => typeof name === 'string' && isDirectoryListFile(name)).sort();
  const defaults = normalizeDirectoryDefaultsData(await fetchJson(`${GITHUB_RAW_BASE_URL}/${DEFAULTS_FILE_NAME}`));
  const directories = await Promise.all(
    fileNames.map(async (fileName) => {
      const raw = await fetchJson(`${GITHUB_RAW_BASE_URL}/${fileName}`);
      return normalizeDirectoryList(raw, getCodeFromFileName(fileName), defaults);
    }),
  );

  return toDirectoryListsData(directories.filter(Boolean), {
    title: DEFAULT_METADATA.title,
    description: DEFAULT_METADATA.description,
    createdAt: defaults.createdAt ?? DEFAULT_METADATA.createdAt,
    updatedAt: defaults.updatedAt ?? DEFAULT_METADATA.updatedAt,
  });
};

const sync = async () => {
  try {
    let existing = '';
    let fallbackMetadata = DEFAULT_METADATA;
    try {
      existing = readFileSync(OUTPUT_PATH, 'utf8');
      const parsedExisting = JSON.parse(existing);
      const normalizedExisting = normalizeDirectoryListsData(parsedExisting);
      if (normalizedExisting) {
        fallbackMetadata = {
          title: normalizedExisting.title,
          description: normalizedExisting.description,
          createdAt: normalizedExisting.createdAt,
          updatedAt: normalizedExisting.updatedAt,
        };
      }
    } catch {
      // File does not exist yet or is invalid JSON.
    }

    const data = normalizeDirectoryListsData(await loadDirectoriesSource(), fallbackMetadata);
    if (!data) {
      throw new Error('Invalid directory lists payload');
    }

    const formatted = `${JSON.stringify(data, null, 2)}\n`;

    if (formatted === existing) {
      console.log('✅ Vendored directory lists already up to date');
      return;
    }

    writeFileSync(OUTPUT_PATH, formatted, 'utf8');
    console.log(`✅ Synced vendored directory lists (${data.directories.length} directories)`);
  } catch (e) {
    console.warn(`⚠️  Could not sync directory lists from GitHub (keeping existing file): ${getErrorMessage(e)}`);
  }
};

sync();
