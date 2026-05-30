import * as React from 'react';
import { createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import OekakiDrawingControls from '../oekaki-drawing-controls';
import { OEKAKI_MOBILE_PORTRAIT_MESSAGE, OEKAKI_WEB_DOWNLOAD_MESSAGE } from '../../../lib/oekaki/oekaki-copy';
import type { UploadedFileResult } from '../../../hooks/use-file-upload';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
const act = (React as { act?: (cb: () => void | Promise<void>) => void | Promise<void> }).act as (cb: () => void | Promise<void>) => void | Promise<void>;

const testState = vi.hoisted(() => ({
  runtime: 'web' as 'web' | 'electron' | 'android',
  loadTegakiMock: vi.fn(),
  openMock: vi.fn(),
  flattenMock: vi.fn(),
}));

vi.mock('../../../lib/media-hosting/show-upload-controls', () => ({
  getMediaHostingRuntime: () => testState.runtime,
}));

vi.mock('../../../lib/oekaki/tegaki-loader', () => ({
  TEGAKI_DRAWING_FILE_NAME: 'tegaki.png',
  loadTegaki: testState.loadTegakiMock,
}));

let container: HTMLDivElement;
let root: Root;

interface MockTegakiOpenOptions {
  width: number;
  height: number;
  saveReplay: boolean;
  onDone: () => void;
  onCancel: () => void;
}

const setViewport = (width: number, height: number) => {
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: width });
  Object.defineProperty(window, 'innerHeight', { configurable: true, value: height });
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: query === '(max-width: 640px) and (orientation: portrait)' && width <= 640 && height > width,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
};

const createFinishedCanvas = () => {
  const canvas = document.createElement('canvas');
  Object.defineProperty(canvas, 'toBlob', {
    configurable: true,
    value: (callback: BlobCallback) => callback(new Blob(['png'], { type: 'image/png' })),
  });
  return canvas;
};

const renderControls = async ({
  uploadFile = vi.fn<(file: File) => Promise<UploadedFileResult | null>>().mockResolvedValue(null),
  onClearUploadedUrl = vi.fn(),
}: {
  uploadFile?: (file: File) => Promise<UploadedFileResult | null>;
  onClearUploadedUrl?: (url: string) => void;
} = {}) => {
  await act(async () => {
    root.render(createElement(OekakiDrawingControls, { uploadFile, onClearUploadedUrl }));
  });
  return { uploadFile, onClearUploadedUrl };
};

const getButton = (label: string): HTMLButtonElement => {
  const button = Array.from(container.querySelectorAll('button')).find((candidate) => candidate.textContent === label);
  if (!(button instanceof HTMLButtonElement)) {
    throw new Error(`Button ${label} not found`);
  }
  return button;
};

