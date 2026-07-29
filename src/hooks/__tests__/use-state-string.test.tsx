import * as React from 'react';
import { createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { communitiesStore } from '../../lib/bitsocial-internals/stores';
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
}));

vi.mock('@bitsocial/bitsocial-react-hooks', () => ({
  useClientsStates: () => ({
    states: testState.clientsStates,
  }),
  useCommunity: () => testState.community,
}));

vi.mock('../use-community-identifiers', () => ({
  useCommunityIdentifiers: (addresses?: string[]) => (addresses ?? []).map((address) => (address.includes('.') ? { name: address } : { publicKey: address })),
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
let feedHarnessRenderCount: number;

const createLoadingCommunity = ({
  address,
  state,
  clientUrls,
  pageClientUrls = [],
}: {
  address: string;
  state: string;
  clientUrls: string[];
  pageClientUrls?: string[];
}) => ({
  address,
  clients: {
    ipfsGateways: Object.fromEntries(clientUrls.map((clientUrl) => [clientUrl, { state }])),
  },
  posts: {
    clients: {
      ipfsGateways: {
        hot: Object.fromEntries(pageClientUrls.map((clientUrl) => [clientUrl, { state: 'fetching-ipfs' }])),
      },
    },
  },
  updatingState: state,
});

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
  feedHarnessRenderCount += 1;
  latestValue = useFeedStateString(addresses);
  return null;
};

describe('use-state-string', () => {
  beforeEach(() => {
    latestValue = undefined;
    localStorage.removeItem('5chan:pure-p2p-browser-enabled');
    testState.clientsStates = {};
    testState.community = undefined;
    communitiesStore.setState({ communities: {} });
    feedHarnessRenderCount = 0;
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
    const addresses = ['music-posting.eth', 'tech-posting.eth', 'video-posting.eth', 'finance-posting.eth', 'photo-posting.eth'];
    communitiesStore.setState({
      communities: {
        'music-posting.eth': createLoadingCommunity({
          address: 'music-posting.eth',
          state: 'fetching-ipns',
          clientUrls: ['https://gateway.example.com'],
          pageClientUrls: ['https://ipfs.io'],
        }),
        'tech-posting.eth': createLoadingCommunity({
          address: 'tech-posting.eth',
          state: 'fetching-ipns',
          clientUrls: ['https://gateway.example.com'],
        }),
        'video-posting.eth': createLoadingCommunity({
          address: 'video-posting.eth',
          state: 'fetching-ipfs',
          clientUrls: ['https://ipfs.io'],
        }),
        'finance-posting.eth': createLoadingCommunity({
          address: 'finance-posting.eth',
          state: 'resolving-address',
          clientUrls: ['https://ens.example.com'],
        }),
        'photo-posting.eth': createLoadingCommunity({
          address: 'photo-posting.eth',
          state: 'resolving-address',
          clientUrls: ['https://ens.example.com'],
        }),
      },
    });

    act(() => {
      root.render(createElement(FeedStateStringHarness, { addresses }));
    });

    expect(latestValue).toBe('Resolving 2 board addresses, downloading 2 boards (music-posting.eth, tech-posting.eth), 1 thread, 1 page via IPFS');
  });

  it('aggregates browser libp2p feed states as peer downloads', () => {
    const addresses = ['music-posting.eth', 'tech-posting.eth', 'video-posting.eth'];
    communitiesStore.setState({
      communities: {
        'music-posting.eth': createLoadingCommunity({
          address: 'music-posting.eth',
          state: 'fetching-ipns',
          clientUrls: ['libp2pjs'],
          pageClientUrls: ['libp2pjs'],
        }),
        'tech-posting.eth': createLoadingCommunity({
          address: 'tech-posting.eth',
          state: 'fetching-ipns',
          clientUrls: ['libp2pjs'],
        }),
        'video-posting.eth': createLoadingCommunity({
          address: 'video-posting.eth',
          state: 'fetching-ipfs',
          clientUrls: ['libp2pjs'],
        }),
      },
    });

    act(() => {
      root.render(createElement(FeedStateStringHarness, { addresses }));
    });

    expect(latestValue).toBe('Downloading 2 boards (music-posting.eth, tech-posting.eth), 1 thread, 1 page from peers');
  });

  it('does not rerender when raw community state changes preserve the loading text', () => {
    const addresses = ['music-posting.eth', 'tech-posting.eth'];

    act(() => {
      root.render(createElement(FeedStateStringHarness, { addresses }));
    });

    expect(latestValue).toBe('Downloading 2 boards (music-posting.eth, tech-posting.eth)');
    expect(feedHarnessRenderCount).toBe(1);

    act(() => {
      communitiesStore.setState({
        communities: {
          'music-posting.eth': createLoadingCommunity({
            address: 'music-posting.eth',
            state: 'initializing',
            clientUrls: [],
          }),
        },
      });
    });

    expect(latestValue).toBe('Downloading 2 boards (music-posting.eth, tech-posting.eth)');
    expect(feedHarnessRenderCount).toBe(1);

    act(() => {
      communitiesStore.setState({
        communities: {
          'music-posting.eth': createLoadingCommunity({
            address: 'music-posting.eth',
            state: 'fetching-ipns',
            clientUrls: ['https://gateway.example.com'],
          }),
        },
      });
    });

    expect(latestValue).toBe('Downloading 1 board (music-posting.eth) via IPFS');
    expect(feedHarnessRenderCount).toBe(2);
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
