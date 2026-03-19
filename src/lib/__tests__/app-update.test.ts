import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const testState = vi.hoisted(() => ({
  androidDownloadAndInstallUpdateMock: vi.fn(),
  capacitorPlatform: 'web',
  electronDownloadAndInstallUpdateMock: vi.fn(),
  electronGetPlatformMock: vi.fn(),
  fetchMock: vi.fn(),
}));

vi.mock('@capacitor/core', () => ({
  Capacitor: {
    getPlatform: () => testState.capacitorPlatform,
  },
}));

vi.mock('../../plugins/app-updater', () => ({
  default: {
    downloadAndInstallUpdate: (options: unknown) => testState.androidDownloadAndInstallUpdateMock(options),
  },
}));

const createFetchResponse = (body: unknown, ok = true, status = 200) => ({
  ok,
  status,
  json: vi.fn().mockResolvedValue(body),
});

const originalLocation = window.location;
const originalElectronApi = window.electronApi;
const originalServiceWorker = navigator.serviceWorker;

const loadModule = async () => {
  vi.resetModules();
  return import('../app-update');
};

describe('app-update', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    testState.androidDownloadAndInstallUpdateMock.mockReset();
    testState.capacitorPlatform = 'web';
    testState.electronDownloadAndInstallUpdateMock.mockReset();
    testState.electronGetPlatformMock.mockReset();
    testState.fetchMock.mockReset();
    vi.stubGlobal('fetch', testState.fetchMock);
    window.electronApi = undefined;
    Object.defineProperty(navigator, 'serviceWorker', {
      configurable: true,
      value: {
        getRegistration: vi.fn().mockResolvedValue({
          update: vi.fn().mockResolvedValue(undefined),
        }),
      },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    window.electronApi = originalElectronApi;
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: originalLocation,
    });
    Object.defineProperty(navigator, 'serviceWorker', {
      configurable: true,
      value: originalServiceWorker,
    });
  });

  it('resolves a web update when version metadata is newer', async () => {
    testState.fetchMock.mockResolvedValueOnce(createFetchResponse({ version: '9.9.9' }));

    const { resolveAvailableAppUpdate } = await loadModule();
    const result = await resolveAvailableAppUpdate();

    expect(result).toEqual({
      runtime: 'web',
      targetVersion: '9.9.9',
      releaseUrl: 'https://github.com/bitsocialnet/5chan/releases/tag/v9.9.9',
    });
  });

  it('returns no web update when the installed version is already current', async () => {
    testState.fetchMock.mockResolvedValueOnce(createFetchResponse({ version: '0.7.2' }));

    const { resolveAvailableAppUpdate } = await loadModule();
    const result = await resolveAvailableAppUpdate();

    expect(result).toBeNull();
  });

  it('selects the matching electron release asset for the current desktop platform', async () => {
    window.electronApi = {
      isElectron: true,
      getPlatform: () => testState.electronGetPlatformMock(),
      downloadAndInstallUpdate: (options) => testState.electronDownloadAndInstallUpdateMock(options),
      copyToClipboard: vi.fn(),
      automateUploadMedia: vi.fn(),
    } as Window['electronApi'];
    testState.electronGetPlatformMock.mockResolvedValue({
      platform: 'linux',
      arch: 'x64',
      version: 'v20.0.0',
    });
    testState.fetchMock.mockResolvedValueOnce(
      createFetchResponse({
        tag_name: 'v9.9.9',
        assets: [
          {
            name: '5chan-9.9.9-arm64.AppImage',
            browser_download_url: 'https://github.com/bitsocialnet/5chan/releases/download/v9.9.9/5chan-9.9.9-arm64.AppImage',
          },
          {
            name: '5chan-9.9.9-x64.AppImage',
            browser_download_url: 'https://github.com/bitsocialnet/5chan/releases/download/v9.9.9/5chan-9.9.9-x64.AppImage',
          },
        ],
      }),
    );

    const { resolveAvailableAppUpdate } = await loadModule();
    const result = await resolveAvailableAppUpdate();

    expect(result).toEqual({
      runtime: 'electron',
      targetVersion: '9.9.9',
      assetName: '5chan-9.9.9-x64.AppImage',
      downloadUrl: 'https://github.com/bitsocialnet/5chan/releases/download/v9.9.9/5chan-9.9.9-x64.AppImage',
      releaseUrl: 'https://github.com/bitsocialnet/5chan/releases/tag/v9.9.9',
    });
  });

  it('prefers the matching mac zip asset for packaged electron updates', async () => {
    window.electronApi = {
      isElectron: true,
      getPlatform: () => testState.electronGetPlatformMock(),
      downloadAndInstallUpdate: (options) => testState.electronDownloadAndInstallUpdateMock(options),
      copyToClipboard: vi.fn(),
      automateUploadMedia: vi.fn(),
    } as Window['electronApi'];
    testState.electronGetPlatformMock.mockResolvedValue({
      platform: 'darwin',
      arch: 'arm64',
      version: 'v20.0.0',
    });
    testState.fetchMock.mockResolvedValueOnce(
      createFetchResponse({
        tag_name: 'v9.9.9',
        assets: [
          {
            name: '5chan-9.9.9-arm64.zip',
            browser_download_url: 'https://github.com/bitsocialnet/5chan/releases/download/v9.9.9/5chan-9.9.9-arm64.zip',
          },
          {
            name: '5chan-9.9.9-arm64.dmg',
            browser_download_url: 'https://github.com/bitsocialnet/5chan/releases/download/v9.9.9/5chan-9.9.9-arm64.dmg',
          },
        ],
      }),
    );

    const { resolveAvailableAppUpdate } = await loadModule();
    const result = await resolveAvailableAppUpdate();

    expect(result).toEqual({
      runtime: 'electron',
      targetVersion: '9.9.9',
      assetName: '5chan-9.9.9-arm64.zip',
      downloadUrl: 'https://github.com/bitsocialnet/5chan/releases/download/v9.9.9/5chan-9.9.9-arm64.zip',
      releaseUrl: 'https://github.com/bitsocialnet/5chan/releases/tag/v9.9.9',
    });
  });

  it('prefers a matching mac dmg over an incompatible zip fallback', async () => {
    window.electronApi = {
      isElectron: true,
      getPlatform: () => testState.electronGetPlatformMock(),
      downloadAndInstallUpdate: (options) => testState.electronDownloadAndInstallUpdateMock(options),
      copyToClipboard: vi.fn(),
      automateUploadMedia: vi.fn(),
    } as Window['electronApi'];
    testState.electronGetPlatformMock.mockResolvedValue({
      platform: 'darwin',
      arch: 'arm64',
      version: 'v20.0.0',
    });
    testState.fetchMock.mockResolvedValueOnce(
      createFetchResponse({
        tag_name: 'v9.9.9',
        assets: [
          {
            name: '5chan-9.9.9-x64.zip',
            browser_download_url: 'https://github.com/bitsocialnet/5chan/releases/download/v9.9.9/5chan-9.9.9-x64.zip',
          },
          {
            name: '5chan-9.9.9-arm64.dmg',
            browser_download_url: 'https://github.com/bitsocialnet/5chan/releases/download/v9.9.9/5chan-9.9.9-arm64.dmg',
          },
        ],
      }),
    );

    const { resolveAvailableAppUpdate } = await loadModule();
    const result = await resolveAvailableAppUpdate();

    expect(result).toEqual({
      runtime: 'electron',
      targetVersion: '9.9.9',
      assetName: '5chan-9.9.9-arm64.dmg',
      downloadUrl: 'https://github.com/bitsocialnet/5chan/releases/download/v9.9.9/5chan-9.9.9-arm64.dmg',
      releaseUrl: 'https://github.com/bitsocialnet/5chan/releases/tag/v9.9.9',
    });
  });

  it('returns no mac update when the only zip asset targets the wrong architecture', async () => {
    window.electronApi = {
      isElectron: true,
      getPlatform: () => testState.electronGetPlatformMock(),
      downloadAndInstallUpdate: (options) => testState.electronDownloadAndInstallUpdateMock(options),
      copyToClipboard: vi.fn(),
      automateUploadMedia: vi.fn(),
    } as Window['electronApi'];
    testState.electronGetPlatformMock.mockResolvedValue({
      platform: 'darwin',
      arch: 'x64',
      version: 'v20.0.0',
    });
    testState.fetchMock.mockResolvedValueOnce(
      createFetchResponse({
        tag_name: 'v9.9.9',
        assets: [
          {
            name: '5chan-9.9.9-arm64.zip',
            browser_download_url: 'https://github.com/bitsocialnet/5chan/releases/download/v9.9.9/5chan-9.9.9-arm64.zip',
          },
        ],
      }),
    );

    const { resolveAvailableAppUpdate } = await loadModule();
    const result = await resolveAvailableAppUpdate();

    expect(result).toBeNull();
  });

  it('selects the latest android apk release asset', async () => {
    testState.capacitorPlatform = 'android';
    testState.fetchMock.mockResolvedValueOnce(
      createFetchResponse({
        tag_name: 'v9.9.9',
        assets: [
          {
            name: '5chan-9.9.9.apk',
            browser_download_url: 'https://github.com/bitsocialnet/5chan/releases/download/v9.9.9/5chan-9.9.9.apk',
          },
        ],
      }),
    );

    const { resolveAvailableAppUpdate } = await loadModule();
    const result = await resolveAvailableAppUpdate();

    expect(result).toEqual({
      runtime: 'android',
      targetVersion: '9.9.9',
      assetName: '5chan-9.9.9.apk',
      downloadUrl: 'https://github.com/bitsocialnet/5chan/releases/download/v9.9.9/5chan-9.9.9.apk',
      releaseUrl: 'https://github.com/bitsocialnet/5chan/releases/tag/v9.9.9',
    });
  });

  it('accepts configured local test asset hosts for native e2e builds', async () => {
    vi.stubEnv('VITE_APP_UPDATE_ALLOWED_DOWNLOAD_HOSTS', '10.0.2.2');
    testState.capacitorPlatform = 'android';
    testState.fetchMock.mockResolvedValueOnce(
      createFetchResponse({
        tag_name: 'v9.9.9',
        html_url: 'http://10.0.2.2:4010/releases/v9.9.9',
        assets: [
          {
            name: '5chan-9.9.9.apk',
            browser_download_url: 'http://10.0.2.2:4010/assets/5chan-9.9.9.apk',
          },
        ],
      }),
    );

    const { resolveAvailableAppUpdate } = await loadModule();
    const result = await resolveAvailableAppUpdate();

    expect(result).toEqual({
      runtime: 'android',
      targetVersion: '9.9.9',
      assetName: '5chan-9.9.9.apk',
      downloadUrl: 'http://10.0.2.2:4010/assets/5chan-9.9.9.apk',
      releaseUrl: 'http://10.0.2.2:4010/releases/v9.9.9',
    });
  });

  it('reloads the page when applying a web update', async () => {
    const reloadMock = vi.fn();
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: {
        ...originalLocation,
        reload: reloadMock,
      },
    });

    const { applyAvailableAppUpdate } = await loadModule();
    await applyAvailableAppUpdate({
      runtime: 'web',
      targetVersion: '9.9.9',
      releaseUrl: 'https://github.com/bitsocialnet/5chan/releases/tag/v9.9.9',
    });

    expect(reloadMock).toHaveBeenCalledTimes(1);
  });

  it('routes native update installs through the matching platform bridge', async () => {
    window.electronApi = {
      isElectron: true,
      getPlatform: () => testState.electronGetPlatformMock(),
      downloadAndInstallUpdate: (options) => testState.electronDownloadAndInstallUpdateMock(options),
      copyToClipboard: vi.fn(),
      automateUploadMedia: vi.fn(),
    } as Window['electronApi'];

    const { applyAvailableAppUpdate } = await loadModule();
    await applyAvailableAppUpdate({
      runtime: 'electron',
      targetVersion: '9.9.9',
      assetName: '5chan-9.9.9.Setup.exe',
      downloadUrl: 'https://github.com/bitsocialnet/5chan/releases/download/v9.9.9/5chan-9.9.9.Setup.exe',
      releaseUrl: 'https://github.com/bitsocialnet/5chan/releases/tag/v9.9.9',
    });
    await applyAvailableAppUpdate({
      runtime: 'android',
      targetVersion: '9.9.9',
      assetName: '5chan-9.9.9.apk',
      downloadUrl: 'https://github.com/bitsocialnet/5chan/releases/download/v9.9.9/5chan-9.9.9.apk',
      releaseUrl: 'https://github.com/bitsocialnet/5chan/releases/tag/v9.9.9',
    });

    expect(testState.electronDownloadAndInstallUpdateMock).toHaveBeenCalledWith({
      url: 'https://github.com/bitsocialnet/5chan/releases/download/v9.9.9/5chan-9.9.9.Setup.exe',
      fileName: '5chan-9.9.9.Setup.exe',
    });
    expect(testState.androidDownloadAndInstallUpdateMock).toHaveBeenCalledWith({
      url: 'https://github.com/bitsocialnet/5chan/releases/download/v9.9.9/5chan-9.9.9.apk',
      fileName: '5chan-9.9.9.apk',
    });
  });
});
