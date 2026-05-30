import { normalizeDirectoryDefaultsData, normalizeDirectoryList, sortDirectoryLists, type DirectoryList } from '../lib/utils/directory-list-utils';

/**
 * Offline fallback for the directory data.
 *
 * `./5chan-directories/` is a byte-for-byte mirror of
 * https://github.com/bitsocialnet/lists/tree/master/5chan-directories (kept fresh by
 * `yarn sync:directories`). The raw per-directory files only carry candidate boards; their
 * code/title/features come from the filename and the shared defaults file, exactly like the
 * GitHub fetch path. This module assembles the same merged shape the app consumes so the
 * directory list and rules keep working when GitHub is unreachable.
 */
const rawModules = import.meta.glob<{ default: unknown }>('./5chan-directories/*.json', { eager: true });

// Matched against the file's basename (not the full path) so the leading "5chan-directories/" folder
// segment cannot be greedily captured as part of the directory code.
const DIRECTORY_FILE_RE = /^5chan-(.+)-directory\.json$/;
const DEFAULTS_FILE_NAME = '5chan-directories-defaults.json';

// 5chan-side metadata for the assembled list (the raw mirror has none of its own).
const VENDORED_METADATA = {
  title: '5chan directories',
  description: 'Directory assignments built from per-directory candidate lists in https://github.com/bitsocialnet/lists/tree/master/5chan-directories',
};

export interface VendoredDirectoryLists {
  title: string;
  description: string;
  createdAt: number;
  updatedAt: number;
  directories: DirectoryList[];
}

const directoryEntries: Array<{ code: string; raw: unknown }> = [];
let defaultsRaw: unknown = null;

for (const [path, module] of Object.entries(rawModules)) {
  const raw = module.default;
  const fileName = path.split('/').pop() ?? '';
  if (fileName === DEFAULTS_FILE_NAME) {
    defaultsRaw = raw;
    continue;
  }
  const match = fileName.match(DIRECTORY_FILE_RE);
  if (match) {
    directoryEntries.push({ code: match[1], raw });
  }
}

const defaults = normalizeDirectoryDefaultsData(defaultsRaw);

const directories = sortDirectoryLists(
  directoryEntries.map(({ code, raw }) => normalizeDirectoryList(raw, code, defaults)).filter((list): list is DirectoryList => list !== null),
);

const timestamps = [defaults.createdAt, defaults.updatedAt, ...directories.flatMap((list) => [list.createdAt, list.updatedAt])].filter(
  (value): value is number => typeof value === 'number',
);

export const vendoredDirectoryLists: VendoredDirectoryLists = {
  ...VENDORED_METADATA,
  createdAt: timestamps.length > 0 ? Math.min(...timestamps) : 0,
  updatedAt: timestamps.length > 0 ? Math.max(...timestamps) : 0,
  directories,
};

// Raw defaults JSON, consumed by the directory-defaults fallback (it normalizes on its own).
export const vendoredDirectoryDefaults: unknown = defaultsRaw;
