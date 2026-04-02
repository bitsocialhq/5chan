import * as React from 'react';
import { createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import CatalogSearch from '../catalog-search';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
const act = (React as { act?: (cb: () => void | Promise<void>) => void | Promise<void> }).act as (cb: () => void | Promise<void>) => void | Promise<void>;

const testState = vi.hoisted(() => ({
  clearSearchFilterMock: vi.fn(),
  debounceCancelMock: vi.fn(),
  isMobile: false,
  location: {
    pathname: '/mu/catalog',
    search: '',
  },
  navigateMock: vi.fn(),
  setSearchFilterMock: vi.fn(),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useLocation: () => testState.location,
    useNavigate: () => testState.navigateMock,
  };
});

vi.mock('../../../hooks/use-is-mobile', () => ({
  default: () => testState.isMobile,
}));

vi.mock('../../../stores/use-catalog-filters-store', () => ({
  default: () => ({
    clearSearchFilter: testState.clearSearchFilterMock,
    setSearchFilter: testState.setSearchFilterMock,
  }),
}));

vi.mock('lodash/debounce', () => ({
  default: <T extends (...args: any[]) => void>(fn: T) => {
    const wrapped = ((...args: Parameters<T>) => fn(...args)) as T & { cancel: () => void };
    wrapped.cancel = () => testState.debounceCancelMock();
    return wrapped;
  },
}));

let container: HTMLDivElement;
let root: Root;

const renderSearch = async () => {
  await act(async () => {
    root.render(createElement(CatalogSearch));
  });
  await act(async () => {
    await Promise.resolve();
  });
};

const clickElement = async (element: Element | null) => {
  expect(element).toBeTruthy();
  await act(async () => {
    element?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
};

const querySearchButton = () => Array.from(container.querySelectorAll('span')).find((node) => node.textContent === 'search') ?? null;
const queryCloseButton = () => Array.from(container.querySelectorAll('span')).find((node) => node.textContent === '✖') ?? null;
const queryInput = () => container.querySelector('input');

const dispatchInput = async (element: HTMLInputElement, value: string) => {
  await act(async () => {
    const descriptor = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value');
    descriptor?.set?.call(element, value);
    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
  });
};

describe('CatalogSearch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    testState.clearSearchFilterMock.mockReset();
    testState.debounceCancelMock.mockReset();
    testState.isMobile = false;
    testState.location = {
      pathname: '/mu/catalog',
      search: '',
    };
    testState.navigateMock.mockReset();
    testState.setSearchFilterMock.mockReset();

    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  it('opens from the query param and seeds the catalog search filter', async () => {
    testState.location = {
      pathname: '/mu/catalog',
      search: '?q=linux',
    };

    await renderSearch();

    expect(testState.setSearchFilterMock).toHaveBeenCalledWith('linux');
    expect(queryInput()).toBeTruthy();
    expect(queryInput()?.getAttribute('value')).toBe('linux');
  });

  it('clears the catalog search filter when navigation removes the query param', async () => {
    testState.location = {
      pathname: '/mu/catalog',
      search: '?q=linux',
    };

    await renderSearch();

    testState.location = {
      pathname: '/mu/catalog',
      search: '',
    };

    await renderSearch();

    expect(testState.clearSearchFilterMock).toHaveBeenCalled();
    expect(queryInput()).toBeNull();
  });

  it('toggles the search UI, updates the filter and URL, and closes via Escape', async () => {
    await renderSearch();

    await clickElement(querySearchButton());
    const input = queryInput();
    expect(input).toBeTruthy();

    if (!input) {
      throw new Error('Expected catalog search input');
    }

    await dispatchInput(input, 'web3');

    expect(testState.setSearchFilterMock).toHaveBeenCalledWith('web3');
    expect(testState.navigateMock).toHaveBeenCalledWith('/mu/catalog?q=web3', { replace: true });

    await act(async () => {
      input.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'Escape' }));
    });

    expect(testState.clearSearchFilterMock).toHaveBeenCalled();
    expect(testState.navigateMock).toHaveBeenLastCalledWith('/mu/catalog', { replace: true });
    expect(queryInput()).toBeNull();
  });

  it('closes through the toggle button and cancels the debounced updater on unmount', async () => {
    testState.isMobile = true;

    await renderSearch();
    await clickElement(querySearchButton());
    expect(queryInput()).toBeTruthy();

    await clickElement(querySearchButton());

    expect(testState.clearSearchFilterMock).toHaveBeenCalled();
    expect(testState.navigateMock).toHaveBeenCalledWith('/mu/catalog', { replace: true });
    expect(queryInput()).toBeNull();

    act(() => root.unmount());
    expect(testState.debounceCancelMock).toHaveBeenCalled();
  });

  it('closes with the explicit close button after typing', async () => {
    await renderSearch();
    await clickElement(querySearchButton());

    const input = queryInput();
    expect(input).toBeTruthy();
    if (!input) {
      throw new Error('Expected catalog search input');
    }

    await dispatchInput(input, 'cats');
    await clickElement(queryCloseButton());

    expect(testState.clearSearchFilterMock).toHaveBeenCalled();
    expect(testState.navigateMock).toHaveBeenLastCalledWith('/mu/catalog', { replace: true });
    expect(queryInput()).toBeNull();
  });
});
