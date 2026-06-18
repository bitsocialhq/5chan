import * as React from 'react';
import { createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Rules from '../rules';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
const act = (React as { act?: (cb: () => void | Promise<void>) => void | Promise<void> }).act as (cb: () => void | Promise<void>) => void | Promise<void>;

const testState = vi.hoisted(() => ({
  communities: {} as Record<string, { rules?: string[]; shortAddress?: string; state?: string; title?: string }>,
  directories: [
    { address: 'anime-posting.eth', title: '/a/ - Anime & Manga' },
    { address: 'random-posting.eth', title: '/b/ - Random' },
    { address: 'flash-posting.eth', title: '/f/ - Flash' },
  ] as Array<{ address: string; title?: string; directoryCode?: string }>,
  directoryDefaults: {
    directories: {
      a: { directoryCode: 'a', title: '/a/ - Anime & Manga', rules: ['All anime discussion welcome.'] },
      b: { directoryCode: 'b', title: '/b/ - Random', rules: ['Be excellent to each other.'] },
      f: { directoryCode: 'f', title: '/f/ - Flash', features: { postFlairs: true }, rules: ['Tag your uploads.'] },
    },
  } as { directories: Record<string, { directoryCode?: string; title?: string; rules?: string[]; features?: Record<string, unknown> }> },
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock('@bitsocial/bitsocial-react-hooks', () => ({
  useClientsStates: () => ({
    states: {},
  }),
  useCommunity: (options?: { communityAddress?: string; community?: { name?: string; publicKey?: string } }) => {
    const communityAddress = options?.communityAddress ?? options?.community?.name ?? options?.community?.publicKey;
    return communityAddress ? testState.communities[communityAddress] : undefined;
  },
}));

vi.mock('../../../hooks/use-directories', async () => {
  const actual = await vi.importActual<typeof import('../../../hooks/use-directories')>('../../../hooks/use-directories');
  return {
    ...actual,
    useDirectories: () => testState.directories,
    useDirectoryDefaults: () => testState.directoryDefaults,
  };
});

vi.mock('../../home/home', () => ({
  Footer: () => createElement('div', { 'data-testid': 'footer' }, 'footer'),
  HomeLogo: () => createElement('div', { 'data-testid': 'home-logo' }, 'home-logo'),
}));

vi.mock('../../../components/markdown/markdown', () => ({
  default: ({ content }: { content: string }) => createElement('div', { 'data-testid': 'markdown' }, content),
}));

vi.mock('lodash/debounce', () => ({
  default: <T extends (...args: any[]) => unknown>(fn: T) => {
    const wrapped = ((...args: Parameters<T>) => fn(...args)) as T & { cancel: () => void };
    wrapped.cancel = () => undefined;
    return wrapped;
  },
}));

let container: HTMLDivElement;
let root: Root;
let scrollIntoViewMock: ReturnType<typeof vi.fn>;

const renderRules = async (initialEntry = '/rules') => {
  await act(async () => {
    root.render(createElement(MemoryRouter, { initialEntries: [initialEntry] }, createElement(Rules)));
  });
};

// Set a controlled input's value via the native setter so React's value tracker still fires onChange.
const setInputValue = (input: HTMLInputElement, value: string) => {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
  setter?.call(input, value);
  input.dispatchEvent(new Event('input', { bubbles: true }));
};

const submitBoardAddress = async (address: string) => {
  const input = container.querySelector('input[type="text"]') as HTMLInputElement;
  expect(input).toBeTruthy();
  const form = input.closest('form') as HTMLFormElement;

  await act(async () => {
    setInputValue(input, address);
  });
  await act(async () => {
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
  });
};

describe('Rules', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    testState.communities = {};
    testState.directories = [
      { address: 'anime-posting.eth', title: '/a/ - Anime & Manga' },
      { address: 'random-posting.eth', title: '/b/ - Random' },
      { address: 'flash-posting.eth', title: '/f/ - Flash' },
    ];
    testState.directoryDefaults = {
      directories: {
        a: { directoryCode: 'a', title: '/a/ - Anime & Manga', rules: ['All anime discussion welcome.'] },
        b: { directoryCode: 'b', title: '/b/ - Random', rules: ['Be excellent to each other.'] },
        f: { directoryCode: 'f', title: '/f/ - Flash', features: { postFlairs: true }, rules: ['Tag your uploads.'] },
      },
    };
    window.scrollTo = vi.fn();
    scrollIntoViewMock = vi.fn();
    Element.prototype.scrollIntoView = scrollIntoViewMock as unknown as typeof Element.prototype.scrollIntoView;

    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  it('renders a quick-jump nav link and a rules section for every directory', async () => {
    await renderRules();

    // Quick-jump nav links use the directory name (like 4chan's board list) and point at per-directory hash links.
    expect(container.querySelector('a[href="/rules#a"]')?.textContent).toBe('Anime & Manga');
    expect(container.querySelector('a[href="/rules#b"]')?.textContent).toBe('Random');

    // One anchored rules section per directory.
    expect(container.querySelector('#a')).toBeTruthy();
    expect(container.querySelector('#b')).toBeTruthy();
    expect(container.textContent).toContain('/a/ - Anime & Manga');
    expect(container.textContent).toContain('/b/ - Random');
  });

  it('renders directory rules from the directories JSON without loading any board over P2P', async () => {
    // communities (the P2P source) is empty, yet the rules still render because they come from the defaults JSON.
    await renderRules();

    expect(container.textContent).toContain('All anime discussion welcome.');
    expect(container.textContent).toContain('Be excellent to each other.');
    // The directory rules are not framed as a P2P "Rules for:" board fetch.
    expect(container.textContent).not.toContain('Rules for:');
  });

  it('insta-scrolls to a directory section when deep-linked via /rules#code', async () => {
    await renderRules('/rules#a');

    expect(scrollIntoViewMock).toHaveBeenCalled();
  });

  it('re-scrolls an active directory hash when directory data refreshes', async () => {
    await renderRules('/rules#b');
    expect(scrollIntoViewMock).toHaveBeenCalledTimes(1);

    testState.directories = [{ address: 'animals-posting.eth', title: '/an/ - Animals & Nature', directoryCode: 'an' }, ...testState.directories];
    testState.directoryDefaults = {
      directories: {
        ...testState.directoryDefaults.directories,
        an: { directoryCode: 'an', title: '/an/ - Animals & Nature', rules: ['Keep animal posts on topic.'] },
      },
    };

    await renderRules('/rules#b');

    expect(scrollIntoViewMock).toHaveBeenCalledTimes(2);
  });

  it('ignores address hashes instead of resolving them to directory rules or P2P rules', async () => {
    testState.communities = {
      'anime-posting.eth': {
        rules: ['P2P address rules should not render from a hash.'],
        shortAddress: 'anime-posting.eth',
        state: 'succeeded',
      },
    };

    await renderRules('/rules#anime-posting.eth');

    expect(scrollIntoViewMock).not.toHaveBeenCalled();
    expect(container.textContent).not.toContain('Rules for: anime-posting.eth');
    expect(container.textContent).not.toContain('P2P address rules should not render from a hash.');
  });

  it('loads a board over P2P when an address is submitted in the loader', async () => {
    testState.communities = {
      'custom-board.eth': {
        rules: ['No spamming.'],
        shortAddress: 'custom-board.eth',
        state: 'succeeded',
      },
    };

    await renderRules();
    await submitBoardAddress('custom-board.eth');

    expect(container.textContent).toContain('Rules for: custom-board.eth');
    expect(container.textContent).toContain('No spamming.');
  });

  it('clears a loaded P2P rules box when navigating to a directory hash link', async () => {
    testState.communities = {
      'custom-board.eth': {
        rules: ['No spamming.'],
        shortAddress: 'custom-board.eth',
        state: 'succeeded',
      },
    };

    await renderRules();
    await submitBoardAddress('custom-board.eth');
    expect(container.textContent).toContain('Rules for: custom-board.eth');

    const link = container.querySelector('a[href="/rules#a"]') as HTMLAnchorElement;
    await act(async () => {
      link.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    });

    expect(container.textContent).not.toContain('Rules for: custom-board.eth');
    expect(scrollIntoViewMock).toHaveBeenCalled();
  });

  it('shows a friendly loading state string while a board is downloading via IPFS', async () => {
    testState.communities = {
      'custom-board.eth': {
        state: 'fetching-ipns',
      },
    };

    await renderRules();
    await submitBoardAddress('custom-board.eth');

    expect(container.textContent).toContain('Downloading board via IPFS');
    expect(container.textContent).not.toContain('loading...');
  });

  it('groups directories into Image Boards and Upload Boards with an h3 per directory', async () => {
    await renderRules();

    expect(container.textContent).toContain('Image Boards');
    expect(container.textContent).toContain('Upload Boards');

    const h3Titles = Array.from(container.querySelectorAll('h3')).map((h3) => h3.textContent);
    expect(h3Titles).toContain('/a/ - Anime & Manga');
    expect(h3Titles).toContain('/b/ - Random');
    expect(h3Titles).toContain('/f/ - Flash');
    expect(container.textContent).toContain('Tag your uploads.');
  });

  it('does not scroll bare /rules back to the top when directories refresh', async () => {
    await renderRules();
    expect(window.scrollTo).toHaveBeenCalled();

    vi.mocked(window.scrollTo).mockClear();
    testState.directories = [...testState.directories, { address: 'travel-posting.eth', title: '/trv/ - Travel', directoryCode: 'trv' }];
    testState.directoryDefaults = {
      directories: {
        ...testState.directoryDefaults.directories,
        trv: { directoryCode: 'trv', title: '/trv/ - Travel', rules: ['Stay on topic.'] },
      },
    };

    await renderRules();

    expect(window.scrollTo).not.toHaveBeenCalled();
  });

  it('toggles the loader action to Clear, which removes the loaded rules and empties the input', async () => {
    testState.communities = {
      'custom-board.eth': {
        rules: ['No spamming.'],
        shortAddress: 'custom-board.eth',
        state: 'succeeded',
      },
    };

    await renderRules();
    await submitBoardAddress('custom-board.eth');
    expect(container.textContent).toContain('Rules for: custom-board.eth');

    const clearButton = Array.from(container.querySelectorAll('button')).find((button) => button.textContent === 'Clear');
    expect(clearButton).toBeTruthy();

    await act(async () => {
      clearButton?.click();
    });

    expect(container.textContent).not.toContain('Rules for: custom-board.eth');
    expect((container.querySelector('input[type="text"]') as HTMLInputElement).value).toBe('');
  });
});
