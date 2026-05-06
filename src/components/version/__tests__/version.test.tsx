import * as React from 'react';
import { createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
const act = (React as { act?: (cb: () => void | Promise<void>) => void | Promise<void> }).act as (cb: () => void | Promise<void>) => void | Promise<void>;

let root: Root;
let container: HTMLDivElement;

const renderVersion = async ({ commitRef, version }: { commitRef: string; version: string }) => {
  vi.resetModules();
  vi.stubEnv('VITE_APP_VERSION', version);
  vi.stubEnv('VITE_COMMIT_REF', commitRef);
  const { default: Version } = await import('../version');

  await act(async () => {
    root.render(createElement(Version));
  });
};

describe('Version', () => {
  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    vi.unstubAllEnvs();
  });

  it('links only to the release when no unreleased commit is configured', async () => {
    await renderVersion({ commitRef: '', version: '0.8.3' });

    expect(container.textContent).toBe('v0.8.3');
    const links = container.querySelectorAll<HTMLAnchorElement>('a');
    expect(links).toHaveLength(1);
    expect(links[0]?.href).toBe('https://github.com/bitsocialnet/5chan/releases/tag/v0.8.3');
  });

  it('appends a linked short hash for unreleased commits', async () => {
    await renderVersion({ commitRef: '2ebd9ecc30a58a96723f9a71f6ed4beeef1b847b', version: '0.8.3' });

    expect(container.textContent).toBe('v0.8.3#2ebd9ec');
    const links = container.querySelectorAll<HTMLAnchorElement>('a');
    expect(links).toHaveLength(2);
    expect(links[0]?.href).toBe('https://github.com/bitsocialnet/5chan/releases/tag/v0.8.3');
    expect(links[1]?.textContent).toBe('#2ebd9ec');
    expect(links[1]?.href).toBe('https://github.com/bitsocialnet/5chan/commit/2ebd9ecc30a58a96723f9a71f6ed4beeef1b847b');
  });
});
