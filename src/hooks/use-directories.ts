import { useEffect, useMemo, useState } from 'react';
import directoryListsData from '../data/5chan-directory-lists.json';
import {
  directoryListToCommunity,
  isRecord,
  normalizeDirectoryDefaultsData,
  normalizeDirectoryList,
  sortDirectoryLists,
  toCanonicalCommunity,
  toString,
  type DirectoriesData,
  type DirectoryDefaultsData,
  type DirectoryCommunity,
  type DirectoryList,
} from '../lib/utils/directory-list-utils';

export type { DirectoriesData, DirectoryCommunity } from '../lib/utils/directory-list-utils';

interface DirectoriesMetadata {
  title: string;
  description: string;
  createdAt: number;
  updatedAt: number;
}

interface DirectoriesState {
  communities: DirectoryCommunity[];
  loading: boolean;
  error: Error | null;
}

const GITHUB_URL_TEMPLATE = 'https://raw.githubusercontent.com/bitsocialnet/lists/master/5chan-directories/5chan-{code}-directory.json';
const GITHUB_DEFAULTS_URL = 'https://raw.githubusercontent.com/bitsocialnet/lists/master/5chan-directories/5chan-directories-defaults.json';
const LOCALSTORAGE_KEY = '5chan-directories-cache';
const LOCALSTORAGE_TIMESTAMP_KEY = '5chan-directories-cache-timestamp';
const CACHE_MAX_AGE_MS = 60 * 60 * 1000; // 1 hour
const FETCH_RETRY_DELAY_MS = 60 * 1000; // 1 minute
const FETCH_TIMEOUT_MS = 10 * 1000;

let cacheCommunities: DirectoryCommunity[] | null = null;
let cacheMetadata: DirectoriesMetadata | null = null;
let inFlightGitHubFetch: Promise<DirectoriesData> | null = null;
let lastSuccessfulGitHubFetchAt: number | null = null;
let lastGitHubFetchAttemptAt: number | null = null;
const DIRECTORY_ALIAS_SUFFIXES = ['.bso', '.eth'] as const;

// Exposed for deterministic unit tests around module-level cache state.
export const __resetDirectoriesModuleStateForTests = () => {
  cacheCommunities = null;
  cacheMetadata = null;
  inFlightGitHubFetch = null;
  lastSuccessfulGitHubFetchAt = null;
  lastGitHubFetchAttemptAt = null;
  fallbackDirectoriesData = null;
};

const getDirectoryIdentifiers = (community: DirectoryCommunity): string[] => [
  ...new Set([community.address, community.name, community.publicKey].filter((value): value is string => typeof value === 'string' && value.length > 0)),
];

const dedupeCommunities = (entries: DirectoryCommunity[]): DirectoryCommunity[] => {
  const seenAddresses = new Set<string>();
  const normalizedEntries: DirectoryCommunity[] = [];

  for (const entry of entries) {
    const dedupeKey = entry.publicKey ?? entry.address;
    if (seenAddresses.has(dedupeKey)) {
      continue;
    }
    seenAddresses.add(dedupeKey);
    normalizedEntries.push(entry);
  }

  return normalizedEntries;
};

const adaptDirectoryLists = (value: Record<string, unknown>): DirectoryCommunity[] => {
  if (!Array.isArray(value.directories)) {
    return [];
  }

  const lists = value.directories
    .map((directory) => {
      if (!isRecord(directory) || !Array.isArray(directory.boards) || typeof directory.directoryCode !== 'string') {
        return null;
      }
      return normalizeDirectoryList(directory, directory.directoryCode);
    })
    .filter((list): list is DirectoryList => list !== null);

  const communities = sortDirectoryLists(lists)
    .map(directoryListToCommunity)
    .filter((community): community is DirectoryCommunity => community !== null);

  return dedupeCommunities(communities);
};

