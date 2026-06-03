import { create } from 'zustand';

export type HomepageStatsScope = 'directory' | 'all';

const LOCALSTORAGE_KEY = '5chan-homepage-stats-scope';

const readInitialStatsScope = (): HomepageStatsScope => (localStorage.getItem(LOCALSTORAGE_KEY) === 'all' ? 'all' : 'directory');

interface HomepageStatsOptionsStore {
  statsScope: HomepageStatsScope;
  setStatsScope: (value: HomepageStatsScope) => void;
}

const useHomepageStatsOptionsStore = create<HomepageStatsOptionsStore>((set) => ({
  statsScope: readInitialStatsScope(),
  setStatsScope: (value) => {
    set({ statsScope: value });
    localStorage.setItem(LOCALSTORAGE_KEY, value);
  },
}));

export default useHomepageStatsOptionsStore;
