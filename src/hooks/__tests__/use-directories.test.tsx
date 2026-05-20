import * as React from 'react';
import { createElement } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  __resetDirectoriesModuleStateForTests,
  findDirectoryByAddress,
  normalizeBoardAddress,
  useDirectories,
  useDirectoriesMetadata,
  useDirectoriesState,
  useDirectoryAddresses,
  useDirectoryByAddress,
  type DirectoriesData,
} from '../use-directories';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
const act = (React as { act?: (cb: () => void | Promise<void>) => void | Promise<void> }).act as (cb: () => void | Promise<void>) => void | Promise<void>;

const LOCALSTORAGE_KEY = '5chan-directories-cache';
const LOCALSTORAGE_TIMESTAMP_KEY = '5chan-directories-cache-timestamp';

type Snapshot = {
  directories: ReturnType<typeof useDirectories>;
  state: ReturnType<typeof useDirectoriesState>;
  addresses: ReturnType<typeof useDirectoryAddresses>;
  directory: ReturnType<typeof useDirectoryByAddress>;
  metadata: ReturnType<typeof useDirectoriesMetadata>;
};

type Deferred<T> = {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (reason?: unknown) => void;
};

type ConsoleWarnCall = Parameters<typeof console.warn>;

let latestSnapshot: Snapshot | null = null;
let root: Root;
let container: HTMLDivElement;
let fetchMock: ReturnType<typeof vi.fn>;
let warnSpy: ReturnType<typeof vi.spyOn>;

const HookHarness = ({ address = 'music-posting.eth' }: { address?: string }) => {
  const directories = useDirectories();
  const state = useDirectoriesState();
  const addresses = useDirectoryAddresses();
  const directory = useDirectoryByAddress(address);
  const metadata = useDirectoriesMetadata();

  React.useLayoutEffect(() => {
    latestSnapshot = {
      directories,
      state,
      addresses,
      directory,
      metadata,
    };
  }, [addresses, directory, directories, metadata, state]);

  return null;
};

const createDeferred = <T,>(): Deferred<T> => {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((innerResolve, innerReject) => {
    resolve = innerResolve;
    reject = innerReject;
  });
  return { promise, resolve, reject };
};

const createFetchResponse = (body: unknown, ok = true, status = 200) => ({
  ok,
  status,
  json: vi.fn().mockResolvedValue(body),
});

const getDirectoryCodeFromUrl = (url: unknown): string => String(url).match(/5chan-([a-z0-9]+)-directory\.json/)?.[1] ?? 'unknown';
const isDefaultsUrl = (url: unknown): boolean => String(url).endsWith('/5chan-directories-defaults.json');
const REMOTE_DIRECTORY_CODES = ['a', 'mu', 'biz'];

type RemoteDirectoryOverride = {
  address?: string;
  publicKey?: string;
  title?: string;
  features?: Record<string, unknown>;
};

const createRemoteDirectoryList = (code: string, board: RemoteDirectoryOverride = {}) => ({
  createdAt: 3,
  updatedAt: 4,
  boards: [
    {
      address: board.address ?? `${code}-posting.bso`,
      publicKey: board.publicKey ?? `${code}-public-key`,
      addedAt: 3,
    },
  ],
});

const createRemoteDefaults = (codes = REMOTE_DIRECTORY_CODES, overrides: Record<string, RemoteDirectoryOverride> = {}) => ({
  title: '5chan Directory Defaults',
  description: 'remote defaults',
  createdAt: 1,
  updatedAt: 10,
  directories: Object.fromEntries(
    codes.map((code) => [
      code,
      {
        directoryCode: code,
        title: overrides[code]?.title ?? `/${code}/ - Test`,
        features: overrides[code]?.features ?? { safeForWork: true },
      },
    ]),
  ),
});

const mockDirectoryListFetches = (overrides: Record<string, RemoteDirectoryOverride> = {}) => {
  fetchMock.mockImplementation((url: unknown) => {
    if (isDefaultsUrl(url)) {
      return Promise.resolve(createFetchResponse(createRemoteDefaults(REMOTE_DIRECTORY_CODES, overrides)));
    }
    const code = getDirectoryCodeFromUrl(url);
    const payload = createRemoteDirectoryList(code, overrides[code]);
    return Promise.resolve(createFetchResponse(payload));
  });
};

const flushEffects = async (count = 4) => {
  for (let i = 0; i < count; i += 1) {
    await act(async () => {
      await Promise.resolve();
    });
  }
};

const renderHarness = (address?: string) => {
  act(() => {
    root.render(createElement(HookHarness, { address }));
  });
};

const expectLatestSnapshot = (): Snapshot => {
  expect(latestSnapshot).not.toBeNull();
  return latestSnapshot as Snapshot;
};

