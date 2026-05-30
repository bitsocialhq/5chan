import * as React from 'react';
import { createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import OekakiDrawingControls from '../oekaki-drawing-controls';
import { OEKAKI_MOBILE_PORTRAIT_MESSAGE } from '../../../lib/oekaki/oekaki-copy';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
const act = (React as { act?: (cb: () => void | Promise<void>) => void | Promise<void> }).act as (cb: () => void | Promise<void>) => void | Promise<void>;

const testState = vi.hoisted(() => ({
  loadTegakiMock: vi.fn(),
  openMock: vi.fn(),
}));

vi.mock('../../../lib/media-hosting/show-upload-controls', () => ({
  getMediaHostingRuntime: () => 'web',
}));

vi.mock('../../../lib/oekaki/tegaki-loader', () => ({
  TEGAKI_DRAWING_FILE_NAME: 'tegaki.png',
  loadTegaki: testState.loadTegakiMock,
}));

let container: HTMLDivElement;
let root: Root;

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

const renderControls = async () => {
  await act(async () => {
    root.render(createElement(OekakiDrawingControls, { uploadFile: vi.fn(), onClearUploadedUrl: vi.fn() }));
  });
};

const clickDraw = async () => {
  const button = Array.from(container.querySelectorAll('button')).find((candidate) => candidate.textContent === 'Draw');
  await act(async () => {
    button?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
};

describe('OekakiDrawingControls', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    testState.openMock.mockReset();
    testState.loadTegakiMock.mockResolvedValue({
      open: testState.openMock,
      flatten: vi.fn(),
    });
    Object.defineProperty(globalThis, 'alert', {
      configurable: true,
      value: vi.fn(),
      writable: true,
    });
    setViewport(1024, 768);
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  it('alerts instead of opening Tegaki on a portrait phone viewport', async () => {
    setViewport(390, 844);

    await renderControls();
    await clickDraw();

    expect(globalThis.alert).toHaveBeenCalledWith(OEKAKI_MOBILE_PORTRAIT_MESSAGE);
    expect(testState.loadTegakiMock).not.toHaveBeenCalled();
  });

  it('opens Tegaki on a landscape phone viewport', async () => {
    setViewport(844, 390);

    await renderControls();
    await clickDraw();

    expect(globalThis.alert).not.toHaveBeenCalled();
    expect(testState.loadTegakiMock).toHaveBeenCalledTimes(1);
    expect(testState.openMock).toHaveBeenCalledWith(expect.objectContaining({ width: 400, height: 400, saveReplay: true }));
  });
});
