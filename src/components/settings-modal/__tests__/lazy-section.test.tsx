import * as React from 'react';
import { createElement, Suspense } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import LazySection, { createSectionLoader } from '../lazy-section';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
const act = (React as { act?: (cb: () => void | Promise<void>) => void | Promise<void> }).act as (cb: () => void | Promise<void>) => void | Promise<void>;

const Section = () => <div data-testid='section'>section</div>;

let root: Root;
let container: HTMLDivElement;

const renderSection = (load: () => Promise<{ default: React.ComponentType }>) =>
  createElement(Suspense, { fallback: createElement('div', { 'data-testid': 'fallback' }) }, createElement(LazySection, { load }));

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

describe('createSectionLoader', () => {
  it('reuses the same import promise', () => {
    let imports = 0;
    const load = createSectionLoader(async () => {
      imports++;
      return { default: Section };
    });

    expect(load()).toBe(load());
    expect(imports).toBe(1);
  });

  it('renders a preloaded section without showing the suspense fallback', async () => {
    const load = createSectionLoader(async () => ({ default: Section }));

    await load();

    // A synchronous render: a section whose chunk is already loaded has to
    // render in the same commit, otherwise expanding it lags behind the click.
    act(() => root.render(renderSection(load)));

    expect(container.querySelector('[data-testid="fallback"]')).toBeNull();
    expect(container.querySelector('[data-testid="section"]')).not.toBeNull();
  });

  it('suspends while the section is still loading', async () => {
    let resolveImport: (module: { default: React.ComponentType }) => void = () => {};
    const load = createSectionLoader(
      () =>
        new Promise<{ default: React.ComponentType }>((resolve) => {
          resolveImport = resolve;
        }),
    );

    await act(async () => {
      root.render(renderSection(load));
    });

    expect(container.querySelector('[data-testid="fallback"]')).not.toBeNull();

    await act(async () => {
      resolveImport({ default: Section });
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(container.querySelector('[data-testid="section"]')).not.toBeNull();
  });
});
