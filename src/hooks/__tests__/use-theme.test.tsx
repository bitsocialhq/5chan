import * as React from 'react';
import { createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import useTheme from '../use-theme';
import { TRASH_BOARD_ADDRESS, TRASH_BOARD_CODE } from '../../lib/special-boards';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
const act = (React as { act?: (cb: () => void | Promise<void>) => void | Promise<void> }).act as (cb: () => void | Promise<void>) => void | Promise<void>;

const testState = vi.hoisted(() => ({
  boardIdentifier: 'trash',
  directories: [] as Array<{ address: string; nsfw?: boolean }>,
  isSpecialThemeEnabled: false as boolean | null,
  locationPathname: '/trash',
  resolvedAddress: 'off-topic.bso' as string | undefined,
  setIsEnabledMock: vi.fn(),
  setThemeMock: vi.fn().mockResolvedValue(undefined),
  themes: {
    nsfw: 'tomorrow',
    sfw: 'yotsuba-b',
  },
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useLocation: () => ({ pathname: testState.locationPathname }),
    useParams: () => ({ boardIdentifier: testState.boardIdentifier }),
  };
});

vi.mock('@bitsocial/bitsocial-react-hooks', () => ({
  useAccountComment: () => undefined,
}));

vi.mock('../use-directories', () => ({
  useDirectories: () => testState.directories,
}));

vi.mock('../use-resolved-community-address', () => ({
  useResolvedCommunityAddress: () => testState.resolvedAddress,
}));

vi.mock('../../stores/use-special-theme-store', () => ({
  default: () => ({
    isEnabled: testState.isSpecialThemeEnabled,
    setIsEnabled: testState.setIsEnabledMock,
  }),
}));

vi.mock('../../stores/use-theme-store', () => ({
  default: <T,>(selector: (state: { setTheme: (category: 'nsfw' | 'sfw', theme: string) => Promise<void>; themes: typeof testState.themes }) => T) =>
    selector({
      setTheme: testState.setThemeMock,
      themes: testState.themes,
    }),
}));

vi.mock('../../lib/update-favicon', () => ({
  isSfwBoard: () => false,
  updateFavicon: vi.fn(),
}));

vi.mock('../../lib/utils/time-utils', () => ({
  getActiveSpecialTheme: () => undefined,
  getSpecialThemeClass: () => 'spooky',
}));

let latestValue: [string, (theme: string) => void | Promise<void>] | undefined;
let container: HTMLDivElement;
let root: Root;

const HookHarness = () => {
  latestValue = useTheme();
  return null;
};

const renderHook = async () => {
  await act(async () => {
    root.render(createElement(HookHarness));
  });
};

describe('useTheme', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    latestValue = undefined;
    testState.boardIdentifier = TRASH_BOARD_CODE;
    testState.directories = [];
    testState.isSpecialThemeEnabled = false;
    testState.locationPathname = `/${TRASH_BOARD_CODE}`;
    testState.resolvedAddress = TRASH_BOARD_ADDRESS;
    testState.themes = {
      nsfw: 'tomorrow',
      sfw: 'yotsuba-b',
    };
    document.body.className = '';
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    document.body.className = '';
  });

  it('uses the nsfw theme bucket for hidden special boards', async () => {
    await renderHook();

    expect(latestValue?.[0]).toBe('tomorrow');

    await act(async () => {
      await latestValue?.[1]('photon');
    });

    expect(testState.setThemeMock).toHaveBeenCalledWith('nsfw', 'photon');
  });
});
