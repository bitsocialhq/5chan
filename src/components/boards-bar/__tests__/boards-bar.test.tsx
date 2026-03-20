import * as React from 'react';
import { createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import BoardsBar from '../boards-bar';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
const act = (React as { act?: (cb: () => void | Promise<void>) => void | Promise<void> }).act as (cb: () => void | Promise<void>) => void | Promise<void>;

const testState = vi.hoisted(() => ({
  accountComment: undefined as { communityAddress?: string; subplebbitAddress?: string } | undefined,
  accountCommunityAddresses: ['music-posting.eth'] as string[],
  directories: [
    { address: 'music-posting.eth', title: '/mu/ - Music' },
    { address: 'tech-posting.eth', title: '/g/ - Technology' },
  ] as Array<{ address: string; title?: string }>,
  directoriesMetadata: { title: '/all/ - All Boards' } as { title?: string } | null,
  initializeVisibilityMock: vi.fn(),
  navigateMock: vi.fn(),
  openBoardsBarEditModalMock: vi.fn(),
  openCreateBoardModalMock: vi.fn(),
  openDirectoryModalMock: vi.fn(),
  resolvedCommunityAddress: 'music-posting.eth' as string | undefined,
  showSubscriptionsInBoardsBar: true,
  subscriptions: ['custom.eth'] as string[],
  visibleDirectories: new Set<string>(['mu']),
}));

function useBoardsBarVisibilityStoreMock() {
  return {
    visibleDirectories: testState.visibleDirectories,
    showSubscriptionsInBoardsBar: testState.showSubscriptionsInBoardsBar,
  };
}

useBoardsBarVisibilityStoreMock.getState = () => ({
  initialize: testState.initializeVisibilityMock,
});

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => testState.navigateMock,
  };
});

vi.mock('@bitsocialnet/bitsocial-react-hooks', () => ({
  useAccount: () => undefined,
  useAccountComment: () => testState.accountComment,
}));

vi.mock('@bitsocialnet/bitsocial-react-hooks/dist/stores/accounts', () => ({
  default: (selector: (state: { activeAccountId: string; accounts: Record<string, { subscriptions: string[] }> }) => unknown) =>
    selector({
      activeAccountId: 'account-1',
      accounts: {
        'account-1': {
          subscriptions: testState.subscriptions,
        },
      },
    }),
}));

vi.mock('../../../hooks/use-account-community-addresses', () => ({
  useAccountCommunityAddresses: () => testState.accountCommunityAddresses,
}));

vi.mock('../../../hooks/use-directories', async () => {
  const actual = await vi.importActual<typeof import('../../../hooks/use-directories')>('../../../hooks/use-directories');
  return {
    ...actual,
    useDirectories: () => testState.directories,
    useDirectoriesMetadata: () => testState.directoriesMetadata,
  };
});

vi.mock('../../../hooks/use-resolved-community-address', () => ({
  useBoardPath: (communityAddress: string | undefined) => {
    if (communityAddress === 'music-posting.eth') return 'mu';
    if (communityAddress === 'tech-posting.eth') return 'g';
    return communityAddress;
  },
  useResolvedCommunityAddress: () => testState.resolvedCommunityAddress,
}));

vi.mock('../../../stores/use-create-board-modal-store', () => ({
  default: () => ({
    openCreateBoardModal: testState.openCreateBoardModalMock,
  }),
}));

vi.mock('../../../stores/use-boards-bar-edit-modal-store', () => ({
  default: () => ({
    openBoardsBarEditModal: testState.openBoardsBarEditModalMock,
  }),
}));

vi.mock('../../../stores/use-boards-bar-visibility-store', () => ({
  default: useBoardsBarVisibilityStoreMock,
}));

vi.mock('../../../stores/use-directory-modal-store', () => ({
  default: () => ({
    openDirectoryModal: testState.openDirectoryModalMock,
  }),
}));

vi.mock('lodash/debounce', () => ({
  default: <T extends (...args: any[]) => void>(fn: T) => {
    const wrapped = ((...args: Parameters<T>) => fn(...args)) as T & { cancel: () => void };
    wrapped.cancel = () => undefined;
    return wrapped;
  },
}));

let container: HTMLDivElement;
let root: Root;

const findExactText = (text: string) => Array.from(container.querySelectorAll<HTMLElement>('*')).find((element) => element.textContent?.trim() === text);

