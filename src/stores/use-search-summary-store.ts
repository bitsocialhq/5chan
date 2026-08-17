import { create } from 'zustand';

interface SearchSummaryState {
  /** Query the totals belong to, so a stale count is never shown for a new search. */
  query: string;
  total: number | null;
  setSummary: (query: string, total: number | null) => void;
}

/** Published by the search results so the board header can title the page with them. */
const useSearchSummaryStore = create<SearchSummaryState>((set) => ({
  query: '',
  total: null,
  setSummary: (query, total) => set((state) => (state.query === query && state.total === total ? state : { query, total })),
}));

export default useSearchSummaryStore;