const adaptV2Directories = (value: Record<string, unknown>): DirectoryCommunity[] => {
  if (!Array.isArray(value.directories)) {
    return [];
  }

  const communities = value.directories
    .map((directory) => {
      if (!isRecord(directory)) {
        return null;
      }
      const features = isRecord(directory.features) ? directory.features : null;
      return toCanonicalCommunity({
        communityAddress: directory.communityAddress,
        name: directory.name,
        publicKey: directory.publicKey,
        title: directory.title,
        directoryCode: directory.directoryCode,
        features,
      });
    })
    .filter((community): community is DirectoryCommunity => community !== null);

  return dedupeCommunities(communities);
};

export const normalizeBoardAddress = (address: string): string => {
  for (const suffix of DIRECTORY_ALIAS_SUFFIXES) {
    if (address.endsWith(suffix)) {
      return address.slice(0, -suffix.length);
    }
  }

  return address;
};

export const findDirectoryByAddress = (directories: DirectoryCommunity[], address: string | undefined): DirectoryCommunity | undefined => {
  if (!address) {
    return undefined;
  }

  const exactMatch = directories.find((community) => community.address === address);
  if (exactMatch) {
    return exactMatch;
  }

  const exactIdentifierMatch = directories.find((community) => getDirectoryIdentifiers(community).includes(address));
  if (exactIdentifierMatch) {
    return exactIdentifierMatch;
  }

  const normalizedAddress = normalizeBoardAddress(address);
  return directories.find((community) => getDirectoryIdentifiers(community).some((identifier) => normalizeBoardAddress(identifier) === normalizedAddress));
};

const adaptV1Communities = (value: Record<string, unknown>): DirectoryCommunity[] => {
  if (!Array.isArray(value.communities)) {
    return [];
  }

  const communities = value.communities
    .map((community) => {
      if (!isRecord(community)) {
        return null;
      }
      return toCanonicalCommunity({
        address: community.address,
        name: community.name,
        publicKey: community.publicKey,
        title: community.title,
        nsfw: community.nsfw,
        directoryCode: community.directoryCode,
        features: community.features,
      });
    })
    .filter((community): community is DirectoryCommunity => community !== null);

  return dedupeCommunities(communities);
};

const getDirectoriesMetadata = (value: unknown): DirectoriesMetadata => {
  if (!isRecord(value)) {
    return {
      title: '',
      description: '',
      createdAt: 0,
      updatedAt: 0,
    };
  }

  return {
    title: typeof value.title === 'string' ? value.title : '',
    description: typeof value.description === 'string' ? value.description : '',
    createdAt: typeof value.createdAt === 'number' ? value.createdAt : 0,
    updatedAt: typeof value.updatedAt === 'number' ? value.updatedAt : 0,
  };
};

const normalizeDirectoriesData = (value: unknown): DirectoriesData | null => {
  if (!isRecord(value)) {
    return null;
  }

  const adapters: Array<(raw: Record<string, unknown>) => DirectoryCommunity[]> = [adaptDirectoryLists, adaptV2Directories, adaptV1Communities];
  const communities = adapters.map((adapter) => adapter(value)).find((normalized) => normalized.length > 0) ?? [];

  if (communities.length === 0) {
    return null;
  }

  const fallbackMetadata = getDirectoriesMetadata(directoryListsData as unknown);
  return {
    title: typeof value.title === 'string' ? value.title : fallbackMetadata.title,
    description: typeof value.description === 'string' ? value.description : fallbackMetadata.description,
    createdAt: typeof value.createdAt === 'number' ? value.createdAt : fallbackMetadata.createdAt,
    updatedAt: typeof value.updatedAt === 'number' ? value.updatedAt : fallbackMetadata.updatedAt,
    communities,
  };
};

let fallbackDirectoriesData: DirectoriesData | null = null;

