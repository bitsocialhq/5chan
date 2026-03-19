import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createTempWorkspace, logStep, repoRoot, runCommand, sleep, startFixtureServer, waitFor } from './app-update-e2e-helpers.mjs';

const OLD_VERSION = '0.7.1';
const NEW_VERSION = '0.7.3';
const OLD_VERSION_CODE = '701';
const NEW_VERSION_CODE = '703';
const PACKAGE_NAME = 'fivechan.android';
const ACTIVITY_NAME = `${PACKAGE_NAME}/.MainActivity`;
const AVD_NAME = 'fivechan-test-api35';
const SETTINGS_HASH = '#/all/settings#interface-settings';

const getAndroidSdkRoot = () => process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT;

const getSdkToolPath = (relativePath) => {
  const sdkRoot = getAndroidSdkRoot();
  if (!sdkRoot) {
    throw new Error('ANDROID_HOME or ANDROID_SDK_ROOT must be set');
  }

  return path.join(sdkRoot, relativePath);
};

const adb = async (args, options = {}) => runCommand(getSdkToolPath('platform-tools/adb'), args, options);

const buildAndroidDebugApk = async ({ version, versionCode, fixturePort }) => {
  await runCommand('corepack', ['yarn', 'build'], {
    env: {
      VITE_APP_VERSION: version,
      VITE_APP_UPDATE_ALLOWED_DOWNLOAD_HOSTS: '10.0.2.2',
      VITE_APP_UPDATE_RELEASE_API_URL: `http://10.0.2.2:${fixturePort}/releases/latest`,
      VITE_E2E_START_HASH: SETTINGS_HASH,
    },
  });
  await runCommand('npx', ['cap', 'sync', 'android']);
  await runCommand('./gradlew', ['assembleDebug', `-PAPP_VERSION_CODE=${versionCode}`, `-PAPP_VERSION_NAME=${version}`], {
    cwd: path.join(repoRoot, 'android'),
  });

  return path.join(repoRoot, 'android', 'app', 'build', 'outputs', 'apk', 'debug', 'app-debug.apk');
};

const ensureEmulatorRunning = async () => {
  const devicesOutput = await adb(['devices'], { captureOutput: true });
  const existingEmulator = devicesOutput.stdout
    .split('\n')
    .map((line) => line.trim())
    .find((line) => line.startsWith('emulator-') && line.endsWith('\tdevice'));

  if (existingEmulator) {
    return existingEmulator.split('\t')[0];
  }

  const avdManagerPath = getSdkToolPath('cmdline-tools/latest/bin/avdmanager');
  const emulatorPath = getSdkToolPath('emulator/emulator');
  const avdList = await runCommand(avdManagerPath, ['list', 'avd'], {
    captureOutput: true,
  });

  if (!avdList.stdout.includes(`Name: ${AVD_NAME}`)) {
    await runCommand('/bin/sh', ['-lc', `echo "no" | "${avdManagerPath}" create avd --name "${AVD_NAME}" --package "system-images;android-35;google_apis;arm64-v8a" --device pixel_6 --force`]);
  }

  const emulatorLogPath = path.join(os.tmpdir(), `fivechan-emulator-${Date.now()}.log`);
  logStep(`starting emulator, log: ${emulatorLogPath}`);
  runCommand('/bin/sh', ['-lc', `"${emulatorPath}" -avd "${AVD_NAME}" -no-boot-anim -no-snapshot-save -netdelay none -netspeed full > "${emulatorLogPath}" 2>&1 &`]);

  await adb(['wait-for-device']);
  await waitFor(
    async () => {
      const result = await adb(['shell', 'getprop', 'sys.boot_completed'], {
        captureOutput: true,
      });
      return result.stdout.replace(/\s+/g, '') === '1';
    },
    {
      timeoutMs: 180000,
      intervalMs: 2000,
      description: 'the Android emulator to finish booting',
    },
  );

  await adb(['shell', 'settings', 'put', 'global', 'window_animation_scale', '0']);
  await adb(['shell', 'settings', 'put', 'global', 'transition_animation_scale', '0']);
  await adb(['shell', 'settings', 'put', 'global', 'animator_duration_scale', '0']);

  const refreshedDevicesOutput = await adb(['devices'], { captureOutput: true });
  const emulatorLine = refreshedDevicesOutput.stdout
    .split('\n')
    .map((line) => line.trim())
    .find((line) => line.startsWith('emulator-') && line.endsWith('\tdevice'));

  if (!emulatorLine) {
    throw new Error('Could not determine the running emulator serial');
  }

  return emulatorLine.split('\t')[0];
};

const readUiDump = async (serial) => {
  await adb(['-s', serial, 'shell', 'uiautomator', 'dump', '/sdcard/window_dump.xml']);
  const dumpResult = await adb(['-s', serial, 'shell', 'cat', '/sdcard/window_dump.xml'], {
    captureOutput: true,
  });
  return dumpResult.stdout;
};

