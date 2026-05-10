import * as React from 'react';
import { createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import BoardsBarEditModal from '../boards-bar-edit-modal';
import useBoardsBarEditModalStore from '../../../stores/use-boards-bar-edit-modal-store';
import useBoardsBarVisibilityStore from '../../../stores/use-boards-bar-visibility-store';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
const act = (React as { act?: (cb: () => void | Promise<void>) => void | Promise<void> }).act as (cb: () => void | Promise<void>) => void | Promise<void>;

vi.mock('@bitsocial/bitsocial-react-hooks', () => ({
  useAccount: () => ({
    subscriptions: ['custom.eth'],
  }),
}));

let container: HTMLDivElement;
let root: Root;

const renderModal = async () => {
  await act(async () => {
    root.render(createElement(MemoryRouter, { initialEntries: ['/tv/catalog'] }, createElement(BoardsBarEditModal)));
  });
};

describe('BoardsBarEditModal', () => {
  beforeEach(() => {
    localStorage.clear();
    useBoardsBarEditModalStore.setState({ showModal: true });
    useBoardsBarVisibilityStore.setState({
      visibleDirectories: new Set(['tv']),
      showSubscriptionsInBoardsBar: false,
    });

    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    useBoardsBarEditModalStore.setState({ showModal: false });
    localStorage.clear();
  });

  it('keeps the modal open when typing spaces in the directory input', async () => {
    await renderModal();

    const input = container.querySelector<HTMLInputElement>('input[aria-label="Directory codes"]');
    expect(input).toBeTruthy();

    await act(async () => {
      input?.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }));
    });

    expect(container.querySelector('[role="dialog"]')).toBeTruthy();
    expect(useBoardsBarEditModalStore.getState().showModal).toBe(true);
  });

  it('still closes when the backdrop itself handles keyboard activation', async () => {
    await renderModal();

    const backdrop = container.querySelector<HTMLElement>('[role="button"]');
    expect(backdrop).toBeTruthy();

    await act(async () => {
      backdrop?.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }));
    });

    expect(useBoardsBarEditModalStore.getState().showModal).toBe(false);
  });
});
