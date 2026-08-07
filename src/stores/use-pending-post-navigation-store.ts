import { create } from 'zustand';

interface PendingPostNavigationState {
  pendingPostNavigationIndex: number | null;
  isNavigatingToPendingPost: boolean;
  beginPendingPostNavigation: (accountCommentIndex: number) => void;
  completePendingPostNavigation: () => void;
  clearPendingPostHandoff: (accountCommentIndex?: number) => void;
  clearPendingPostNavigation: (accountCommentIndex?: number) => void;
}

const usePendingPostNavigationStore = create<PendingPostNavigationState>((set) => ({
  pendingPostNavigationIndex: null,
  isNavigatingToPendingPost: false,
  beginPendingPostNavigation: (pendingPostNavigationIndex) => set({ isNavigatingToPendingPost: true, pendingPostNavigationIndex }),
  completePendingPostNavigation: () => set({ isNavigatingToPendingPost: false }),
  clearPendingPostHandoff: (accountCommentIndex) =>
    set((state) => (accountCommentIndex === undefined || state.pendingPostNavigationIndex === accountCommentIndex ? { pendingPostNavigationIndex: null } : state)),
  clearPendingPostNavigation: (accountCommentIndex) =>
    set((state) =>
      accountCommentIndex === undefined || state.pendingPostNavigationIndex === accountCommentIndex
        ? { isNavigatingToPendingPost: false, pendingPostNavigationIndex: null }
        : state,
    ),
}));

export default usePendingPostNavigationStore;
