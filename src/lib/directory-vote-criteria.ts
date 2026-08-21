import { deriveDirectoryCriteria, type Criteria } from '@bitsocial/pubsub-voting';
import stripJsonComments from 'strip-json-comments';
import vendoredManifestSource from '../data/5chan-directory-criteria.jsonc?raw';

export const DIRECTORY_VOTE_CRITERIA_URL = 'https://raw.githubusercontent.com/bitsocialnet/lists/master/5chan-directory-criteria.jsonc';

const LOCALSTORAGE_KEY = '5chan-directory-vote-criteria-cache';
const LOCALSTORAGE_TIMESTAMP_KEY = '5chan-directory-vote-criteria-cache-timestamp';
const CACHE_MAX_AGE_MS = 60 * 60 * 1000;
const FETCH_RETRY_DELAY_MS = 60 * 1000;
const FETCH_TIMEOUT_MS = 10 * 1000;
const DIRECTORY_CONTEST_ID_PATTERN = /^5chan-dir-(.+)-vote-test-\d+$/;

export interface DirectoryVoteCriteria {
  criteria: Criteria[];
  criteriaByDirectoryCode: ReadonlyMap<string, Criteria>;
  directoryCodeByContestId: ReadonlyMap<string, string>;
}

let cachedCriteria: DirectoryVoteCriteria | undefined;
let vendoredCriteria: DirectoryVoteCriteria | undefined;
let inFlightFetch: Promise<DirectoryVoteCriteria> | undefined;
let lastFetchAttemptAt: number | undefined;
let lastFetchSuccessAt: number | undefined;
const criteriaListeners = new Set<() => void>();

export const getDirectoryCodeFromContestId = (contestId: string): string | undefined => DIRECTORY_CONTEST_ID_PATTERN.exec(contestId)?.[1];

export const parseDirectoryVoteCriteria = (source: string): DirectoryVoteCriteria => {
  const manifest = JSON.parse(stripJsonComments(source));
  const criteria = deriveDirectoryCriteria(manifest);
  const criteriaByDirectoryCode = new Map<string, Criteria>();
  const directoryCodeByContestId = new Map<string, string>();

  for (const contestCriteria of criteria) {
    const directoryCode = getDirectoryCodeFromContestId(contestCriteria.contestId);
    if (!directoryCode) {
      throw new Error(`Directory vote contestId does not encode a directory code: ${contestCriteria.contestId}`);
    }
    if (criteriaByDirectoryCode.has(directoryCode)) {
      throw new Error(`Directory vote manifest defines more than one contest for /${directoryCode}/`);
    }
    criteriaByDirectoryCode.set(directoryCode, contestCriteria);
    directoryCodeByContestId.set(contestCriteria.contestId, directoryCode);
  }

  return { criteria, criteriaByDirectoryCode, directoryCodeByContestId };
};

export const getVendoredDirectoryVoteCriteria = (): DirectoryVoteCriteria => {
  vendoredCriteria ??= parseDirectoryVoteCriteria(vendoredManifestSource);
  return vendoredCriteria;
};

const getLocalStorage = (): Storage | undefined => {
  try {
    return globalThis.localStorage;
  } catch {
    return undefined;
  }
};

const readCachedSource = (): { source: string; savedAt?: number } | undefined => {
  const storage = getLocalStorage();
  if (!storage) return undefined;

  try {
    const source = storage.getItem(LOCALSTORAGE_KEY);
    if (!source) return undefined;
    parseDirectoryVoteCriteria(source);
    const savedAtValue = Number(storage.getItem(LOCALSTORAGE_TIMESTAMP_KEY));
    return { source, ...(Number.isFinite(savedAtValue) && savedAtValue > 0 ? { savedAt: savedAtValue } : {}) };
  } catch (error) {
    console.warn('Invalid directory vote criteria cache, clearing it:', error);
    storage.removeItem(LOCALSTORAGE_KEY);
    storage.removeItem(LOCALSTORAGE_TIMESTAMP_KEY);
    return undefined;
  }
};

const saveCachedSource = (source: string) => {
  try {
    const storage = getLocalStorage();
    storage?.setItem(LOCALSTORAGE_KEY, source);
    storage?.setItem(LOCALSTORAGE_TIMESTAMP_KEY, Date.now().toString());
  } catch (error) {
    console.warn('Failed to cache directory vote criteria:', error);
  }
};

const haveSameCriteria = (first: DirectoryVoteCriteria, second: DirectoryVoteCriteria): boolean => JSON.stringify(first.criteria) === JSON.stringify(second.criteria);

const notifyCriteriaListeners = () => {
  for (const listener of criteriaListeners) listener();
};

export const getCachedDirectoryVoteCriteria = (): DirectoryVoteCriteria => {
  if (cachedCriteria) return cachedCriteria;
  const cached = readCachedSource();
  if (cached) {
    cachedCriteria = parseDirectoryVoteCriteria(cached.source);
    lastFetchSuccessAt = cached.savedAt;
  } else {
    cachedCriteria = getVendoredDirectoryVoteCriteria();
  }
  return cachedCriteria;
};

const fetchDirectoryVoteCriteria = async (): Promise<DirectoryVoteCriteria> => {
  const controller = new AbortController();
  const timeoutId = globalThis.setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(DIRECTORY_VOTE_CRITERIA_URL, { cache: 'no-cache', signal: controller.signal });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const source = await response.text();
    const parsed = parseDirectoryVoteCriteria(source);
    const previous = cachedCriteria;
    cachedCriteria = previous && haveSameCriteria(previous, parsed) ? previous : parsed;
    lastFetchSuccessAt = Date.now();
    saveCachedSource(source);
    if (cachedCriteria !== previous) notifyCriteriaListeners();
    return cachedCriteria;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`Timed out fetching ${DIRECTORY_VOTE_CRITERIA_URL}`);
    }
    throw error;
  } finally {
    globalThis.clearTimeout(timeoutId);
  }
};

export const loadDirectoryVoteCriteria = async (): Promise<DirectoryVoteCriteria> => {
  const now = Date.now();
  if (cachedCriteria && lastFetchSuccessAt !== undefined && now - lastFetchSuccessAt < CACHE_MAX_AGE_MS) {
    return cachedCriteria;
  }
  if (inFlightFetch) return inFlightFetch;
  if (cachedCriteria && lastFetchAttemptAt !== undefined && now - lastFetchAttemptAt < FETCH_RETRY_DELAY_MS) {
    return cachedCriteria;
  }

  lastFetchAttemptAt = now;
  inFlightFetch = fetchDirectoryVoteCriteria()
    .catch((error) => {
      console.warn(`Failed to fetch directory vote criteria from ${DIRECTORY_VOTE_CRITERIA_URL}:`, error);
      return getCachedDirectoryVoteCriteria();
    })
    .finally(() => {
      inFlightFetch = undefined;
    });
  return inFlightFetch;
};

export const subscribeDirectoryVoteCriteria = (listener: () => void) => {
  criteriaListeners.add(listener);
  void loadDirectoryVoteCriteria().catch((error) => console.error('Failed to load directory vote criteria', error));
  return () => {
    criteriaListeners.delete(listener);
  };
};

export const __resetDirectoryVoteCriteriaForTests = () => {
  cachedCriteria = undefined;
  vendoredCriteria = undefined;
  inFlightFetch = undefined;
  lastFetchAttemptAt = undefined;
  lastFetchSuccessAt = undefined;
  criteriaListeners.clear();
};
