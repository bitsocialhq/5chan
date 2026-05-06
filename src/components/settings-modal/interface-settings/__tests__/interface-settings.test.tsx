import * as React from 'react';
import { createElement } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import InterfaceSettings from '../interface-settings';
import useFeedViewSettingsStore from '../../../../stores/use-feed-view-settings-store';
import { INTERFACE_LANGUAGE_STORAGE_KEY } from '../../../../lib/constants';
import useAppUpdateStore from '../../../../stores/use-app-update-store';

vi.hoisted(() => {
  vi.stubEnv('VITE_APP_DISTRIBUTION', 'github');
});

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
const act = (React as { act?: (cb: () => void | Promise<void>) => void | Promise<void> }).act as (cb: () => void | Promise<void>) => void | Promise<void>;

const testState = vi.hoisted(() => ({
  alertMock: vi.fn(),
  applyAppUpdateMock: vi.fn(),
  changeLanguageMock: vi.fn(),
  fitExpandedImagesToScreen: false,
  refreshAvailableUpdateMock: vi.fn(),
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

const BoardModeIndicator = () => {
  const enableInfiniteScroll = useFeedViewSettingsStore((state) => state.enableInfiniteScroll);
  return <span data-testid='board-mode'>{enableInfiniteScroll ? 'infinite' : 'pagination'}</span>;
};

const STORAGE_KEY = 'feed-view-settings-store';

let root: Root;
let container: HTMLDivElement;

const render = (children: React.ReactNode) => {
  act(() => {
    root.render(createElement(MemoryRouter, {}, children));
  });
};

const settleLazyImports = async () => {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
};

const findButtonByText = (text: string) => Array.from(container.querySelectorAll('button')).find((candidate) => candidate.textContent === text);

describe('InterfaceSettings', () => {
  let setItemSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.removeItem(STORAGE_KEY);
    testState.alertMock.mockReset();
    testState.applyAppUpdateMock.mockReset();
    testState.changeLanguageMock.mockReset();
    testState.fitExpandedImagesToScreen = false;
    testState.refreshAvailableUpdateMock.mockReset();
    testState.setFitExpandedImagesToScreenMock.mockReset();
    testState.setUnmuteExpandedVideoSoundMock.mockReset();
    testState.unmuteExpandedVideoSound = false;
    useFeedViewSettingsStore.getState().setEnableInfiniteScroll(false);
    useAppUpdateStore.setState({
      availableUpdate: null,
      isApplyingUpdate: false,
      isCheckingForUpdate: false,
      applyAppUpdate: testState.applyAppUpdateMock,
      refreshAvailableUpdate: testState.refreshAvailableUpdateMock,
    });
    vi.stubGlobal('alert', testState.alertMock);
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
    const label = Array.from(container.querySelectorAll('label')).find((candidate) => candidate.textContent?.toLowerCase().includes('enable_infinite_scroll'));
    expect(label).toBeTruthy();
    const checkbox = label?.querySelector<HTMLInputElement>('input[type="checkbox"]');
    expect(checkbox).toBeTruthy();
    expect(checkbox?.checked).toBe(false);
  });

  it('toggling checkbox updates persisted state and re-renders board mode', async () => {
    render(createElement(React.Fragment, {}, createElement(InterfaceSettings), createElement(BoardModeIndicator)));

    const label = Array.from(container.querySelectorAll('label')).find((candidate) => candidate.textContent?.toLowerCase().includes('enable_infinite_scroll'));
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

  it('renders a check button when no app update is available', async () => {
    render(createElement(InterfaceSettings));
    await settleLazyImports();

    expect(container.textContent).toContain('Update:');
    expect(findButtonByText('Check')).toBeTruthy();
  });

  it('shows the checking status while an update check is in progress', async () => {
    useAppUpdateStore.setState({
      isCheckingForUpdate: true,
    });

    render(createElement(InterfaceSettings));
    await settleLazyImports();

    expect(findButtonByText('Check')?.disabled).toBe(true);
    expect(container.textContent).toContain('checking_for_updates');
  });

  it('renders a download button and release link when an app update is available', async () => {
    useAppUpdateStore.setState({
      availableUpdate: {
        runtime: 'web',
        targetVersion: '9.9.9',
        releaseUrl: 'https://github.com/bitsocialnet/5chan/releases/tag/v9.9.9',
      },
    });

    render(createElement(InterfaceSettings));
    await settleLazyImports();

    expect(findButtonByText('Download')).toBeTruthy();
    const releaseLink = container.querySelector<HTMLAnchorElement>('a[href="https://github.com/bitsocialnet/5chan/releases/tag/v9.9.9"]');
    expect(releaseLink?.textContent).toBe('v9.9.9');
    expect(container.textContent).toContain('new_version_found');
  });

  it('checks for app updates when the check button is pressed', async () => {
    render(createElement(InterfaceSettings));
    await settleLazyImports();

    const button = findButtonByText('Check');
    expect(button).toBeTruthy();

    await act(async () => {
      button?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });

    expect(testState.refreshAvailableUpdateMock).toHaveBeenCalledTimes(1);
    expect(testState.applyAppUpdateMock).not.toHaveBeenCalled();
  });

  it('applies the available app update when the button is pressed', async () => {
    useAppUpdateStore.setState({
      availableUpdate: {
        runtime: 'android',
        targetVersion: '9.9.9',
        releaseUrl: 'https://github.com/bitsocialnet/5chan/releases/tag/v9.9.9',
      },
    });

    render(createElement(InterfaceSettings));
    await settleLazyImports();

    const button = findButtonByText('Download');
    expect(button).toBeTruthy();

    await act(async () => {
      button?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });

    expect(testState.applyAppUpdateMock).toHaveBeenCalledTimes(1);
    expect(testState.alertMock).not.toHaveBeenCalled();
  });

  it('disables the update button while an app update is already being applied', async () => {
    useAppUpdateStore.setState({
      availableUpdate: {
        runtime: 'web',
        targetVersion: '9.9.9',
        releaseUrl: 'https://github.com/bitsocialnet/5chan/releases/tag/v9.9.9',
      },
      isApplyingUpdate: true,
    });

    render(createElement(InterfaceSettings));
    await settleLazyImports();

    expect(findButtonByText('Download')?.disabled).toBe(true);
  });

  it('alerts when applying the update fails', async () => {
    testState.applyAppUpdateMock.mockRejectedValueOnce(new Error('installer failed'));
    useAppUpdateStore.setState({
      availableUpdate: {
        runtime: 'electron',
        targetVersion: '9.9.9',
        assetName: '5chan-9.9.9-x64.AppImage',
        downloadUrl: 'https://github.com/bitsocialnet/5chan/releases/download/v9.9.9/5chan-9.9.9-x64.AppImage',
        releaseUrl: 'https://github.com/bitsocialnet/5chan/releases/tag/v9.9.9',
      },
    });

    render(createElement(InterfaceSettings));
    await settleLazyImports();

    const button = findButtonByText('Download');
    expect(button).toBeTruthy();

    await act(async () => {
      button?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });

    expect(testState.alertMock).toHaveBeenCalledWith('Error: installer failed');
  });
});
