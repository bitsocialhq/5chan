import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const flushMicrotasks = async () => {
  await Promise.resolve();
  await Promise.resolve();
};

const loadBlotterVisibilityStore = async () => (await import('../use-blotter-visibility-store')).default;
const loadHomepageStatsOptionsStore = async () => (await import('../use-homepage-stats-options-store')).default;
const loadModQueueStore = async () => (await import('../use-mod-queue-store')).default;
const loadPopularThreadsOptionsStore = async () => (await import('../use-popular-threads-options-store')).default;

const loadSpecialThemeStore = async (isoDate: string) => {
  vi.resetModules();
  vi.useFakeTimers();
  vi.setSystemTime(new Date(isoDate));
  const module = await import('../use-special-theme-store');
  await flushMicrotasks();
  return module.default;
};

describe('persisted extra stores', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.resetModules();
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('toggles blotter visibility and persists the hidden flag', async () => {
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem');
    const useBlotterVisibilityStore = await loadBlotterVisibilityStore();

    expect(useBlotterVisibilityStore.getState().isHidden).toBe(false);

    useBlotterVisibilityStore.getState().toggleVisibility();
    expect(useBlotterVisibilityStore.getState().isHidden).toBe(true);
    expect(setItemSpy).toHaveBeenCalledWith('blotter-visibility', expect.stringContaining('"isHidden":true'));

    setItemSpy.mockRestore();
  });

  it('loads popular thread options from localStorage defaults and persists changes', async () => {
    const usePopularThreadsOptionsStore = await loadPopularThreadsOptionsStore();

    expect(usePopularThreadsOptionsStore.getState().showWorksafeContentOnly).toBe(true);
    expect(usePopularThreadsOptionsStore.getState().showNsfwContentOnly).toBe(false);

    usePopularThreadsOptionsStore.getState().setShowWorksafeContentOnly(false);
    usePopularThreadsOptionsStore.getState().setShowNsfwContentOnly(true);

    expect(localStorage.getItem('showWorksafeContentOnly')).toBe('false');
    expect(localStorage.getItem('showNsfwContentOnly')).toBe('true');
  });

  it('loads homepage stats scope from localStorage defaults and persists changes', async () => {
    const useHomepageStatsOptionsStore = await loadHomepageStatsOptionsStore();

    expect(useHomepageStatsOptionsStore.getState().statsScope).toBe('directory');

    useHomepageStatsOptionsStore.getState().setStatsScope('all');

    expect(useHomepageStatsOptionsStore.getState().statsScope).toBe('all');
    expect(localStorage.getItem('5chan-homepage-stats-scope')).toBe('all');
  });

  it('defaults the mod queue to feed view when no preference is stored', async () => {
    const useModQueueStore = await loadModQueueStore();
    await flushMicrotasks();

    expect(useModQueueStore.getState().viewMode).toBe('feed');
  });

  it('migrates legacy mod queue storage and computes threshold seconds from the active unit', async () => {
    localStorage.setItem(
      'mod-queue-storage',
      JSON.stringify({
        state: {
          alertThresholdHours: 3,
          selectedBoardFilter: 'music.eth',
        },
        version: 0,
      }),
    );

    const useModQueueStore = await loadModQueueStore();
    await flushMicrotasks();

    expect(useModQueueStore.getState()).toMatchObject({
      alertThresholdValue: 3,
      alertThresholdUnit: 'hours',
      dismissedCommentCids: [],
      queuedCommentHistory: [],
      selectedBoardFilter: 'music.eth',
      viewMode: 'feed',
    });
    expect(useModQueueStore.getState().getAlertThresholdSeconds()).toBe(10_800);

    useModQueueStore.getState().setAlertThreshold(15, 'minutes');
    useModQueueStore.getState().dismissCommentFromQueue('approved-cid');
    useModQueueStore.getState().dismissCommentFromQueue('approved-cid');
    useModQueueStore.getState().rememberCommentsInQueue([{ cid: 'approved-cid', approved: true, content: 'approved body' }]);
    useModQueueStore.getState().rememberCommentsInQueue([{ cid: 'rejected-cid', approved: false, content: 'rejected body' }]);
    useModQueueStore.getState().setSelectedBoardFilter('tech.eth');
    useModQueueStore.getState().setViewMode('compact');

    expect(useModQueueStore.getState()).toMatchObject({
      alertThresholdValue: 15,
      alertThresholdUnit: 'minutes',
      dismissedCommentCids: ['approved-cid'],
      queuedCommentHistory: [
        { cid: 'rejected-cid', approved: false, content: 'rejected body' },
        { cid: 'approved-cid', approved: true, content: 'approved body' },
      ],
      selectedBoardFilter: 'tech.eth',
      viewMode: 'compact',
    });
    expect(useModQueueStore.getState().getAlertThresholdSeconds()).toBe(900);
  });

  it('blocks special theme enablement outside active special dates and clears persisted enabled state on rehydrate', async () => {
    localStorage.setItem(
      'Special-theme-storage',
      JSON.stringify({
        state: { isEnabled: true },
        version: 0,
      }),
    );

    const useSpecialThemeStore = await loadSpecialThemeStore('2024-07-04T00:00:00Z');

    expect(useSpecialThemeStore.getState().isEnabled).toBeNull();

    useSpecialThemeStore.getState().setIsEnabled(true);
    expect(useSpecialThemeStore.getState().isEnabled).toBeNull();
  });

  it('allows opting into the special theme during christmas and halloween', async () => {
    const useSpecialThemeStore = await loadSpecialThemeStore('2024-12-24T00:00:00Z');

    expect(useSpecialThemeStore.getState().isEnabled).toBeNull();

    useSpecialThemeStore.getState().setIsEnabled(true);
    expect(useSpecialThemeStore.getState().isEnabled).toBe(true);

    localStorage.clear();
    const useHalloweenSpecialThemeStore = await loadSpecialThemeStore('2024-10-31T00:00:00Z');

    expect(useHalloweenSpecialThemeStore.getState().isEnabled).toBeNull();

    useHalloweenSpecialThemeStore.getState().setIsEnabled(true);
    expect(useHalloweenSpecialThemeStore.getState().isEnabled).toBe(true);
  });
});