const findNodeBounds = (dumpXml, matcher) => {
  const nodePattern = /<node\b([^>]+?)\/>/g;

  for (const match of dumpXml.matchAll(nodePattern)) {
    const attributes = match[1];
    const textMatch = attributes.match(/\btext="([^"]*)"/);
    const contentDescMatch = attributes.match(/\bcontent-desc="([^"]*)"/);
    const boundsMatch = attributes.match(/\bbounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"/);
    const clickableMatch = attributes.match(/\bclickable="([^"]*)"/);
    const text = textMatch?.[1] || contentDescMatch?.[1] || '';

    if (!boundsMatch || !matcher(text, clickableMatch?.[1] === 'true')) {
      continue;
    }

    const [, left, top, right, bottom] = boundsMatch.map(Number);
    return {
      x: Math.floor((left + right) / 2),
      y: Math.floor((top + bottom) / 2),
    };
  }

  return null;
};

const tapText = async (serial, { exactText, pattern, timeoutMs = 120000 }) => {
  const bounds = await waitFor(
    async () => {
      const dumpXml = await readUiDump(serial);
      return findNodeBounds(dumpXml, (text, clickable) => clickable && (exactText ? text === exactText : pattern.test(text)));
    },
    {
      timeoutMs,
      intervalMs: 2000,
      description: `UI text ${exactText || pattern}`,
    },
  );

  await adb(['-s', serial, 'shell', 'input', 'tap', `${bounds.x}`, `${bounds.y}`]);
};

const waitForText = async (serial, matcher, description) =>
  waitFor(
    async () => {
      const dumpXml = await readUiDump(serial);
      if (typeof matcher === 'string') {
        return dumpXml.includes(`text="${matcher}"`) || dumpXml.includes(`content-desc="${matcher}"`);
      }

      return matcher.test(dumpXml);
    },
    {
      timeoutMs: 120000,
      intervalMs: 2000,
      description,
    },
  );

const waitForInstalledVersion = async (serial, version) =>
  waitFor(
    async () => {
      const packageInfo = await adb(['-s', serial, 'shell', 'dumpsys', 'package', PACKAGE_NAME], {
        captureOutput: true,
      });
      return packageInfo.stdout.includes(`versionName=${version}`);
    },
    {
      timeoutMs: 180000,
      intervalMs: 3000,
      description: `installed package version ${version}`,
    },
  );

const main = async () => {
  const workspace = await createTempWorkspace('android-update-e2e');
  const fixtureServer = await startFixtureServer();

  try {
    const oldApkSourcePath = await buildAndroidDebugApk({
      version: OLD_VERSION,
      versionCode: OLD_VERSION_CODE,
      fixturePort: fixtureServer.port,
    });
    const oldApkPath = path.join(workspace, `5chan-v${OLD_VERSION}.apk`);
    await fs.promises.copyFile(oldApkSourcePath, oldApkPath);

    const newApkSourcePath = await buildAndroidDebugApk({
      version: NEW_VERSION,
      versionCode: NEW_VERSION_CODE,
      fixturePort: fixtureServer.port,
    });
    const newApkPath = path.join(workspace, `5chan-v${NEW_VERSION}.apk`);
    await fs.promises.copyFile(newApkSourcePath, newApkPath);

    fixtureServer.setRelease(NEW_VERSION, [
      {
        name: path.basename(newApkPath),
        filePath: newApkPath,
      },
    ]);

    const serial = await ensureEmulatorRunning();
    await adb(['-s', serial, 'uninstall', PACKAGE_NAME]).catch(() => undefined);
    await adb(['-s', serial, 'install', '-r', oldApkPath]);
    await adb(['-s', serial, 'shell', 'appops', 'set', PACKAGE_NAME, 'REQUEST_INSTALL_PACKAGES', 'allow']);
    await adb(['-s', serial, 'shell', 'am', 'start', '-n', ACTIVITY_NAME]);

    await waitForText(serial, 'Check', 'the settings update check button');
    await tapText(serial, { exactText: 'Check' });
    await waitForText(serial, 'Download', 'the download button after update detection');
    await waitForText(serial, `v${NEW_VERSION}`, 'the release version link text');
    await tapText(serial, { exactText: 'Download' });
    await tapText(serial, {
      pattern: /^(Install|Update)$/i,
      timeoutMs: 120000,
    });
    await waitForInstalledVersion(serial, NEW_VERSION);

    await adb(['-s', serial, 'shell', 'am', 'force-stop', PACKAGE_NAME]);
    await adb(['-s', serial, 'shell', 'am', 'start', '-n', ACTIVITY_NAME]);
    await waitForText(serial, `v${NEW_VERSION}`, 'the relaunched app version text');

    logStep(`android update e2e passed on ${serial}: package ${PACKAGE_NAME} updated to ${NEW_VERSION}`);
  } finally {
    await sleep(1000);
    await fixtureServer.close();
    await fs.promises.rm(workspace, { recursive: true, force: true }).catch(() => undefined);
  }
};

await main();