const renderBoardsBar = async (initialEntry: string) => {
  await act(async () => {
    root.render(
      createElement(
        MemoryRouter,
        { initialEntries: [initialEntry] },
        createElement(
          Routes,
          {},
          createElement(Route, { path: '/:boardIdentifier/*', element: createElement(BoardsBar) }),
          createElement(Route, { path: '/pending/:accountCommentIndex/*', element: createElement(BoardsBar) }),
          createElement(Route, { path: '*', element: createElement(BoardsBar) }),
        ),
      ),
    );
  });
  await act(async () => {
    await Promise.resolve();
  });
};

describe('BoardsBar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    testState.accountComment = undefined;
    testState.accountCommunityAddresses = ['music-posting.eth'];
    testState.directories = [
      { address: 'music-posting.eth', title: '/mu/ - Music' },
      { address: 'tech-posting.eth', title: '/g/ - Technology' },
    ];
    testState.directoriesMetadata = { title: '/all/ - All Boards' };
    testState.navigateMock.mockReset();
    testState.openBoardsBarEditModalMock.mockReset();
    testState.openCreateBoardModalMock.mockReset();
    testState.openDirectoryModalMock.mockReset();
    testState.initializeVisibilityMock.mockReset();
    testState.resolvedCommunityAddress = 'music-posting.eth';
    testState.showSubscriptionsInBoardsBar = true;
    testState.subscriptions = ['custom.eth'];
    testState.visibleDirectories = new Set(['mu']);

    Object.defineProperty(window, 'scrollY', {
      configurable: true,
      value: 0,
      writable: true,
    });

    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  it('renders desktop board groups and subscription links, then opens edit/create/directory actions', async () => {
    await renderBoardsBar('/mu');

    expect(testState.initializeVisibilityMock).toHaveBeenCalledTimes(1);
    expect(container.textContent).toContain('all');
    expect(container.textContent).toContain('subs');
    expect(container.textContent).toContain('mod');
    expect(container.textContent).toContain('custom.eth');
    expect(container.textContent).toContain('mu');
    expect(container.textContent).not.toContain('g /');

    await act(async () => {
      findExactText('...')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(container.textContent).toContain('g');

    await act(async () => {
      findExactText('Edit')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      findExactText('create_board')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(testState.openBoardsBarEditModalMock).toHaveBeenCalledTimes(1);
    expect(testState.openCreateBoardModalMock).toHaveBeenCalledTimes(1);

    await act(async () => {
      findExactText('biz')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(testState.openDirectoryModalMock).toHaveBeenCalledTimes(1);
  });

  it('opens the desktop search bar and submits entered board addresses', async () => {
    await renderBoardsBar('/mu');

    await act(async () => {
      findExactText('search')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    const inputs = container.querySelectorAll<HTMLInputElement>('input[type="text"]');
    const desktopSearchInput = inputs[0];
    expect(desktopSearchInput).toBeTruthy();

    await act(async () => {
      desktopSearchInput.value = 'new-board.eth';
      desktopSearchInput.form?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    });

    expect(testState.navigateMock).toHaveBeenCalledWith('/new-board.eth');
  });

  it('keeps catalog navigation on mobile board changes and hides the navbar on downward scroll', async () => {
    await renderBoardsBar('/mu/catalog');

    const select = container.querySelector('select');
    expect(select).toBeTruthy();

    await act(async () => {
      if (select) {
        select.value = 'all';
        select.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });

    expect(testState.navigateMock).toHaveBeenCalledWith('/all/catalog');

    const mobileNav = container.querySelector<HTMLElement>('[style*="translateY"]');
    expect(mobileNav?.style.transform).toBe('translateY(0)');

    await act(async () => {
      window.scrollY = 100;
      window.dispatchEvent(new Event('scroll'));
    });

    expect(mobileNav?.style.transform).toBe('translateY(-23px)');
  });

  it('keeps the mobile board context for legacy account comments', async () => {
    testState.resolvedCommunityAddress = undefined;
    testState.accountComment = { subplebbitAddress: 'music-posting.eth' };

    await renderBoardsBar('/pending/7');

    const select = container.querySelector('select');
    expect(select).toBeTruthy();
    expect(Array.from(select?.querySelectorAll('option') ?? []).some((option) => option.value === 'mu')).toBe(true);
  });
});
