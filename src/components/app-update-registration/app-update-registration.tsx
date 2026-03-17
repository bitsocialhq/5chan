import { useEffect } from 'react';
import packageJson from '../../../package.json';
import { fetchLatestStableVersion, isElectron, refreshServiceWorkerRegistration } from '../../lib/app-update';
import useAppUpdateStore from '../../stores/use-app-update-store';

const UPDATE_CHECK_INTERVAL_MS = 60 * 1000;

const AppUpdateRegistration = () => {
  useEffect(() => {
    if (isElectron) {
      return undefined;
    }

    let isDisposed = false;

    const syncUpdateAvailability = async () => {
      await refreshServiceWorkerRegistration().catch((error) => {
        console.error('Failed to refresh service worker registration', error);
      });

      try {
        const latestStableVersion = await fetchLatestStableVersion();

        if (!isDisposed) {
          useAppUpdateStore.getState().setNeedRefresh(packageJson.version !== latestStableVersion);
        }
      } catch (error) {
        console.error('Failed to check app update availability', error);
      }
    };

    void syncUpdateAvailability();
    const intervalId = window.setInterval(() => {
      void syncUpdateAvailability();
    }, UPDATE_CHECK_INTERVAL_MS);
    return () => {
      isDisposed = true;
      window.clearInterval(intervalId);
      useAppUpdateStore.getState().setNeedRefresh(false);
    };
  }, []);

  return null;
};

export default AppUpdateRegistration;
