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
    expect(container.textContent).toContain('results_provided_by');
    expect(container.textContent).toContain('5archive.org');
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
    expect(container.querySelector<HTMLInputElement>('input[type="radio"]')?.checked).toBe(true);
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
