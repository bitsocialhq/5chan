import * as React from 'react';
import { createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Rules from '../rules';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
const act = (React as { act?: (cb: () => void | Promise<void>) => void | Promise<void> }).act as (cb: () => void | Promise<void>) => void | Promise<void>;

const testState = vi.hoisted(() => ({
  boardIdentifier: undefined as string | undefined,
  communities: {} as Record<string, { rules?: string[]; shortAddress?: string; state?: string; title?: string }>,
  directories: [
    { address: 'anime-posting.eth', title: '/a/ - Anime & Manga' },
    { address: 'random-posting.eth', title: '/b/ - Random' },
  ] as Array<{ address: string; title?: string }>,
  navigateMock: vi.fn(),
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
    useNavigate: () => testState.navigateMock,
    useParams: () => ({
      boardIdentifier: testState.boardIdentifier,
    }),
  };
});

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
  };
});

vi.mock('../../home', () => ({
  Footer: () => createElement('div', { 'data-testid': 'footer' }, 'footer'),
  HomeLogo: () => createElement('div', { 'data-testid': 'home-logo' }, 'home-logo'),
}));

vi.mock('../../../components/markdown', () => ({
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

const renderRules = async () => {
  await act(async () => {
    root.render(createElement(Rules));
  });
};

describe('Rules', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    testState.boardIdentifier = undefined;
    testState.communities = {};
    testState.directories = [
      { address: 'anime-posting.eth', title: '/a/ - Anime & Manga' },
      { address: 'random-posting.eth', title: '/b/ - Random' },
    ];
    window.scrollTo = vi.fn();

    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  it('keeps custom-address routes out of the default board select', async () => {
    testState.boardIdentifier = 'custom-board.eth';
    testState.communities = {
      'custom-board.eth': {
        rules: ['No custom options in the select.'],
        shortAddress: 'custom-board.eth',
        state: 'succeeded',
      },
    };

    await renderRules();

    const select = container.querySelector('select');
    expect(select).toBeTruthy();
    expect(select?.value).toBe('');
    expect(Array.from(select?.options ?? []).map((option) => option.value)).toEqual(['', 'anime-posting.eth', 'random-posting.eth']);
    expect(container.textContent).toContain('Rules for: custom-board.eth');
  });

  it('keeps the canonical default board selected for known directories', async () => {
    testState.boardIdentifier = 'a';
    testState.communities = {
      'anime-posting.eth': {
        rules: ['Stay on topic.'],
        state: 'succeeded',
      },
    };

    await renderRules();

    const select = container.querySelector('select');
    expect(select).toBeTruthy();
    expect(select?.value).toBe('anime-posting.eth');
    expect(Array.from(select?.options ?? []).map((option) => option.value)).toEqual(['', 'anime-posting.eth', 'random-posting.eth']);
    expect(container.textContent).toContain('Rules for: /a/ - Anime & Manga');
  });

  it('shows a friendly loading state string while board rules are downloading', async () => {
    testState.boardIdentifier = 'a';
    testState.communities = {
      'anime-posting.eth': {
        state: 'fetching-ipns',
      },
    };

    await renderRules();

    expect(container.textContent).toContain('Downloading board from peers');
    expect(container.textContent).not.toContain('loading...');
  });
});
