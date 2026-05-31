import { spawn } from 'node:child_process';
import { constants } from 'node:fs';
import { access } from 'node:fs/promises';
import { join } from 'node:path';
import process from 'node:process';
import { setTimeout as delay } from 'node:timers/promises';
import { chromium, devices } from 'playwright';

const DEFAULT_SERVER_URL = 'http://127.0.0.1:4173/';
const DEFAULT_HOME_URL = `${DEFAULT_SERVER_URL}#/`;
const PREVIEW_PORT = '4173';
const PREVIEW_HOST = '127.0.0.1';
const PREVIEW_TIMEOUT_MS = 30_000;
const PAGE_TIMEOUT_MS = 30_000;

const shouldStartPreview = process.argv.includes('--start-preview');
const smokeBaseUrl = process.env.SMOKE_BASE_URL || DEFAULT_HOME_URL;
const smokeServerUrl = smokeBaseUrl.split('#')[0] || DEFAULT_SERVER_URL;

const buildRouteUrl = (hashPath) => {
  const normalizedHash = hashPath.startsWith('#') ? hashPath : `#${hashPath}`;
  return `${smokeServerUrl.replace(/\/?$/, '/')}${normalizedHash}`;
};

const previewCommand = process.platform === 'win32' ? 'vite.cmd' : 'vite';
const previewBin = join(process.cwd(), 'node_modules', '.bin', previewCommand);

let previewProcess = null;
let previewShutdownRequested = false;

const scenarios = [
  {
    name: 'desktop',
    contextOptions: {
      viewport: { width: 1440, height: 960 },
    },
  },
  {
    name: 'mobile',
    contextOptions: {
      ...devices['Pixel 7'],
    },
  },
];

const cleanupPreview = async () => {
  if (!previewProcess || previewProcess.exitCode !== null || previewProcess.killed) {
    return;
  }

  previewShutdownRequested = true;
  previewProcess.kill('SIGTERM');

  const exited = await Promise.race([
    new Promise((resolve) => {
      previewProcess?.once('exit', () => resolve(true));
    }),
    delay(5_000).then(() => false),
  ]);

  if (!exited && previewProcess && previewProcess.exitCode === null && !previewProcess.killed) {
    previewProcess.kill('SIGKILL');
  }
};

const registerSignalHandlers = () => {
  const handler = async (signal) => {
    await cleanupPreview();
    process.exit(signal === 'SIGINT' ? 130 : 143);
  };

  process.once('SIGINT', handler);
  process.once('SIGTERM', handler);
};

const assertNoPageErrors = (pageErrors, scenarioName, stepName) => {
  if (pageErrors.length === 0) {
    return;
  }

  const messages = pageErrors.map((error) => error.stack || error.message).join('\n\n');
  throw new Error(`[${scenarioName}] ${stepName} triggered renderer errors:\n${messages}`);
};

const waitForAppRender = async (page, minTextLength = 20) => {
  await page.waitForFunction(
    (expectedLength) => {
      const root = document.getElementById('root');
      const text = (document.body?.innerText || '').trim();
      return Boolean(root && root.childElementCount > 0 && text.length >= expectedLength);
    },
    minTextLength,
    { timeout: PAGE_TIMEOUT_MS },
  );
};

const waitForTitle = async (page, expectedTitle) => {
  await page.waitForFunction((title) => document.title === title, expectedTitle, { timeout: PAGE_TIMEOUT_MS });
};

const waitForVisibleText = async (page, pattern) => {
  await page.getByText(pattern).first().waitFor({ state: 'visible', timeout: PAGE_TIMEOUT_MS });
};

const runScenario = async (browser, scenario) => {
  const context = await browser.newContext(scenario.contextOptions);
  const page = await context.newPage();
  const pageErrors = [];
  const consoleErrors = new Set();

  page.on('pageerror', (error) => pageErrors.push(error));
  page.on('crash', () => pageErrors.push(new Error('Page crashed')));
  page.on('console', (message) => {
    if (message.type() === 'error') {
      consoleErrors.add(message.text());
    }
  });

  try {
    await page.goto(buildRouteUrl('/'), { waitUntil: 'domcontentloaded', timeout: PAGE_TIMEOUT_MS });
    await waitForAppRender(page, 100);
    await waitForTitle(page, '5chan');
    await waitForVisibleText(page, /What is 5chan|what_is_5chan/i);
    assertNoPageErrors(pageErrors, scenario.name, 'home route');

    await page.getByRole('link', { name: /^FAQ$/i }).first().click();
    await page.waitForURL((url) => url.hash === '#/faq', { timeout: PAGE_TIMEOUT_MS });
    await waitForTitle(page, 'FAQ - 5chan');
    await waitForVisibleText(page, /Frequently Asked Questions/i);
    assertNoPageErrors(pageErrors, scenario.name, 'FAQ route');

    await page.getByRole('link', { name: /^Rules$/i }).first().click();
    await page.waitForURL((url) => url.hash === '#/rules', { timeout: PAGE_TIMEOUT_MS });
    await waitForTitle(page, 'Rules - 5chan');
    await waitForVisibleText(page, /^Rules$/i);
    await waitForVisibleText(page, /Load rules P2P from any board/i);
    assertNoPageErrors(pageErrors, scenario.name, 'Rules route');

    await page.goto(buildRouteUrl('/all/settings'), { waitUntil: 'domcontentloaded', timeout: PAGE_TIMEOUT_MS });
    await waitForAppRender(page, 20);
    await page.locator('#interface-settings').waitFor({ state: 'visible', timeout: PAGE_TIMEOUT_MS });
    await page.locator('#media-hosting-settings').waitFor({ state: 'visible', timeout: PAGE_TIMEOUT_MS });
    assertNoPageErrors(pageErrors, scenario.name, 'settings route');

    if (consoleErrors.size > 0) {
      console.warn(`[smoke:${scenario.name}] console errors observed during smoke test:`);
      for (const message of consoleErrors) {
        console.warn(message);
      }
    }
  } finally {
    await context.close();
  }
};

const startPreview = async () => {
  await access(join(process.cwd(), 'build', 'index.html'), constants.R_OK);
  await access(previewBin, constants.X_OK);

  previewProcess = spawn(previewBin, ['preview', '--host', PREVIEW_HOST, '--port', PREVIEW_PORT, '--strictPort'], {
    cwd: process.cwd(),
    env: process.env,
    stdio: 'inherit',
  });

  if (!previewProcess.pid) {
    throw new Error('Failed to start Vite preview server');
  }

  previewProcess.once('exit', (code) => {
    if (!previewShutdownRequested && code !== 0 && code !== null) {
      console.error(`Vite preview exited early with code ${code}`);
    }
  });
};

const waitForServer = async () => {
  const startedAt = Date.now();

  while (Date.now() - startedAt < PREVIEW_TIMEOUT_MS) {
    try {
      const response = await fetch(smokeServerUrl, { redirect: 'manual' });
      if (response.ok || response.status === 304) {
        return;
      }
    } catch {
      // Keep polling until timeout.
    }

    await delay(500);
  }

  throw new Error(`Timed out waiting for preview server at ${smokeServerUrl}`);
};

const main = async () => {
  registerSignalHandlers();

  try {
    if (shouldStartPreview) {
      await startPreview();
      await waitForServer();
    }

    const browser = await chromium.launch({ headless: true });
    try {
      for (const scenario of scenarios) {
        console.log(`Running smoke checks for ${scenario.name}...`);
        await runScenario(browser, scenario);
      }
    } finally {
      await browser.close();
    }

    console.log('Web smoke checks passed.');
  } finally {
    await cleanupPreview();
  }
};

await main();
