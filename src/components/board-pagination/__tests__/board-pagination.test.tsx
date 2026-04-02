import * as React from 'react';
import { createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import BoardPagination from '../board-pagination';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
const act = (React as { act?: (cb: () => void | Promise<void>) => void | Promise<void> }).act as (cb: () => void | Promise<void>) => void | Promise<void>;

const testState = vi.hoisted(() => ({
  enableInfiniteScroll: false,
  navigateMock: vi.fn(),
  setEnableInfiniteScrollMock: vi.fn(),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, values?: Record<string, unknown>) => (values?.page ? `${key}:${values.page}` : key),
  }),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => testState.navigateMock,
  };
});

vi.mock('../../../stores/use-feed-view-settings-store', () => ({
  default: (selector: (state: { enableInfiniteScroll: boolean; setEnableInfiniteScroll: typeof testState.setEnableInfiniteScrollMock }) => unknown) =>
    selector({
      enableInfiniteScroll: testState.enableInfiniteScroll,
      setEnableInfiniteScroll: testState.setEnableInfiniteScrollMock,
    }),
}));

vi.mock('../../style-selector/style-selector', () => ({
  default: () => createElement('div', { 'data-testid': 'style-selector' }, 'style-selector'),
}));

let container: HTMLDivElement;
let root: Root;

const renderPagination = (element: React.ReactElement) => {
  act(() => {
    root.render(createElement(MemoryRouter, {}, element));
  });
};

describe('BoardPagination', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    testState.enableInfiniteScroll = false;

    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  it('renders standard pagination links and previous or next navigation controls', async () => {
    renderPagination(createElement(BoardPagination, { basePath: '/mu', currentPage: 2, totalPages: 3 }));

    const pageLinks = Array.from(container.querySelectorAll('a'));
    expect(pageLinks.map((link) => link.textContent)).toEqual(['1', '3']);
    expect(pageLinks[0]?.getAttribute('href')).toBe('/mu');
    expect(pageLinks[1]?.getAttribute('href')).toBe('/mu/3');
    expect(container.querySelector('[aria-current="page"]')?.textContent).toBe('2');

    await act(async () => {
      const buttons = Array.from(container.querySelectorAll('button'));
      buttons[0]?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      buttons[1]?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(testState.navigateMock).toHaveBeenNthCalledWith(1, { pathname: '/mu', search: '' });
    expect(testState.navigateMock).toHaveBeenNthCalledWith(2, { pathname: '/mu/3', search: '' });
  });

  it('shows the footer pagelist, catalog links, and enables infinite scroll from the all shortcut', async () => {
    renderPagination(createElement(BoardPagination, { basePath: '/mu', currentPage: 1, footerStyle: true, totalPages: 3 }));

    expect(container.querySelector('[data-testid="style-selector"]')?.textContent).toBe('style-selector');
    expect(container.textContent).toContain('catalog');
    expect(container.textContent).toContain('archive');

    const allLink = Array.from(container.querySelectorAll<HTMLElement>('[role="button"]')).find((element) => element.textContent === 'all');
    expect(allLink).toBeTruthy();

    await act(async () => {
      allLink?.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'Enter' }));
    });

    expect(testState.setEnableInfiniteScrollMock).toHaveBeenCalledWith(true);

    await act(async () => {
      const nextButton = Array.from(container.querySelectorAll('button')).find((button) => button.textContent === 'next');
      nextButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(testState.navigateMock).toHaveBeenCalledWith({ pathname: '/mu/2', search: '' });
  });

  it('hides the footer pagelist for multiboards or when infinite scroll is already enabled', () => {
    testState.enableInfiniteScroll = true;
    renderPagination(createElement(BoardPagination, { basePath: '/all', currentPage: 1, footerStyle: true, isMultiboard: true, totalPages: 5 }));

    expect(container.querySelector('[data-testid="style-selector"]')).toBeTruthy();
    expect(container.textContent).not.toContain('catalog');
    expect(container.textContent).not.toContain('archive');
  });

  it('returns nothing for single-page non-footer pagination', () => {
    renderPagination(createElement(BoardPagination, { basePath: '/mu', currentPage: 1, totalPages: 1 }));

    expect(container.textContent).toBe('');
  });
});
