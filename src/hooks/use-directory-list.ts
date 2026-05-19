import { useEffect, useMemo, useState } from 'react';
import { DirectoryCommunity, useDirectories } from './use-directories';

export interface DirectoryListBoard {
  address: string;
  publicKey?: string;
  title?: string;
  description?: string;
  owner?: string;
  score: number;
  managedByDevs: boolean;
  addedAt?: number;
}

interface DirectoryList {
  directoryCode: string;
  title?: string;
  description?: string;
  createdAt?: number;
  updatedAt?: number;
  boards: DirectoryListBoard[];
}

interface DirectoryListState {
  list: DirectoryList | null;
  loading: boolean;
  error: Error | null;
}

const GITHUB_URL_TEMPLATE = 'https://raw.githubusercontent.com/bitsocialnet/lists/master/5chan-{code}-directory.json';
const LOCALSTORAGE_KEY_PREFIX = '5chan-directory-list-cache:';
const LOCALSTORAGE_TIMESTAMP_KEY_PREFIX = '5chan-directory-list-cache-timestamp:';
const CACHE_MAX_AGE_MS = 60 * 60 * 1000; // 1 hour
const FETCH_RETRY_DELAY_MS = 60 * 1000; // 1 minute
const FETCH_TIMEOUT_MS = 10 * 1000;

// Per-code module caches keyed by directory code (e.g. 'biz').
const moduleCaches = new Map<string, DirectoryList>();
const inFlightFetches = new Map<string, Promise<DirectoryList | null>>();
const lastFetchSuccessAt = new Map<string, number>();
const lastFetchAttemptAt = new Map<string, number>();

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;

const toNumber = (value: unknown): number | undefined => (typeof value === 'number' && Number.isFinite(value) ? value : undefined);

const toString = (value: unknown): string | undefined => (typeof value === 'string' && value.length > 0 ? value : undefined);

const toBool = (value: unknown): boolean => value === true;

const normalizeBoard = (raw: unknown): DirectoryListBoard | null => {
  if (!isRecord(raw)) return null;
  const address = toString(raw.address) ?? toString(raw.name);
  if (!address) return null;

  return {
    address,
    ...(toString(raw.publicKey) ? { publicKey: toString(raw.publicKey)! } : {}),
    ...(toString(raw.title) ? { title: toString(raw.title)! } : {}),
    ...(toString(raw.description) ? { description: toString(raw.description)! } : {}),
    ...(toString(raw.owner) ? { owner: toString(raw.owner)! } : {}),
    score: toNumber(raw.score) ?? 0,
    managedByDevs: toBool(raw.managedByDevs),
    ...(toNumber(raw.addedAt) !== undefined ? { addedAt: toNumber(raw.addedAt) } : {}),
  };
};

const normalizeDirectoryList = (raw: unknown, fallbackCode: string): DirectoryList | null => {
  if (!isRecord(raw)) return null;
  const boardsRaw = Array.isArray(raw.boards) ? raw.boards : Array.isArray(raw.communities) ? raw.communities : null;
  if (!boardsRaw) return null;

  const boards = boardsRaw.map(normalizeBoard).filter((board): board is DirectoryListBoard => board !== null);
  if (boards.length === 0) return null;

  return {
    directoryCode: toString(raw.directoryCode) ?? fallbackCode,
    ...(toString(raw.title) ? { title: toString(raw.title)! } : {}),
    ...(toString(raw.description) ? { description: toString(raw.description)! } : {}),
    ...(toNumber(raw.createdAt) !== undefined ? { createdAt: toNumber(raw.createdAt) } : {}),
    ...(toNumber(raw.updatedAt) !== undefined ? { updatedAt: toNumber(raw.updatedAt) } : {}),
    boards,
  };
};

const synthesizeFromMainDirectory = (directoryCode: string, directories: DirectoryCommunity[]): DirectoryList | null => {
  const match = directories.find((community) => community.directoryCode === directoryCode);
  if (!match || !match.address) return null;

  const board: DirectoryListBoard = {
    address: match.address,
    ...(match.publicKey ? { publicKey: match.publicKey } : {}),
    ...(match.title ? { title: match.title } : {}),
    score: 0,
    managedByDevs: true,
  };

  return {
    directoryCode,
    ...(match.title ? { title: match.title } : {}),
    boards: [board],
  };
};

const getLocalStorageKey = (code: string) => `${LOCALSTORAGE_KEY_PREFIX}${code}`;
const getLocalStorageTimestampKey = (code: string) => `${LOCALSTORAGE_TIMESTAMP_KEY_PREFIX}${code}`;

const getFromLocalStorage = (code: string): DirectoryList | null => {
  try {
    const cached = localStorage.getItem(getLocalStorageKey(code));
    const timestamp = localStorage.getItem(getLocalStorageTimestampKey(code));
    if (cached && timestamp) {
      const age = Date.now() - parseInt(timestamp, 10);
      if (age < CACHE_MAX_AGE_MS) {
        const parsed = JSON.parse(cached);
        const normalized = normalizeDirectoryList(parsed, code);
        if (normalized) return normalized;
        localStorage.removeItem(getLocalStorageKey(code));
        localStorage.removeItem(getLocalStorageTimestampKey(code));
      }
    }
  } catch (e) {
    console.warn(`Failed to read directory list "${code}" from localStorage:`, e);
  }
  return null;
};

