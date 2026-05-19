import * as React from 'react';
import { createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Home from '../home';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
const act = (React as { act?: (cb: () => void | Promise<void>) => void | Promise<void> }).act as (cb: () => void | Promise<void>) => void | Promise<void>;

const testState = vi.hoisted(() => ({
  closeDirectoryModalMock: vi.fn(),
  directories: [] as Array<{ address: string; title?: string; directoryCode?: string }>,
  directoryAddresses: [] as string[],
  directoryListCodes: [] as string[],
  directoryListsByCode: {} as Record<string, { boards: Array<{ address: string; score: number; managedByDevs: boolean; addedAt?: number }> }>,
  loadingStartTimestamps: [] as number[],
  nowSeconds: 1_704_067_210,
  navigateMock: vi.fn(),
  communities: {} as Record<string, unknown>,
  communityStats: {} as Record<string, { allPostCount?: number; weekActiveUserCount?: number }>,
}));

vi.mock('react-i18next', () => ({
  Trans: ({ i18nKey }: { i18nKey: string }) => createElement('span', { 'data-testid': `trans-${i18nKey}` }, i18nKey),
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

vi.mock('@bitsocial/bitsocial-react-hooks', () => ({
  useCommunities: () => ({ communities: testState.communities }),
}));

vi.mock('../../../hooks/use-directories', () => ({
  useDirectories: () => testState.directories,
  useDirectoryAddresses: () => testState.directoryAddresses,
  findDirectoryByAddress: (directories: Array<{ address: string; title?: string; directoryCode?: string }>, address: string | undefined) =>
    directories.find((entry) => entry.address === address || entry.directoryCode === address || entry.title === address),
}));

vi.mock('../../../hooks/use-directory-list', async () => {
  const actual = await vi.importActual<typeof import('../../../hooks/use-directory-list')>('../../../hooks/use-directory-list');
  return {
    ...actual,
    useDirectoryLists: (directoryCodes: string[] | undefined) => {
      testState.directoryListCodes = directoryCodes ?? [];
      return {
        listsByCode: testState.directoryListsByCode,
        loadingByCode: {},
        errorsByCode: {},
      };
    },
  };
});

vi.mock('../../../hooks/use-communities-stats', () => ({
  CommunityStatsCollector: ({ communityAddress }: { communityAddress: string }) =>
    createElement('div', { 'data-testid': 'stats-collector', 'data-address': communityAddress }),
  useCommunitiesStatsStore: (selector: (state: { communityStats: typeof testState.communityStats }) => unknown) => selector({ communityStats: testState.communityStats }),
}));

vi.mock('../../../stores/use-communities-loading-start-timestamps-store', () => ({
  default: () => testState.loadingStartTimestamps,
}));

vi.mock('../../../hooks/use-now-seconds', () => ({
  useNowSeconds: () => testState.nowSeconds,
}));

vi.mock('../../../components/loading-ellipsis', () => ({
  default: ({ string }: { string: string }) => createElement('span', { 'data-testid': 'loading-ellipsis' }, string),
}));

vi.mock('../../../stores/use-directory-modal-store', () => ({
  default: () => ({
    closeDirectoryModal: testState.closeDirectoryModalMock,
  }),
}));

vi.mock('../boards-list', () => ({
  default: ({ multisub }: { multisub: unknown[] }) => createElement('div', { 'data-testid': 'boards-list' }, `boards:${multisub.length}`),
}));

vi.mock('../popular-threads-box', () => ({
  default: ({ directories, directoryAddresses }: { directories: unknown[]; directoryAddresses: string[] }) =>
    createElement('div', { 'data-testid': 'popular-threads-box' }, `popular:${directories.length}:${directoryAddresses.length}`),
}));

vi.mock('../../../components/site-legal-meta', () => ({
  default: () => createElement('div', { 'data-testid': 'site-legal-meta' }, 'site-legal-meta'),
}));

vi.mock('../../../components/disclaimer-modal', () => ({
  default: () => createElement('div', { 'data-testid': 'disclaimer-modal' }, 'disclaimer-modal'),
}));

vi.mock('../../../components/directory-modal', () => ({
  default: () => createElement('div', { 'data-testid': 'directory-modal' }, 'directory-modal'),
}));

let container: HTMLDivElement;
let root: Root;

const renderHome = () => {
  act(() => {
    root.render(createElement(MemoryRouter, {}, createElement(Home)));
  });
};

describe('Home', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    document.title = 'before';
    testState.closeDirectoryModalMock.mockReset();
    testState.navigateMock.mockReset();
    testState.directories = [
      { address: 'music-posting.eth', title: '/mu/ - Music', directoryCode: 'mu' },
      { address: 'tech-posting.eth', title: '/g/ - Technology', directoryCode: 'g' },
    ];
    testState.directoryAddresses = ['music-posting.eth', 'tech-posting.eth'];
    testState.directoryListCodes = [];
    testState.directoryListsByCode = {};
    testState.loadingStartTimestamps = [];
    testState.nowSeconds = 1_704_067_210;
    testState.communities = {
      'music-posting.eth': { address: 'music-posting.eth' },
      'tech-posting.eth': { address: 'tech-posting.eth' },
    };
    testState.communityStats = {
      'music-posting.eth': { allPostCount: 5, weekActiveUserCount: 2 },
      'tech-posting.eth': { allPostCount: 7, weekActiveUserCount: 5 },
    };

    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  it('renders the home view chrome, child sections, collectors, and aggregated stats', () => {
    renderHome();

    expect(document.title).toBe('5chan');
    expect(container.querySelector('[data-testid="disclaimer-modal"]')?.textContent).toBe('disclaimer-modal');
    expect(container.querySelector('[data-testid="directory-modal"]')?.textContent).toBe('directory-modal');
    expect(container.querySelector('[data-testid="boards-list"]')?.textContent).toBe('boards:2');
    expect(container.querySelector('[data-testid="popular-threads-box"]')?.textContent).toBe('popular:2:2');
    expect(container.querySelectorAll('[data-testid="stats-collector"]')).toHaveLength(2);
    expect(container.querySelectorAll('[data-testid="loading-ellipsis"]')).toHaveLength(0);
    expect(container.textContent).toContain('total_posts 12');
    expect(container.textContent).toContain('current_users 7');
    expect(container.textContent).toContain('boards_tracked 2');
    expect(container.querySelector('[data-testid="site-legal-meta"]')?.textContent).toBe('site-legal-meta');
    expect(container.querySelector<HTMLAnchorElement>('a[href="/pass"]')?.textContent).toBe('support_5chan');
  });

  it('keeps the stats values loading until every directory has loaded stats', () => {
    testState.communityStats = {
      'music-posting.eth': { allPostCount: 5, weekActiveUserCount: 2 },
    };

    renderHome();

    const loadingValues = Array.from(container.querySelectorAll('[data-testid="loading-ellipsis"]'));
    expect(loadingValues).toHaveLength(3);
    expect(loadingValues.map((value) => value.textContent)).toEqual(['loading', 'loading', 'loading']);
    expect(container.textContent).not.toContain('total_posts 5');
    expect(container.textContent).not.toContain('current_users 2');
    expect(container.textContent).not.toContain('boards_tracked 1');
  });

  it('uses a ranked directory fallback board when the default board stats stay unresolved', () => {
    testState.directories = [
      { address: 'business-and-finance.bso', title: '/biz/ - Business & Finance', directoryCode: 'biz' },
      { address: 'tech-posting.eth', title: '/g/ - Technology', directoryCode: 'g' },
    ];
    testState.directoryAddresses = ['business-and-finance.bso', 'tech-posting.eth'];
    testState.loadingStartTimestamps = [1_704_067_170, 1_704_067_170];
    testState.directoryListsByCode = {
      biz: {
        boards: [
          { address: 'business-and-finance.bso', score: 100, managedByDevs: true },
          { address: 'backup-business.bso', score: 10, managedByDevs: false },
        ],
      },
    };
    testState.communityStats = {
      'backup-business.bso': { allPostCount: 11, weekActiveUserCount: 3 },
      'tech-posting.eth': { allPostCount: 7, weekActiveUserCount: 4 },
    };

    renderHome();

    const collectorAddresses = Array.from(container.querySelectorAll('[data-testid="stats-collector"]')).map((collector) => collector.getAttribute('data-address'));
    expect(testState.directoryListCodes).toEqual(['biz']);
    expect(collectorAddresses).toEqual(['business-and-finance.bso', 'tech-posting.eth', 'backup-business.bso']);
    expect(container.querySelectorAll('[data-testid="loading-ellipsis"]')).toHaveLength(0);
    expect(container.textContent).toContain('total_posts 18');
    expect(container.textContent).toContain('current_users 7');
    expect(container.textContent).toContain('boards_tracked 2');
  });

  it('shows zero totals after every directory has loaded zero-count stats', () => {
    testState.communityStats = {
      'music-posting.eth': { allPostCount: 0, weekActiveUserCount: 0 },
      'tech-posting.eth': { allPostCount: 0, weekActiveUserCount: 0 },
    };

    renderHome();

    expect(container.querySelectorAll('[data-testid="loading-ellipsis"]')).toHaveLength(0);
    expect(container.textContent).toContain('total_posts 0');
    expect(container.textContent).toContain('current_users 0');
    expect(container.textContent).toContain('boards_tracked 2');
  });

  it('navigates to the canonical board path when the search form is submitted', async () => {
    renderHome();

    const input = container.querySelector<HTMLInputElement>('input[type="text"]');
    const form = container.querySelector('form');
    expect(input).toBeTruthy();
    expect(form).toBeTruthy();

    await act(async () => {
      if (input) {
        input.value = 'music-posting.eth';
      }
      form?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    });

    expect(testState.navigateMock).toHaveBeenCalledWith('/mu');
  });

  it('closes the directory modal when the home view unmounts', () => {
    renderHome();
    expect(testState.closeDirectoryModalMock).not.toHaveBeenCalled();

    act(() => root.unmount());

    expect(testState.closeDirectoryModalMock).toHaveBeenCalledTimes(1);

    root = createRoot(container);
  });
});