export const getFallbackDirectoriesData = (): DirectoriesData => {
  if (fallbackDirectoriesData) return fallbackDirectoriesData;
  const normalized = normalizeDirectoriesData(directoryListsData as unknown);
  const metadata = getDirectoriesMetadata(directoryListsData as unknown);
  fallbackDirectoriesData = normalized ?? {
    ...metadata,
    communities: [],
  };
  return fallbackDirectoriesData;
};

const getFromLocalStorage = (): DirectoriesData | null => {
  try {
    const cached = localStorage.getItem(LOCALSTORAGE_KEY);
    const timestamp = localStorage.getItem(LOCALSTORAGE_TIMESTAMP_KEY);
    if (cached && timestamp) {
      const age = Date.now() - parseInt(timestamp, 10);
      if (age < CACHE_MAX_AGE_MS) {
        const parsed = JSON.parse(cached);
        const normalized = normalizeDirectoriesData(parsed);
        if (normalized) {
          return normalized;
        }
        console.warn('Invalid directories cache format, clearing stale cache');
        localStorage.removeItem(LOCALSTORAGE_KEY);
        localStorage.removeItem(LOCALSTORAGE_TIMESTAMP_KEY);
      }
    }
  } catch (e) {
    console.warn('Failed to read from localStorage:', e);
  }
  return null;
};

const saveToLocalStorage = (data: DirectoriesData) => {
  try {
    localStorage.setItem(LOCALSTORAGE_KEY, JSON.stringify(data));
    localStorage.setItem(LOCALSTORAGE_TIMESTAMP_KEY, Date.now().toString());
  } catch (e) {
    console.warn('Failed to save to localStorage:', e);
  }
};

const toDirectoriesMetadata = (data: DirectoriesData): DirectoriesMetadata => ({
  title: data.title,
  description: data.description,
  createdAt: data.createdAt,
  updatedAt: data.updatedAt,
});

const hydrateModuleCaches = (data: DirectoriesData) => {
  cacheCommunities = data.communities;
  cacheMetadata = toDirectoriesMetadata(data);
};

const getFallbackDirectoryLists = (defaults?: DirectoryDefaultsData): DirectoryList[] => {
  const rawData = directoryListsData as unknown;
  if (!isRecord(rawData) || !Array.isArray(rawData.directories)) {
    return [];
  }

  return rawData.directories
    .map((directory) => {
      if (!isRecord(directory)) {
        return null;
      }
      const fallbackCode = toString(directory.directoryCode);
      return fallbackCode ? normalizeDirectoryList(directory, fallbackCode, defaults) : null;
    })
    .filter((list): list is DirectoryList => list !== null);
};

const fetchWithTimeout = async (url: string): Promise<Response> => {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetch(url, { cache: 'no-cache', signal: controller.signal });
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`Timed out fetching ${url}`);
    }
    throw error;
  } finally {
    window.clearTimeout(timeoutId);
  }
};

const fetchJsonWithTimeout = async (url: string): Promise<unknown> => {
  const response = await fetchWithTimeout(url);
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  return response.json();
};

const fetchDirectoryDefaultsFromGitHub = async (): Promise<DirectoryDefaultsData> => {
  return normalizeDirectoryDefaultsData(await fetchJsonWithTimeout(GITHUB_DEFAULTS_URL));
};

const fetchDirectoryListFromGitHub = async (code: string, defaults: DirectoryDefaultsData): Promise<DirectoryList | null> => {
  const response = await fetchWithTimeout(GITHUB_URL_TEMPLATE.replace('{code}', code));
  if (response.status === 404) {
    return null;
  }
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  const list = normalizeDirectoryList(await response.json(), code, defaults);
  if (!list) {
    throw new Error(`Invalid directory list payload for ${code}`);
  }
  return list;
};

