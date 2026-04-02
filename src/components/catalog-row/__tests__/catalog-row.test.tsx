import * as React from 'react';
import { createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import CatalogRow, { CatalogPostMedia } from '../catalog-row';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
const act = (React as { act?: (cb: () => void | Promise<void>) => void | Promise<void> }).act as (cb: () => void | Promise<void>) => void | Promise<void>;

type TestComment = {
  author?: {
    address?: string;
    displayName?: string;
  };
  cid: string;
  content?: string;
  commentModeration?: {
    archived?: boolean;
  };
  link?: string;
  linkHeight?: number;
  linkWidth?: number;
  locked?: boolean;
  parentCid?: string;
  pinned?: boolean;
  postCid?: string;
  removed?: boolean;
  replyCount?: number;
  replies?: {
    pages?: Record<
      string,
      {
        comments?: TestComment[];
      }
    >;
  };
  spoiler?: boolean;
  communityAddress?: string;
  subplebbitAddress?: string;
  thumbnailUrl?: string;
  timestamp?: number;
  title?: string;
};

const testState = vi.hoisted(() => ({
  directories: [{ address: 'music-posting.eth', features: {}, title: '/mu/ - Music' }] as Array<{
    address: string;
    features?: Record<string, unknown>;
    title?: string;
  }>,
  gifFrameStatus: 'idle' as 'failed' | 'idle' | 'ready',
  gifFrameUrl: undefined as string | undefined,
  hiddenCids: new Set<string>(),
  imageSize: 'Small' as 'Large' | 'Small',
  linkCount: 0,
  mediaInfoByLink: {} as Record<string, { patternThumbnailUrl?: string; thumbnail?: string; type: string; url: string }>,
  lastRepliesComment: undefined as TestComment | undefined,
  replies: [] as TestComment[],
  roleByAddress: {} as Record<string, { commentAuthorRole?: string; isCommentAuthorMod: boolean }>,
  showOPComment: true,
  showSnow: false,
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock('@bitsocialnet/bitsocial-react-hooks', () => ({
  useReplies: ({ comment, sortType }: { comment?: TestComment; sortType?: string }) => {
    if (comment) {
      testState.lastRepliesComment = comment;
    }

    const preloadedReplies =
      comment?.replies?.pages?.[sortType || 'best']?.comments ?? Object.values(comment?.replies?.pages ?? {}).find((page) => page?.comments?.length)?.comments;

    const compatiblePreloadedReplies: TestComment[] = [];
    if (preloadedReplies?.length && comment?.communityAddress) {
      for (const reply of preloadedReplies) {
        if (!reply?.communityAddress || reply.communityAddress !== comment.communityAddress) {
          break;
        }
        compatiblePreloadedReplies.push(reply);
      }
    }

    return {
      replies: comment ? (compatiblePreloadedReplies.length ? compatiblePreloadedReplies : testState.replies) : [],
    };
  },
}));

vi.mock('@bitsocialnet/bitsocial-react-hooks/dist/lib/localforage-lru/index.js', () => ({
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
  offset: () => ({}),
  size: () => ({}),
  useFloating: () => ({
    floatingStyles: {},
    refs: {
      floating: { current: null },
      reference: { current: null },
      setFloating: () => undefined,
      setReference: () => undefined,
    },
    update: () => undefined,
  }),
}));

vi.mock('../../../lib/get-short-address', () => ({
  default: () => 'mu',
}));

vi.mock('../../../lib/snow', () => ({
  shouldShowSnow: () => testState.showSnow,
}));

vi.mock('../../../lib/utils/time-utils', () => ({
  getFormattedTimeAgo: (timestamp?: number) => `ago:${timestamp}`,
}));

vi.mock('../../../lib/utils/post-menu-props', () => ({
  selectPostMenuProps: (post?: TestComment) => ({ cid: post?.cid }),
}));

vi.mock('../../../hooks/use-directories', () => ({
  findDirectoryByAddress: (directories: typeof testState.directories, address?: string) => {
    if (!address) {
      return undefined;
    }

    const normalizeBoardAddress = (value: string) => value.replace(/\.(bso|eth)$/, '');

    return directories.find((entry) => entry.address === address) ?? directories.find((entry) => normalizeBoardAddress(entry.address) === normalizeBoardAddress(address));
  },
  normalizeBoardAddress: (address: string) => address.replace(/\.(bso|eth)$/, ''),
  useDirectories: () => testState.directories,
}));

vi.mock('../../../stores/use-catalog-style-store', () => ({
  default: () => ({
    imageSize: testState.imageSize,
    showOPComment: testState.showOPComment,
  }),
}));

vi.mock('../../../hooks/use-author-privileges', () => ({
  default: ({ commentAuthorAddress }: { commentAuthorAddress?: string }) =>
    testState.roleByAddress[commentAuthorAddress || ''] || {
      commentAuthorRole: undefined,
      isCommentAuthorMod: false,
    },
}));

vi.mock('../../../hooks/use-comment-media-info', () => ({
  useCommentMediaInfo: (link?: string) => (link ? testState.mediaInfoByLink[link] : undefined),
}));

vi.mock('../../../hooks/use-count-links-in-replies', () => ({
  default: () => testState.linkCount,
}));

vi.mock('../../../hooks/use-fetch-gif-first-frame', () => ({
  default: () => ({
    frameUrl: testState.gifFrameUrl,
    status: testState.gifFrameStatus,
  }),
}));

vi.mock('../../../hooks/use-hide', () => ({
  default: ({ cid }: { cid: string }) => ({
    hidden: testState.hiddenCids.has(cid),
  }),
}));

vi.mock('../../post-desktop/post-menu-desktop', () => ({
  default: ({ postMenu }: { postMenu: { cid?: string } }) => createElement('span', { 'data-testid': `post-menu-${postMenu.cid}` }, 'menu'),
}));

let container: HTMLDivElement;
let root: Root;

const flushEffects = async (count = 3) => {
  for (let i = 0; i < count; i += 1) {
    await act(async () => {
      await Promise.resolve();
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
  }
};

const renderWithRouter = async (element: React.ReactNode, initialEntry = '/mu/catalog') => {
  await act(async () => {
    root.render(createElement(MemoryRouter, { initialEntries: [initialEntry] }, element));
  });
  await flushEffects();
};

describe('CatalogRow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
    testState.directories = [{ address: 'music-posting.eth', features: {}, title: '/mu/ - Music' }];
    testState.gifFrameStatus = 'idle';
    testState.gifFrameUrl = undefined;
    testState.hiddenCids = new Set<string>();
    testState.imageSize = 'Small';
    testState.linkCount = 0;
    testState.mediaInfoByLink = {};
    testState.lastRepliesComment = undefined;
    testState.replies = [];
    testState.roleByAddress = {};
    testState.showOPComment = true;
    testState.showSnow = false;
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    vi.useRealTimers();
    act(() => root.unmount());
    container.remove();
  });

  it('renders gif frames with matched filter borders and falls back to deleted media on load errors', async () => {
    testState.gifFrameStatus = 'ready';
    testState.gifFrameUrl = 'https://cdn.example/frame.png';

    await act(async () => {
      root.render(
        createElement(CatalogPostMedia, {
          cid: 'post-1',
          commentMediaInfo: { type: 'gif', url: 'https://example.com/source.gif' },
          linkHeight: 200,
          linkWidth: 400,
          matchedFilterColor: 'red',
        }),
      );
    });

    const wrapper = container.firstElementChild as HTMLElement | null;
    const frameImage = container.querySelector<HTMLImageElement>('img[src="https://cdn.example/frame.png"]');

    expect(wrapper?.style.border).toContain('red');
    expect(frameImage).toBeTruthy();
    expect(frameImage?.getAttribute('width')).toBe('150');
    expect(frameImage?.getAttribute('height')).toBe('75');

    await act(async () => {
      frameImage?.dispatchEvent(new Event('error', { bubbles: true }));
    });

    expect(container.querySelector<HTMLImageElement>('img[src="assets/filedeleted-res.gif"]')).toBeTruthy();
  });

  it('renders the archived icon for archived threads', async () => {
    const post: TestComment = {
      author: { address: 'author-1', displayName: 'Alice' },
      cid: 'post-archived',
      commentModeration: {
        archived: true,
      },
      content: 'Archived thread',
      replyCount: 3,
      subplebbitAddress: 'music-posting.eth',
      title: 'Old thread',
    };

    testState.mediaInfoByLink['https://example.com/media.png'] = { type: 'image', url: 'https://example.com/media.png' };
    await renderWithRouter(createElement(CatalogRow, { row: [post] }));

    expect(container.querySelector('[title="archived"]')).toBeTruthy();
  });

  it('renders audio players and video first-frame fallbacks for media without thumbnails', async () => {
    await act(async () => {
      root.render(
        createElement(CatalogPostMedia, {
          cid: 'audio-post',
          commentMediaInfo: { type: 'audio', url: 'https://example.com/file.mp3' },
        }),
      );
    });

    expect(container.querySelector<HTMLAudioElement>('audio[src="https://example.com/file.mp3"]')).toBeTruthy();

    await act(async () => {
      root.render(
        createElement(CatalogPostMedia, {
          cid: 'video-post',
          commentMediaInfo: { type: 'video', url: 'https://example.com/file.mp4' },
        }),
      );
    });

    expect(container.querySelector<HTMLVideoElement>('video[src="https://example.com/file.mp4#t=0.001"]')).toBeTruthy();
  });

  it('does not force square dimensions on images when media metadata is missing', async () => {
    await act(async () => {
      root.render(
        createElement(CatalogPostMedia, {
          cid: 'image-post',
          commentMediaInfo: { type: 'image', url: 'https://example.com/file.png' },
        }),
      );
    });

    const image = container.querySelector<HTMLImageElement>('img[src="https://example.com/file.png"]');

    expect(image).toBeTruthy();
    expect(image?.getAttribute('width')).toBeNull();
    expect(image?.getAttribute('height')).toBeNull();
  });

  it('renders media posts with board links, counts, and hover previews in all view', async () => {
    testState.directories = [{ address: 'music-posting.eth', features: { requirePostLinkIsMedia: true }, title: '/mu/ - Music' }];
    testState.linkCount = 2;
    testState.mediaInfoByLink['https://example.com/media.png'] = { type: 'image', url: 'https://example.com/media.png' };
    testState.replies = [
      {
        author: { address: 'author-2', displayName: 'Bob' },
        cid: 'reply-1',
        timestamp: 200,
      },
    ];
    testState.roleByAddress = {
      'author-1': { commentAuthorRole: 'Owner', isCommentAuthorMod: true },
      'author-2': { commentAuthorRole: 'Janitor', isCommentAuthorMod: true },
    };

    const post: TestComment = {
      author: { address: 'author-1', displayName: 'Alice' },
      cid: 'post-1',
      content: 'Hello **world**',
      link: 'https://example.com/media.png',
      linkHeight: 120,
      linkWidth: 200,
      locked: true,
      pinned: true,
      replyCount: 5,
      communityAddress: 'music-posting.eth',
      timestamp: 100,
      title: 'Thread title',
    };

    await renderWithRouter(createElement(CatalogRow, { row: [post] }), '/all/catalog');
    vi.useFakeTimers();

    const postLink = document.body.querySelector<HTMLAnchorElement>('a[href="/mu/thread/post-1"]');
    expect(postLink).toBeTruthy();
    expect(container.textContent).toContain('R: 5');
    expect(container.textContent).toContain('/ I: 2');
    expect(container.querySelector('[data-testid="post-menu-post-1"]')?.textContent).toBe('menu');

    const previewTrigger = document.body.querySelector('a[href="/mu/thread/post-1"] > div');
    await act(async () => {
      previewTrigger?.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
      vi.advanceTimersByTime(260);
      await Promise.resolve();
    });

    expect(document.body.textContent).toContain('Thread title by Alice ## Board Owner');
    expect(document.body.textContent).toContain('to p/mu');
    expect(document.body.textContent).toContain('last_reply_by Bob ## Board Janitor');
    expect(document.body.textContent).toContain('ago:100');
    expect(document.body.textContent).toContain('ago:200');
  });

  it('uses alias-aware board features when deciding whether reply links are media', async () => {
    testState.directories = [{ address: 'music-posting.bso', features: { requirePostLinkIsMedia: true }, title: '/mu/ - Music' }];
    testState.linkCount = 3;
    testState.mediaInfoByLink['https://example.com/media.png'] = { type: 'image', url: 'https://example.com/media.png' };

    const post: TestComment = {
      author: { address: 'author-1', displayName: 'Alice' },
      cid: 'post-alias',
      content: 'Alias test',
      link: 'https://example.com/media.png',
      replyCount: 4,
      communityAddress: 'music-posting.eth',
      title: 'Alias title',
    };

    await renderWithRouter(createElement(CatalogRow, { row: [post] }), '/mu/catalog');

    expect(container.textContent).toContain('R: 4');
    expect(container.textContent).toContain('/ I: 3');
    expect(container.textContent).not.toContain('/ L: 3');
    expect(document.body.querySelector('a[href="/mu/thread/post-alias"]')).toBeTruthy();
    expect(container.querySelector('[title="(R)eplies / (I)mage Replies"]')).toBeTruthy();
  });

  it('normalizes legacy board addresses before fetching hover preview replies', async () => {
    testState.directories = [{ address: 'music-posting.eth', features: {}, title: '/mu/ - Music' }];
    testState.mediaInfoByLink['https://example.com/legacy.png'] = { type: 'image', url: 'https://example.com/legacy.png' };
    testState.replies = [];

    const post: TestComment = {
      author: { address: 'author-1', displayName: 'Alice' },
      cid: 'post-legacy',
      content: 'Legacy address thread',
      link: 'https://example.com/legacy.png',
      replyCount: 1,
      replies: {
        pages: {
          new: {
            comments: [
              {
                author: { address: 'author-2', displayName: 'Bob' },
                cid: 'reply-legacy',
                subplebbitAddress: 'music-posting.eth',
                timestamp: 200,
              },
            ],
          },
        },
      },
      subplebbitAddress: 'music-posting.eth',
      timestamp: 100,
      title: 'Legacy title',
    };

    await renderWithRouter(createElement(CatalogRow, { row: [post] }), '/all/catalog');
    vi.useFakeTimers();

    const previewTrigger = document.body.querySelector('a[href="/mu/thread/post-legacy"] > div');
    await act(async () => {
      previewTrigger?.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
      vi.advanceTimersByTime(260);
      await Promise.resolve();
    });

    expect(testState.lastRepliesComment?.communityAddress).toBe('music-posting.eth');
    expect(testState.lastRepliesComment?.replies?.pages?.new?.comments?.[0]?.communityAddress).toBe('music-posting.eth');
    expect(document.body.textContent).toContain('Legacy title by Alice');
    expect(document.body.textContent).toContain('last_reply_by Bob');
  });

  it('renders hidden and text-only threads with canonical board thread links', async () => {
    testState.hiddenCids = new Set(['hidden-1']);
    testState.showOPComment = false;

    const posts: TestComment[] = [
      {
        author: { address: 'hidden-author', displayName: 'Ghost' },
        cid: 'hidden-1',
        content: 'hidden text',
        link: 'https://example.com/hidden.png',
        communityAddress: 'music-posting.eth',
      },
      {
        author: { address: 'text-author', displayName: 'Anon' },
        cid: 'text-1',
        content: 'Plain thread body',
        replyCount: 1,
        communityAddress: 'music-posting.eth',
        title: 'Text title',
      },
    ];

    await renderWithRouter(createElement(CatalogRow, { row: posts }), '/mu/catalog');

    const links = Array.from(document.body.querySelectorAll<HTMLAnchorElement>('a')).map((link) => link.getAttribute('href'));
    expect(links).toContain('/mu/thread/hidden-1');
    expect(links).toContain('/mu/thread/text-1');
    expect(container.textContent).toContain('(hidden)');
    expect(container.textContent).toContain('Text title: Plain thread body');
  });

  it('applies the estimated row height to the virtualization wrapper', async () => {
    const post: TestComment = {
      cid: 'estimated-post',
      content: 'Estimated row body',
      communityAddress: 'music-posting.eth',
    };

    await renderWithRouter(createElement(CatalogRow, { estimatedHeight: 246, row: [post] }), '/mu/catalog');

    expect(container.querySelector('[data-pretext-height="246"]')).toBeTruthy();
  });
});
