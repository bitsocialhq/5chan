import * as React from 'react';
import { createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import useSearchProviderStore from '../../../stores/use-search-provider-store';
import Search from '../search';
import SearchDirectory from '../search-directory';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
const act = (React as { act?: (cb: () => void | Promise<void>) => void | Promise<void> }).act as (cb: () => void | Promise<void>) => void | Promise<void>;

const testState = vi.hoisted(() => ({
  directories: [{ address: 'music-posting.bso', directoryCode: 'mu', title: '/mu/ - Music' }],
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, values?: Record<string, unknown>) => (values ? `${key}:${JSON.stringify(values)}` : key),
  }),
}));

vi.mock('../../../hooks/use-directories', async () => {
  const actual = await vi.importActual<typeof import('../../../hooks/use-directories')>('../../../hooks/use-directories');
  return {
    ...actual,
    useDirectories: () => testState.directories,
  };
});

const LocationProbe = () => {
  const location = useLocation();
  return <output data-testid='location'>{location.pathname + location.search}</output>;
};

let container: HTMLDivElement;
let root: Root;

const renderRoute = async (entry: string) => {
  await act(async () => {
    root.render(
      createElement(
        MemoryRouter,
        { initialEntries: [entry] },
        createElement(
          React.Fragment,
          {},
          createElement(
            Routes,
            {},
            createElement(Route, { path: '/search', element: createElement(Search) }),
            createElement(Route, { path: '/search/directory', element: createElement(SearchDirectory) }),
          ),
          createElement(LocationProbe),
        ),
      ),
    );
    await Promise.resolve();
  });
};

describe('archive search', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    useSearchProviderStore.setState({ selectedProviderId: '5archive' });
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    vi.unstubAllGlobals();
  });

  it('renders indexed results and provider attribution from the selected provider', async () => {
    const query = `hello-${Date.now()}`;
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        query,
        page: 1,
        limit: 25,
        total: 1,
        posts: [
          {
            archived: 1,
            author_address: null,
            author_name: 'Archive Anon',
            cid: 'reply-cid',
            community_address: 'music-posting.bso',
            content: 'A preserved reply',
            deleted: 0,
            depth: 1,
            indexed_at: 1_700_000_100,
            parent_cid: 'post-cid',
            post_cid: 'post-cid',
            removed: 0,
            reply_count: 0,
            timestamp: 1_700_000_000,
            title: null,
          },
        ],
      }),
    });
    vi.stubGlobal('fetch', fetchMock);

    await renderRoute(`/search?q=${encodeURIComponent(query)}`);

    await vi.waitFor(() => expect(container.textContent).toContain('A preserved reply'));
    expect(container.textContent).toContain('results_provided_by');
    expect(container.textContent).toContain('5archive.org');
    expect(container.textContent).toContain('archived');
    expect(container.querySelector<HTMLAnchorElement>('a[href="/mu"]')).toBeTruthy();
    expect(container.querySelector<HTMLAnchorElement>('a[href="https://5archive.org/mu/thread/reply-cid"]')).toBeTruthy();
    expect(container.querySelector<HTMLAnchorElement>(`a[href="/search/directory?q=${encodeURIComponent(query)}"]`)).toBeTruthy();
  });

  it('does not query the provider until a search term is present', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    await renderRoute('/search');

    expect(fetchMock).not.toHaveBeenCalled();
    expect(container.textContent).toContain('archive_search_subtitle');
  });

  it('lists the current provider in the provider directory and returns to the query', async () => {
    await renderRoute('/search/directory?q=archive');

    expect(container.textContent).toContain('5archive.org');
    expect(container.textContent).toContain('current_provider');
    expect(container.querySelector<HTMLInputElement>('input[type="radio"]')?.checked).toBe(true);
    expect(container.querySelector<HTMLAnchorElement>('a[href="/search?q=archive"]')).toBeTruthy();
  });

  it('submits a new query into the URL', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ query: 'first', page: 1, limit: 25, total: 0, posts: [] }),
    });
    vi.stubGlobal('fetch', fetchMock);
    await renderRoute('/search?q=first');
    await vi.waitFor(() => expect(container.textContent).toContain('search_no_results'));

    const input = container.querySelector<HTMLInputElement>('input[type="search"]');
    await act(async () => {
      if (input) input.value = 'second query';
      input?.form?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    });

    expect(container.querySelector('[data-testid="location"]')?.textContent).toBe('/search?q=second+query');
  });
});
