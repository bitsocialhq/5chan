const isElectron = window.electronApi?.isElectron === true;

const fetchLatestStableVersion = async (): Promise<string> => {
  const versionUrl = isElectron
    ? 'https://raw.githubusercontent.com/bitsocialnet/5chan/master/package.json'
    : new URL(`/version.json?t=${Date.now()}`, window.location.origin).toString();
  const packageRes = await fetch(versionUrl, { cache: 'no-store' });
  const packageData = await packageRes.json();

  if (typeof packageData?.version !== 'string') {
    throw new Error('invalid version payload');
  }

  return packageData.version;
};

const refreshServiceWorkerRegistration = async (): Promise<void> => {
  if (!('serviceWorker' in navigator)) {
    return;
  }

  const registration = await navigator.serviceWorker.getRegistration();
  await registration?.update();
};

export { fetchLatestStableVersion, isElectron, refreshServiceWorkerRegistration };
