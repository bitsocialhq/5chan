import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('search provider store', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.resetModules();
  });

  it('follows the directory ranking until an indexer is pinned', async () => {
    const { default: useSearchProviderStore, SEARCH_PROVIDER_STORAGE_KEY } = await import('../use-search-provider-store');

    expect(useSearchProviderStore.getState().selectedProviderId).toBeNull();

    useSearchProviderStore.getState().setSelectedProviderId('5archive');
    expect(useSearchProviderStore.getState().selectedProviderId).toBe('5archive');
    expect(localStorage.getItem(SEARCH_PROVIDER_STORAGE_KEY)).toBe('5archive');
  });

  it('goes back to the directory ranking when the pin is cleared', async () => {
    const { default: useSearchProviderStore, SEARCH_PROVIDER_STORAGE_KEY } = await import('../use-search-provider-store');

    useSearchProviderStore.getState().setSelectedProviderId('5archive');
    useSearchProviderStore.getState().setSelectedProviderId(null);

    expect(useSearchProviderStore.getState().selectedProviderId).toBeNull();
    expect(localStorage.getItem(SEARCH_PROVIDER_STORAGE_KEY)).toBeNull();
  });

  it('ignores unknown provider ids', async () => {
    const { default: useSearchProviderStore } = await import('../use-search-provider-store');

    useSearchProviderStore.getState().setSelectedProviderId('unknown');
    expect(useSearchProviderStore.getState().selectedProviderId).toBeNull();
  });
});
