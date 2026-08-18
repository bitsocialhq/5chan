import { create } from 'zustand';
import { SEARCH_PROVIDERS } from '../lib/search-providers';

export const SEARCH_PROVIDER_STORAGE_KEY = '5chan-search-provider';

/** null follows the directory ranking; a string pins that indexer until it is cleared. */
const getInitialProviderId = (): string | null => {
  const storedProviderId = localStorage.getItem(SEARCH_PROVIDER_STORAGE_KEY);
  return SEARCH_PROVIDERS.some((provider) => provider.id === storedProviderId) ? storedProviderId : null;
};

interface SearchProviderStore {
  selectedProviderId: string | null;
  setSelectedProviderId: (providerId: string | null) => void;
}

const useSearchProviderStore = create<SearchProviderStore>((set) => ({
  selectedProviderId: getInitialProviderId(),
  setSelectedProviderId: (providerId) => {
    if (providerId === null) {
      localStorage.removeItem(SEARCH_PROVIDER_STORAGE_KEY);
      set({ selectedProviderId: null });
      return;
    }
    if (!SEARCH_PROVIDERS.some((provider) => provider.id === providerId)) return;
    localStorage.setItem(SEARCH_PROVIDER_STORAGE_KEY, providerId);
    set({ selectedProviderId: providerId });
  },
}));

export default useSearchProviderStore;
