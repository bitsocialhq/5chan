import { create } from 'zustand';

export type SearchSummaryStatus = 'pending' | 'answered' | 'failed';

interface SearchSummaryState {
  /** Indexer that answered, which the header credits instead of the ranked-first one. */
  providerId: string | null;
  /** Query the totals belong to, so a stale count is never shown for a new search. */
  query: string;
  status: SearchSummaryStatus;
  total: number | null;
  setSummary: (query: string, status: SearchSummaryStatus, total?: number | null, providerId?: string | null) => void;
}

/** Published by the search request so the board header can title the page with it. */
const useSearchSummaryStore = create<SearchSummaryState>((set) => ({
  providerId: null,
  query: '',
  status: 'pending',
  total: null,
  setSummary: (query, status, total = null, providerId = null) =>
    set((state) =>
      state.query === query && state.status === status && state.total === total && state.providerId === providerId ? state : { query, status, total, providerId },
    ),
}));

export default useSearchSummaryStore;
