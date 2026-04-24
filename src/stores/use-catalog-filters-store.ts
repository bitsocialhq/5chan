import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Comment } from '@bitsocial/bitsocial-react-hooks';
import { commentMatchesPattern } from '../lib/utils/pattern-utils';

interface FilterItem {
  text: string;
  enabled: boolean;
  count: number;
  filteredCids: Set<string>;
  communityCounts: Map<string, number>;
  communityFilteredCids: Map<string, Set<string>>;
  hide: boolean;
  top: boolean;
  color?: string;
}

interface CatalogFiltersStore {
  filterText: string;
  setFilterText: (value: string) => void;
  filterItems: FilterItem[];
  setFilterItems: (items: FilterItem[]) => void;
  saveAndApplyFilters: (items: FilterItem[]) => void;
  filter: ((comment: Comment) => boolean) | undefined;
  updateFilter: () => void;
  initializeFilter: () => void;
  filteredCount: number;
  filteredCids: Set<string>;
  incrementFilterCount: (filterIndex: number, cid: string, communityAddress: string) => void;
  recalcFilteredCount: () => void;
  currentCommunityAddress: string | null;
  setCurrentCommunityAddress: (address: string | null) => void;
  getFilteredCountForCurrentCommunity: () => number;
  searchText: string;
  setSearchFilter: (text: string) => void;
  clearSearchFilter: () => void;
  resetCountsForCurrentCommunity: () => void;
  matchedFilters: Map<string, string>;
  setMatchedFilter: (cid: string, color: string) => void;
  clearMatchedFilters: () => void;
}

type RawFilterItem = {
  text?: string;
  enabled?: boolean;
  count?: number;
  filteredCids?: Set<string>;
  communityCounts?: Map<string, number>;
  communityFilteredCids?: Map<string, Set<string>>;
  hide?: boolean;
  top?: boolean;
  color?: string;
};

const toMap = (value: unknown, fallback: Map<any, any>): Map<string, any> => (value instanceof Map ? (value as Map<string, any>) : fallback);

const normalizeFilterItem = (item: RawFilterItem): FilterItem => {
  const communityCounts = toMap(item.communityCounts, new Map<string, number>());
  const communityFilteredCids = toMap(item.communityFilteredCids, new Map<string, Set<string>>());

  return {
    text: item.text || '',
    enabled: item.enabled ?? true,
    count: item.count || 0,
    filteredCids: item.filteredCids || new Set<string>(),
    communityCounts,
    communityFilteredCids,
    hide: item.hide ?? true,
    top: item.top ?? false,
    color: item.color || '',
  };
};

const createCatalogFilter = (get: () => CatalogFiltersStore) => (comment: Comment) => {
  if (!comment?.cid) return true;

  const state = get();
  if (state.searchText.trim() !== '' && !commentMatchesPattern(comment, state.searchText)) {
    return false;
  }

  let shouldHide = false;
  for (const item of state.filterItems) {
    if (item.enabled && item.text.trim() !== '' && item.hide && commentMatchesPattern(comment, item.text)) {
      shouldHide = true;
      break;
    }
  }

  return !shouldHide;
};

