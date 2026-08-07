import { useEffect, useState } from 'react';
import type { Comment } from '@bitsocial/bitsocial-react-hooks';

interface SettledFeedSnapshot {
  comments: Comment[];
  scopeKey: string;
}

// A mod-queue refresh rebuilds the hook feed from empty/partial pages. Keep the
// last completed generation mounted until its replacement is complete so local
// moderation state and the rest of the queue do not flicker away mid-refresh.
export const useSettledModQueueFeed = (feed: Comment[], feedState: string, scopeKey: string): Comment[] => {
  const [settledSnapshot, setSettledSnapshot] = useState<SettledFeedSnapshot>({ comments: [], scopeKey });
  const isSettled = feedState === 'succeeded';

  useEffect(() => {
    if (!isSettled) {
      return;
    }

    setSettledSnapshot((currentSnapshot) => {
      if (currentSnapshot.scopeKey === scopeKey && currentSnapshot.comments === feed) {
        return currentSnapshot;
      }
      return { comments: feed, scopeKey };
    });
  }, [feed, isSettled, scopeKey]);

  if (isSettled || settledSnapshot.scopeKey !== scopeKey || settledSnapshot.comments.length === 0) {
    return feed;
  }

  return settledSnapshot.comments;
};

export default useSettledModQueueFeed;
