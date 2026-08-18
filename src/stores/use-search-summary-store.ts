import { create } from 'zustand';

interface SearchSummaryState {
  /** Indexer that answered, which the header credits instead of the ranked-first one. */
  providerId: string | null;
  /** Query the totals belong to, so a stale count is never shown for a new search. */
  query: string;
  total: number | null;
  setSummary: (query: string, total: number | null, providerId: string | null) => void;
}

/** Published by the search results so the board header can title the page with them. */
const useSearchSummaryStore = create<SearchSummaryState>((set) => ({
  providerId: null,
  query: '',
  total: null,
  setSummary: (query, total, providerId) =>
    set((state) => (state.query === query && state.total === total && state.providerId === providerId ? state : { query, total, providerId })),
}));

export default useSearchSummaryStore;
