import { useCallback, useSyncExternalStore } from 'react';
import type { Criteria } from '@bitsocial/pubsub-voting';
import { getCachedDirectoryVoteCriteria, subscribeDirectoryVoteCriteria } from '../lib/directory-vote-criteria';

export const useDirectoryVoteCriteria = (directoryCode: string | undefined): Criteria | undefined => {
  const getSnapshot = useCallback(() => (directoryCode ? getCachedDirectoryVoteCriteria().criteriaByDirectoryCode.get(directoryCode) : undefined), [directoryCode]);
  const subscribe = useCallback((listener: () => void) => (directoryCode ? subscribeDirectoryVoteCriteria(listener) : () => {}), [directoryCode]);

  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
};