const clickButton = async (label: string) => {
  const button = getButton(label);
  await act(async () => {
    button.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
};

const triggerTegakiDone = async () => {
  const openOptions = testState.openMock.mock.calls.at(-1)?.[0] as MockTegakiOpenOptions | undefined;
  if (!openOptions) {
    throw new Error('Tegaki open options not captured');
  }
  await act(async () => {
    openOptions.onDone();
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
  });
};

describe('OekakiDrawingControls', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    testState.runtime = 'web';
    testState.openMock.mockReset();
    testState.flattenMock.mockReset();
    testState.flattenMock.mockReturnValue(createFinishedCanvas());
    testState.loadTegakiMock.mockResolvedValue({
      open: testState.openMock,
      flatten: testState.flattenMock,
    });
    Object.defineProperty(globalThis, 'alert', {
      configurable: true,
      value: vi.fn(),
      writable: true,
    });
    Object.defineProperty(globalThis, 'confirm', {
      configurable: true,
      value: vi.fn(() => true),
      writable: true,
    });
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      value: vi.fn(() => 'blob:tegaki'),
    });
    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true,
      value: vi.fn(),
    });
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
    setViewport(1024, 768);
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    vi.restoreAllMocks();
  });

  it('alerts instead of opening Tegaki on a portrait phone viewport', async () => {
    setViewport(390, 844);

    await renderControls();
    await clickButton('Draw');

    expect(globalThis.alert).toHaveBeenCalledWith(OEKAKI_MOBILE_PORTRAIT_MESSAGE);
    expect(testState.loadTegakiMock).not.toHaveBeenCalled();
  });

  it('opens Tegaki on a landscape phone viewport', async () => {
    setViewport(844, 390);

    await renderControls();
    await clickButton('Draw');

    expect(globalThis.alert).not.toHaveBeenCalled();
    expect(testState.loadTegakiMock).toHaveBeenCalledTimes(1);
    expect(testState.openMock).toHaveBeenCalledWith(expect.objectContaining({ width: 400, height: 400, saveReplay: true }));
  });

  it('keeps Draw disabled while Tegaki is open', async () => {
    await renderControls();
    await clickButton('Draw');

    expect(getButton('Draw').disabled).toBe(true);
    await clickButton('Draw');
    expect(testState.loadTegakiMock).toHaveBeenCalledTimes(1);

    const openOptions = testState.openMock.mock.calls.at(-1)?.[0] as MockTegakiOpenOptions;
    await act(async () => {
      openOptions.onCancel();
    });

    expect(getButton('Draw').disabled).toBe(false);
  });

  it('downloads the web drawing only after confirmation', async () => {
    await renderControls();
    await clickButton('Draw');
    await triggerTegakiDone();

    expect(globalThis.confirm).toHaveBeenCalledWith(OEKAKI_WEB_DOWNLOAD_MESSAGE);
    expect(HTMLAnchorElement.prototype.click).toHaveBeenCalledTimes(1);
    expect(URL.createObjectURL).toHaveBeenCalledOnce();
  });

  it('does not download the web drawing when confirmation is cancelled', async () => {
    Object.defineProperty(globalThis, 'confirm', {
      configurable: true,
      value: vi.fn(() => false),
    });

    await renderControls();
    await clickButton('Draw');
    await triggerTegakiDone();

    expect(globalThis.confirm).toHaveBeenCalledWith(OEKAKI_WEB_DOWNLOAD_MESSAGE);
    expect(HTMLAnchorElement.prototype.click).not.toHaveBeenCalled();
    expect(URL.createObjectURL).not.toHaveBeenCalled();
  });

  it('clears the uploaded drawing URL when Clear is clicked', async () => {
    testState.runtime = 'electron';
    const uploadFile = vi.fn<(file: File) => Promise<UploadedFileResult | null>>().mockResolvedValue({
      url: 'https://files.example/tegaki.png',
      fileName: 'tegaki.png',
    });
    const onClearUploadedUrl = vi.fn();

    await renderControls({ uploadFile, onClearUploadedUrl });
    await clickButton('Draw');
    await triggerTegakiDone();
    await clickButton('Clear');

    expect(onClearUploadedUrl).toHaveBeenCalledWith('https://files.example/tegaki.png');
  });

  it('clears a stale uploaded URL when re-uploading an edited drawing fails', async () => {
    testState.runtime = 'electron';
    const uploadFile = vi
      .fn<(file: File) => Promise<UploadedFileResult | null>>()
      .mockResolvedValueOnce({ url: 'https://files.example/first.png', fileName: 'tegaki.png' })
      .mockResolvedValueOnce(null);
    const onClearUploadedUrl = vi.fn();

    await renderControls({ uploadFile, onClearUploadedUrl });
    await clickButton('Draw');
    await triggerTegakiDone();
    await clickButton('Edit');
    await triggerTegakiDone();

    expect(uploadFile).toHaveBeenCalledTimes(2);
    expect(onClearUploadedUrl).toHaveBeenCalledWith('https://files.example/first.png');
  });
});
