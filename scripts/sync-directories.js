// Best-effort mirror of the 5chan directories folder from GitHub.
// Keeps src/data/5chan-directories/ a byte-for-byte copy of
// https://github.com/bitsocialnet/lists/tree/master/5chan-directories so the app has an
// offline fallback (loaded via src/data/vendored-directory-lists.ts) when GitHub is down.
// Also mirrors the directory voting manifest next to it (see syncVoteCriteria below).
// Never fails the build: if the fetch fails (offline, rate-limited, etc.), existing files are kept.

import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'fs';
import { isAbsolute, join, dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import stripJsonComments from 'strip-json-comments';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const GITHUB_CONTENTS_URL = 'https://api.github.com/repos/bitsocialnet/lists/contents/5chan-directories?ref=master';
const GITHUB_RAW_BASE_URL = 'https://raw.githubusercontent.com/bitsocialnet/lists/master/5chan-directories';
const DIRECTORIES_SOURCE_PATH = process.env.DIRECTORIES_SOURCE_PATH;
const OUTPUT_DIR = join(__dirname, '..', 'src', 'data', '5chan-directories');
const TIMEOUT_MS = 5000;

// The directory voting manifest: shared `defaults` plus one `contests` entry per directory
// slot. The same file the seeder derives its contests from, so both sides land on
// byte-identical criteria documents (and therefore the same pubsub topics).
const VOTE_CRITERIA_FILE_NAME = '5chan-directory-criteria.jsonc';
const VOTE_CRITERIA_RAW_URL = `https://raw.githubusercontent.com/bitsocialnet/lists/master/${VOTE_CRITERIA_FILE_NAME}`;
const VOTE_CRITERIA_OUTPUT_PATH = join(__dirname, '..', 'src', 'data', VOTE_CRITERIA_FILE_NAME);

const isJsonFile = (fileName) => typeof fileName === 'string' && fileName.endsWith('.json');
const isRecord = (value) => typeof value === 'object' && value !== null;
const getErrorMessage = (error) => (error instanceof Error ? error.message : String(error));
const getSourceLabel = () => {
  if (!DIRECTORIES_SOURCE_PATH) {
    return `GitHub folder: ${GITHUB_CONTENTS_URL}`;
  }
  const resolvedSourcePath = isAbsolute(DIRECTORIES_SOURCE_PATH) ? DIRECTORIES_SOURCE_PATH : resolve(process.cwd(), DIRECTORIES_SOURCE_PATH);
  return `local directory: ${resolvedSourcePath}`;
};

const fetchWithTimeout = async (url, asJson) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    return asJson ? response.json() : response.text();
  } finally {
    clearTimeout(timeout);
  }
};

// Load the { fileName -> verbatim text } map from a local mirror directory.
const loadFromLocalDirectory = (directoryPath) => {
  console.log(`ℹ️  Mirroring directories from local directory: ${directoryPath}`);
  const files = {};
  for (const fileName of readdirSync(directoryPath).filter(isJsonFile)) {
    files[fileName] = readFileSync(join(directoryPath, fileName), 'utf8');
  }
  return files;
};

// Load the { fileName -> verbatim text } map from the GitHub folder.
const loadFromGitHub = async () => {
  console.log(`ℹ️  Mirroring directories from GitHub folder: ${GITHUB_CONTENTS_URL}`);
  const contents = await fetchWithTimeout(GITHUB_CONTENTS_URL, true);
  if (!Array.isArray(contents)) {
    throw new Error('Invalid GitHub directory listing');
  }

  const fileNames = contents
    .filter((entry) => isRecord(entry) && entry.type === 'file' && isJsonFile(entry.name))
    .map((entry) => entry.name)
    .sort();

  const files = {};
  await Promise.all(
    fileNames.map(async (fileName) => {
      files[fileName] = await fetchWithTimeout(`${GITHUB_RAW_BASE_URL}/${fileName}`, false);
    }),
  );
  return files;
};

const loadSourceFiles = async () => {
  if (DIRECTORIES_SOURCE_PATH) {
    const resolvedSourcePath = isAbsolute(DIRECTORIES_SOURCE_PATH) ? DIRECTORIES_SOURCE_PATH : resolve(process.cwd(), DIRECTORIES_SOURCE_PATH);
    if (!existsSync(resolvedSourcePath) || !statSync(resolvedSourcePath).isDirectory()) {
      throw new Error(`Local directories source folder not found: ${resolvedSourcePath}`);
    }
    return loadFromLocalDirectory(resolvedSourcePath);
  }
  return loadFromGitHub();
};

