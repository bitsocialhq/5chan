import * as React from 'react';
import { createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import PostMenuDesktop from '../post-menu-desktop';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
const act = (React as { act?: (cb: () => void | Promise<void>) => void | Promise<void> }).act as (cb: () => void | Promise<void>) => void | Promise<void>;

const testState = vi.hoisted(() => ({
  boardPath: 'mu',
  copyShareLinkMock: vi.fn().mockResolvedValue(undefined),
  copyToClipboardMock: vi.fn().mockResolvedValue(undefined),
  hidden: false,
  hideMock: vi.fn(),
  mediaInfo: undefined as { thumbnail?: string; type?: string; url?: string } | undefined,
  unhideMock: vi.fn(),
  validUrl: true,
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
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
  useId: () => 'desktop-menu',
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
  getBoardPath: () => testState.boardPath,
}));

vi.mock('../../../../hooks/use-directories', () => ({
  useDirectories: () => [],
}));

vi.mock('../../../../hooks/use-hide', () => ({
  default: () => ({
    hidden: testState.hidden,
    hide: testState.hideMock,
    unhide: testState.unhideMock,
  }),
}));

vi.mock('../../../../lib/utils/view-utils', () => ({
  isAllView: (pathname: string) => pathname.startsWith('/all'),
  isCatalogView: (pathname: string) => pathname.includes('/catalog'),
  isPostPageView: (pathname: string) => pathname.includes('/thread/'),
  isSubscriptionsView: (pathname: string) => pathname.startsWith('/subscriptions'),
}));

let container: HTMLDivElement;
let root: Root;

const basePostMenu = {
  authorAddress: '0xauthor',
  cid: 'cid-1',
  link: undefined as string | undefined,
  linkHeight: 0,
  linkWidth: 0,
  postCid: 'cid-1',
  communityAddress: 'music-posting.eth',
  thumbnailUrl: undefined as string | undefined,
};

const renderMenu = async (initialEntry = '/mu', postMenu = basePostMenu) => {
  await act(async () => {
    root.render(createElement(MemoryRouter, { initialEntries: [initialEntry] }, createElement(PostMenuDesktop, { postMenu } as any)));
  });
};

const openMenu = async () => {
  const trigger = document.body.querySelector('[title="Post menu"]');
  await act(async () => {
    trigger?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
};

describe('PostMenuDesktop', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    testState.boardPath = 'mu';
    testState.hidden = false;
    testState.mediaInfo = undefined;
    testState.validUrl = true;
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  it('copies direct links, content ids, and user ids from the desktop menu', async () => {
    await renderMenu();

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
    const copyUserId = Array.from(document.body.querySelectorAll('div')).find((node) => node.textContent === 'copy_user_id');
    await act(async () => {
      copyUserId?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    expect(testState.copyToClipboardMock).toHaveBeenCalledWith('0xauthor');
  });

  it('toggles hide and unhide labels outside the thread root route', async () => {
    await renderMenu('/mu');

    await openMenu();
    const hideThread = Array.from(document.body.querySelectorAll('div')).find((node) => node.textContent === 'hide_thread');
    expect(hideThread).toBeTruthy();

    await act(async () => {
      hideThread?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    expect(testState.hideMock).toHaveBeenCalled();

    testState.hidden = true;
    await renderMenu('/mu');
    await openMenu();

    const unhideThread = Array.from(document.body.querySelectorAll('div')).find((node) => node.textContent === 'unhide_thread');
    expect(unhideThread).toBeTruthy();

    await act(async () => {
      unhideThread?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    expect(testState.unhideMock).toHaveBeenCalled();
  });

  it('omits thread hiding on the thread root route and exposes image search entries for media posts', async () => {
    testState.mediaInfo = {
      type: 'image',
      url: 'https://cdn.example/image.png',
    };

    await renderMenu('/mu/thread/cid-1', {
      ...basePostMenu,
      link: 'https://cdn.example/image.png',
    });

    await openMenu();

    expect(Array.from(document.body.querySelectorAll('div')).find((node) => node.textContent === 'hide_thread')).toBeUndefined();

    const imageSearch = Array.from(document.body.querySelectorAll('[role="button"]')).find((node) => node.textContent?.includes('Image_search'));
    expect(imageSearch).toBeTruthy();

    await act(async () => {
      imageSearch?.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
    });

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