const useCatalogFiltersStore = create(
  persist<CatalogFiltersStore>(
    (set, get) => ({
      filterText: '',
      setFilterText: (value: string) => set({ filterText: value }),
      filterItems: [],
      filteredCount: 0,
      filteredCids: new Set<string>(),
      currentCommunityAddress: null,
      matchedFilters: new Map<string, string>(),
      setMatchedFilter: (cid: string, color: string) => {
        set((state) => {
          const newMatchedFilters = new Map(state.matchedFilters);
          if (color) {
            newMatchedFilters.set(cid, color);
          } else {
            newMatchedFilters.delete(cid);
          }
          return { matchedFilters: newMatchedFilters };
        });
      },
      clearMatchedFilters: () => {
        set({ matchedFilters: new Map<string, string>() });
      },
      setCurrentCommunityAddress: (address: string | null) => {
        const prevAddress = get().currentCommunityAddress;

        if (address !== prevAddress) {
          set((state) => {
            if (address) {
              const updatedFilterItems = state.filterItems.map((item) => {
                const newItem = { ...item };

                // Reset count and filteredCids (global counters)
                newItem.count = 0;
                newItem.filteredCids = new Set();

                if (!newItem.communityCounts || !(newItem.communityCounts instanceof Map)) {
                  newItem.communityCounts = new Map();
                }
                if (!newItem.communityFilteredCids || !(newItem.communityFilteredCids instanceof Map)) {
                  newItem.communityFilteredCids = new Map();
                }

                if (!newItem.communityFilteredCids.has(address)) {
                  newItem.communityFilteredCids.set(address, new Set<string>());
                }
                if (!newItem.communityCounts.has(address)) {
                  newItem.communityCounts.set(address, 0);
                }

                return newItem;
              });

              return {
                currentCommunityAddress: address,
                filterItems: updatedFilterItems,
                filteredCount: 0, // This will be recalculated below
              };
            }

            return {
              currentCommunityAddress: address,
            };
          });

          get().recalcFilteredCount();
        } else {
          set({ currentCommunityAddress: address });
        }
      },
      searchText: '',
      setSearchFilter: (text: string) => {
        set({ searchText: text });
      },
      clearSearchFilter: () => {
        set({ searchText: '' });
      },
      setFilterItems: (items: FilterItem[]) => {
        const nonEmptyItems = items.filter((item) => item.text.trim() !== '').map((item) => normalizeFilterItem(item));
        set({ filterItems: nonEmptyItems });
        get().recalcFilteredCount();
      },
      saveAndApplyFilters: (items: FilterItem[]) => {
        const nonEmptyItems = items.filter((item) => item.text.trim() !== '').map((item) => normalizeFilterItem(item));

        // Compare new filter items with existing ones to detect pattern changes
        const existingItems = get().filterItems;
        const updatedItems = nonEmptyItems.map((newItem) => {
          // Try to find matching existing item by index or text
          const existingItem = existingItems.find((item) => item.text === newItem.text);

          // If we found a matching item, keep its counts
          if (existingItem) {
            return {
              ...newItem,
              count: existingItem.count,
              filteredCids: existingItem.filteredCids,
              communityCounts: existingItem.communityCounts,
              communityFilteredCids: existingItem.communityFilteredCids,
              color: newItem.color || '',
            };
          }

          // If pattern has changed or it's a new filter, reset all counts
          return {
            ...newItem,
            count: 0,
            filteredCids: new Set<string>(),
            communityCounts: new Map<string, number>(),
            communityFilteredCids: new Map<string, Set<string>>(),
            color: newItem.color || '',
          };
        });

        // Clear matched filters when saving new filters
        get().clearMatchedFilters();

        set({
          filterItems: updatedItems,
          filteredCids: new Set<string>(),
        });

        get().recalcFilteredCount();
      },
      filter: createCatalogFilter(get),
      updateFilter: () => undefined,
      initializeFilter: () => undefined,
      incrementFilterCount: (filterIndex: number, cid: string, communityAddress: string) => {
        set((state) => {
          const newFilterItems = [...state.filterItems];
          if (newFilterItems[filterIndex]) {
            const item = newFilterItems[filterIndex];

            // Ensure communityFilteredCids is a Map
            const communityFilteredCids = new Map(item.communityFilteredCids);
            if (!communityFilteredCids.has(communityAddress)) {
              communityFilteredCids.set(communityAddress, new Set());
            }
            const cidSet = communityFilteredCids.get(communityAddress)!;

            // Only increment the count if this CID hasn't been counted for this community yet
            if (!cidSet.has(cid)) {
              const newItemFilteredCids = new Set(item.filteredCids);
              newItemFilteredCids.add(cid);

              cidSet.add(cid);
              communityFilteredCids.set(communityAddress, cidSet);

              const communityCounts = new Map(item.communityCounts);
              const currentCount = communityCounts.get(communityAddress) || 0;
              communityCounts.set(communityAddress, currentCount + 1);

              newFilterItems[filterIndex] = {
                ...item,
                count: item.count + 1,
                filteredCids: newItemFilteredCids,
                communityCounts,
                communityFilteredCids,
              };

              return { filterItems: newFilterItems };
            }
          }
          return state;
        });

        get().recalcFilteredCount();
      },
      recalcFilteredCount: () => {
        set((state) => {
          const currentCommunityAddress = state.currentCommunityAddress;
          if (!currentCommunityAddress) return { filteredCount: 0 };

          let filteredCount = 0;
          for (const item of state.filterItems) {
            if (item.enabled && item.hide) {
              const subCount = item.communityCounts?.get(currentCommunityAddress) || 0;
              filteredCount += subCount;
            }
          }

          return { filteredCount };
        });
      },
      getFilteredCountForCurrentCommunity: () => {
        const state = get();
        const currentCommunityAddress = state.currentCommunityAddress;
        if (!currentCommunityAddress) return 0;

        let filteredCount = 0;
        for (const item of state.filterItems) {
          if (item.enabled && item.hide) {
            const subCount = item.communityCounts?.get(currentCommunityAddress) || 0;
            filteredCount += subCount;
          }
        }

        return filteredCount;
      },
      resetCountsForCurrentCommunity: () => {
        const currentCommunityAddress = get().currentCommunityAddress;
        if (!currentCommunityAddress) return;

        set((state) => {
          const updatedFilterItems = state.filterItems.map((item) => {
            const newItem = { ...item };

            // Ensure maps are properly initialized
            if (!newItem.communityCounts || !(newItem.communityCounts instanceof Map)) {
              newItem.communityCounts = new Map();
            }
            if (!newItem.communityFilteredCids || !(newItem.communityFilteredCids instanceof Map)) {
              newItem.communityFilteredCids = new Map();
            }

            // Reset counts for current community
            newItem.communityCounts.set(currentCommunityAddress, 0);
            newItem.communityFilteredCids.set(currentCommunityAddress, new Set<string>());

            return newItem;
          });

          return {
            filterItems: updatedFilterItems,
            filteredCount: 0,
          };
        });
      },
    }),
    {
      name: 'catalog-filters-storage',
      partialize: (state) => {
        return {
          filterItems: state.filterItems.map((item) => ({
            text: item.text,
            enabled: item.enabled,
            hide: item.hide,
            top: item.top,
            color: item.color,
          })),
        } as any;
      },
      deserialize: (persisted) => {
        const persistedObj = typeof persisted === 'string' ? JSON.parse(persisted) : persisted;
        const persistedState =
          persistedObj && typeof persistedObj === 'object' && 'state' in persistedObj ? (persistedObj as { state?: CatalogFiltersStore }).state : persistedObj;

        if (persistedState && typeof persistedState === 'object' && 'filterItems' in persistedState) {
          const migratedState = {
            ...persistedState,
            filterItems: persistedState.filterItems.map((item: RawFilterItem) => ({
              ...normalizeFilterItem(item),
            })),
            filteredCount: 0,
          };

          if (persistedObj && typeof persistedObj === 'object' && 'state' in persistedObj) {
            return { ...persistedObj, state: migratedState };
          }

          return migratedState;
        }

        return persistedObj || persisted;
      },
    },
  ),
);

export default useCatalogFiltersStore;
