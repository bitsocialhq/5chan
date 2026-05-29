import * as React from 'react';
import { createElement } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import SubscriptionsSetting from '../subscriptions-setting';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
const act = (React as { act?: (cb: () => void | Promise<void>) => void | Promise<void> }).act as (cb: () => void | Promise<void>) => void | Promise<void>;

const accountState = vi.hoisted(() => ({
  value: {
    name: 'Account 1',
    subscriptions: ['music-posting.bso'],
  } as { name: string; subscriptions: string[] },
}));

const subscriptionMocks = vi.hoisted(() => ({
  byAddress: new Map<string, { subscribed: boolean; subscribe: ReturnType<typeof vi.fn>; unsubscribe: ReturnType<typeof vi.fn> }>(),
  setAccount: vi.fn(),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock('@bitsocial/bitsocial-react-hooks', () => ({
  useAccount: () => accountState.value,
  useSubscribe: ({ communityAddress }: { communityAddress: string }) =>
    subscriptionMocks.byAddress.get(communityAddress) ?? {
      subscribed: false,
      subscribe: vi.fn(),
      unsubscribe: vi.fn(),
    },
  setAccount: subscriptionMocks.setAccount,
}));

let root: Root;
let container: HTMLDivElement;
let confirmSpy: ReturnType<typeof vi.spyOn>;

const render = () => {
  act(() => {
    root.render(createElement(SubscriptionsSetting));
  });
};

const getButtonByText = (text: string) => {
  const button = Array.from(container.querySelectorAll('button')).find((candidate) => (candidate.textContent ?? '').includes(text));
  if (!button) {
    throw new Error(`Button containing "${text}" not found`);
  }
  return button;
};

describe('SubscriptionsSetting', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    accountState.value = {
      name: 'Account 1',
      subscriptions: ['music-posting.bso'],
    };
    subscriptionMocks.byAddress = new Map();
    subscriptionMocks.setAccount.mockReset();
    confirmSpy = vi.spyOn(window, 'confirm').mockImplementation(() => true);

    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    confirmSpy.mockRestore();
  });

  it('shows the empty-state message when there are no subscriptions', () => {
    accountState.value = {
      name: 'Account 1',
      subscriptions: [],
    };

    render();

    expect(container.textContent).toContain('not_subscribed_to_any_board');
  });

  it('unsubscribes from all boards after confirmation', async () => {
    accountState.value = {
      name: 'Account 1',
      subscriptions: ['music-posting.bso', 'business.eth'],
    };

    render();

    await act(async () => {
      getButtonByText('unsubscribe_all').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(confirmSpy).toHaveBeenCalledWith('unsubscribe_all_confirm');
    expect(subscriptionMocks.setAccount).toHaveBeenCalledWith({
      name: 'Account 1',
      subscriptions: [],
    });
  });

  it('does not unsubscribe from all boards when confirmation is cancelled', async () => {
    confirmSpy.mockReturnValueOnce(false);
    accountState.value = {
      name: 'Account 1',
      subscriptions: ['music-posting.bso', 'business.eth'],
    };

    render();

    await act(async () => {
      getButtonByText('unsubscribe_all').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(subscriptionMocks.setAccount).not.toHaveBeenCalled();
  });

  it('toggles a board subscription with click and keyboard interaction', async () => {
    const subscribe = vi.fn();
    const unsubscribe = vi.fn();
    subscriptionMocks.byAddress.set('music-posting.bso', {
      subscribed: true,
      subscribe,
      unsubscribe,
    });

    render();

    const subscriptionButton = getButtonByText('unsubscribe');
    expect(subscriptionButton.textContent).toContain('unsubscribe');

    await act(async () => {
      subscriptionButton.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(unsubscribe).toHaveBeenCalledOnce();
    expect(subscriptionButton.textContent).toContain('subscribe');

    await act(async () => {
      subscriptionButton.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    });

    expect(subscribe).toHaveBeenCalledOnce();
    expect(subscriptionButton.textContent).toContain('unsubscribe');
  });
});
