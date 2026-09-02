#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import process from 'node:process';
import { isWindows, repoRoot, resolvePort, startVite, waitForPort } from './dev-server-utils.mjs';

const adbBin = isWindows ? 'adb.exe' : 'adb';
const host = '127.0.0.1';
const requestedPort = Number(process.env.ANDROID_USB_PORT || 3000);
const openBrowser = process.env.ANDROID_USB_OPEN_BROWSER !== '0' && process.env.ANDROID_USB_OPEN_BROWSER !== 'false';

function fail(message) {
  console.error(message);
  process.exit(1);
}

function refreshGeneratedSources() {
  const refresh = spawnSync('corepack', ['yarn', 'run', 'refresh:generated'], {
    cwd: repoRoot,
    encoding: 'utf8',
    stdio: 'inherit',
    env: process.env,
  });

  if (refresh.status !== 0) {
    fail(`refresh:generated failed with exit code ${refresh.status ?? 'unknown'}`);
  }
}

function getReadyDevices() {
  const adbDevices = spawnSync(adbBin, ['devices'], {
    cwd: repoRoot,
    encoding: 'utf8',
  });

  if (adbDevices.error) {
    fail('ADB not found. Install Android platform-tools, connect the phone over USB, and enable USB debugging.');
  }

  if (adbDevices.status !== 0) {
    fail(`ADB check failed: ${adbDevices.stderr.trim() || adbDevices.stdout.trim() || 'unknown error'}`);
  }

  const devices = adbDevices.stdout
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('List of devices attached'));

  const readyDevices = devices.filter((line) => line.endsWith('\tdevice')).map((line) => line.split('\t')[0]);

  if (readyDevices.length === 0) {
    const detail = devices.length > 0 ? ` Detected states: ${devices.join(', ')}` : '';
    fail(`No Android device is ready over USB.${detail} Connect the phone, unlock it, trust the computer, and enable USB debugging.`);
  }

  return readyDevices;
}

function reversePorts(devices, port) {
  for (const serial of devices) {
    const adbReverse = spawnSync(adbBin, ['-s', serial, 'reverse', `tcp:${port}`, `tcp:${port}`], {
      cwd: repoRoot,
      encoding: 'utf8',
    });

    if (adbReverse.status !== 0) {
      fail(`ADB reverse failed for ${serial}: ${adbReverse.stderr.trim() || adbReverse.stdout.trim() || 'unknown error'}`);
    }
  }
}

/** Opens the preview URL in each device's default browser via VIEW intent. */
function openPreviewOnDevices(devices, url) {
  for (const serial of devices) {
    const open = spawnSync(adbBin, ['-s', serial, 'shell', 'am', 'start', '-a', 'android.intent.action.VIEW', '-d', url], {
      cwd: repoRoot,
      encoding: 'utf8',
    });

    if (open.status !== 0) {
      console.warn(`Could not open URL on ${serial}: ${open.stderr.trim() || open.stdout.trim() || 'unknown error'}`);
    }
  }
}

refreshGeneratedSources();

const devices = getReadyDevices();
const port = await resolvePort(requestedPort);

reversePorts(devices, port);

console.log('');
console.log(`Starting Android USB preview from ${repoRoot}`);
console.log(`Host URL: http://${host}:${port}`);
if (port !== requestedPort) {
  console.log(`Preferred port ${requestedPort} is busy, so this run will use ${port}.`);
}
console.log(`ADB reverse is active for: ${devices.join(', ')}`);
const deviceUrl = `http://localhost:${port}`;
if (openBrowser) {
  console.log(`Opening ${deviceUrl} in the default browser on the device(s) when the dev server is ready…`);
} else {
  console.log(`Open ${deviceUrl} in a browser on the Android device (ANDROID_USB_OPEN_BROWSER=0).`);
}
console.log('');

startVite(host, port);

if (openBrowser) {
  waitForPort(host, port)
    .then(() => {
      openPreviewOnDevices(devices, deviceUrl);
      console.log(`Opened ${deviceUrl} on device(s): ${devices.join(', ')}`);
      console.log('');
    })
    .catch((err) => {
      console.warn(String(err.message || err));
    });
}
