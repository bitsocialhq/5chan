import fs from 'node:fs';
import path from 'node:path';
import { _electron as electron } from 'playwright';
import { copyPath, createTempWorkspace, findFirstMatchingPath, logStep, repoRoot, runCommand, sleep, startFixtureServer, waitFor } from './app-update-e2e-helpers.mjs';

const OLD_VERSION = '0.7.1';
const NEW_VERSION = '0.7.3';
const SETTINGS_HASH = '#/all/settings#interface-settings';
const MAC_ARCH = process.arch === 'x64' ? 'x64' : 'arm64';

const findPackagedMacApp = async () => {
  const outDirectory = path.join(repoRoot, 'out');
  return findFirstMatchingPath(outDirectory, (entryPath, entry) => entry.isDirectory() && entryPath.endsWith('.app'));
};

const buildPackagedApp = async ({ version, fixturePort }) => {
  await runCommand('corepack', ['yarn', 'electron:package'], {
    env: {
      VITE_APP_VERSION: version,
      VITE_APP_UPDATE_ALLOWED_DOWNLOAD_HOSTS: '127.0.0.1',
      VITE_APP_UPDATE_RELEASE_API_URL: `http://127.0.0.1:${fixturePort}/releases/latest`,
      VITE_E2E_START_HASH: SETTINGS_HASH,
    },
  });

  const packagedAppPath = await findPackagedMacApp();
  if (!packagedAppPath) {
    throw new Error('Could not find the packaged macOS app');
  }

  return packagedAppPath;
};

const zipMacApp = async (appPath, zipPath) => {
  await fs.promises.rm(zipPath, { force: true });
  await runCommand('/usr/bin/ditto', ['-c', '-k', '--sequesterRsrc', '--keepParent', appPath, zipPath]);
};

const main = async () => {
  if (process.platform !== 'darwin') {
    throw new Error('Electron update e2e is only implemented for macOS in this harness');
  }

  const workspace = await createTempWorkspace('electron-update-e2e');
  const fixtureServer = await startFixtureServer();

  try {
    const packagedOldAppPath = await buildPackagedApp({
      version: OLD_VERSION,
      fixturePort: fixtureServer.port,
    });

    const installedAppPath = path.join(workspace, 'installed', '5chan.app');
    await copyPath(packagedOldAppPath, installedAppPath);

    const packagedNewAppPath = await buildPackagedApp({
      version: NEW_VERSION,
      fixturePort: fixtureServer.port,
    });

    const zippedNewAppPath = path.join(workspace, `5chan-darwin-${MAC_ARCH}-v${NEW_VERSION}.zip`);
    await zipMacApp(packagedNewAppPath, zippedNewAppPath);

    fixtureServer.setRelease(NEW_VERSION, [
      {
        name: path.basename(zippedNewAppPath),
        filePath: zippedNewAppPath,
      },
    ]);

    const versionMetadataPath = path.join(installedAppPath, 'Contents', 'Resources', 'app', 'build', 'version.json');
    const sandboxHome = path.join(workspace, 'home');
    const updaterDebugLogPath = path.join(workspace, 'app-updater.log');
    const plebbitDataPath = path.join(sandboxHome, 'Library', 'Application Support', 'plebbit');
    await fs.promises.mkdir(plebbitDataPath, { recursive: true });
    await fs.promises.writeFile(path.join(plebbitDataPath, 'auth-key'), 'e2e-auth-key', 'utf8');

    const electronApp = await electron.launch({
      executablePath: path.join(installedAppPath, 'Contents', 'MacOS', '5chan'),
      env: {
        ...process.env,
        APP_UPDATE_ALLOWED_DOWNLOAD_HOSTS: '127.0.0.1',
        APP_UPDATE_DEBUG: '1',
        APP_UPDATE_DEBUG_LOG_PATH: updaterDebugLogPath,
        HOME: sandboxHome,
      },
    });

    const firstWindow = await electronApp.firstWindow();
    firstWindow.on('dialog', async (dialog) => {
      logStep(`electron app dialog: ${dialog.message()}`);
      await dialog.dismiss();
    });
    await firstWindow.waitForLoadState('domcontentloaded');
    await firstWindow.getByRole('button', { name: 'Check' }).waitFor({
      timeout: 120000,
    });
    await firstWindow.getByRole('button', { name: 'Check' }).click();
    await firstWindow.getByRole('button', { name: 'Download' }).waitFor({
      timeout: 120000,
    });
    await firstWindow.getByText(`v${NEW_VERSION}`).waitFor({
      timeout: 120000,
    });
    await firstWindow.getByRole('button', { name: 'Download' }).evaluate((button) => {
      button.click();
    });

    await waitFor(
      async () => {
        try {
          const payload = JSON.parse(await fs.promises.readFile(versionMetadataPath, 'utf8'));
          return payload.version === NEW_VERSION;
        } catch {
          return false;
        }
      },
      {
        timeoutMs: 180000,
        intervalMs: 2000,
        description: `the installed app bundle to be replaced with v${NEW_VERSION}`,
      },
    );

    await waitFor(
      async () => {
        const result = await runCommand('/usr/bin/pgrep', ['-f', path.join(installedAppPath, 'Contents', 'MacOS', '5chan')], {
          captureOutput: true,
        }).catch(() => null);
        return result?.stdout?.trim()?.length ? result.stdout.trim() : false;
      },
      {
        timeoutMs: 120000,
        intervalMs: 2000,
        description: 'the updated macOS app to relaunch',
      },
    );

    logStep(`electron update e2e passed: ${installedAppPath} now contains version ${NEW_VERSION}`);
  } finally {
    await sleep(2000);
    await fixtureServer.close();
    await fs.promises.rm(workspace, { recursive: true, force: true }).catch(() => undefined);
  }
};

await main();
