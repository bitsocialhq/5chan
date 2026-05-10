import * as React from 'react';
import { createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import CatalogFilters from '../catalog-filters';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
const act = (React as { act?: (cb: () => void | Promise<void>) => void | Promise<void> }).act as (cb: () => void | Promise<void>) => void | Promise<void>;

type FilterItem = {
  color?: string;
  count: number;
  enabled: boolean;
  filteredCids: Set<string>;
  hide: boolean;
  communityCounts: Map<string, number>;
  communityFilteredCids: Map<string, Set<string>>;
  text: string;
  top: boolean;
};

const testState = vi.hoisted(() => ({
  currentCommunityAddress: 'music-posting.eth' as string | null,
  filterItems: [] as FilterItem[],
  resetCountsMock: vi.fn(),
  resetFeedMock: vi.fn(),
  saveAndApplyFiltersMock: vi.fn(),
}));

const createFilterItem = (overrides: Partial<FilterItem> = {}): FilterItem => ({
  color: '',
  count: 0,
  enabled: true,
  filteredCids: new Set<string>(),
  hide: true,
  communityCounts: new Map<string, number>(),
  communityFilteredCids: new Map<string, Set<string>>(),
  text: '',
  top: false,
  ...overrides,
});

function getCatalogFiltersState() {
  return {
    currentCommunityAddress: testState.currentCommunityAddress,
    filterItems: testState.filterItems,
    saveAndApplyFilters: testState.saveAndApplyFiltersMock,
  };
}

function useCatalogFiltersStoreMock<T>(selector?: (state: ReturnType<typeof getCatalogFiltersState>) => T) {
  const state = getCatalogFiltersState();
  return selector ? selector(state) : (state as T);
}

useCatalogFiltersStoreMock.getState = () => ({
  resetCountsForCurrentCommunity: testState.resetCountsMock,
});

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock('../../../stores/use-catalog-filters-store', () => ({
  default: useCatalogFiltersStoreMock,
}));

vi.mock('../../../stores/use-feed-reset-store', () => ({
  default: (selector: (state: { reset: typeof testState.resetFeedMock }) => unknown) =>
    selector({
      reset: testState.resetFeedMock,
    }),
}));

vi.mock('../filters-protip', () => ({
  default: () => createElement('div', { 'data-testid': 'filters-protip' }, 'filters-protip'),
}));

vi.mock('../highlight-color-picker', () => ({
  default: ({ index, item, updateLocalFilterItem }: { index: number; item: FilterItem; updateLocalFilterItem: (index: number, item: FilterItem) => void }) =>
    createElement(
      'button',
      {
        'data-testid': `color-picker-${index}`,
        onClick: () => updateLocalFilterItem(index, { ...item, color: index === 0 ? 'red' : 'blue' }),
        type: 'button',
      },
      item.color || 'pick',
    ),
}));

let container: HTMLDivElement;
let root: Root;

const click = async (element: Element | null) => {
  await act(async () => {
    element?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
};

const dispatchInput = async (element: HTMLInputElement, value: string) => {
  await act(async () => {
    const descriptor = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value');
    descriptor?.set?.call(element, value);
    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
  });
};

const toggleCheckbox = async (element: HTMLInputElement | undefined) => {
  await act(async () => {
    element?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
};

const renderCatalogFilters = () => {
  act(() => {
    root.render(createElement(CatalogFilters));
  });
};

const openModal = async () => {
  const button = Array.from(container.querySelectorAll('[role="button"]')).find((candidate) => candidate.textContent === 'filters');
  await click(button ?? null);
};

const getRows = () => Array.from(container.querySelectorAll('tbody tr'));

const getTextInputs = () => Array.from(container.querySelectorAll<HTMLInputElement>('tbody input[type="text"]'));

describe('CatalogFilters', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
    testState.currentCommunityAddress = 'music-posting.eth';
    testState.filterItems = [
      createFilterItem({
        count: 2,
        communityCounts: new Map([['music-posting.eth', 2]]),
        communityFilteredCids: new Map([['music-posting.eth', new Set(['alpha-cid'])]]),
        text: 'alpha',
      }),
      createFilterItem({
        count: 4,
        hide: false,
        communityCounts: new Map([['music-posting.eth', 4]]),
        communityFilteredCids: new Map([['music-posting.eth', new Set(['beta-cid'])]]),
        text: 'beta',
        top: true,
      }),
    ];
    testState.resetCountsMock.mockReset();
    testState.resetFeedMock.mockReset();
    testState.saveAndApplyFiltersMock.mockReset();
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    vi.useRealTimers();
    act(() => root.unmount());
    container.remove();
  });

  it('opens help, closes help from the overlay, and closes the modal with Escape', async () => {
    renderCatalogFilters();
    await openModal();

    expect(container.textContent).toContain('filter_and_highlights');

    await click(container.querySelector('[title="help"]'));

    expect(container.querySelector('[data-testid="filters-protip"]')?.textContent).toBe('filters-protip');
    expect(container.textContent).toContain('filter_and_highlights_help');

    const overlay = Array.from(container.querySelectorAll('[role="button"]')).find((candidate) => candidate.tagName === 'DIV');
    await click(overlay ?? null);

    expect(container.querySelector('[data-testid="filters-protip"]')).toBeNull();
    expect(container.textContent).toContain('filter_and_highlights');

    await act(async () => {
      document.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'Escape' }));
    });

    expect(container.querySelector('[title="close"]')).toBeNull();
  });

  it('adds a filter row with default empty values', async () => {
    vi.useFakeTimers();
    renderCatalogFilters();
    await openModal();

    expect(getTextInputs()).toHaveLength(2);

    const addButton = Array.from(container.querySelectorAll('button')).find((candidate) => candidate.textContent === 'add');
    await act(async () => {
      addButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      vi.runAllTimers();
    });

    const inputs = getTextInputs();
    expect(inputs).toHaveLength(3);
    expect(inputs[2]?.value).toBe('');

    const addedRowInputs = Array.from(getRows()[2]?.querySelectorAll<HTMLInputElement>('input') ?? []);
    expect(addedRowInputs[0]?.checked).toBe(true);
    expect(addedRowInputs[2]?.checked).toBe(true);
    expect(addedRowInputs[3]?.checked).toBe(false);
  });

  it('reorders, edits, and saves non-empty filters from the form', async () => {
    renderCatalogFilters();
    await openModal();

    expect(container.textContent).toContain('x2');
    expect(container.textContent).toContain('x4');

    const initialRows = getRows();
    const moveUpButton = initialRows[1]?.querySelector('[role="button"]');
    await click(moveUpButton ?? null);

    const reorderedInputs = getTextInputs();
    expect(reorderedInputs[0]?.value).toBe('beta');
    expect(reorderedInputs[1]?.value).toBe('alpha');

    const deleteButton = getRows()[1]?.querySelectorAll('[role="button"]')[1];
    await click(deleteButton ?? null);

    expect(getTextInputs()).toHaveLength(1);

    const firstRow = getRows()[0];
    const firstRowInputs = firstRow ? Array.from(firstRow.querySelectorAll<HTMLInputElement>('input')) : [];
    const enabledCheckbox = firstRowInputs[0];
    const textInput = firstRowInputs[1];
    const hideCheckbox = firstRowInputs[2];
    const topCheckbox = firstRowInputs[3];

    expect(textInput?.value).toBe('beta');

    await toggleCheckbox(enabledCheckbox);
    await click(container.querySelector('[data-testid="color-picker-0"]'));
    await toggleCheckbox(hideCheckbox);
    await toggleCheckbox(topCheckbox);
    await dispatchInput(textInput, 'beta-updated');

    const addButton = Array.from(container.querySelectorAll('button')).find((candidate) => candidate.textContent === 'add');
    await click(addButton ?? null);

    expect(getTextInputs()).toHaveLength(2);

    await act(async () => {
      document.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'Enter' }));
    });
    expect(testState.saveAndApplyFiltersMock).not.toHaveBeenCalled();

    await act(async () => {
      container.querySelector('form')?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    });

    expect(testState.saveAndApplyFiltersMock).toHaveBeenCalledTimes(1);
    const savedFilters = testState.saveAndApplyFiltersMock.mock.calls[0]?.[0] as FilterItem[] | undefined;
    expect(savedFilters).toHaveLength(1);
    expect(savedFilters?.[0]).toMatchObject({
      color: 'red',
      enabled: false,
      hide: true,
      text: 'beta-updated',
      top: false,
    });
    expect(savedFilters?.[0]).not.toHaveProperty('id');
    expect(testState.resetCountsMock).toHaveBeenCalledTimes(1);
    expect(testState.resetFeedMock).toHaveBeenCalledTimes(1);
    expect(container.querySelector('[title="close"]')).toBeNull();
  });
});
