import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('snow', () => {
  beforeEach(() => {
    document.head.innerHTML = '';
    document.body.innerHTML = '';
    vi.restoreAllMocks();
    vi.useRealTimers();
    vi.resetModules();
  });

  it('creates and removes a deterministic snow field', async () => {
    const mathRandomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.5);
    const { initSnow, removeSnow } = await import('../snow');

    initSnow({ flakeCount: 3 });

    const snowfield = document.getElementById('js-snowfield');
    expect(snowfield).toBeTruthy();
    expect(snowfield?.children).toHaveLength(2);
    expect(document.head.querySelector('style')?.textContent).toContain('fall-1');

    removeSnow();
    expect(document.getElementById('js-snowfield')).toBeNull();

    mathRandomSpy.mockRestore();
  });

  it('shows snow only for christmas special theme dates', async () => {
    const useSpecialThemeStore = (await import('../../stores/use-special-theme-store')).default;
    const { shouldShowSnow } = await import('../snow');

    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-12-24T00:00:00Z'));

    useSpecialThemeStore.setState({ isEnabled: true });
    expect(shouldShowSnow()).toBe(true);

    useSpecialThemeStore.setState({ isEnabled: false });
    expect(shouldShowSnow()).toBe(false);

    useSpecialThemeStore.setState({ isEnabled: null });
    expect(shouldShowSnow()).toBe(true);

    vi.setSystemTime(new Date('2024-10-31T00:00:00Z'));
    useSpecialThemeStore.setState({ isEnabled: true });
    expect(shouldShowSnow()).toBe(false);

    useSpecialThemeStore.setState({ isEnabled: null });
    expect(shouldShowSnow()).toBe(false);

    vi.setSystemTime(new Date('2024-07-04T00:00:00Z'));
    expect(shouldShowSnow()).toBe(false);
  });
});
