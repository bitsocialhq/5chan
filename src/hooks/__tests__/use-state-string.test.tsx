import * as React from 'react';
import { createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import useStateString, { useFeedStateString } from '../use-state-string';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
const act = (React as { act?: (cb: () => void | Promise<void>) => void | Promise<void> }).act as (cb: () => void | Promise<void>) => void | Promise<void>;

const testState = vi.hoisted(() => ({
  clientsStates: {} as Record<string, string[]>,
  community: undefined as
    | {
        publishingState?: string;
        state?: string;
        updatingState?: string;
      }
    | undefined,
  communitiesStates: {} as Record<string, { clientUrls: string[]; communityAddresses: string[] }>,
}));

vi.mock('@bitsocial/bitsocial-react-hooks', () => ({
  useClientsStates: () => ({
    states: testState.clientsStates,
  }),
  useCommunity: () => testState.community,
  useCommunitiesStates: () => ({
    states: testState.communitiesStates,
  }),
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
let latestValue: string | undefined;

const StateStringHarness = ({
  value,
}: {
  value: {
    publishingState?: string;
    state?: string;
    updatingState?: string;
  };
}) => {
  latestValue = useStateString(value);
  return null;
};

const FeedStateStringHarness = ({ addresses }: { addresses?: string[] }) => {
  latestValue = useFeedStateString(addresses);
  return null;
};

describe('use-state-string', () => {
  beforeEach(() => {
    latestValue = undefined;
    localStorage.removeItem('5chan:pure-p2p-browser-enabled');
    testState.clientsStates = {};
    testState.community = undefined;
    testState.communitiesStates = {};
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  it('formats client state strings with friendly names and via IPFS', () => {
    testState.clientsStates = {
      'fetching-ipns': ['https://rpc.example.com/path', 'https://ipfs.io/api'],
      'resolving-address': ['https://ens.example.com'],
    };

    act(() => {
      root.render(createElement(StateStringHarness, { value: { state: 'updating' } }));
    });

    expect(latestValue).toBe('Resolving address, downloading board via IPFS');
  });

  it('formats browser libp2p client state strings as peer downloads', () => {
    testState.clientsStates = {
      'fetching-ipns': ['libp2pjs'],
      'resolving-address': ['https://ens.example.com'],
    };

    act(() => {
      root.render(createElement(StateStringHarness, { value: { state: 'updating' } }));
    });

    expect(latestValue).toBe('Resolving address, downloading board from peers');
  });

  it('formats browser p2p fallback publishing states as peer downloads when pure p2p is enabled', () => {
    localStorage.setItem('5chan:pure-p2p-browser-enabled', 'true');

    act(() => {
      root.render(createElement(StateStringHarness, { value: { publishingState: 'fetching-ipfs', state: 'publishing' } }));
    });

    expect(latestValue).toBe('Downloading thread from peers');
  });

  it('falls back to publishing and updating states when no client states are available', () => {
    localStorage.setItem('5chan:pure-p2p-browser-enabled', 'false');

    act(() => {
      root.render(createElement(StateStringHarness, { value: { publishingState: 'fetching-ipfs', state: 'publishing' } }));
    });
    expect(latestValue).toBe('Downloading thread via IPFS');

    act(() => {
      root.render(createElement(StateStringHarness, { value: { state: 'updating', updatingState: 'fetching-ipns' } }));
    });
    expect(latestValue).toBe('Downloading board via IPFS');

    act(() => {
      root.render(createElement(StateStringHarness, { value: { publishingState: 'fetching-ipfs' } }));
    });
    expect(latestValue).toBe('Downloading thread via IPFS');
  });

  it('formats raw community loading states when no client or update states are available', () => {
    localStorage.setItem('5chan:pure-p2p-browser-enabled', 'false');
    testState.community = {
      state: 'fetching-community-ipfs',
    };

    act(() => {
      root.render(createElement(FeedStateStringHarness, { addresses: ['music-posting.eth'] }));
    });

    expect(latestValue).toBe('Downloading board via IPFS');
  });

  it('formats browser p2p single-board feed fallback states as peer downloads when pure p2p is enabled', () => {
    localStorage.setItem('5chan:pure-p2p-browser-enabled', 'true');
    testState.community = {
      state: 'updating',
      updatingState: 'fetching-ipfs',
    };

    act(() => {
      root.render(createElement(FeedStateStringHarness, { addresses: ['music-posting.eth'] }));
    });

    expect(latestValue).toBe('Downloading board from peers');
  });

  it('sanitizes single-board feed state strings to board wording', () => {
    localStorage.setItem('5chan:pure-p2p-browser-enabled', 'false');
    testState.community = {
      state: 'updating',
      updatingState: 'fetching-ipfs',
    };

    act(() => {
      root.render(createElement(FeedStateStringHarness, { addresses: ['music-posting.eth'] }));
    });

    expect(latestValue).toBe('Downloading board via IPFS');
  });

  it('formats single-board initializing feed states as board loading copy', () => {
    testState.community = {
      state: 'initializing',
    };

    act(() => {
      root.render(createElement(FeedStateStringHarness, { addresses: ['music-posting.eth'] }));
    });

    expect(latestValue).toBe('Loading board');
  });

  it('keeps multi-board feeds on multi-board loading copy while the single community hook initializes', () => {
    testState.community = {
      state: 'initializing',
    };

    act(() => {
      root.render(createElement(FeedStateStringHarness, { addresses: ['music-posting.eth', 'tech-posting.eth'] }));
    });

    expect(latestValue).toBe('Downloading 2 boards (music-posting.eth, tech-posting.eth)');
  });

  it('aggregates multi-board feed states across address resolution, threads, and pages', () => {
    testState.communitiesStates = {
      'fetching-ipfs': {
        clientUrls: ['https://ipfs.io'],
        communityAddresses: ['music-posting.eth'],
      },
      'fetching-ipns': {
        clientUrls: ['https://gateway.example.com'],
        communityAddresses: ['music-posting.eth', 'tech-posting.eth'],
      },
      'page-1': {
        clientUrls: ['https://gateway.example.com', 'https://ipfs.io'],
        communityAddresses: ['music-posting.eth'],
      },
      'resolving-address': {
        clientUrls: ['https://ens.example.com'],
        communityAddresses: ['music-posting.eth', 'tech-posting.eth'],
      },
    };

    act(() => {
      root.render(createElement(FeedStateStringHarness, { addresses: ['music-posting.eth', 'tech-posting.eth'] }));
    });

    expect(latestValue).toBe('Resolving 2 board addresses, downloading 2 boards (music-posting.eth, tech-posting.eth), 1 thread, 1 page via IPFS');
  });

  it('aggregates browser libp2p feed states as peer downloads', () => {
    testState.communitiesStates = {
      'fetching-ipfs': {
        clientUrls: ['libp2pjs'],
        communityAddresses: ['music-posting.eth'],
      },
      'fetching-ipns': {
        clientUrls: ['libp2pjs'],
        communityAddresses: ['music-posting.eth', 'tech-posting.eth'],
      },
      'page-1': {
        clientUrls: ['libp2pjs'],
        communityAddresses: ['music-posting.eth'],
      },
    };

    act(() => {
      root.render(createElement(FeedStateStringHarness, { addresses: ['music-posting.eth', 'tech-posting.eth'] }));
    });

    expect(latestValue).toBe('Downloading 2 boards (music-posting.eth, tech-posting.eth), 1 thread, 1 page from peers');
  });

  it('shows an immediate board-specific loading string before detailed multi-board states arrive', () => {
    act(() => {
      root.render(createElement(FeedStateStringHarness, { addresses: ['music-posting.eth', 'tech-posting.eth'] }));
    });

    expect(latestValue).toBe('Downloading 2 boards (music-posting.eth, tech-posting.eth)');
  });

  it('shortens long hash addresses in board list using getShortAddress', () => {
    const longAddr1 = 'AdnytMQQMvAkG3XbzoVyAE6YLmHuG3UDigUC';
    const longAddr2 = 'NFgjQWX2EUEsZbzoVyAE6YLmHuG3UDigUCxx';

    act(() => {
      root.render(createElement(FeedStateStringHarness, { addresses: [longAddr1, longAddr2] }));
    });

    expect(latestValue).toBe('Downloading 2 boards (MvAkG3XbzoVy, EUEsZbzoVyAE)');
  });
});
