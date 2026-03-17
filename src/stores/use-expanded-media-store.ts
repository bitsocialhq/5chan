import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface ExpandedMediaState {
  fitExpandedImagesToScreen: boolean;
  unmuteExpandedVideoSound: boolean;
  setFitExpandedImagesToScreen: (fit: boolean) => void;
  setUnmuteExpandedVideoSound: (unmute: boolean) => void;
}

const useExpandedMediaStore = create<ExpandedMediaState>()(
  persist(
    (set) => ({
      fitExpandedImagesToScreen: false,
      unmuteExpandedVideoSound: false,
      setFitExpandedImagesToScreen: (fit) => set({ fitExpandedImagesToScreen: fit }),
      setUnmuteExpandedVideoSound: (unmute) => set({ unmuteExpandedVideoSound: unmute }),
    }),
    {
      name: 'expanded-media-store',
    },
  ),
);

export default useExpandedMediaStore;
