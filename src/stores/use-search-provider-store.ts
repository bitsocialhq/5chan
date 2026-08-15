import { create } from 'zustand';
import { DEFAULT_SEARCH_PROVIDER_ID, SEARCH_PROVIDERS } from '../lib/search-providers';

export const SEARCH_PROVIDER_STORAGE_KEY = '5chan-search-provider';

const getInitialProviderId = (): string => {
  const storedProviderId = localStorage.getItem(SEARCH_PROVIDER_STORAGE_KEY);
  return SEARCH_PROVIDERS.some((provider) => provider.id === storedProviderId) ? storedProviderId! : DEFAULT_SEARCH_PROVIDER_ID;
};

interface SearchProviderStore {
  selectedProviderId: string;
  setSelectedProviderId: (providerId: string) => void;
}

const useSearchProviderStore = create<SearchProviderStore>((set) => ({
  selectedProviderId: getInitialProviderId(),
  setSelectedProviderId: (providerId) => {
    if (!SEARCH_PROVIDERS.some((provider) => provider.id === providerId)) return;
    localStorage.setItem(SEARCH_PROVIDER_STORAGE_KEY, providerId);
    set({ selectedProviderId: providerId });
  },
}));

export default useSearchProviderStore;
