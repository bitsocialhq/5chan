import { afterEach, describe, expect, it, vi } from 'vitest';
import type { TegakiGlobal } from '../tegaki-loader';

const SCRIPT_SELECTOR = 'script[data-tegaki-oekaki="script"]';

const importFreshLoader = async () => {
  vi.resetModules();
  return import('../tegaki-loader');
};

const createTegaki = (): TegakiGlobal => ({
  open: vi.fn(),
  flatten: vi.fn(() => document.createElement('canvas')),
});

describe('loadTegaki', () => {
  afterEach(() => {
    delete window.Tegaki;
    document.head.querySelectorAll('[data-tegaki-oekaki]').forEach((element) => element.remove());
    vi.restoreAllMocks();
  });

  it('rejects immediately when an existing loaded script did not initialize Tegaki', async () => {
    const script = document.createElement('script');
    script.dataset.tegakiOekaki = 'script';
    Object.defineProperty(script, 'readyState', { configurable: true, value: 'complete' });
    document.head.appendChild(script);
    const { loadTegaki } = await importFreshLoader();

    await expect(loadTegaki()).rejects.toThrow('Tegaki did not initialize');
  });

  it('retries after a transient script load failure', async () => {
    const { loadTegaki } = await importFreshLoader();
    const firstLoad = loadTegaki();
    const firstScript = document.querySelector<HTMLScriptElement>(SCRIPT_SELECTOR);
    expect(firstScript).not.toBeNull();

    firstScript?.dispatchEvent(new Event('error'));
    await expect(firstLoad).rejects.toThrow('Failed to load Tegaki');
    expect(document.querySelector(SCRIPT_SELECTOR)).toBeNull();

    const secondLoad = loadTegaki();
    const secondScript = document.querySelector<HTMLScriptElement>(SCRIPT_SELECTOR);
    expect(secondScript).not.toBeNull();
    expect(secondScript).not.toBe(firstScript);

    const tegaki = createTegaki();
    window.Tegaki = tegaki;
    secondScript?.dispatchEvent(new Event('load'));

    await expect(secondLoad).resolves.toBe(tegaki);
  });
});
