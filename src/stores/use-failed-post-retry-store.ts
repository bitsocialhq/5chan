import { create } from 'zustand';

interface FailedPostRetryState {
  // Account-comment index of the failed post currently being retried, or null when no retry is in flight.
  // Retrying deletes the old pending row and republishes, so the pending route briefly has no addressable
  // comment and no active challenge. The pending view reads this to avoid mistaking that gap for an
  // abandoned challenge and redirecting away.
  retryingAccountCommentIndex: number | null;
  startRetry: (accountCommentIndex: number) => void;
  endRetry: () => void;
}

const useFailedPostRetryStore = create<FailedPostRetryState>((set) => ({
  retryingAccountCommentIndex: null,
  startRetry: (accountCommentIndex) => set({ retryingAccountCommentIndex: accountCommentIndex }),
  endRetry: () => set({ retryingAccountCommentIndex: null }),
}));

export default useFailedPostRetryStore;