const sync = async () => {
  try {
    const files = await loadSourceFiles();
    const fileNames = Object.keys(files);
    if (fileNames.length === 0) {
      throw new Error('No directory files found in source');
    }

    // Validate every file parses as JSON before touching disk, so a transient HTML error page
    // (or a truncated download) can never overwrite a good vendored mirror.
    for (const [fileName, text] of Object.entries(files)) {
      try {
        JSON.parse(text);
      } catch {
        throw new Error(`Invalid JSON for ${fileName}`);
      }
    }

    mkdirSync(OUTPUT_DIR, { recursive: true });

    let written = 0;
    for (const [fileName, text] of Object.entries(files)) {
      const outputPath = join(OUTPUT_DIR, fileName);
      // Write verbatim; the upstream files are the source of truth, mirror them byte-for-byte.
      const existing = existsSync(outputPath) ? readFileSync(outputPath, 'utf8') : null;
      if (existing !== text) {
        writeFileSync(outputPath, text, 'utf8');
        written += 1;
      }
    }

    // Prune local json files that no longer exist upstream so the mirror stays exact.
    const sourceNames = new Set(fileNames);
    let removed = 0;
    for (const fileName of readdirSync(OUTPUT_DIR).filter(isJsonFile)) {
      if (!sourceNames.has(fileName)) {
        rmSync(join(OUTPUT_DIR, fileName));
        removed += 1;
      }
    }

    if (written === 0 && removed === 0) {
      console.log(`✅ Vendored directories already up to date (${fileNames.length} files)`);
      return;
    }
    console.log(`✅ Mirrored directories (${fileNames.length} files, ${written} updated, ${removed} removed)`);
  } catch (e) {
    console.warn(`⚠️  Could not mirror directories from ${getSourceLabel()} (keeping existing files): ${getErrorMessage(e)}`);
  }
};

// Mirror the directory voting manifest verbatim. Kept byte-for-byte for the same reason as
// the directory files: the manifest is only an authoring convenience, but the criteria
// documents derived from it are canonically encoded and their CIDs are the pubsub topics,
// so 5chan and the seeder must derive from the same values or they end up on different
// topics and never see each other's votes.
const syncVoteCriteria = async () => {
  const localSourcePath = DIRECTORIES_SOURCE_PATH
    ? join(isAbsolute(DIRECTORIES_SOURCE_PATH) ? DIRECTORIES_SOURCE_PATH : resolve(process.cwd(), DIRECTORIES_SOURCE_PATH), '..', VOTE_CRITERIA_FILE_NAME)
    : null;

  try {
    const text = localSourcePath ? readFileSync(localSourcePath, 'utf8') : await fetchWithTimeout(VOTE_CRITERIA_RAW_URL, false);

    // Validate before touching disk so an HTML error page or a truncated download can never
    // overwrite a good vendored manifest.
    let parsed;
    try {
      parsed = JSON.parse(stripJsonComments(text));
    } catch {
      throw new Error('Invalid JSONC');
    }
    if (!isRecord(parsed) || !isRecord(parsed.defaults) || !Array.isArray(parsed.contests) || parsed.contests.length === 0) {
      throw new Error('Manifest is missing `defaults` or a non-empty `contests` array');
    }

    mkdirSync(dirname(VOTE_CRITERIA_OUTPUT_PATH), { recursive: true });
    const existing = existsSync(VOTE_CRITERIA_OUTPUT_PATH) ? readFileSync(VOTE_CRITERIA_OUTPUT_PATH, 'utf8') : null;
    if (existing === text) {
      console.log(`✅ Vendored vote criteria already up to date (${parsed.contests.length} contests)`);
      return;
    }
    writeFileSync(VOTE_CRITERIA_OUTPUT_PATH, text, 'utf8');
    console.log(`✅ Mirrored vote criteria (${parsed.contests.length} contests)`);
  } catch (e) {
    const sourceLabel = localSourcePath ? `local file: ${localSourcePath}` : `GitHub raw file: ${VOTE_CRITERIA_RAW_URL}`;
    console.warn(`⚠️  Could not mirror vote criteria from ${sourceLabel} (keeping existing file): ${getErrorMessage(e)}`);
  }
};

await sync();
await syncVoteCriteria();
