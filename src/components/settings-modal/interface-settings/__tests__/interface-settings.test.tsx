import * as React from 'react';
import { createElement } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import packageJson from '../../../../../package.json';
import InterfaceSettings from '../interface-settings';
import useFeedViewSettingsStore from '../../../../stores/use-feed-view-settings-store';
import { INTERFACE_LANGUAGE_STORAGE_KEY } from '../../../../lib/constants';
import useAppUpdateStore from '../../../../stores/use-app-update-store';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
const act = (React as { act?: (cb: () => void | Promise<void>) => void | Promise<void> }).act as (cb: () => void | Promise<void>) => void | Promise<void>;

const testState = vi.hoisted(() => ({
  alertMock: vi.fn(),
  applyAppUpdateMock: vi.fn(),
  changeLanguageMock: vi.fn(),
  fetchMock: vi.fn(),
  fitExpandedImagesToScreen: false,
  setFitExpandedImagesToScreenMock: vi.fn(),
  setUnmuteExpandedVideoSoundMock: vi.fn(),
  unmuteExpandedVideoSound: false,
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, unknown>) => (opts ? `${key}:${JSON.stringify(opts)}` : key),
    i18n: { changeLanguage: testState.changeLanguageMock, language: 'en' },
  }),
}));

vi.mock('../../../../stores/use-expanded-media-store', () => ({
  default: () => ({
    fitExpandedImagesToScreen: testState.fitExpandedImagesToScreen,
    setFitExpandedImagesToScreen: testState.setFitExpandedImagesToScreenMock,
    setUnmuteExpandedVideoSound: testState.setUnmuteExpandedVideoSoundMock,
    unmuteExpandedVideoSound: testState.unmuteExpandedVideoSound,
  }),
}));

vi.mock('../../version', () => ({
  default: () => null,
}));

vi.mock('../../../style-selector/style-selector', () => ({
  default: () => null,
}));

/** Minimal component that subscribes to feed view settings (like Board) to verify re-renders. */
const BoardModeIndicator = () => {
  const enableInfiniteScroll = useFeedViewSettingsStore((state) => state.enableInfiniteScroll);
  return <span data-testid='board-mode'>{enableInfiniteScroll ? 'infinite' : 'pagination'}</span>;
};

const STORAGE_KEY = 'feed-view-settings-store';

let root: Root;
let container: HTMLDivElement;

const createFetchResponse = (body: unknown) => ({
  json: vi.fn().mockResolvedValue(body),
});

const createDeferred = <T,>() => {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((innerResolve, innerReject) => {
    resolve = innerResolve;
    reject = innerReject;
  });
  return { promise, resolve, reject };
};

const render = (children: React.ReactNode) => {
  act(() => {
    root.render(createElement(MemoryRouter, {}, children));
  });
};

