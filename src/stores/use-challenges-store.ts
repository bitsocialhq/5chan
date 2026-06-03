import { create } from 'zustand';
import { Challenge } from '@bitsocial/bitsocial-react-hooks';
import { redactGeneratedFortuneFromChallenge } from '../lib/utils/challenge-utils';

let nextChallengeId = 0;

interface State {
  challenges: Array<{ challenge: Challenge; id: number; onAbandon?: () => Promise<void> | void }>;
  addChallenge: (challenge: Challenge, onAbandon?: () => Promise<void> | void) => void;
  removeChallenge: () => void;
  abandonCurrentChallenge: () => Promise<void>;
}

const useChallengesStore = create<State>((set, get) => ({
  challenges: [],
  addChallenge: (challenge: Challenge, onAbandon?: () => Promise<void> | void) => {
    set((state) => ({
      challenges: [...state.challenges, { challenge: redactGeneratedFortuneFromChallenge(challenge), id: nextChallengeId++, onAbandon }],
    }));
  },
  removeChallenge: () => {
    set((state) => {
      const challenges = [...state.challenges];
      challenges.shift();
      return { challenges };
    });
  },
  abandonCurrentChallenge: async () => {
    const currentChallenge = get().challenges[0];
    get().removeChallenge();
    try {
      await currentChallenge?.onAbandon?.();
    } catch (error) {
      console.error('Failed to abandon challenge publication:', error);
    }
  },
}));

export default useChallengesStore;
