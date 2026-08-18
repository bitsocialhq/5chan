import { sortByDirectoryRank } from './utils/directory-list-utils';

export interface SearchProvider {
  /** Unix seconds the indexer was listed, the way directory boards record it. */
  addedAt?: number;
  apiUrl: string;
  id: string;
  name: string;
  owner?: string;
  /** Vote score once directory voting is enabled; until then the list order is curated. */
  score?: number;
  siteUrl: string;
}

/**
 * The indexers that can power /search/, ranked like a board directory: the highest-ranked
 * reachable one answers, and a person can still pin another from /search/directory.
 */
export const SEARCH_PROVIDERS: readonly SearchProvider[] = [
  {
    addedAt: 1779182014,
    apiUrl: 'https://api.5archive.org',
    id: '5archive',
    name: '5archive.org',
    siteUrl: 'https://5archive.org',
  },
];

export const getRankedSearchProviders = (): SearchProvider[] =>
  sortByDirectoryRank(SEARCH_PROVIDERS, (provider) => ({ id: provider.id, owner: provider.owner, score: provider.score, addedAt: provider.addedAt }));

/** The indexer the directory ranks first, used whenever nobody pinned one. */
export const getDirectorySearchProvider = (): SearchProvider => getRankedSearchProviders()[0];

export const getSearchProvider = (providerId: string | null): SearchProvider =>
  SEARCH_PROVIDERS.find((provider) => provider.id === providerId) ?? getDirectorySearchProvider();

/** Pinned indexer alone, otherwise every indexer in rank order so a dead one fails over. */
export const getSearchProviderChain = (providerId: string | null): SearchProvider[] => {
  const pinned = SEARCH_PROVIDERS.find((provider) => provider.id === providerId);
  return pinned ? [pinned] : getRankedSearchProviders();
};