describe('use-directories', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    latestSnapshot = null;
    __resetDirectoriesModuleStateForTests();
    localStorage.clear();
    fetchMock = vi.fn();
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    vi.stubGlobal('fetch', fetchMock);

    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    warnSpy.mockRestore();
    vi.unstubAllGlobals();
    __resetDirectoriesModuleStateForTests();
  });

  it('normalizes aliases and finds matching directories by exact or alias address', () => {
    const communities = [
      {
        address: 'music-posting.bso',
        name: 'music-posting.bso',
        publicKey: '12D3KooWQdQ6TkVA1Xe9zzaFP6vXBgsLeMAewpLpLwbsAYKivnQy',
        title: '/mu/ - Music',
      },
      { address: 'business.eth', title: '/biz/ - Business & Finance' },
    ];

    expect(normalizeBoardAddress('music-posting.eth')).toBe('music-posting');
    expect(normalizeBoardAddress('business.bso')).toBe('business');
    expect(normalizeBoardAddress('business.xyz')).toBe('business.xyz');

    expect(findDirectoryByAddress(communities, 'music-posting.bso')?.address).toBe('music-posting.bso');
    expect(findDirectoryByAddress(communities, 'music-posting.eth')?.address).toBe('music-posting.bso');
    expect(findDirectoryByAddress(communities, '12D3KooWQdQ6TkVA1Xe9zzaFP6vXBgsLeMAewpLpLwbsAYKivnQy')?.address).toBe('music-posting.bso');
    expect(findDirectoryByAddress(communities, undefined)).toBeUndefined();
  });

  it('hydrates from localStorage first, then refreshes from GitHub with normalized and deduped data', async () => {
    const cachedData: DirectoriesData = {
      title: 'Cached directories',
      description: 'cached description',
      createdAt: 1,
      updatedAt: 2,
      communities: [
        { address: 'music-posting.bso', title: '/mu/ - Cached Music', nsfw: false },
        { address: 'flash.bso', title: '/f/ - Flash', nsfw: true },
      ],
    };

    localStorage.setItem(LOCALSTORAGE_KEY, JSON.stringify(cachedData));
    localStorage.setItem(LOCALSTORAGE_TIMESTAMP_KEY, String(Date.now()));

    const pendingDefaults = createDeferred<ReturnType<typeof createFetchResponse>>();
    const pendingFetches = new Map<string, Deferred<ReturnType<typeof createFetchResponse>>>();
    fetchMock.mockImplementation((url: unknown) => {
      if (isDefaultsUrl(url)) {
        return pendingDefaults.promise;
      }
      const code = getDirectoryCodeFromUrl(url);
      const deferred = createDeferred<ReturnType<typeof createFetchResponse>>();
      pendingFetches.set(code, deferred);
      return deferred.promise;
    });

    renderHarness();
    await flushEffects();

    expect(fetchMock).toHaveBeenCalled();
    expect(latestSnapshot?.state.loading).toBe(false);
    expect(latestSnapshot?.state.communities.map((community) => community.address)).toEqual(['music-posting.bso', 'flash.bso']);
    expect(latestSnapshot?.addresses).toEqual(['music-posting.bso', 'flash.bso']);
    expect(latestSnapshot?.directory?.address).toBe('music-posting.bso');
    expect(latestSnapshot?.metadata).toEqual({
      title: 'Cached directories',
      description: 'cached description',
      createdAt: 1,
      updatedAt: 2,
    });

    const remoteOverrides: Record<string, RemoteDirectoryOverride> = {
      mu: {
        address: 'music-posting.bso',
        publicKey: 'music-public-key',
        title: '/mu/ - Music',
        features: { safeForWork: true, postsPerPage: 25, nested: { ignore: true } },
      },
    };
    pendingDefaults.resolve(createFetchResponse(createRemoteDefaults(REMOTE_DIRECTORY_CODES, remoteOverrides)));
    await flushEffects();

    pendingFetches.forEach((pendingFetch, code) => {
      const override = code === 'mu' ? remoteOverrides.mu : undefined;
      pendingFetch.resolve(createFetchResponse(createRemoteDirectoryList(code, override)));
    });
    await flushEffects();

    expect(latestSnapshot?.state.loading).toBe(false);
    expect(latestSnapshot?.directories).toEqual(
      expect.arrayContaining([
        {
          address: 'music-posting.bso',
          name: 'music-posting.bso',
          publicKey: 'music-public-key',
          title: '/mu/ - Music',
          directoryCode: 'mu',
          features: { safeForWork: true, postsPerPage: 25 },
          nsfw: false,
        },
      ]),
    );
    expect(latestSnapshot?.addresses).toContain('music-posting.bso');
    expect(latestSnapshot?.directory?.address).toBe('music-posting.bso');
    expect(latestSnapshot?.metadata?.title).toBe('5chan directories');

    const persisted = JSON.parse(localStorage.getItem(LOCALSTORAGE_KEY) ?? '{}');
    expect(persisted.title).toBe('5chan directories');
    expect(persisted.communities.length).toBeGreaterThan(1);
  });

  it('does not refetch GitHub directories for each later hook mount after a successful refresh', async () => {
    mockDirectoryListFetches({
      mu: {
        address: 'music-posting.bso',
        publicKey: 'music-public-key',
        title: '/mu/ - Music',
        features: { safeForWork: true, postsPerPage: 25 },
      },
    });

    renderHarness();
    await flushEffects(8);

    const firstSnapshot = expectLatestSnapshot();
    const firstFetchCount = fetchMock.mock.calls.length;
    expect(firstFetchCount).toBeGreaterThan(1);
    expect(firstSnapshot.directories.map((community) => community.address)).toContain('music-posting.bso');
    expect(firstSnapshot.metadata?.title).toBe('5chan directories');

    latestSnapshot = null;
    act(() => {
      root.render(null);
    });

    renderHarness();
    await flushEffects(8);

    const secondSnapshot = expectLatestSnapshot();
    expect(fetchMock).toHaveBeenCalledTimes(firstFetchCount);
    expect(secondSnapshot.directories.map((community) => community.address)).toContain('music-posting.bso');
    expect(secondSnapshot.metadata?.title).toBe('5chan directories');
  });

  it('keeps vendored non-default directories when remote defaults omit them and one list fetch fails', async () => {
    fetchMock.mockImplementation((url: unknown) => {
      if (isDefaultsUrl(url)) {
        return Promise.resolve(
          createFetchResponse(
            createRemoteDefaults(['mu'], {
              mu: { address: 'music-remote.bso', publicKey: 'music-remote-public-key', title: '/mu/ - Music' },
            }),
          ),
        );
      }

      const code = getDirectoryCodeFromUrl(url);
      if (code === 'mu') {
        return Promise.resolve(createFetchResponse(createRemoteDirectoryList('mu', { address: 'music-remote.bso', publicKey: 'music-remote-public-key' })));
      }
      if (code === 'biz') {
        return Promise.resolve(createFetchResponse({ error: 'temporary failure' }, false, 500));
      }
      return Promise.resolve(createFetchResponse({ error: 'missing' }, false, 404));
    });

    renderHarness('television-and-film.bso');
    await flushEffects(12);

    const snapshot = expectLatestSnapshot();
    const directoriesByCode = new Map(snapshot.directories.map((directory) => [directory.directoryCode, directory]));
    expect(directoriesByCode.get('mu')?.address).toBe('music-remote.bso');
    expect(directoriesByCode.get('biz')?.address).toBe('business-and-finance.bso');
    expect(directoriesByCode.get('tv')?.address).toBe('television-and-film.bso');
    expect(snapshot.directory?.address).toBe('television-and-film.bso');
    expect(warnSpy.mock.calls.some((call: ConsoleWarnCall) => String(call[0]).includes('Failed to fetch directory list "biz"'))).toBe(true);
  });

  it('clears invalid recent cache entries and falls back to vendored data when GitHub refresh fails', async () => {
    localStorage.setItem(LOCALSTORAGE_KEY, JSON.stringify({ title: 'broken cache' }));
    localStorage.setItem(LOCALSTORAGE_TIMESTAMP_KEY, String(Date.now()));
    fetchMock.mockRejectedValueOnce(new Error('network down'));

    renderHarness('unknown.eth');
    await flushEffects(8);

    expect(fetchMock).toHaveBeenCalled();
    expect(localStorage.getItem(LOCALSTORAGE_KEY)).toBeNull();
    expect(localStorage.getItem(LOCALSTORAGE_TIMESTAMP_KEY)).toBeNull();
    expect(warnSpy.mock.calls.some((call: ConsoleWarnCall) => String(call[0]).includes('Invalid directories cache format'))).toBe(true);
    expect(warnSpy.mock.calls.some((call: ConsoleWarnCall) => String(call[0]).includes('Failed to fetch directories'))).toBe(true);
    expect(latestSnapshot?.state.loading).toBe(false);
    expect(latestSnapshot?.directories.length).toBeGreaterThan(0);
    expect(latestSnapshot?.addresses.length).toBeGreaterThan(0);
    expect(latestSnapshot?.directory).toBeUndefined();
    expect(latestSnapshot?.metadata).not.toBeNull();
  });
});