const fetchDirectoriesFromGitHub = async (): Promise<DirectoriesData> => {
  const defaults = await fetchDirectoryDefaultsFromGitHub();
  const fallbackLists = getFallbackDirectoryLists(defaults);
  const fallbackListsByCode = new Map(fallbackLists.map((list) => [list.directoryCode, list]));
  const codes = [...new Set([...Object.keys(defaults.directories), ...fallbackLists.map((list) => list.directoryCode)])];
  const fetchedLists = await Promise.all(
    codes.map(async (code) => {
      try {
        return (await fetchDirectoryListFromGitHub(code, defaults)) ?? fallbackListsByCode.get(code) ?? null;
      } catch (error) {
        console.warn(`Failed to fetch directory list "${code}" from GitHub, using fallback if available:`, error);
        return fallbackListsByCode.get(code) ?? null;
      }
    }),
  );
  const lists = sortDirectoryLists(fetchedLists.filter((list): list is DirectoryList => list !== null));
  const fallbackMetadata = getDirectoriesMetadata(directoryListsData as unknown);
  const timestamps = [defaults.createdAt, defaults.updatedAt, ...lists.flatMap((list) => [list.createdAt, list.updatedAt])].filter(
    (value): value is number => typeof value === 'number',
  );
  const data = normalizeDirectoriesData({
    ...fallbackMetadata,
    ...(timestamps.length > 0 ? { createdAt: Math.min(...timestamps), updatedAt: Math.max(...timestamps) } : {}),
    directories: lists,
  });
  if (!data) {
    throw new Error('Invalid directories payload');
  }
  hydrateModuleCaches(data);
  lastSuccessfulGitHubFetchAt = Date.now();
  saveToLocalStorage(data);
  return data;
};

const shouldRefreshFromGitHub = () => {
  const now = Date.now();
  if (lastSuccessfulGitHubFetchAt !== null && now - lastSuccessfulGitHubFetchAt < CACHE_MAX_AGE_MS) {
    return false;
  }

  if (lastGitHubFetchAttemptAt !== null && now - lastGitHubFetchAttemptAt < FETCH_RETRY_DELAY_MS) {
    return false;
  }

  return true;
};

const fetchDirectoriesFromGitHubDeduped = async (): Promise<DirectoriesData | null> => {
  if (inFlightGitHubFetch) {
    return inFlightGitHubFetch;
  }

  if (!shouldRefreshFromGitHub()) {
    return null;
  }

  lastGitHubFetchAttemptAt = Date.now();
  inFlightGitHubFetch = fetchDirectoriesFromGitHub().finally(() => {
    inFlightGitHubFetch = null;
  });
  return inFlightGitHubFetch;
};

export const useDirectories = () => {
  // Use vendored data as initial state to prevent theme flash on first load
  // This ensures NSFW status is known synchronously before first render
  const [state, setState] = useState<DirectoriesState>({
    communities: getFallbackDirectoriesData().communities,
    loading: true,
    error: null,
  });

  useEffect(() => {
    let isMounted = true;
    const hydrateCommunities = (data: DirectoriesData) => {
      cacheCommunities = data.communities;
      if (isMounted) {
        setState({
          communities: data.communities,
          loading: false,
          error: null,
        });
      }
    };

    (async () => {
      if (cacheCommunities) {
        setState({
          communities: cacheCommunities,
          loading: false,
          error: null,
        });
      } else {
        // Check localStorage first
        const cachedData = getFromLocalStorage();
        if (cachedData) {
          hydrateCommunities(cachedData);
        }
      }

      try {
        // Refresh from GitHub when the session cache is stale, without refetching for every hook mount.
        const directories = await fetchDirectoriesFromGitHubDeduped();
        if (directories) {
          hydrateCommunities(directories);
        } else if (!cacheCommunities) {
          hydrateCommunities(getFallbackDirectoriesData());
        }
      } catch (e) {
        console.warn('Failed to fetch directories from GitHub:', e);
        // Keep each hook instance in sync even if a sibling hook populated the module cache first.
        if (cacheCommunities) {
          if (isMounted) {
            setState({
              communities: cacheCommunities,
              loading: false,
              error: null,
            });
          }
        } else {
          hydrateCommunities(getFallbackDirectoriesData());
        }
      }
    })();

    return () => {
      isMounted = false;
    };
  }, []);

  // Always prefer cacheCommunities (module-level, stable reference) when available
  // Only use state.communities during initial load before cache is populated
  // This ensures a stable reference for memoization in consuming hooks
  return cacheCommunities || state.communities || getFallbackDirectoriesData().communities;
};

