import { create } from 'zustand';

interface PopularThreadsOptionsStore {
  showWorksafeContentOnly: boolean;
  setShowWorksafeContentOnly: (value: boolean) => void;
  showNsfwContentOnly: boolean;
  setShowNsfwContentOnly: (value: boolean) => void;
}

const storedShowWorksafeContentOnly = localStorage.getItem('showWorksafeContentOnly');

const usePopularThreadsOptionsStore = create<PopularThreadsOptionsStore>((set) => ({
  showWorksafeContentOnly: storedShowWorksafeContentOnly === 'true' || storedShowWorksafeContentOnly === null ? true : false,
  setShowWorksafeContentOnly: (value: boolean) => {
    set({ showWorksafeContentOnly: value });
    localStorage.setItem('showWorksafeContentOnly', value.toString());
  },
  showNsfwContentOnly: localStorage.getItem('showNsfwContentOnly') === 'true' ? true : false,
  setShowNsfwContentOnly: (value: boolean) => {
    set({ showNsfwContentOnly: value });
    localStorage.setItem('showNsfwContentOnly', value.toString());
  },
}));

export default usePopularThreadsOptionsStore;
