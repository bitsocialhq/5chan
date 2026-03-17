import { memo, useEffect } from 'react';
import { registerSW } from 'virtual:pwa-register';
import useAppUpdateStore from '../../stores/use-app-update-store';

const UPDATE_CHECK_INTERVAL_MS = 60 * 1000;

const AppUpdateRegistration = () => {
  useEffect(() => {
    let intervalId: number | null = null;

    const updateServiceWorker = registerSW({
      immediate: true,
      onNeedRefresh: () => {
        useAppUpdateStore.getState().setNeedRefresh(true);
      },
      onRegisteredSW: (_swScriptUrl: string, serviceWorkerRegistration: ServiceWorkerRegistration | undefined) => {
        if (!serviceWorkerRegistration) {
          return;
        }

        const checkForUpdates = () => {
          void serviceWorkerRegistration.update().catch(() => undefined);
        };

        checkForUpdates();
        if (intervalId !== null) {
          window.clearInterval(intervalId);
        }
        intervalId = window.setInterval(checkForUpdates, UPDATE_CHECK_INTERVAL_MS);
      },
      onRegisterError: (error: unknown) => {
        console.error('Failed to register service worker', error);
      },
    });

    useAppUpdateStore.getState().setUpdateServiceWorker(updateServiceWorker);

    return () => {
      if (intervalId !== null) {
        window.clearInterval(intervalId);
      }
      useAppUpdateStore.getState().setNeedRefresh(false);
      useAppUpdateStore.getState().setUpdateServiceWorker(null);
    };
  }, []);

  return null;
};

export default memo(AppUpdateRegistration);
