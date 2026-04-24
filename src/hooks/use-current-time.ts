import { useState, useEffect } from 'react';

/**
 * Returns the current time in seconds, updating periodically.
 * This prevents unnecessary rerenders by only updating every 60 seconds
 * instead of on every render cycle.
 *
 * For visual updates like blinking animations, CSS handles that independently.
 * This hook is for time-based calculations that don't need millisecond precision.
 */
export const useCurrentTime = (updateIntervalSeconds: number | false = 60) => {
  const [currentTime, setCurrentTime] = useState(() => Date.now() / 1000);

  useEffect(() => {
    if (updateIntervalSeconds === false) {
      return;
    }

    // Update periodically
    const intervalId = setInterval(() => {
      setCurrentTime((previousTime) => {
        const nextTime = Date.now() / 1000;
        return Math.floor(nextTime) === Math.floor(previousTime) ? previousTime : nextTime;
      });
    }, updateIntervalSeconds * 1000);

    return () => clearInterval(intervalId);
  }, [updateIntervalSeconds]);

  return currentTime;
};