export const useDirectoriesState = () => {
  // Use vendored data as fallback to prevent theme flash on first load
  const [state, setState] = useState<DirectoriesState>({
    communities: cacheCommunities || getFallbackDirectoriesData().communities,
    loading: !cacheCommunities,
    error: null,
  });

  useEffect(() => {
    let isMounted = true;
    const hydrateCommunities = (data: DirectoriesData) => {
      cacheCommunities = data.communities;
      if (isMounted) {
        setState({
          communities: data.communities,
          loading: false,
          error: null,
        });
      }
    };

    (async () => {
      if (cacheCommunities) {
        setState({
          communities: cacheCommunities,
          loading: false,
          error: null,
        });
      } else {
        // Check localStorage first
        const cachedData = getFromLocalStorage();
        if (cachedData) {
          hydrateCommunities(cachedData);
        }
      }

      try {
        // Refresh from GitHub when the session cache is stale, without refetching for every hook mount.
        const directories = await fetchDirectoriesFromGitHubDeduped();
        if (directories) {
          hydrateCommunities(directories);
        } else if (!cacheCommunities) {
          hydrateCommunities(getFallbackDirectoriesData());
        }
      } catch (e) {
        console.warn('Failed to fetch directories from GitHub:', e);
        // Keep each hook instance in sync even if a sibling hook populated the module cache first.
        if (cacheCommunities) {
          if (isMounted) {
            setState({
              communities: cacheCommunities,
              loading: false,
              error: null,
            });
          }
        } else {
          hydrateCommunities(getFallbackDirectoriesData());
        }
      }
    })();

    return () => {
      isMounted = false;
    };
  }, []);

  return state;
};

export const useDirectoryAddresses = () => {
  const directories = useDirectories();
  const directoryAddresses = useMemo(() => (Array.isArray(directories) ? directories.map((community) => community.address) : []), [directories]);

  return directoryAddresses;
};

export const useDirectoryByAddress = (address: string | undefined) => {
  const directories = useDirectories();
  return useMemo(() => findDirectoryByAddress(directories, address), [directories, address]);
};

export const useDirectoriesMetadata = () => {
  const [metadata, setMetadata] = useState<DirectoriesMetadata | null>(null);

  useEffect(() => {
    let isMounted = true;
    const hydrateMetadata = (data: DirectoriesData) => {
      const nextMetadata = toDirectoriesMetadata(data);
      cacheMetadata = nextMetadata;
      if (isMounted) {
        setMetadata(nextMetadata);
      }
    };

    (async () => {
      if (cacheMetadata) {
        setMetadata(cacheMetadata);
      } else {
        // Check localStorage first
        const cachedData = getFromLocalStorage();
        if (cachedData) {
          hydrateMetadata(cachedData);
        }
      }

      try {
        // Refresh from GitHub when the session cache is stale, without refetching for every hook mount.
        const directories = await fetchDirectoriesFromGitHubDeduped();
        if (directories) {
          hydrateMetadata(directories);
        } else if (!cacheMetadata) {
          hydrateMetadata(getFallbackDirectoriesData());
        }
      } catch (e) {
        console.warn('Failed to fetch directory metadata from GitHub:', e);
        // Keep each hook instance in sync even if a sibling hook populated the module cache first.
        if (cacheMetadata) {
          if (isMounted) {
            setMetadata(cacheMetadata);
          }
        } else {
          hydrateMetadata(getFallbackDirectoriesData());
        }
      }
    })();

    return () => {
      isMounted = false;
    };
  }, []);

  return cacheMetadata || metadata;
};
