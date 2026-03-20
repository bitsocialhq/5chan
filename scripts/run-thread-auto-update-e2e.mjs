import { spawn } from 'node:child_process';
import { join } from 'node:path';
import process from 'node:process';
import { setTimeout as delay } from 'node:timers/promises';
import { chromium } from 'playwright';

const PAGE_TIMEOUT_MS = 30_000;
const SERVER_TIMEOUT_MS = 60_000;
const HARNESS_URL =
  process.env.THREAD_AUTO_UPDATE_E2E_URL || `http://${process.env.THREAD_AUTO_UPDATE_E2E_HOST || '127.0.0.1'}:${process.env.THREAD_AUTO_UPDATE_E2E_PORT || '4174'}/?e2e=thread-auto-update`;
const harnessOrigin = new URL(HARNESS_URL);
const DEV_HOST = harnessOrigin.hostname;
const DEV_PORT = harnessOrigin.port || (harnessOrigin.protocol === 'https:' ? '443' : '80');
const shouldStartDevServer = process.argv.includes('--start-dev');
const viteCommand = process.platform === 'win32' ? 'vite.cmd' : 'vite';
const viteBin = join(process.cwd(), 'node_modules', '.bin', viteCommand);

const scenarios = [
  {
    name: 'desktop',
    contextOptions: {
      viewport: { width: 1440, height: 960 },
    },
  },
];

let devServerProcess = null;
let devServerShutdownRequested = false;

const cleanupDevServer = async () => {
  if (!devServerProcess || devServerProcess.exitCode !== null || devServerProcess.killed) {
    return;
  }

  devServerShutdownRequested = true;
  devServerProcess.kill('SIGTERM');

  const exited = await Promise.race([
    new Promise((resolve) => {
      devServerProcess?.once('exit', () => resolve(true));
    }),
    delay(5_000).then(() => false),
  ]);

  if (!exited && devServerProcess && devServerProcess.exitCode === null && !devServerProcess.killed) {
    devServerProcess.kill('SIGKILL');
  }
};

const registerSignalHandlers = () => {
  const handleSignal = async (signal) => {
    await cleanupDevServer();
    process.exit(signal === 'SIGINT' ? 130 : 143);
  };

  process.once('SIGINT', handleSignal);
  process.once('SIGTERM', handleSignal);
};

const startDevServer = async () => {
  devServerProcess = spawn(viteBin, ['--host', DEV_HOST, '--port', DEV_PORT, '--strictPort'], {
    cwd: process.cwd(),
    env: process.env,
    stdio: 'inherit',
  });

  if (!devServerProcess.pid) {
    throw new Error('Failed to start the dev server');
  }

  devServerProcess.once('exit', (code) => {
    if (!devServerShutdownRequested && code !== 0 && code !== null) {
      console.error(`Dev server exited early with code ${code}`);
    }
  });
};

const waitForServer = async (timeoutMs = SERVER_TIMEOUT_MS) => {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(HARNESS_URL, { redirect: 'manual' });
      if (response.ok || response.status === 304) {
        return;
      }
    } catch {
      // Keep polling until timeout.
    }

    await delay(500);
  }

  throw new Error(`Timed out waiting for ${HARNESS_URL}`);
};

const waitForTestIdText = async (page, testId, expectedText) => {
  await page.getByTestId(testId).waitFor({ state: 'visible', timeout: PAGE_TIMEOUT_MS });
  await page.waitForFunction(
    ({ expected, id }) => document.querySelector(`[data-testid="${id}"]`)?.textContent === expected,
    { expected: expectedText, id: testId },
    { timeout: PAGE_TIMEOUT_MS },
  );
};

const runScenario = async (browser, scenario) => {
  const context = await browser.newContext(scenario.contextOptions);
  const page = await context.newPage();
  const pageErrors = [];
  const consoleErrors = [];

  page.on('pageerror', (error) => pageErrors.push(error));
  page.on('crash', () => pageErrors.push(new Error('Page crashed')));
  page.on('console', (message) => {
    if (message.type() === 'error') {
      consoleErrors.push(message.text());
    }
  });

  try {
    await page.goto(HARNESS_URL, { waitUntil: 'domcontentloaded', timeout: PAGE_TIMEOUT_MS });
    await page.getByRole('heading', { name: 'Thread Auto Update E2E' }).waitFor({ timeout: PAGE_TIMEOUT_MS });

    const autoCheckbox = page.getByLabel('Auto');
    const simulateServerUpdateButton = page.getByTestId('simulate-server-update');
    const updateButton = page.getByRole('button', { exact: true, name: 'update' });

    if (await autoCheckbox.isChecked()) {
      throw new Error(`[${scenario.name}] Auto checkbox should default to unchecked`);
    }

    await waitForTestIdText(page, 'visible-post-label', 'OP version 1');
    await waitForTestIdText(page, 'visible-replies-count', '1');
    await waitForTestIdText(page, 'visible-first-reply', 'reply 1 edited v1');

    await simulateServerUpdateButton.click();
    await waitForTestIdText(page, 'server-version', 'Server version 2');
    await waitForTestIdText(page, 'visible-post-label', 'OP version 1');
    await waitForTestIdText(page, 'visible-replies-count', '1');
    await waitForTestIdText(page, 'visible-first-reply', 'reply 1 edited v1');

    await updateButton.click();
    await waitForTestIdText(page, 'visible-post-label', 'OP version 2');
    await waitForTestIdText(page, 'visible-replies-count', '2');
    await waitForTestIdText(page, 'visible-first-reply', 'reply 1 edited v2');

    await autoCheckbox.check();
    await simulateServerUpdateButton.click();
    await waitForTestIdText(page, 'server-version', 'Server version 3');
    await waitForTestIdText(page, 'visible-post-label', 'OP version 3');
    await waitForTestIdText(page, 'visible-replies-count', '3');
    await waitForTestIdText(page, 'visible-first-reply', 'reply 1 edited v3');

    await autoCheckbox.uncheck();
    await simulateServerUpdateButton.click();
    await waitForTestIdText(page, 'server-version', 'Server version 4');
    await waitForTestIdText(page, 'visible-post-label', 'OP version 3');
    await waitForTestIdText(page, 'visible-replies-count', '3');
    await waitForTestIdText(page, 'visible-first-reply', 'reply 1 edited v3');

    if (pageErrors.length > 0) {
      throw new Error(`[${scenario.name}] page errors:\n${pageErrors.map((error) => error.stack || error.message).join('\n\n')}`);
    }

    if (consoleErrors.length > 0) {
      throw new Error(`[${scenario.name}] console errors:\n${consoleErrors.join('\n\n')}`);
    }
  } finally {
    await context.close();
  }
};

const main = async () => {
  registerSignalHandlers();

  try {
    if (shouldStartDevServer) {
      const hasExistingServer = await waitForServer(3_000).then(() => true).catch(() => false);
      if (!hasExistingServer) await startDevServer();
      await waitForServer();
    }

    const browser = await chromium.launch({ headless: true });
    try {
      for (const scenario of scenarios) {
        console.log(`Running thread auto update e2e for ${scenario.name}...`);
        await runScenario(browser, scenario);
      }
    } finally {
      await browser.close();
    }

    console.log('Thread auto update e2e passed.');
  } finally {
    await cleanupDevServer();
  }
};

await main();
