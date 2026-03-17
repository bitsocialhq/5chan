import { create } from 'zustand';
import { refreshServiceWorkerRegistration } from '../lib/app-update';

interface AppUpdateState {
  needRefresh: boolean;
  setNeedRefresh: (needRefresh: boolean) => void;
  applyAppUpdate: () => Promise<void>;
}

const reloadCurrentPage = () => {
  window.location.reload();
};

const useAppUpdateStore = create<AppUpdateState>((set) => ({
  needRefresh: false,
  setNeedRefresh: (needRefresh) => set({ needRefresh }),
  applyAppUpdate: async () => {
    await refreshServiceWorkerRegistration().catch((error) => {
      console.error('Failed to refresh service worker registration', error);
    });
    reloadCurrentPage();
  },
}));

export default useAppUpdateStore;
