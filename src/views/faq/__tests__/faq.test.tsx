import * as React from 'react';
import { createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import FAQ from '../faq';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
const act = (React as { act?: (cb: () => void | Promise<void>) => void | Promise<void> }).act as (cb: () => void | Promise<void>) => void | Promise<void>;

vi.mock('react-router-hash-link', () => ({
  HashLink: ({ children, to }: { children: React.ReactNode; to: string }) => createElement('a', { href: to }, children),
}));

vi.mock('../../home/home', () => ({
  Footer: () => createElement('div', { 'data-testid': 'footer' }, 'footer'),
  HomeLogo: () => createElement('div', { 'data-testid': 'home-logo' }, 'home-logo'),
}));

let container: HTMLDivElement;
let root: Root;
let scrollIntoViewMock: ReturnType<typeof vi.fn>;

const renderFAQ = async (initialEntry = '/faq') => {
  await act(async () => {
    root.render(createElement(MemoryRouter, { initialEntries: [initialEntry] }, createElement(FAQ)));
  });
};

describe('FAQ', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.scrollTo = vi.fn();
    scrollIntoViewMock = vi.fn();
    Element.prototype.scrollIntoView = scrollIntoViewMock as unknown as typeof Element.prototype.scrollIntoView;
    document.title = 'before';

    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  it('scrolls to the FAQ hash target on direct hash routes', async () => {
    await renderFAQ('/faq#sage');

    const sageQuestion = document.getElementById('sage');
    expect(sageQuestion?.textContent).toBe('What is "sage"?');
    expect(scrollIntoViewMock).toHaveBeenCalledTimes(1);
    expect(scrollIntoViewMock.mock.contexts[0]).toBe(sageQuestion);
    expect(window.scrollTo).not.toHaveBeenCalled();
    expect(document.title).toBe('FAQ - 5chan');
  });

  it('scrolls to the top when there is no FAQ hash target', async () => {
    await renderFAQ();

    expect(scrollIntoViewMock).not.toHaveBeenCalled();
    expect(window.scrollTo).toHaveBeenCalledWith(0, 0);
    expect(document.title).toBe('FAQ - 5chan');
  });
});
