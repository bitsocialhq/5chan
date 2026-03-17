import { create } from 'zustand';

type UpdateServiceWorker = (reloadPage?: boolean) => Promise<void>;

interface AppUpdateState {
  needRefresh: boolean;
  updateServiceWorker: UpdateServiceWorker | null;
  setNeedRefresh: (needRefresh: boolean) => void;
  setUpdateServiceWorker: (updateServiceWorker: UpdateServiceWorker | null) => void;
  applyAppUpdate: () => Promise<void>;
}

const reloadCurrentPage = () => {
  window.location.reload();
};

const useAppUpdateStore = create<AppUpdateState>((set, get) => ({
  needRefresh: false,
  updateServiceWorker: null,
  setNeedRefresh: (needRefresh) => set({ needRefresh }),
  setUpdateServiceWorker: (updateServiceWorker) => set({ updateServiceWorker }),
  applyAppUpdate: async () => {
    const { needRefresh, updateServiceWorker } = get();

    if (needRefresh && updateServiceWorker) {
      await updateServiceWorker(true);
      return;
    }

    reloadCurrentPage();
  },
}));

export default useAppUpdateStore;
