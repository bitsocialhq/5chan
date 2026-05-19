import * as React from 'react';
import { createElement } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import CryptoAddressSetting from '../crypto-address-setting';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
const act = (React as { act?: (cb: () => void | Promise<void>) => void | Promise<void> }).act as (cb: () => void | Promise<void>) => void | Promise<void>;

const SIGNER_ADDRESS = '12D3KooWSignerPublicKey';

const hookMocks = vi.hoisted(() => ({
  setAccount: vi.fn(),
  useAccount: vi.fn(),
  useResolvedAuthorAddress: vi.fn(),
}));

const TestedCryptoAddressSetting = ((CryptoAddressSetting as unknown as { type?: React.ComponentType }).type ??
  (CryptoAddressSetting as unknown as React.ComponentType)) as React.ComponentType;

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) =>
      (
        ({
          check: 'check',
          crypto_address_not_resolved: 'Crypto address is not resolved yet.',
          crypto_address_not_yours: 'Crypto address is not yours.',
          crypto_address_verification: 'if the crypto address is resolved p2p',
          crypto_address_yours: 'Crypto address belongs to this account.',
          enter_crypto_address: 'Please enter a valid crypto address.',
          loading: 'loading',
          save: 'save',
          saved: 'saved',
        }) as Record<string, string>
      )[key] ?? key,
  }),
}));

vi.mock('@bitsocial/bitsocial-react-hooks', () => ({
  setAccount: hookMocks.setAccount,
  useAccount: hookMocks.useAccount,
  useResolvedAuthorAddress: hookMocks.useResolvedAuthorAddress,
}));

let root: Root;
let container: HTMLDivElement;
let alertSpy: ReturnType<typeof vi.spyOn>;
let lastResolveOptions: unknown;
let resolvedAuthorState: {
  chainProvider?: { urls?: string[] };
  error?: unknown;
  resolvedAddress?: string | null;
  state?: string;
};

const render = async () => {
  await act(async () => {
    root.render(createElement(TestedCryptoAddressSetting));
    await Promise.resolve();
  });
};

const rerender = render;

const getInput = () => {
  const input = container.querySelector('input[placeholder="myaddress.bso"]') as HTMLInputElement | null;
  if (!input) {
    throw new Error('crypto address input not found');
  }
  return input;
};

const getButtonByText = (text: string) => {
  const button = Array.from(container.querySelectorAll('button')).find((candidate) => (candidate.textContent ?? '').trim() === text);
  if (!button) {
    throw new Error(`button "${text}" not found`);
  }
  return button as HTMLButtonElement;
};

const setInputValue = async (value: string) => {
  await act(async () => {
    const input = getInput();
    const valueSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
    if (!valueSetter) {
      throw new Error('input value setter not found');
    }
    valueSetter.call(input, value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await Promise.resolve();
  });
};

describe('CryptoAddressSetting', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();

    resolvedAuthorState = {
      chainProvider: undefined,
      error: undefined,
      resolvedAddress: undefined,
      state: 'initializing',
    };
    lastResolveOptions = undefined;

    hookMocks.useAccount.mockReturnValue({
      author: {
        address: 'legacy-name.eth',
        shortAddress: 'legacy-name.eth',
      },
      signer: {
        address: SIGNER_ADDRESS,
      },
    });
    hookMocks.setAccount.mockResolvedValue({});
    hookMocks.useResolvedAuthorAddress.mockImplementation((options: unknown) => {
      lastResolveOptions = options;
      return resolvedAuthorState;
    });

    alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => undefined);
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => {
      vi.runOnlyPendingTimers();
      root.unmount();
    });
    container.remove();
    alertSpy.mockRestore();
    vi.useRealTimers();
  });

  it('uses the full author address as the initial field value', async () => {
    hookMocks.useAccount.mockReturnValue({
      author: {
        address: 'resolved-alias.eth',
        shortAddress: 'different-short-address',
      },
      signer: {
        address: SIGNER_ADDRESS,
      },
    });

    await render();

    expect(getInput().value).toBe('resolved-alias.eth');
  });

  it('shows a transient validation message when check is clicked with an empty field', async () => {
    hookMocks.useAccount.mockReturnValue({
      author: {
        address: '12D3KooWSignerPublicKey',
        shortAddress: '12D3KooWSignerPublicKey',
      },
      signer: {
        address: SIGNER_ADDRESS,
      },
    });

    await render();

    await act(async () => {
      getButtonByText('check').click();
    });

    expect(container.textContent).toContain('Please enter a valid crypto address.');
    expect(alertSpy).not.toHaveBeenCalled();

    await act(async () => {
      vi.advanceTimersByTime(2000);
    });

    expect(container.textContent).toContain('if the crypto address is resolved p2p');
    expect(container.textContent).not.toContain('Please enter a valid crypto address.');
  });

  it('updates the displayed status after async resolution completes', async () => {
    await render();

    await setInputValue('music-posting.bso');

    expect(container.textContent).toContain('if the crypto address is resolved p2p');

    await act(async () => {
      getButtonByText('check').click();
    });

    expect(container.textContent).toContain('loading');
    expect((lastResolveOptions as { author?: { address?: string } } | undefined)?.author?.address).toBe('music-posting.bso');

    resolvedAuthorState = {
      ...resolvedAuthorState,
      resolvedAddress: null,
      state: 'succeeded',
    };

    await rerender();

    expect(container.textContent).toContain('Crypto address is not resolved yet.');
  });

  it('saves a verified alias when it resolves to the signer address', async () => {
    await render();

    await setInputValue('resolved-name.bso');

    await act(async () => {
      getButtonByText('check').click();
    });

    resolvedAuthorState = {
      ...resolvedAuthorState,
      resolvedAddress: SIGNER_ADDRESS,
      state: 'succeeded',
    };

    await rerender();

    await act(async () => {
      getButtonByText('save').click();
      await Promise.resolve();
    });

    expect(hookMocks.setAccount).toHaveBeenCalledWith(
      expect.objectContaining({
        author: expect.objectContaining({
          address: 'resolved-name.bso',
        }),
      }),
    );
    expect(container.textContent).toContain('saved');
    expect(getInput().value).toBe('resolved-name.bso');
    expect(alertSpy).not.toHaveBeenCalled();
  });
});
