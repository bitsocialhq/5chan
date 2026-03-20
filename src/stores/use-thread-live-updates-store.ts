import { create } from 'zustand';

interface ThreadLiveUpdatesState {
  enabled: boolean;
  isUpdating: boolean;
  updateRequestId: number;
  repliesResetRequestId: number;
  setEnabled: (enabled: boolean) => void;
  toggleEnabled: () => void;
  requestUpdate: () => void;
  startUpdate: () => void;
  finishUpdate: (requestId: number, shouldResetReplies?: boolean) => void;
  resetState: () => void;
}

const defaultState = {
  enabled: false,
  isUpdating: false,
  updateRequestId: 0,
  repliesResetRequestId: 0,
};

const useThreadLiveUpdatesStore = create<ThreadLiveUpdatesState>((set) => ({
  ...defaultState,
  setEnabled: (enabled) => set({ enabled }),
  toggleEnabled: () => set((state) => ({ enabled: !state.enabled })),
  requestUpdate: () =>
    set((state) => ({
      updateRequestId: state.updateRequestId + 1,
    })),
  startUpdate: () => set({ isUpdating: true }),
  finishUpdate: (requestId, shouldResetReplies = true) =>
    set((state) => ({
      isUpdating: state.updateRequestId === requestId ? false : state.isUpdating,
      repliesResetRequestId: shouldResetReplies ? Math.max(state.repliesResetRequestId, requestId) : state.repliesResetRequestId,
    })),
  resetState: () => set(defaultState),
}));

export default useThreadLiveUpdatesStore;
