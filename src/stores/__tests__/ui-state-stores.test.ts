import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('ui state stores', () => {
  beforeEach(() => {
    vi.resetModules();
    localStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('useBoardsBarEditModalStore opens and closes the modal', async () => {
    const store = (await import('../use-boards-bar-edit-modal-store')).default;

    expect(store.getState().showModal).toBe(false);

    store.getState().openBoardsBarEditModal();
    expect(store.getState().showModal).toBe(true);

    store.getState().closeBoardsBarEditModal();
    expect(store.getState().showModal).toBe(false);
  });

  it('useSelectedTextStore sets and resets selected text', async () => {
    const store = (await import('../use-selected-text-store')).default;

    store.getState().setSelectedText('>quoted line');
    expect(store.getState().selectedText).toBe('>quoted line');

    store.getState().resetSelectedText();
    expect(store.getState().selectedText).toBe('');
  });

  it('useExpandedMediaStore persists expanded media preferences', async () => {
    const store = (await import('../use-expanded-media-store')).default;

    expect(store.getState().fitExpandedImagesToScreen).toBe(false);
    expect(store.getState().unmuteExpandedVideoSound).toBe(false);

    store.getState().setFitExpandedImagesToScreen(true);
    store.getState().setUnmuteExpandedVideoSound(true);

    expect(store.getState().fitExpandedImagesToScreen).toBe(true);
    expect(store.getState().unmuteExpandedVideoSound).toBe(true);
    expect(localStorage.getItem('expanded-media-store')).toContain('fitExpandedImagesToScreen');
    expect(localStorage.getItem('expanded-media-store')).toContain('unmuteExpandedVideoSound');
  });

  it('useSubplebbitOfflineStore merges updates and clears initialLoad after the timeout', async () => {
    vi.useFakeTimers();

    const store = (await import('../use-subplebbit-offline-store')).default;

    store.getState().initializesubplebbitOfflineState('music-posting.eth');
    expect(store.getState().subplebbitOfflineState['music-posting.eth']).toEqual({ initialLoad: true });

    store.getState().setSubplebbitOfflineState('music-posting.eth', {
      state: 'offline',
      updatedAt: 123,
      updatingState: 'recovering',
    });

    expect(store.getState().subplebbitOfflineState['music-posting.eth']).toEqual({
      initialLoad: true,
      state: 'offline',
      updatedAt: 123,
      updatingState: 'recovering',
    });

    vi.advanceTimersByTime(30_000);

    expect(store.getState().subplebbitOfflineState['music-posting.eth']).toEqual({
      initialLoad: false,
      state: 'offline',
      updatedAt: 123,
      updatingState: 'recovering',
    });
  });
});
