import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { resolvePort } from './dev-server-utils.mjs';

const isWindows = process.platform === 'win32';
const usePortless = process.env.PORTLESS !== '0' && !isWindows;
const binDir = join(process.cwd(), 'node_modules', '.bin');
const executableSuffix = isWindows ? '.cmd' : '';
const portlessBin = join(binDir, `portless${executableSuffix}`);
const viteBin = join(binDir, `vite${executableSuffix}`);
const fallbackHost = '127.0.0.1';
const fallbackUrlHost = '5chan.localhost';
const fallbackRequestedPort = 1355;

function sanitizeLabel(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}

function getCurrentBranch() {
  const result = spawnSync('git', ['branch', '--show-current'], {
    cwd: process.cwd(),
    encoding: 'utf8',
  });

  if (result.status !== 0) {
    return null;
  }

  const branch = result.stdout.trim();

  return branch || null;
}

function getActivePortlessRoutes() {
  const result = spawnSync(portlessBin, ['list'], {
    cwd: process.cwd(),
    encoding: 'utf8',
    env: process.env,
  });

  if (result.status !== 0) {
    return new Set();
  }

  const matches = result.stdout.match(/http:\/\/[a-z0-9.-]+\.localhost:1355/g) || [];

  return new Set(matches);
}

function isRouteBusy(activeRoutes, appName) {
  return activeRoutes.has(`http://${appName}.localhost:1355`);
}

function getPreferredPortlessAppName(activeRoutes) {
  const branch = getCurrentBranch();
  const branchLabel = sanitizeLabel(branch || 'current');

  if (branch && branch !== 'master' && branch !== 'main') {
    return `${branchLabel}.5chan`;
  }

  if (isRouteBusy(activeRoutes, '5chan')) {
    return `${branchLabel}.5chan`;
  }

  return '5chan';
}

function getPortlessAppName() {
  const activeRoutes = getActivePortlessRoutes();
  const preferredAppName = getPreferredPortlessAppName(activeRoutes);

  if (!isRouteBusy(activeRoutes, preferredAppName)) {
    return preferredAppName;
  }

  for (let suffix = 2; suffix < 1000; suffix += 1) {
    const candidate = `${preferredAppName}-${suffix}`;

    if (!isRouteBusy(activeRoutes, candidate)) {
      return candidate;
    }
  }

  return `${preferredAppName}-${Date.now()}`;
}

const command = usePortless && existsSync(portlessBin) ? portlessBin : viteBin;
let args;
let publicUrl = null;

if (command === portlessBin) {
  const appName = getPortlessAppName();

  publicUrl = `http://${appName}.localhost:1355`;
  args = [appName, 'vite'];

  if (appName !== '5chan') {
    console.log(`Starting Portless dev server at ${publicUrl}`);
  }
} else {
  const port = await resolvePort(fallbackRequestedPort);
  const fallbackUrl = `http://${fallbackUrlHost}:${port}`;

  args = ['--host', fallbackHost, '--port', String(port), '--strictPort'];

  if (command !== portlessBin && process.env.PORTLESS !== '0') {
    console.warn(`portless unavailable on this platform, using vite directly on ${fallbackUrl}`);
  } else {
    console.log(`Starting Vite directly at ${fallbackUrl}`);
  }

  if (port !== fallbackRequestedPort) {
    console.log(`Preferred port ${fallbackRequestedPort} is busy, so this run will use ${fallbackUrl}.`);
  }
}

const child = spawn(command, args, {
  stdio: 'inherit',
  env: process.env,
});

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 0);
});