const saveToLocalStorage = (code: string, data: DirectoryList) => {
  try {
    localStorage.setItem(getLocalStorageKey(code), JSON.stringify(data));
    localStorage.setItem(getLocalStorageTimestampKey(code), Date.now().toString());
  } catch (e) {
    console.warn(`Failed to save directory list "${code}" to localStorage:`, e);
  }
};

const shouldRefreshFromGitHub = (code: string): boolean => {
  const now = Date.now();
  const lastSuccess = lastFetchSuccessAt.get(code);
  if (lastSuccess !== undefined && now - lastSuccess < CACHE_MAX_AGE_MS) {
    return false;
  }
  const lastAttempt = lastFetchAttemptAt.get(code);
  if (lastAttempt !== undefined && now - lastAttempt < FETCH_RETRY_DELAY_MS) {
    return false;
  }
  return true;
};

const fetchDirectoryListFromGitHub = async (code: string): Promise<DirectoryList | null> => {
  const url = GITHUB_URL_TEMPLATE.replace('{code}', code);
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  let response: Response;
  try {
    response = await fetch(url, { cache: 'no-cache', signal: controller.signal });
  } finally {
    window.clearTimeout(timeoutId);
  }
  if (response.status === 404) {
    // Not yet published; treat as missing — caller will fall back.
    return null;
  }
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  const normalized = normalizeDirectoryList(await response.json(), code);
  if (!normalized) {
    throw new Error(`Invalid directory list payload for ${code}`);
  }
  moduleCaches.set(code, normalized);
  lastFetchSuccessAt.set(code, Date.now());
  saveToLocalStorage(code, normalized);
  return normalized;
};

const fetchDirectoryListDeduped = (code: string): Promise<DirectoryList | null> => {
  const existing = inFlightFetches.get(code);
  if (existing) return existing;

  if (!shouldRefreshFromGitHub(code)) {
    return Promise.resolve(null);
  }

  lastFetchAttemptAt.set(code, Date.now());
  const promise = fetchDirectoryListFromGitHub(code).finally(() => {
    inFlightFetches.delete(code);
  });
  inFlightFetches.set(code, promise);
  return promise;
};

/**
 * Fetch the candidate boards for a single directory code (e.g. 'biz').
 *
 * Source: `bitsocialnet/lists/5chan-{code}-directory.json`. When the network is unavailable
 * or the file is not yet published, falls back to a synthesized single-entry list derived
 * from the main 5chan-directories.json (the dev-managed default).
 */
export const useDirectoryList = (directoryCode: string | undefined): DirectoryListState => {
  const directories = useDirectories();
  const fallback = useMemo(() => (directoryCode ? synthesizeFromMainDirectory(directoryCode, directories) : null), [directoryCode, directories]);

  const [state, setState] = useState<DirectoryListState>(() => {
    if (!directoryCode) {
      return { list: null, loading: false, error: null };
    }
    const cached = moduleCaches.get(directoryCode);
    if (cached) {
      return { list: cached, loading: false, error: null };
    }
    return { list: fallback, loading: true, error: null };
  });

  useEffect(() => {
    if (!directoryCode) {
      setState({ list: null, loading: false, error: null });
      return;
    }

    let isMounted = true;

    const hydrate = (list: DirectoryList) => {
      moduleCaches.set(directoryCode, list);
      if (isMounted) {
        setState({ list, loading: false, error: null });
      }
    };

    (async () => {
      const cached = moduleCaches.get(directoryCode);
      if (cached) {
        setState({ list: cached, loading: false, error: null });
      } else {
        const local = getFromLocalStorage(directoryCode);
        if (local) {
          hydrate(local);
        } else if (fallback) {
          setState({ list: fallback, loading: true, error: null });
        }
      }

      try {
        const fetched = await fetchDirectoryListDeduped(directoryCode);
        if (fetched) {
          hydrate(fetched);
        } else if (!moduleCaches.get(directoryCode) && fallback) {
          if (isMounted) {
            setState({ list: fallback, loading: false, error: null });
          }
        } else if (isMounted) {
          // Stop the loading indicator once the fetch resolves (even if it returned null).
          setState((prev) => ({ ...prev, loading: false }));
        }
      } catch (error) {
        console.warn(`Failed to fetch directory list "${directoryCode}":`, error);
        if (!isMounted) return;
        const cachedAfter = moduleCaches.get(directoryCode);
        if (cachedAfter) {
          setState({ list: cachedAfter, loading: false, error: null });
        } else if (fallback) {
          setState({ list: fallback, loading: false, error: error instanceof Error ? error : new Error(String(error)) });
        } else {
          setState({ list: null, loading: false, error: error instanceof Error ? error : new Error(String(error)) });
        }
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [directoryCode, fallback]);

  return state;
};

/**
 * Sort boards by score (desc). Ties break in favor of `managedByDevs`, then `addedAt` asc.
 */
export const sortDirectoryBoardsByRank = (boards: DirectoryListBoard[]): DirectoryListBoard[] =>
  [...boards].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (a.managedByDevs !== b.managedByDevs) return a.managedByDevs ? -1 : 1;
    return (a.addedAt ?? 0) - (b.addedAt ?? 0);
  });

/**
 * Pick the winning board for a directory, skipping any boards reported offline.
 * Returns the highest-ranked online board, or — if every candidate looks offline —
 * the highest-ranked board anyway, so the user still lands somewhere.
 */
export const pickDirectoryWinner = (boards: DirectoryListBoard[], isOffline: (address: string) => boolean): DirectoryListBoard | undefined => {
  const ranked = sortDirectoryBoardsByRank(boards);
  return ranked.find((board) => !isOffline(board.address)) ?? ranked[0];
};
