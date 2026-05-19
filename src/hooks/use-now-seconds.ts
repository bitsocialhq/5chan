import { useEffect, useState } from 'react';

const STATUS_REFRESH_INTERVAL_MS = 30_000;

const getNowSeconds = () => Date.now() / 1000;

export const useNowSeconds = (enabled = true) => {
  const [nowSeconds, setNowSeconds] = useState(getNowSeconds);

  useEffect(() => {
    if (!enabled) return;

    const updateNow = () => setNowSeconds(getNowSeconds());
    updateNow();
    const interval = window.setInterval(updateNow, STATUS_REFRESH_INTERVAL_MS);
    return () => window.clearInterval(interval);
  }, [enabled]);

  return nowSeconds;
};