describe('InterfaceSettings', () => {
  let setItemSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.removeItem(STORAGE_KEY);
    testState.alertMock.mockReset();
    testState.applyAppUpdateMock.mockReset();
    testState.changeLanguageMock.mockReset();
    testState.fetchMock.mockReset();
    testState.fitExpandedImagesToScreen = false;
    testState.setFitExpandedImagesToScreenMock.mockReset();
    testState.setUnmuteExpandedVideoSoundMock.mockReset();
    testState.unmuteExpandedVideoSound = false;
    useFeedViewSettingsStore.getState().setEnableInfiniteScroll(false);
    useAppUpdateStore.setState({
      needRefresh: false,
      applyAppUpdate: testState.applyAppUpdateMock,
    });
    vi.stubGlobal('alert', testState.alertMock);
    vi.stubGlobal('fetch', testState.fetchMock);
    setItemSpy = vi.spyOn(Storage.prototype, 'setItem');
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    setItemSpy.mockRestore();
    vi.unstubAllGlobals();
  });

  it('renders enable_infinite_scroll_tip under the infinite scroll checkbox', () => {
    render(createElement(InterfaceSettings));
    expect(container.textContent).toMatch(/enable_infinite_scroll_tip/i);
  });

  it('renders enable_infinite_scroll checkbox unchecked by default', () => {
    render(createElement(InterfaceSettings));
    const label = Array.from(container.querySelectorAll('label')).find((l) => l.textContent?.toLowerCase().includes('enable_infinite_scroll'));
    expect(label).toBeTruthy();
    const checkbox = label?.querySelector<HTMLInputElement>('input[type="checkbox"]');
    expect(checkbox).toBeTruthy();
    expect(checkbox?.checked).toBe(false);
  });

  it('toggling checkbox updates persisted state and re-renders board mode', async () => {
    render(createElement(React.Fragment, {}, createElement(InterfaceSettings), createElement(BoardModeIndicator)));

    const label = Array.from(container.querySelectorAll('label')).find((l) => l.textContent?.toLowerCase().includes('enable_infinite_scroll'));
    const checkbox = label?.querySelector<HTMLInputElement>('input[type="checkbox"]');
    expect(checkbox).toBeTruthy();

    expect(container.querySelector('[data-testid="board-mode"]')?.textContent).toBe('pagination');

    await act(async () => {
      checkbox?.click();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(useFeedViewSettingsStore.getState().enableInfiniteScroll).toBe(true);
    expect(checkbox?.checked).toBe(true);
    expect(container.querySelector('[data-testid="board-mode"]')?.textContent).toBe('infinite');
    expect(localStorage.getItem(STORAGE_KEY)).toContain('"enableInfiniteScroll":true');
  });

  it('toggles fit expanded images through the media store', async () => {
    render(createElement(InterfaceSettings));

    const label = Array.from(container.querySelectorAll('label')).find((candidate) => candidate.textContent?.toLowerCase().includes('fit_expanded_images_to_screen'));
    const checkbox = label?.querySelector<HTMLInputElement>('input[type="checkbox"]');
    expect(checkbox).toBeTruthy();

    await act(async () => {
      checkbox?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(testState.setFitExpandedImagesToScreenMock).toHaveBeenCalledWith(true);
  });

  it('toggles unmute video sound through the media store', async () => {
    render(createElement(InterfaceSettings));

    const label = Array.from(container.querySelectorAll('label')).find((candidate) => candidate.textContent?.toLowerCase().includes('unmute_video_sound'));
    const checkbox = label?.querySelector<HTMLInputElement>('input[type="checkbox"]');
    expect(checkbox).toBeTruthy();

    await act(async () => {
      checkbox?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(testState.setUnmuteExpandedVideoSoundMock).toHaveBeenCalledWith(true);
  });

  it('changes the interface language from the language selector', async () => {
    render(createElement(InterfaceSettings));

    const select = container.querySelector<HTMLSelectElement>('select');
    expect(select).toBeTruthy();

    await act(async () => {
      if (select) {
        select.value = 'fr';
        select.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });

    expect(testState.changeLanguageMock).toHaveBeenCalledWith('fr');
    expect(localStorage.getItem(INTERFACE_LANGUAGE_STORAGE_KEY)).toBe('fr');
  });

  it('disables the update button while fetching and restores it afterward', async () => {
    const pendingFetch = createDeferred<ReturnType<typeof createFetchResponse>>();
    testState.fetchMock.mockReturnValueOnce(pendingFetch.promise);

    render(createElement(InterfaceSettings));

    const button = Array.from(container.querySelectorAll('button')).find((candidate) => candidate.textContent === 'check');
    expect(button).toBeTruthy();

    await act(async () => {
      button?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(button?.disabled).toBe(true);

    pendingFetch.resolve(createFetchResponse({ version: packageJson.version }));
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(button?.disabled).toBe(false);
    expect(testState.alertMock).toHaveBeenCalledWith(expect.stringContaining('latest_stable_version'));
  });

  it('applies the app update when a newer stable version is available', async () => {
    testState.fetchMock.mockResolvedValueOnce(createFetchResponse({ version: '9.9.9' }));

    render(createElement(InterfaceSettings));

    const button = Array.from(container.querySelectorAll('button')).find((candidate) => candidate.textContent === 'check');
    expect(button).toBeTruthy();

    await act(async () => {
      button?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });

    expect(testState.applyAppUpdateMock).toHaveBeenCalledTimes(1);
    expect(testState.alertMock).not.toHaveBeenCalled();
  });

  it('alerts when already on the latest stable version', async () => {
    testState.fetchMock.mockResolvedValueOnce(createFetchResponse({ version: packageJson.version }));

    render(createElement(InterfaceSettings));

    const button = Array.from(container.querySelectorAll('button')).find((candidate) => candidate.textContent === 'check');
    expect(button).toBeTruthy();

    await act(async () => {
      button?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });

    expect(testState.alertMock).toHaveBeenCalledWith(expect.stringContaining('latest_stable_version'));
  });

  it('renders an update button when a service worker refresh is ready', () => {
    useAppUpdateStore.setState({ needRefresh: true });

    render(createElement(InterfaceSettings));

    const button = Array.from(container.querySelectorAll('button')).find((candidate) => candidate.textContent === 'update');
    expect(button).toBeTruthy();
  });

  it('applies the waiting service worker when the update button is pressed', async () => {
    useAppUpdateStore.setState({ needRefresh: true });

    render(createElement(InterfaceSettings));

    const button = Array.from(container.querySelectorAll('button')).find((candidate) => candidate.textContent === 'update');
    expect(button).toBeTruthy();

    await act(async () => {
      button?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });

    expect(testState.applyAppUpdateMock).toHaveBeenCalledTimes(1);
    expect(testState.fetchMock).not.toHaveBeenCalled();
  });

  it('alerts when fetching the latest version info fails', async () => {
    testState.fetchMock.mockRejectedValueOnce(new Error('network down'));

    render(createElement(InterfaceSettings));

    const button = Array.from(container.querySelectorAll('button')).find((candidate) => candidate.textContent === 'check');
    expect(button).toBeTruthy();

    await act(async () => {
      button?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });

    expect(testState.alertMock).toHaveBeenCalledWith('Failed to fetch latest version info: Error: network down');
  });
});
