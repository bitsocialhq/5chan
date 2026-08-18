import * as React from 'react';
import { createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MissingFetchError, type PubsubVoterOptions } from '@bitsocial/pubsub-voting';
import { createInMemoryPubsubVoter, usePubsubVoter } from '../use-pubsub-voter';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
const act = (React as { act?: (cb: () => void | Promise<void>) => void | Promise<void> }).act as (cb: () => void | Promise<void>) => void | Promise<void>;

const testState = vi.hoisted(() => ({
  account: undefined as Record<string, unknown> | undefined,
}));

vi.mock('@bitsocial/bitsocial-react-hooks', () => ({
  useAccount: () => testState.account,
}));

const createHeliaNode = (includeFetch = true) =>
  ({
    libp2p: {
      services: {
        pubsub: {
          publish: vi.fn(),
          subscribe: vi.fn(),
          unsubscribe: vi.fn(),
        },
        fetch: includeFetch
          ? {
              fetch: vi.fn(),
              registerLookupFunction: vi.fn(),
              unregisterLookupFunction: vi.fn(),
            }
          : undefined,
      },
    },
    blockstore: {
      get: vi.fn(),
      put: vi.fn(),
      has: vi.fn(),
    },
  }) as unknown as PubsubVoterOptions['helia'];

const TestComponent = () => {
  const voter = usePubsubVoter();
  return createElement('output', { 'data-state': voter.state }, voter.error?.name);
};

let container: HTMLDivElement;
let root: Root;

const renderHook = async () => {
  await act(async () => {
    root.render(createElement(TestComponent));
    await Promise.resolve();
  });
};

describe('usePubsubVoter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    testState.account = undefined;
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  it('constructs an in-memory voter from the public pkc heliaNode seam', async () => {
    const voter = createInMemoryPubsubVoter(createHeliaNode());

    await expect(voter.destroy()).resolves.toBeUndefined();
  });

  it('reports unavailable when the account has no browser libp2p client', async () => {
    testState.account = { pkc: { clients: {} } };

    await renderHook();

    expect(container.querySelector('output')?.getAttribute('data-state')).toBe('unavailable');
  });

  it('constructs against the account libp2pjs client', async () => {
    testState.account = {
      pkc: {
        clients: {
          libp2pJsClients: {
            libp2pjs: { heliaNode: createHeliaNode() },
          },
        },
      },
    };

    await renderHook();

    expect(container.querySelector('output')?.getAttribute('data-state')).toBe('ready');
  });

  it('surfaces a malformed shared node as a construction failure', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    testState.account = {
      pkc: {
        clients: {
          libp2pJsClients: {
            libp2pjs: { heliaNode: createHeliaNode(false) },
          },
        },
      },
    };

    await renderHook();

    expect(container.querySelector('output')?.getAttribute('data-state')).toBe('failed');
    expect(container.querySelector('output')?.textContent).toBe(MissingFetchError.name);
    expect(consoleError).toHaveBeenCalledWith('Failed to construct pubsub voter', expect.any(MissingFetchError));
    consoleError.mockRestore();
  });
});
