export interface SearchProvider {
  apiUrl: string;
  id: string;
  name: string;
  siteUrl: string;
}

export const DEFAULT_SEARCH_PROVIDER_ID = '5archive';

export const SEARCH_PROVIDERS: readonly SearchProvider[] = [
  {
    apiUrl: 'https://api.5archive.org',
    id: DEFAULT_SEARCH_PROVIDER_ID,
    name: '5archive.org',
    siteUrl: 'https://5archive.org',
  },
];

export const getSearchProvider = (providerId: string): SearchProvider => SEARCH_PROVIDERS.find((provider) => provider.id === providerId) ?? SEARCH_PROVIDERS[0];
