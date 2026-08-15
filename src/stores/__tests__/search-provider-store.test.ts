import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('search provider store', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.resetModules();
  });

  it('defaults to 5archive and persists valid provider selections', async () => {
    const { default: useSearchProviderStore, SEARCH_PROVIDER_STORAGE_KEY } = await import('../use-search-provider-store');

    expect(useSearchProviderStore.getState().selectedProviderId).toBe('5archive');
    useSearchProviderStore.getState().setSelectedProviderId('5archive');
    expect(localStorage.getItem(SEARCH_PROVIDER_STORAGE_KEY)).toBe('5archive');
  });

  it('ignores unknown provider ids', async () => {
    const { default: useSearchProviderStore } = await import('../use-search-provider-store');

    useSearchProviderStore.getState().setSelectedProviderId('unknown');
    expect(useSearchProviderStore.getState().selectedProviderId).toBe('5archive');
  });
});
