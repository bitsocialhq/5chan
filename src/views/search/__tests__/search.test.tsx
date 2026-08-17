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

const renderRoute = async (entry: string | { pathname: string; search?: string; state?: unknown }) => {
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
            createElement(Route, { path: '/search/catalog', element: createElement(Search) }),
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

  it('renders a matched reply under its thread OP with the regular post components', async () => {
    const query = `hello-${Date.now()}`;
    const matchedReply = {
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
      raw: JSON.stringify({ comment: {}, commentUpdate: { number: 42 } }),
      removed: 0,
      reply_count: 0,
      timestamp: 1_700_000_000,
      title: null,
    };
    const threadPost = { ...matchedReply, cid: 'post-cid', content: 'The thread OP', depth: 0, parent_cid: null, title: 'Thread subject' };
    const fetchMock = vi.fn().mockImplementation((url: string) =>
      Promise.resolve({
        ok: true,
        json: async () => (url.includes('/api/posts/') ? { post: threadPost } : { query, page: 1, limit: 25, total: 1, posts: [matchedReply] }),
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    await renderRoute(`/search?q=${encodeURIComponent(query)}`);

    await vi.waitFor(() => expect(container.textContent).toContain('A preserved reply'));
    // The matched reply is shown inside its thread.
    expect(container.textContent).toContain('The thread OP');
    expect(container.textContent).toContain('Thread subject');
    // Post components render the post number, the archived icon and a board link, like the board views do.
    expect(container.textContent).toContain('Archive Anon');
    expect(container.textContent).toContain('42');
    expect(container.querySelector<HTMLImageElement>('img[title="archived"]')).toBeTruthy();
    expect(container.querySelector<HTMLAnchorElement>('a[href="/mu"]')).toBeTruthy();
    expect(container.querySelector<HTMLAnchorElement>('a[href="/mu/thread/reply-cid"]')).toBeTruthy();
    // The query travels in the router state, not in the provider directory URL.
    expect(container.querySelector<HTMLAnchorElement>('a[href="/search/directory"]')).toBeTruthy();
    // The provider attribution moved to the board header, which this test does not render.
    expect(container.textContent).not.toContain('results_provided_by');
  });

  it('renders a matched thread OP on its own, without its replies', async () => {
    const query = `op-${Date.now()}`;
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        query,
        page: 1,
        limit: 25,
        total: 1,
        posts: [
          {
            archived: 0,
            author_address: null,
            author_name: null,
            cid: 'post-cid',
            community_address: 'music-posting.bso',
            content: 'A preserved thread',
            deleted: 0,
            depth: 0,
            indexed_at: 1_700_000_100,
            parent_cid: null,
            post_cid: 'post-cid',
            removed: 0,
            reply_count: 3,
            timestamp: 1_700_000_000,
            title: null,
          },
        ],
      }),
    });
    vi.stubGlobal('fetch', fetchMock);

    await renderRoute(`/search?q=${encodeURIComponent(query)}`);

    await vi.waitFor(() => expect(container.textContent).toContain('A preserved thread'));
    // Only the search request: an OP match needs no thread lookup.
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('shows the matched threads as catalog tiles, one tile per thread', async () => {
    const query = `catalog-${Date.now()}`;
    const matchedReply = {
      archived: 0,
      author_address: null,
      author_name: null,
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
    };
    const otherReply = { ...matchedReply, cid: 'other-reply-cid', content: 'Another preserved reply' };
    const threadPost = { ...matchedReply, cid: 'post-cid', content: 'The thread OP', depth: 0, parent_cid: null, reply_count: 2, title: 'Thread subject' };
    const fetchMock = vi.fn().mockImplementation((url: string) =>
      Promise.resolve({
        ok: true,
        json: async () => (url.includes('/api/posts/') ? { post: threadPost } : { query, page: 1, limit: 25, total: 2, posts: [matchedReply, otherReply] }),
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    await renderRoute({ pathname: '/search/catalog', search: `?q=${encodeURIComponent(query)}` });

    await vi.waitFor(() => expect(container.textContent).toContain('Thread subject'));
    // Both matches belong to the same thread, so the catalog shows it once.
    expect(container.querySelectorAll('a[href="/mu/thread/post-cid"]').length).toBe(1);
    // The catalog links back to the search results.
    expect(container.querySelector<HTMLAnchorElement>(`a[href="/search?q=${encodeURIComponent(query)}"]`)).toBeTruthy();
  });

  it('does not query the provider until a search term is present', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    await renderRoute('/search');

    expect(fetchMock).not.toHaveBeenCalled();
    expect(container.textContent).toContain('archive_search_subtitle');
  });

  it('lists the current provider in the provider directory and returns to the search it came from', async () => {
    await renderRoute({ pathname: '/search/directory', state: { returnPath: '/search?q=archive' } });

    expect(container.textContent).toContain('5archive.org');
    expect(container.textContent).toContain('current_provider');
    // The selected provider has no [use] action, the way board directories mark their current board.
    expect([...container.querySelectorAll('button')].some((button) => button.textContent === 'use')).toBe(false);
    // It is laid out like the board directories, with their button rows and footer.
    expect([...container.querySelectorAll('button')].some((button) => button.textContent === 'bottom')).toBe(true);
    expect(container.querySelector<HTMLAnchorElement>('a[href="/search?q=archive"]')).toBeTruthy();
  });

  it('returns to the plain search when the provider directory is opened directly', async () => {
    await renderRoute('/search/directory');

    expect(container.querySelector<HTMLAnchorElement>('a[href="/search"]')).toBeTruthy();
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
