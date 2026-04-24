import * as React from 'react';
import { createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import PostMenuMobile from '../post-menu-mobile';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
const act = (React as { act?: (cb: () => void | Promise<void>) => void | Promise<void> }).act as (cb: () => void | Promise<void>) => void | Promise<void>;

const testState = vi.hoisted(() => ({
  copyShareLinkMock: vi.fn().mockResolvedValue(undefined),
  copyToClipboardMock: vi.fn().mockResolvedValue(undefined),
  hidden: false,
  hideMock: vi.fn(),
  mediaInfo: undefined as { thumbnail?: string; type?: string; url?: string } | undefined,
  pseudonymityMode: undefined as string | undefined,
  privileges: {
    isAccountCommentAuthor: false,
    isAccountMod: false,
  },
  unhideMock: vi.fn(),
  validUrl: true,
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock('@bitsocial/bitsocial-react-hooks', () => ({
  useAccount: () => ({ author: { address: '0xmod' }, signer: { address: '0xauthor' } }),
  usePublishCommentEdit: () => ({ publishCommentEdit: vi.fn().mockResolvedValue(undefined) }),
}));

vi.mock('@bitsocial/bitsocial-react-hooks/dist/lib/localforage-lru/index.js', () => ({
  default: {
    createInstance: () => ({
      entries: vi.fn().mockResolvedValue([]),
      getItem: vi.fn(),
      removeItem: vi.fn(),
      setItem: vi.fn(),
    }),
  },
}));

vi.mock('@floating-ui/react', () => ({
  FloatingFocusManager: ({ children }: { children?: React.ReactNode }) => createElement(React.Fragment, {}, children),
  autoUpdate: () => undefined,
  flip: () => ({}),
  offset: () => ({}),
  shift: () => ({}),
  useClick: () => ({}),
  useDismiss: () => ({}),
  useFloating: () => ({
    context: {},
    floatingStyles: {},
    refs: {
      setFloating: () => undefined,
      setReference: () => undefined,
    },
  }),
  useId: () => 'mobile-menu',
  useInteractions: () => ({
    getFloatingProps: (props?: Record<string, unknown>) => props || {},
    getReferenceProps: (props?: Record<string, unknown>) => props || {},
  }),
  useRole: () => ({}),
}));

vi.mock('../../../../lib/utils/media-utils', () => ({
  getCommentMediaInfo: () => testState.mediaInfo,
}));

vi.mock('../../../../lib/utils/url-utils', () => ({
  copyShareLinkToClipboard: testState.copyShareLinkMock,
  isValidURL: () => testState.validUrl,
}));

vi.mock('../../../../lib/utils/clipboard-utils', () => ({
  copyToClipboard: testState.copyToClipboardMock,
}));

vi.mock('../../../../lib/utils/route-utils', () => ({
  getBoardPath: () => 'mu',
}));

vi.mock('../../../../hooks/use-directories', () => ({
  useDirectories: () => [],
}));

vi.mock('../../../../hooks/use-author-privileges', () => ({
  default: () => testState.privileges,
}));

vi.mock('../../../../hooks/use-board-pseudonymity-mode', () => ({
  useBoardPseudonymityMode: () => testState.pseudonymityMode,
}));

vi.mock('../../../../hooks/use-hide', () => ({
  default: () => ({
    hidden: testState.hidden,
    hide: testState.hideMock,
    unhide: testState.unhideMock,
  }),
}));

vi.mock('../../../../lib/utils/view-utils', () => ({
  isBoardView: (pathname: string) => /^\/[^/]+$/.test(pathname),
  isPostPageView: (pathname: string) => pathname.includes('/thread/'),
}));

vi.mock('../../../edit-menu/edit-menu', () => ({
  default: ({ post }: { post?: { cid?: string } }) => createElement('div', { 'data-testid': 'edit-menu' }, post?.cid || 'missing'),
}));

let container: HTMLDivElement;
let root: Root;

const basePostMenu = {
  authorAddress: '0xauthor',
  cid: 'cid-1',
  deleted: false,
  link: undefined as string | undefined,
  linkHeight: 0,
  linkWidth: 0,
  parentCid: undefined as string | undefined,
  postCid: 'cid-1',
  removed: false,
  communityAddress: 'music-posting.eth',
  thumbnailUrl: undefined as string | undefined,
};

const renderMenu = async (initialEntry = '/mu', postMenu = basePostMenu) => {
  await act(async () => {
    root.render(
      createElement(
        MemoryRouter,
        { initialEntries: [initialEntry] },
        createElement(PostMenuMobile, {
          editMenuPost: { cid: postMenu.cid },
          postMenu,
        } as any),
      ),
    );
  });
};

const openMenu = async () => {
  const trigger = document.body.querySelector('[title="Post menu"]');
  await act(async () => {
    trigger?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
};

describe('PostMenuMobile', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    testState.hidden = false;
    testState.mediaInfo = undefined;
    testState.pseudonymityMode = undefined;
    testState.privileges = {
      isAccountCommentAuthor: false,
      isAccountMod: false,
    };
    testState.validUrl = true;
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  it('opens the mobile menu, copies share metadata, and shows edit controls for mods', async () => {
    testState.privileges = {
      isAccountCommentAuthor: true,
      isAccountMod: true,
    };

    await renderMenu('/mu');
    expect(document.body.querySelector('[data-testid="edit-menu"]')?.textContent).toBe('cid-1');

    await openMenu();
    const copyLink = Array.from(document.body.querySelectorAll('div')).find((node) => node.textContent === 'copy_direct_link');
    await act(async () => {
      copyLink?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    expect(testState.copyShareLinkMock).toHaveBeenCalledWith('mu', 'thread', 'cid-1');

    await openMenu();
    const copyContentId = Array.from(document.body.querySelectorAll('div')).find((node) => node.textContent === 'copy_content_id');
    await act(async () => {
      copyContentId?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    expect(testState.copyToClipboardMock).toHaveBeenCalledWith('cid-1');

    await openMenu();
    const hideThread = Array.from(document.body.querySelectorAll('div')).find((node) => node.textContent === 'hide_thread');
    await act(async () => {
      hideThread?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    expect(testState.hideMock).toHaveBeenCalled();
  });

  it('does not show edit controls on pseudonymous boards when user is not a mod', async () => {
    testState.pseudonymityMode = 'per-post';
    testState.privileges = {
      isAccountCommentAuthor: false,
      isAccountMod: false,
    };

    await renderMenu('/mu');

    expect(document.body.querySelector('[data-testid="edit-menu"]')).toBeNull();
  });

  it("does not show edit controls when pseudonymity mode is 'none' and the user lacks privileges", async () => {
    testState.pseudonymityMode = 'none';

    await renderMenu('/mu');

    expect(document.body.querySelector('[data-testid="edit-menu"]')).toBeNull();
  });

  it('omits thread hiding on the root thread route and suppresses the menu for deleted posts', async () => {
    await renderMenu('/mu/thread/cid-1');
    await openMenu();
    expect(Array.from(document.body.querySelectorAll('div')).find((node) => node.textContent === 'hide_thread')).toBeUndefined();

    await renderMenu('/mu', {
      ...basePostMenu,
      deleted: true,
    });

    expect(document.body.querySelector('[title="Post menu"]')).toBeNull();
  });

  it('renders image search targets for image posts in the mobile menu', async () => {
    testState.mediaInfo = {
      type: 'image',
      url: 'https://cdn.example/image.png',
    };

    await renderMenu('/mu', {
      ...basePostMenu,
      link: 'https://cdn.example/image.png',
    });

    await openMenu();

    const hrefs = Array.from(document.body.querySelectorAll('a')).map((link) => link.getAttribute('href'));
    expect(hrefs).toEqual(
      expect.arrayContaining([
        'https://lens.google.com/uploadbyurl?url=https%3A%2F%2Fcdn.example%2Fimage.png',
        'https://www.yandex.com/images/search?img_url=https%3A%2F%2Fcdn.example%2Fimage.png&rpt=imageview',
        'https://saucenao.com/search.php?url=https%3A%2F%2Fcdn.example%2Fimage.png',
      ]),
    );
  });
});
