import * as React from 'react';
import { createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { Link, MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import PostForm, { LinkTypePreviewer } from '../post-form';
import { OEKAKI_WEB_WARNING_TEXT } from '../../../lib/oekaki/oekaki-copy';
import { POST_OPTIONS_VALIDATION_DELAY_MS } from '../../../lib/utils/post-options-utils';
import usePendingPostNavigationStore from '../../../stores/use-pending-post-navigation-store';
import usePostFormDraftsStore from '../../../stores/use-post-form-drafts-store';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
const act = (React as { act?: (cb: () => void | Promise<void>) => void | Promise<void> }).act as (cb: () => void | Promise<void>) => void | Promise<void>;

const testState = vi.hoisted(() => ({
  account: {
    author: { address: 'alice.eth', displayName: 'Alice' },
    subscriptions: ['music-posting.eth'],
  },
  accountComment: undefined as { communityAddress?: string } | undefined,
  bestAvailableYouTubeThumbnailMock: undefined as undefined | ((link: string) => Promise<string | undefined>),
  accountCommunityAddresses: ['mod.eth'] as string[],
  comments: {} as Record<string, { commentModeration?: { archived?: boolean }; deleted?: boolean; locked?: boolean; postCid?: string; removed?: boolean }>,
  directories: [
    { address: 'music-posting.eth', features: {}, title: '/mu/ - Music' },
    { address: 'mod.eth', features: {}, title: '/mod/ - Moderation' },
  ] as Array<{ address: string; directoryCode?: string; features?: Record<string, unknown>; title?: string }>,
  directoryListsByCode: {} as Record<
    string,
    {
      boards: Array<{ address: string; features?: Record<string, unknown>; publicKey?: string }>;
      directoryCode: string;
      features?: Record<string, unknown>;
      title?: string;
    }
  >,
  editedComment: undefined as { commentModeration?: { archived?: boolean }; deleted?: boolean; locked?: boolean; postCid?: string; removed?: boolean } | undefined,
  gifFrameStatus: 'idle' as 'idle' | 'ready',
  handleUploadMock: vi.fn(),
  uploadFileMock: vi.fn(),
  isOffline: false,
  isOnlineStatusLoading: false,
  isUploading: false,
  isResolvingExternalQuotes: false,
  mediaHostingRuntime: 'web' as 'web' | 'android' | 'electron',
  navigateMock: vi.fn(),
  onAbandonPost: undefined as undefined | (() => void),
  onPublishError: undefined as undefined | ((error: Error) => void),
  onPendingPost: undefined as undefined | ((accountCommentIndex: number, pendingPost: Record<string, unknown>) => void),
  offlineTitle: 'offline board',
  postIndex: undefined as number | undefined,
  publishedPostOptions: undefined as Record<string, unknown> | undefined,
  publishPostOptions: {} as Record<string, unknown>,
  publishPostMock: vi.fn(),
  publishReplyMock: vi.fn(),
  publishReplyError: null as string | null,
  publishReplyStateMessage: null as string | null,
  replyIndex: undefined as number | undefined,
  resetPublishPostOptionsMock: vi.fn(),
  resetPublishReplyOptionsMock: vi.fn(),
  resolvedCommunityAddress: undefined as string | undefined,
  rolesByCommunity: {} as Record<string, Record<string, { role?: string }>>,
  setAccountMock: vi.fn(),
  setPublishPostOptionsMock: vi.fn(),
  setPublishReplyOptionsMock: vi.fn(),
  showUploadControls: true,
  communities: {
    'music-posting.eth': { address: 'music-posting.eth' },
  } as Record<string, unknown>,
  uploadComplete: undefined as ((uploadedUrl: string) => void) | undefined,
  uploadMode: 'always',
  uploadedFileName: 'picked.png' as string | null,
}));

vi.mock('react-i18next', async () => {
  const React = await vi.importActual<typeof import('react')>('react');

  return {
    Trans: ({ i18nKey, components }: { components?: Record<string, React.ReactElement>; i18nKey: string }) => {
      if (i18nKey === 'post_form_rules_faq_prompt') {
        return React.createElement(
          React.Fragment,
          {},
          'Please read the ',
          components?.rules ? React.cloneElement(components.rules, {}, 'Rules') : 'Rules',
          ' and ',
          components?.faq ? React.cloneElement(components.faq, {}, 'FAQ') : 'FAQ',
          ' before posting.',
        );
      }
      if (i18nKey === 'post_form_flash_upload_prompt') {
        return React.createElement(
          React.Fragment,
          {},
          'Recommended SWF host: ',
          components?.catbox ? React.cloneElement(components.catbox, {}, 'Catbox') : 'Catbox',
          '. Upload a .swf, then paste the direct https://files.catbox.moe/...swf link in Link.',
        );
      }

      return i18nKey;
    },
    useTranslation: () => ({
      t: (key: string, options?: Record<string, unknown>) => {
        if (key === 'choose_one') return 'Choose one:';
        if (key === 'post_form_code_tags_prompt') return 'You may highlight syntax and preserve whitespace by using [code] tags.';
        if (typeof options?.count !== 'undefined') return `${key}:${options.count}`;
        return options?.domain ? `${key}:${options.domain}` : key;
      },
    }),
  };
});

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => testState.navigateMock,
  };
});

vi.mock('@bitsocial/bitsocial-react-hooks', () => ({
  setAccount: (account: unknown) => testState.setAccountMock(account),
  useAccount: () => testState.account,
  useAccountComment: () => testState.accountComment,
  useCommunity: (options?: { community?: { name?: string; publicKey?: string } }) => {
    const communityKey = options?.community?.name ?? options?.community?.publicKey;
    return communityKey ? testState.communities[communityKey] : undefined;
  },
  useEditedComment: () => ({ editedComment: testState.editedComment }),
}));

vi.mock('@bitsocial/bitsocial-react-hooks/dist/stores/communities', () => ({
  default: (selector: (state: { communities: typeof testState.communities }) => unknown) => selector({ communities: testState.communities }),
}));

vi.mock('@bitsocial/bitsocial-react-hooks/dist/stores/communities-pages', () => ({
  default: (selector: (state: { comments: typeof testState.comments }) => unknown) => selector({ comments: testState.comments }),
}));

vi.mock('../../../hooks/use-account-community-addresses', () => ({
  useAccountCommunityAddresses: () => testState.accountCommunityAddresses,
}));

vi.mock('../../../hooks/use-directories', () => ({
  findDirectoryByAddress: (directories: typeof testState.directories, address: string | undefined) => directories.find((entry) => entry.address === address),
  useDirectories: () => testState.directories,
  useDirectoryByAddress: (address: string | undefined) => testState.directories.find((entry) => entry.address === address),
  normalizeBoardAddress: (address: string) => address.replace(/\.(bso|eth)$/, ''),
}));

vi.mock('../../../hooks/use-directory-entry', async () => {
  const actual = await vi.importActual<typeof import('../../../hooks/use-directory-entry')>('../../../hooks/use-directory-entry');
  return {
    ...actual,
    useDirectoryEntry: (address: string | undefined, directoryCodeHint?: string) => {
      const list =
        testState.directoryListsByCode[directoryCodeHint ?? ''] ??
        Object.values(testState.directoryListsByCode).find((candidate) => candidate.boards.some((board) => board.address === address));
      return actual.getDirectoryEntryForAddress({
        address,
        directories: testState.directories,
        directoryCodeHint,
        list,
      });
    },
  };
});

vi.mock('../../../hooks/use-community-identifiers', () => ({
  useCommunityIdentifier: (address?: string) => (address ? { name: address } : undefined),
}));

vi.mock('../../../hooks/use-resolved-community-address', () => ({
  useResolvedCommunityAddress: () => testState.resolvedCommunityAddress,
}));

vi.mock('../../../hooks/use-stable-community', () => ({
  useCommunityField: <T,>(communityAddress: string | undefined, selector: (community?: Record<string, unknown> & { roles?: Record<string, { role?: string }> }) => T) => {
    const community = communityAddress ? (testState.communities[communityAddress] as Record<string, unknown> | undefined) : undefined;
    return selector(
      communityAddress
        ? ({
            ...community,
            roles: testState.rolesByCommunity[communityAddress],
          } as Record<string, unknown> & { roles?: Record<string, { role?: string }> })
        : undefined,
    );
  },
}));

vi.mock('../../../hooks/use-fetch-gif-first-frame', () => ({
  default: () => ({
    status: testState.gifFrameStatus,
  }),
}));

vi.mock('../../../hooks/use-is-community-offline', () => ({
  default: () => ({
    isOffline: testState.isOffline,
    isOnlineStatusLoading: testState.isOnlineStatusLoading,
    offlineTitle: testState.offlineTitle,
  }),
}));

vi.mock('../../../hooks/use-is-mobile', () => ({
  default: () => false,
}));

vi.mock('../../../hooks/use-publish-post', async () => {
  const React = await vi.importActual<typeof import('react')>('react');

  return {
    default: ({
      communityAddress,
      onAbandonPost,
      onPublishError,
      onPendingPost,
    }: {
      communityAddress?: string;
      onAbandonPost?: () => void;
      onPublishError?: (error: Error) => void;
      onPendingPost?: (accountCommentIndex: number, pendingPost: Record<string, unknown>) => void;
    }) => {
      const [, forceUpdate] = React.useReducer((value: number) => value + 1, 0);
      testState.onAbandonPost = onAbandonPost;
      testState.onPublishError = onPublishError;
      testState.onPendingPost = onPendingPost;
      const getPublishPostOptions = React.useCallback(
        () => ({
          ...(communityAddress ? { communityAddress } : {}),
          ...testState.publishPostOptions,
        }),
        [communityAddress],
      );
      const publishPost = React.useCallback(
        (options?: Record<string, unknown>) => {
          const sanitizedOptions = Object.entries(options || {}).reduce(
            (acc, [key, value]) => {
              acc[key] = value === '' ? undefined : value;
              return acc;
            },
            {} as Record<string, unknown>,
          );
          testState.publishPostOptions = {
            ...getPublishPostOptions(),
            ...sanitizedOptions,
          };
          testState.publishedPostOptions = testState.publishPostOptions;
          const result = testState.publishPostMock(options);
          forceUpdate();
          return result;
        },
        [getPublishPostOptions],
      );
      const resetPublishPostOptions = React.useCallback(() => {
        testState.publishPostOptions = {};
        testState.resetPublishPostOptionsMock();
        forceUpdate();
      }, []);
      const setPublishPostOptions = React.useCallback(
        (options: Record<string, unknown>) => {
          const sanitizedOptions = Object.entries(options).reduce(
            (acc, [key, value]) => {
              acc[key] = value === '' ? undefined : value;
              return acc;
            },
            {} as Record<string, unknown>,
          );

          testState.setPublishPostOptionsMock(options);
          testState.publishPostOptions = {
            ...getPublishPostOptions(),
            ...sanitizedOptions,
          };
          forceUpdate();
        },
        [getPublishPostOptions],
      );

      return {
        postIndex: testState.postIndex,
        publishPost,
        publishPostOptions: getPublishPostOptions(),
        resetPublishPostOptions,
        setPublishPostOptions,
      };
    },
  };
});

vi.mock('../../../hooks/use-publish-reply', async () => {
  const React = await vi.importActual<typeof import('react')>('react');

  return {
    default: ({ cid, postCid, communityAddress }: { cid: string; postCid?: string; communityAddress: string }) => {
      const [publishReplyOptions, setPublishReplyOptionsState] = React.useState<Record<string, unknown>>({
        parentCid: cid,
        postCid: postCid ?? cid,
        communityAddress,
      });
      const publishReply = React.useCallback((options?: Record<string, unknown>) => {
        if (options) {
          testState.setPublishReplyOptionsMock(options);
          setPublishReplyOptionsState((previous) => ({ ...previous, ...options }));
        }
        return testState.publishReplyMock(options);
      }, []);
      const resetPublishReplyOptions = React.useCallback(() => testState.resetPublishReplyOptionsMock(), []);
      const setPublishReplyOptions = React.useCallback((options: Record<string, unknown>) => {
        testState.setPublishReplyOptionsMock(options);
        setPublishReplyOptionsState((previous) => ({ ...previous, ...options }));
      }, []);

      return {
        isResolvingExternalQuotes: testState.isResolvingExternalQuotes,
        publishReply,
        publishReplyError: testState.publishReplyError,
        publishReplyStateMessage: testState.publishReplyStateMessage,
        replyIndex: testState.replyIndex,
        resetPublishReplyOptions,
        setPublishReplyOptions,
        _publishReplyOptions: publishReplyOptions,
      };
    },
  };
});

vi.mock('../../../hooks/use-file-upload', () => ({
  useFileUpload: ({ onUploadComplete }: { onUploadComplete: (uploadedUrl: string) => void }) => {
    testState.uploadComplete = onUploadComplete;
    return {
      handleUpload: testState.handleUploadMock,
      uploadFile: testState.uploadFileMock,
      isUploading: testState.isUploading,
      uploadedFileName: testState.uploadedFileName,
    };
  },
}));

vi.mock('../../loading-ellipsis/loading-ellipsis', () => ({
  default: ({ string }: { string: string }) => createElement('span', { 'data-testid': 'loading-ellipsis' }, string),
}));

vi.mock('../../../lib/utils/media-utils', () => {
  const getTwimgMediaFilePublishUrl = (link: string) => {
    try {
      const url = new URL(link.trim());
      const pathParts = url.pathname.split('/').filter(Boolean);
      const [mediaPath, mediaId] = pathParts;
      const format = url.searchParams.get('format')?.toLowerCase();
      if (url.hostname !== 'pbs.twimg.com' || pathParts.length !== 2 || mediaPath !== 'media' || !mediaId || mediaId.includes('.')) return undefined;
      if (!format || !['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(format)) return undefined;
      return `https://pbs.twimg.com/media/${mediaId}.${format}`;
    } catch {
      return undefined;
    }
  };

  return {
    getDisplayMediaInfoType: (type: string, t: (key: string) => string) => t(type),
    getLinkMediaInfo: (link: string) => {
      const path = (() => {
        try {
          return new URL(link).pathname;
        } catch {
          return link;
        }
      })();
      if (getTwimgMediaFilePublishUrl(link)) {
        return { type: 'image', url: link };
      }
      if (path.endsWith('.gif')) {
        return { type: 'gif', url: link };
      }
      if (path.endsWith('.jpg') || path.endsWith('.jpeg') || path.endsWith('.png')) {
        return { type: 'image', url: link };
      }
      if (path.endsWith('.mp4')) {
        return { type: 'video', url: link };
      }
      if (path.endsWith('.mp3')) {
        return { type: 'audio', url: link };
      }
      if (link.includes('youtube.com')) {
        return { patternThumbnailUrl: 'https://img.youtube.com/vi/abc123/maxresdefault.jpg', type: 'iframe', url: link };
      }
      return { type: 'webpage', url: link };
    },
    getTwimgMediaFilePublishUrl,
    getYouTubeThumbnailUrlFromLink: (link: string) => {
      try {
        const url = new URL(link);
        if (!url.hostname.includes('youtube.com')) return undefined;
        const videoId = url.searchParams.get('v');
        return videoId ? `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg` : undefined;
      } catch {
        return undefined;
      }
    },
    getBestAvailableYouTubeThumbnailUrlFromLink: async (link: string) => {
      if (testState.bestAvailableYouTubeThumbnailMock) {
        return testState.bestAvailableYouTubeThumbnailMock(link);
      }

      try {
        const url = new URL(link);
        if (!url.hostname.includes('youtube.com')) return undefined;
        const videoId = url.searchParams.get('v');
        return videoId ? `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg` : undefined;
      } catch {
        return undefined;
      }
    },
  };
});

vi.mock('../../../lib/media-hosting/show-upload-controls', () => ({
  getMediaHostingRuntime: () => testState.mediaHostingRuntime,
  getShowUploadControls: () => testState.showUploadControls,
  isWebRuntime: () => testState.mediaHostingRuntime === 'web',
}));

vi.mock('../../../stores/use-media-hosting-store', () => ({
  default: (selector: (state: { uploadMode: string }) => unknown) =>
    selector({
      uploadMode: testState.uploadMode,
    }),
}));

vi.mock('lodash/debounce', () => ({
  default: <T extends (...args: any[]) => void>(fn: T, wait = 0) => {
    let timeout: ReturnType<typeof setTimeout> | undefined;
    const wrapped = ((...args: Parameters<T>) => {
      if (timeout) {
        clearTimeout(timeout);
      }
      timeout = setTimeout(() => fn(...args), wait);
    }) as T & { cancel: () => void };
    wrapped.cancel = () => {
      if (timeout) {
        clearTimeout(timeout);
      }
      timeout = undefined;
    };
    return wrapped;
  },
}));

let container: HTMLDivElement;
let root: Root;

const flushEffects = async (count = 4) => {
  for (let i = 0; i < count; i += 1) {
    await act(async () => {
      await Promise.resolve();
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
  }
};

const renderPostForm = async (initialEntry: string) => {
  await act(async () => {
    root.render(
      createElement(
        MemoryRouter,
        { initialEntries: [initialEntry] },
        createElement(
          Routes,
          {},
          createElement(Route, { path: '/all/*', element: createElement(PostForm) }),
          createElement(Route, { path: '/subs/*', element: createElement(PostForm) }),
          createElement(Route, { path: '/mod/*', element: createElement(PostForm) }),
          createElement(Route, { path: '/:boardIdentifier/thread/:commentCid/*', element: createElement(PostForm) }),
          createElement(Route, { path: '/:boardIdentifier/*', element: createElement(PostForm) }),
        ),
      ),
    );
  });
  await flushEffects();
};

const KeyedPostForm = () => {
  const location = useLocation();
  return createElement(PostForm, { key: location.pathname });
};

const renderNavigablePostForm = async (initialEntry: string) => {
  await act(async () => {
    root.render(
      createElement(
        MemoryRouter,
        { initialEntries: [initialEntry] },
        createElement(
          React.Fragment,
          {},
          createElement(Link, { to: '/biz' }, 'go_biz'),
          createElement(Link, { to: '/biz?search=first' }, 'go_biz_first_search'),
          createElement(Link, { to: '/biz?search=second' }, 'go_biz_second_search'),
          createElement(Link, { to: '/biz/thread/thread-cid' }, 'go_thread'),
          createElement(
            Routes,
            {},
            createElement(Route, { path: '/:boardIdentifier/thread/:commentCid/*', element: createElement(KeyedPostForm) }),
            createElement(Route, { path: '/:boardIdentifier/*', element: createElement(KeyedPostForm) }),
          ),
        ),
      ),
    );
  });
  await flushEffects();
};

const clickByText = async (scope: ParentNode, text: string, index = 0) => {
  const button = Array.from(scope.querySelectorAll('button')).filter((candidate) => candidate.textContent === text)[index] as HTMLButtonElement | undefined;
  await act(async () => {
    button?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
};

const clickLinkByText = async (scope: ParentNode, text: string, index = 0) => {
  const link = Array.from(scope.querySelectorAll('a')).filter((candidate) => candidate.textContent === text)[index] as HTMLAnchorElement | undefined;
  await act(async () => {
    link?.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
  });
  await flushEffects();
};

const dispatchInput = async (element: HTMLInputElement | HTMLTextAreaElement, value: string) => {
  await act(async () => {
    const prototype = element instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    const descriptor = Object.getOwnPropertyDescriptor(prototype, 'value');
    descriptor?.set?.call(element, value);
    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
  });
};

const waitForOptionsValidation = async () => {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, POST_OPTIONS_VALIDATION_DELAY_MS + 20));
  });
};

const waitForContentLengthValidation = async () => {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 1020));
  });
};

const dispatchChange = async (element: HTMLInputElement | HTMLSelectElement, value: string | boolean) => {
  await act(async () => {
    if (typeof value === 'boolean' && 'checked' in element) {
      element.checked = value;
    } else {
      element.value = String(value);
    }
    element.dispatchEvent(new Event('change', { bubbles: true }));
  });
};

describe('PostForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    usePostFormDraftsStore.setState({ forms: {} });
    usePendingPostNavigationStore.getState().clearPendingPostNavigation();
    testState.account = {
      author: { address: 'alice.eth', displayName: 'Alice' },
      subscriptions: ['music-posting.eth'],
    };
    testState.accountComment = undefined;
    testState.bestAvailableYouTubeThumbnailMock = undefined;
    testState.accountCommunityAddresses = ['mod.eth'];
    testState.comments = {};
    testState.directories = [
      { address: 'music-posting.eth', features: {}, title: '/mu/ - Music' },
      { address: 'politically-incorrect.bso', directoryCode: 'pol', features: { hasFlags: true }, title: '/pol/ - Politically Incorrect' },
      { address: 'sports-posting.bso', directoryCode: 'sp', features: { hasFlags: true }, title: '/sp/ - Sports' },
      { address: 'random-nsfw.bso', features: {}, title: '/b/ - Random' },
      {
        address: 'flash-posting.bso',
        directoryCode: 'f',
        features: { postFlairs: true, requirePostFlairs: true, requirePostLink: true, requirePostLinkIsMedia: false },
        title: '/f/ - Flash',
      },
      { address: 'technology-posting.bso', directoryCode: 'g', features: {}, title: '/g/ - Technology' },
      { address: 'site-feedback.bso', directoryCode: 'q', features: {}, title: '/q/ - 5chan Feedback' },
      { address: 'silly-stuff.bso', features: {}, title: '/s5s/ - Silly Stuff' },
      { address: 'traditional-games.bso', features: {}, title: '/tg/ - Traditional Games' },
      { address: 'mod.eth', features: {}, title: '/mod/ - Moderation' },
    ];
    testState.directoryListsByCode = {};
    testState.editedComment = undefined;
    testState.gifFrameStatus = 'idle';
    testState.isOffline = false;
    testState.isOnlineStatusLoading = false;
    testState.isUploading = false;
    testState.isResolvingExternalQuotes = false;
    testState.mediaHostingRuntime = 'web';
    testState.offlineTitle = 'offline board';
    testState.onAbandonPost = undefined;
    testState.onPublishError = undefined;
    testState.onPendingPost = undefined;
    testState.postIndex = undefined;
    testState.publishedPostOptions = undefined;
    testState.publishPostOptions = {};
    testState.publishReplyError = null;
    testState.publishReplyStateMessage = null;
    testState.replyIndex = undefined;
    testState.resolvedCommunityAddress = undefined;
    testState.rolesByCommunity = {};
    testState.showUploadControls = true;
    testState.uploadComplete = undefined;
    testState.uploadMode = 'always';
    testState.uploadedFileName = 'picked.png';
    testState.communities = {
      'music-posting.eth': { address: 'music-posting.eth' },
      'traditional-games.bso': { address: 'traditional-games.bso' },
    };
    testState.handleUploadMock.mockReset();
    testState.uploadFileMock.mockReset();
    testState.navigateMock.mockReset();
    testState.publishPostMock.mockReset();
    testState.publishReplyMock.mockReset();
    testState.resetPublishPostOptionsMock.mockReset();
    testState.resetPublishReplyOptionsMock.mockReset();
    testState.setAccountMock.mockReset();
    testState.setPublishPostOptionsMock.mockReset();
    testState.setPublishReplyOptionsMock.mockReset();
    Object.defineProperty(globalThis, 'alert', {
      configurable: true,
      value: vi.fn(),
      writable: true,
    });

    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    usePendingPostNavigationStore.getState().clearPendingPostNavigation();
  });

  it('shows the closed-thread notice when the current post can no longer receive replies', async () => {
    testState.comments = {
      'thread-cid': {
        locked: true,
        postCid: 'thread-cid',
      },
    };

    await renderPostForm('/mu/thread/thread-cid');

    expect(container.textContent).toContain('thread_closed');
    expect(container.textContent).toContain('may_not_reply');
  });

  it('shows the closed-thread notice for archived threads', async () => {
    testState.comments = {
      'thread-cid': {
        postCid: 'thread-cid',
        commentModeration: {
          archived: true,
        },
      },
    };

    await renderPostForm('/mu/thread/thread-cid');

    expect(container.textContent).toContain('thread_archived');
    expect(container.textContent).toContain('may_not_reply');
  });

  it('opens the new-thread form, validates all-view requirements, and publishes a board post', async () => {
    await renderPostForm('/all');
    await clickByText(container, 'start_new_thread');

    const table = container.querySelector('table');
    expect(table).toBeTruthy();

    await clickByText(table as HTMLTableElement, 'choose_file');
    expect(testState.handleUploadMock).toHaveBeenCalledTimes(1);

    await clickByText(table as HTMLTableElement, 'post');
    expect(globalThis.alert).not.toHaveBeenCalled();
    expect(container.textContent).toContain('error: empty_comment_alert');
    expect(table?.querySelector('tbody tr.rules')?.textContent).toContain('Please read the Rules and FAQ before posting.');
    expect(table?.querySelector('tfoot')?.textContent).toContain('error: empty_comment_alert');
    expect(table?.querySelector('tbody')?.nextElementSibling).toBe(table?.querySelector('tfoot'));

    const textInputs = table?.querySelectorAll<HTMLInputElement>('input[type="text"]') || [];
    const nameInput = textInputs[0];
    const optionsInput = textInputs[1];
    const subjectInput = textInputs[2];
    const linkInput = textInputs[3];
    const textarea = table?.querySelector('textarea');
    const select = table?.querySelector('select');

    expect(nameInput).toBeTruthy();
    expect(optionsInput?.getAttribute('aria-label')).toBe('options');
    expect(subjectInput).toBeTruthy();
    expect(linkInput).toBeTruthy();
    expect(linkInput?.getAttribute('placeholder')).toBe('https://website.com/image.jpg');
    expect(textarea).toBeTruthy();
    expect(select).toBeTruthy();
    expect(select?.className).toContain('boardSelector');

    await dispatchInput(linkInput as HTMLInputElement, 'not-a-url');
    await clickByText(table as HTMLTableElement, 'post');
    expect(globalThis.alert).not.toHaveBeenCalled();
    expect(container.textContent).toContain('error: invalid_url_alert');

    await dispatchInput(linkInput as HTMLInputElement, 'https://example.com/page');
    await clickByText(table as HTMLTableElement, 'post');
    expect(globalThis.alert).not.toHaveBeenCalled();
    expect(container.textContent).toContain('error: link_not_image_or_video_alert');
    expect(testState.publishPostMock).not.toHaveBeenCalled();

    await dispatchInput(textarea as HTMLTextAreaElement, 'A valid body');
    await dispatchInput(linkInput as HTMLInputElement, 'https://i.4cdn.org/gif/file.jpg');
    await clickByText(table as HTMLTableElement, 'post');
    expect(globalThis.alert).not.toHaveBeenCalled();
    expect(container.textContent).toContain('error: expiring_media_link_alert:i.4cdn.org');
    expect(testState.publishPostMock).not.toHaveBeenCalled();

    await dispatchInput(linkInput as HTMLInputElement, '');
    await clickByText(table as HTMLTableElement, 'post');
    expect(globalThis.alert).not.toHaveBeenCalled();
    expect(container.textContent).toContain('error: no_board_selected_warning');

    await dispatchChange(select as HTMLSelectElement, 'music-posting.eth');
    await dispatchInput(nameInput as HTMLInputElement, 'Alice Cooper');
    await dispatchInput(subjectInput as HTMLInputElement, 'A thread');

    const spoilerToggle = table?.querySelector<HTMLInputElement>('input[type="checkbox"]');
    if (spoilerToggle) {
      await dispatchChange(spoilerToggle, true);
    }

    (globalThis.alert as ReturnType<typeof vi.fn>).mockClear();
    await clickByText(table as HTMLTableElement, 'post');

    expect(testState.publishPostMock).toHaveBeenCalledTimes(1);
    expect(testState.setPublishPostOptionsMock).toHaveBeenCalledWith({ communityAddress: 'music-posting.eth' });
  });

  it('converts YouTube links to thumbnail file links on media-only post forms', async () => {
    const youtubeLink = 'https://www.youtube.com/watch?v=abc123';
    const thumbnailLink = 'https://img.youtube.com/vi/abc123/maxresdefault.jpg';

    await renderPostForm('/all');
    await clickByText(container, 'start_new_thread');

    const table = container.querySelector('table') as HTMLTableElement;
    const select = table.querySelector('select') as HTMLSelectElement;
    const textarea = table.querySelector('textarea') as HTMLTextAreaElement;
    const linkInput = table.querySelectorAll<HTMLInputElement>('input[type="text"]')[3];
    const getConversionNotice = () =>
      Array.from(container.querySelectorAll<HTMLDivElement>('div'))
        .reverse()
        .find((element) => element.textContent?.includes('youtube_thumbnail_link_conversion_notice'));

    await dispatchChange(select, 'music-posting.eth');

    vi.useFakeTimers();
    try {
      await dispatchInput(textarea, 'test');
      textarea.setSelectionRange(textarea.value.length, textarea.value.length);
      await dispatchInput(linkInput, youtubeLink);

      expect(linkInput.value).toBe(youtubeLink);
      expect(linkInput.disabled).toBe(true);
      expect(container.textContent).toContain('youtube_thumbnail_link_conversion_notice');
      expect(container.textContent).toContain('3');
      expect(table.textContent).toContain('youtube_thumbnail_link_conversion_notice');
      expect(getConversionNotice()?.className).toContain('formError');
      expect(getConversionNotice()?.closest('tfoot')).toBeTruthy();

      await act(async () => {
        vi.advanceTimersByTime(1000);
      });
      expect(container.textContent).toContain('2');
      expect(linkInput.disabled).toBe(true);

      await act(async () => {
        vi.advanceTimersByTime(1000);
      });
      expect(container.textContent).toContain('1');
      expect(linkInput.disabled).toBe(true);

      await act(async () => {
        vi.advanceTimersByTime(1000);
      });

      expect(linkInput.value).toBe(thumbnailLink);
      expect(linkInput.disabled).toBe(false);
      expect(textarea.value).toBe(`test ${youtubeLink}`);
      expect(container.textContent).not.toContain('youtube_thumbnail_link_conversion_notice');
    } finally {
      vi.clearAllTimers();
      vi.useRealTimers();
    }

    await clickByText(table, 'post');

    expect(testState.publishPostMock).toHaveBeenCalledTimes(1);
    expect(testState.publishedPostOptions?.link).toBe(thumbnailLink);
    expect(testState.publishedPostOptions?.content).toBe(`test ${youtubeLink}`);
  });

  it('requires a link when live community features require post links', async () => {
    testState.resolvedCommunityAddress = 'music-posting.eth';
    testState.communities['music-posting.eth'] = {
      address: 'music-posting.eth',
      features: { requirePostLink: true },
    };

    await renderPostForm('/mu');
    await clickByText(container, 'start_new_thread');

    const table = container.querySelector('table') as HTMLTableElement;
    const textarea = table.querySelector('textarea') as HTMLTextAreaElement;
    const linkInput = table.querySelectorAll<HTMLInputElement>('input[type="text"]')[3];

    await dispatchInput(textarea, 'Link required thread');
    await clickByText(table, 'post');

    expect(container.textContent).toContain('error: post_link_required_alert');
    const linkRequiredError = Array.from(container.querySelectorAll('div')).find((element) => element.textContent === 'error: post_link_required_alert');
    expect(linkRequiredError?.className).toContain('error');
    expect(linkRequiredError?.className).toContain('formError');
    expect(linkRequiredError?.closest('tfoot')).toBeTruthy();
    expect(testState.publishPostMock).not.toHaveBeenCalled();

    await dispatchInput(linkInput, 'https://example.com/thread');
    await clickByText(table, 'post');

    expect(testState.publishPostMock).toHaveBeenCalledTimes(1);
    expect(testState.publishedPostOptions?.link).toBe('https://example.com/thread');
  });

  it('requires a media link when live community features require post links to be media', async () => {
    testState.resolvedCommunityAddress = 'music-posting.eth';
    testState.communities['music-posting.eth'] = {
      address: 'music-posting.eth',
      features: { requirePostLink: true, requirePostLinkIsMedia: true },
    };

    await renderPostForm('/mu');
    await clickByText(container, 'start_new_thread');

    const table = container.querySelector('table') as HTMLTableElement;
    const textarea = table.querySelector('textarea') as HTMLTextAreaElement;
    const linkInput = table.querySelectorAll<HTMLInputElement>('input[type="text"]')[3];

    await dispatchInput(textarea, 'Media required thread');
    await clickByText(table, 'post');

    expect(container.textContent).toContain('error: post_media_link_required_alert');
    const mediaRequiredError = Array.from(container.querySelectorAll('div')).find((element) => element.textContent === 'error: post_media_link_required_alert');
    expect(mediaRequiredError?.className).toContain('error');
    expect(mediaRequiredError?.className).toContain('formError');
    expect(mediaRequiredError?.closest('tfoot')).toBeTruthy();
    expect(testState.publishPostMock).not.toHaveBeenCalled();

    await dispatchInput(linkInput, 'https://example.com/page');
    await clickByText(table, 'post');

    expect(container.textContent).toContain('error: link_not_image_or_video_alert');
    expect(testState.publishPostMock).not.toHaveBeenCalled();

    await dispatchInput(linkInput, 'https://example.com/image.jpg');
    await clickByText(table, 'post');

    expect(testState.publishPostMock).toHaveBeenCalledTimes(1);
    expect(testState.publishedPostOptions?.link).toBe('https://example.com/image.jpg');
  });

  it('does not require an empty link when only media links are constrained', async () => {
    testState.resolvedCommunityAddress = 'current-news.bso';
    testState.directories.push({
      address: 'current-news.bso',
      directoryCode: 'news',
      features: { requirePostLink: false, requirePostLinkIsMedia: true },
      title: '/news/ - Current News',
    });
    testState.communities['current-news.bso'] = {
      address: 'current-news.bso',
      features: { requirePostLink: false, requirePostLinkIsMedia: true },
    };

    await renderPostForm('/news');
    await clickByText(container, 'start_new_thread');

    const table = container.querySelector('table') as HTMLTableElement;
    const textarea = table.querySelector('textarea') as HTMLTextAreaElement;
    const linkInput = table.querySelectorAll<HTMLInputElement>('input[type="text"]')[3];

    await dispatchInput(textarea, 'News body with source in text');
    await clickByText(table, 'post');

    expect(container.textContent).not.toContain('post_media_link_required_alert');
    expect(testState.publishPostMock).toHaveBeenCalledTimes(1);
    expect(testState.publishedPostOptions?.link).toBeUndefined();

    testState.publishPostMock.mockClear();
    await dispatchInput(linkInput, 'https://example.com/article');
    await clickByText(table, 'post');

    expect(container.textContent).toContain('error: link_not_image_or_video_alert');
    expect(testState.publishPostMock).not.toHaveBeenCalled();
  });

  it('ignores duplicate post clicks while youtube thumbnail resolution is pending', async () => {
    const youtubeLink = 'https://www.youtube.com/watch?v=slow123';
    const thumbnailLink = 'https://img.youtube.com/vi/slow123/maxresdefault.jpg';
    let resolveThumbnail: (thumbnailLink: string) => void = () => {};
    const thumbnailPromise = new Promise<string | undefined>((resolve) => {
      resolveThumbnail = resolve;
    });
    const resolverMock = vi.fn(() => thumbnailPromise);
    testState.bestAvailableYouTubeThumbnailMock = resolverMock;

    await renderPostForm('/all');
    await clickByText(container, 'start_new_thread');

    const table = container.querySelector('table') as HTMLTableElement;
    const select = table.querySelector('select') as HTMLSelectElement;
    const textarea = table.querySelector('textarea') as HTMLTextAreaElement;
    const linkInput = table.querySelectorAll<HTMLInputElement>('input[type="text"]')[3];
    const postButton = Array.from(table.querySelectorAll('button')).find((button) => button.textContent === 'post') as HTMLButtonElement;

    await dispatchChange(select, 'music-posting.eth');
    await dispatchInput(textarea, 'Video body');
    textarea.setSelectionRange(textarea.value.length, textarea.value.length);
    await dispatchInput(linkInput, youtubeLink);

    await clickByText(table, 'post');
    expect(postButton.disabled).toBe(true);

    await clickByText(table, 'post');
    expect(resolverMock).toHaveBeenCalledTimes(1);
    expect(testState.publishPostMock).not.toHaveBeenCalled();

    await act(async () => {
      resolveThumbnail(thumbnailLink);
      await thumbnailPromise;
      await Promise.resolve();
    });

    expect(testState.publishPostMock).toHaveBeenCalledTimes(1);
    expect(testState.publishedPostOptions?.link).toBe(thumbnailLink);
    expect(testState.publishedPostOptions?.content).toBe(`Video body ${youtubeLink}`);
  });

  it('ignores duplicate post clicks while publish is pending', async () => {
    let resolvePublish: () => void = () => {};
    const publishPromise = new Promise<void>((resolve) => {
      resolvePublish = resolve;
    });
    testState.publishPostMock.mockReturnValue(publishPromise);

    await renderPostForm('/all');
    await clickByText(container, 'start_new_thread');

    const table = container.querySelector('table') as HTMLTableElement;
    const select = table.querySelector('select') as HTMLSelectElement;
    const textarea = table.querySelector('textarea') as HTMLTextAreaElement;
    const postButton = Array.from(table.querySelectorAll('button')).find((button) => button.textContent === 'post') as HTMLButtonElement;

    await dispatchChange(select, 'music-posting.eth');
    await dispatchInput(textarea, 'Thread body');

    await clickByText(table, 'post');
    expect(postButton.disabled).toBe(true);

    await clickByText(table, 'post');
    expect(testState.publishPostMock).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolvePublish();
      await publishPromise;
    });
    await flushEffects();

    expect(postButton.disabled).toBe(false);
  });

  it('publishes known twimg query-format post links with a path extension without editing the field', async () => {
    const twimgLink = 'https://pbs.twimg.com/media/HJxnhNKWMAAhqFU?format=jpg&name=medium';
    const publishLink = 'https://pbs.twimg.com/media/HJxnhNKWMAAhqFU.jpg';

    await renderPostForm('/all');
    await clickByText(container, 'start_new_thread');

    const table = container.querySelector('table') as HTMLTableElement;
    const select = table.querySelector('select') as HTMLSelectElement;
    const textarea = table.querySelector('textarea') as HTMLTextAreaElement;
    const linkInput = table.querySelectorAll<HTMLInputElement>('input[type="text"]')[3];

    await dispatchChange(select, 'music-posting.eth');
    await dispatchInput(textarea, 'Twimg thread');
    await dispatchInput(linkInput, twimgLink);
    await clickByText(table, 'post');

    expect(linkInput.value).toBe(twimgLink);
    expect(testState.publishPostMock).toHaveBeenCalledTimes(1);
    expect(testState.publishPostMock).toHaveBeenCalledWith({
      content: 'Twimg thread',
      link: publishLink,
    });
    expect(testState.publishedPostOptions?.link).toBe(publishLink);
  });

  it('rewrites known twimg query-format links to their path-extension form when the link field loses focus', async () => {
    await renderPostForm('/all');
    await clickByText(container, 'start_new_thread');

    const table = container.querySelector('table') as HTMLTableElement;
    const select = table.querySelector('select') as HTMLSelectElement;
    const linkInput = table.querySelectorAll<HTMLInputElement>('input[type="text"]')[3];

    await dispatchChange(select, 'music-posting.eth');

    const blurLinkInput = async () => {
      await act(async () => {
        linkInput.dispatchEvent(new FocusEvent('focusout', { bubbles: true }));
      });
    };

    // A twimg `?format=jpg` link becomes its `.jpg` form once the field loses focus.
    await dispatchInput(linkInput, 'https://pbs.twimg.com/media/HJxnhNKWMAAhqFU?format=jpg&name=medium');
    expect(linkInput.value).toBe('https://pbs.twimg.com/media/HJxnhNKWMAAhqFU?format=jpg&name=medium');
    await blurLinkInput();
    expect(linkInput.value).toBe('https://pbs.twimg.com/media/HJxnhNKWMAAhqFU.jpg');

    // The detected format is preserved (png stays png).
    await dispatchInput(linkInput, 'https://pbs.twimg.com/media/ZZZ9?format=png&name=orig');
    await blurLinkInput();
    expect(linkInput.value).toBe('https://pbs.twimg.com/media/ZZZ9.png');

    // Non-twimg links are left untouched.
    await dispatchInput(linkInput, 'https://example.com/photo?format=jpg&name=large');
    await blurLinkInput();
    expect(linkInput.value).toBe('https://example.com/photo?format=jpg&name=large');
  });

  it('shows Oekaki draw controls only on the /i/ board form', async () => {
    testState.directories.push({
      address: 'oekaki-posting.bso',
      directoryCode: 'i',
      features: { requirePostLink: true, requirePostLinkIsMedia: true },
      title: '/i/ - Oekaki',
    });
    testState.communities['oekaki-posting.bso'] = { address: 'oekaki-posting.bso' };
    testState.resolvedCommunityAddress = 'oekaki-posting.bso';

    await renderPostForm('/i');
    await clickByText(container, 'start_new_thread');

    const table = container.querySelector('table') as HTMLTableElement;
    const drawRow = Array.from(table.querySelectorAll('tr')).find((row) => row.textContent?.includes('Size') && row.textContent?.includes('Replay'));
    expect(table.textContent).toContain('Size');
    expect(table.textContent).toContain('Replay');
    expect(Array.from(table.querySelectorAll('span')).some((span) => span.textContent === '×')).toBe(true);
    expect(drawRow?.textContent).not.toContain(OEKAKI_WEB_WARNING_TEXT);
    expect(Array.from(table.querySelectorAll('button')).some((button) => button.textContent === 'Draw')).toBe(true);
    expect((Array.from(table.querySelectorAll('button')).find((button) => button.textContent === 'Clear') as HTMLButtonElement | undefined)?.disabled).toBe(true);
    const rulesItems = Array.from(table.querySelectorAll('tr.rules li')).map((item) => item.textContent);
    expect(rulesItems).toEqual(['Please read the Rules and FAQ before posting.', OEKAKI_WEB_WARNING_TEXT]);

    testState.mediaHostingRuntime = 'electron';
    await renderPostForm('/i');
    await clickByText(container, 'start_new_thread');

    expect(container.textContent).not.toContain(OEKAKI_WEB_WARNING_TEXT);

    testState.resolvedCommunityAddress = 'music-posting.eth';
    await renderPostForm('/mu');
    await clickByText(container, 'start_new_thread');

    expect(Array.from(container.querySelectorAll('button')).some((button) => button.textContent === 'Draw')).toBe(false);
  });

  it('restores each location post form visibility and draft after navigation', async () => {
    testState.resolvedCommunityAddress = 'music-posting.eth';
    await renderNavigablePostForm('/biz');
    await clickByText(container, 'start_new_thread');

    let table = container.querySelector('table');
    const textarea = table?.querySelector('textarea');
    const optionsInput = table?.querySelector<HTMLInputElement>('[aria-label="options"]');
    const subjectInput = table?.querySelector<HTMLInputElement>('[aria-label="subject"]');
    const linkInput = table?.querySelector<HTMLInputElement>('[aria-label="link"]');
    const spoilerInput = table?.querySelector<HTMLInputElement>('input[type="checkbox"]');

    expect(table).toBeTruthy();
    expect(textarea).toBeTruthy();
    expect(optionsInput).toBeTruthy();
    expect(subjectInput).toBeTruthy();
    expect(linkInput).toBeTruthy();
    expect(spoilerInput).toBeTruthy();

    await dispatchInput(optionsInput as HTMLInputElement, 'nonoko');
    await dispatchInput(subjectInput as HTMLInputElement, 'Saved subject');
    await dispatchInput(textarea as HTMLTextAreaElement, 'saved board draft');
    await dispatchInput(linkInput as HTMLInputElement, 'https://example.com/saved.png');
    await act(async () => {
      spoilerInput?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    await clickLinkByText(container, 'go_thread');
    expect(testState.resetPublishPostOptionsMock).toHaveBeenCalledTimes(1);
    expect(container.querySelector('table')).toBeNull();

    await clickByText(container, 'post_a_reply');
    expect(container.querySelector<HTMLTextAreaElement>('textarea')?.value).toBe('');

    await clickLinkByText(container, 'go_biz');

    table = container.querySelector('table');
    expect(table).toBeTruthy();
    expect(table?.querySelector<HTMLInputElement>('[aria-label="options"]')?.value).toBe('nonoko');
    expect(table?.querySelector<HTMLInputElement>('[aria-label="subject"]')?.value).toBe('Saved subject');
    expect(table?.querySelector<HTMLTextAreaElement>('textarea')?.value).toBe('saved board draft');
    expect(table?.querySelector<HTMLInputElement>('[aria-label="link"]')?.value).toBe('https://example.com/saved.png');
    expect(table?.querySelector<HTMLInputElement>('input[type="checkbox"]')?.checked).toBe(true);

    await clickByText(table as HTMLTableElement, 'post');
    expect(testState.publishPostMock).toHaveBeenCalledWith({
      content: 'saved board draft',
      link: 'https://example.com/saved.png',
      spoiler: true,
      title: 'Saved subject',
    });
  });

  it('restores the correct post draft when only the location search changes', async () => {
    testState.resolvedCommunityAddress = 'music-posting.eth';
    await renderNavigablePostForm('/biz?search=first');
    await clickByText(container, 'start_new_thread');
    await dispatchInput(container.querySelector<HTMLTextAreaElement>('textarea') as HTMLTextAreaElement, 'first search draft');

    await clickLinkByText(container, 'go_biz_second_search');
    await clickByText(container, 'start_new_thread');
    await dispatchInput(container.querySelector<HTMLTextAreaElement>('textarea') as HTMLTextAreaElement, 'second search draft');

    await clickLinkByText(container, 'go_biz_first_search');
    expect(container.querySelector<HTMLTextAreaElement>('textarea')?.value).toBe('first search draft');

    await clickLinkByText(container, 'go_biz_second_search');
    expect(container.querySelector<HTMLTextAreaElement>('textarea')?.value).toBe('second search draft');
  });

  it('shows a 4chan-style flag field on flag boards and publishes the default geographic request', async () => {
    testState.resolvedCommunityAddress = 'politically-incorrect.bso';

    await renderPostForm('/pol');
    await clickByText(container, 'start_new_thread');

    const table = container.querySelector('table');
    const flagSelect = table?.querySelector<HTMLSelectElement>('select[aria-label="flag"]');
    const textarea = table?.querySelector<HTMLTextAreaElement>('textarea');

    expect(flagSelect).toBeTruthy();
    expect(flagSelect?.value).toBe('country:auto');
    expect(
      Array.from(flagSelect?.options || [])
        .slice(0, 4)
        .map((option) => option.textContent),
    ).toEqual(['Geographic Location', 'Anarcho-Capitalist', 'Anarchist', 'Black Nationalist']);

    await dispatchInput(textarea as HTMLTextAreaElement, 'flagged post');
    await clickByText(table as HTMLTableElement, 'post');

    expect(testState.publishPostMock).toHaveBeenCalledWith({
      content: 'flagged post',
      challengeRequest: {
        challengeAnswers: ['bitsocial-flags:5chan:flag:country:auto'],
      },
      flairs: [{ type: 'country', code: 'auto', text: 'flag:country:auto' }],
    });
  });

  it('shows the /pol/ flag field when a non-primary directory candidate is hosting /pol/', async () => {
    testState.resolvedCommunityAddress = 'nothing-is-beyond-our-reach.bso';
    testState.directoryListsByCode.pol = {
      directoryCode: 'pol',
      features: { hasFlags: true },
      title: '/pol/ - Politically Incorrect',
      boards: [{ address: 'politically-incorrect.bso' }, { address: 'nothing-is-beyond-our-reach.bso' }],
    };

    await renderPostForm('/pol');
    await clickByText(container, 'start_new_thread');

    const table = container.querySelector('table');
    const flagSelect = table?.querySelector<HTMLSelectElement>('select[aria-label="flag"]');
    const textarea = table?.querySelector<HTMLTextAreaElement>('textarea');

    expect(flagSelect).toBeTruthy();
    expect(flagSelect?.value).toBe('country:auto');

    await dispatchInput(textarea as HTMLTextAreaElement, 'candidate board flag post');
    await clickByText(table as HTMLTableElement, 'post');

    expect(testState.publishPostMock).toHaveBeenCalledWith({
      content: 'candidate board flag post',
      challengeRequest: {
        challengeAnswers: ['bitsocial-flags:5chan:flag:country:auto'],
      },
      flairs: [{ type: 'country', code: 'auto', text: 'flag:country:auto' }],
    });
  });

  it('publishes geographic location on /sp/ without showing a flag field', async () => {
    testState.resolvedCommunityAddress = 'sports-posting.bso';

    await renderPostForm('/sp');
    await clickByText(container, 'start_new_thread');

    const table = container.querySelector('table');
    const flagSelect = table?.querySelector<HTMLSelectElement>('select[aria-label="flag"]');
    const textarea = table?.querySelector<HTMLTextAreaElement>('textarea');

    expect(flagSelect).toBeNull();

    await dispatchInput(textarea as HTMLTextAreaElement, 'sports post');
    await clickByText(table as HTMLTableElement, 'post');

    expect(testState.publishPostMock).toHaveBeenCalledWith({
      content: 'sports post',
      challengeRequest: {
        challengeAnswers: ['bitsocial-flags:5chan:flag:country:auto'],
      },
      flairs: [{ type: 'country', code: 'auto', text: 'flag:country:auto' }],
    });
  });

  it('publishes selected political flags from the post form', async () => {
    testState.resolvedCommunityAddress = 'politically-incorrect.bso';

    await renderPostForm('/pol');
    await clickByText(container, 'start_new_thread');

    const table = container.querySelector('table');
    const flagSelect = table?.querySelector<HTMLSelectElement>('select[aria-label="flag"]');
    const textarea = table?.querySelector<HTMLTextAreaElement>('textarea');

    await dispatchChange(flagSelect as HTMLSelectElement, 'pol:AC');
    await dispatchInput(textarea as HTMLTextAreaElement, 'memeflag post');
    await clickByText(table as HTMLTableElement, 'post');

    expect(testState.publishPostMock).toHaveBeenCalledWith({
      content: 'memeflag post',
      flairs: [{ type: 'pol', code: 'AC', text: 'flag:pol:AC' }],
    });
  });

  it('shows /f/ upload guidance and publishes the selected flash tag as a post flair', async () => {
    testState.resolvedCommunityAddress = 'flash-posting.bso';

    await renderPostForm('/f');
    await clickByText(container, 'start_new_thread');

    const table = container.querySelector('table');
    const flashTagSelect = table?.querySelector<HTMLSelectElement>('select[name="flashTag"]');
    const linkInput = Array.from(table?.querySelectorAll<HTMLInputElement>('input[type="text"]') || []).find((input) => input.getAttribute('aria-label') === 'link');
    const textarea = table?.querySelector<HTMLTextAreaElement>('textarea');
    const catboxLink = table?.querySelector<HTMLAnchorElement>('a[href="https://catbox.moe/"]');

    expect(flashTagSelect).toBeTruthy();
    expect(flashTagSelect?.value).toBe('');
    expect(Array.from(flashTagSelect?.options || []).map((option) => option.textContent)).toEqual([
      'Choose one:',
      'Hentai',
      'Porn',
      'Japanese',
      'Anime',
      'Game',
      'Loop',
      'Other',
    ]);
    expect(catboxLink?.textContent).toBe('Catbox');
    expect(container.textContent).toContain('Recommended SWF host: Catbox');

    await dispatchChange(flashTagSelect as HTMLSelectElement, 'loop');
    await dispatchInput(linkInput as HTMLInputElement, 'https://files.catbox.moe/movie.swf');
    await dispatchInput(textarea as HTMLTextAreaElement, 'flash thread');
    await clickByText(table as HTMLTableElement, 'post');

    expect(testState.publishPostMock).toHaveBeenCalledWith({
      content: 'flash thread',
      flairs: [{ text: 'flash:loop' }],
    });
  });

  it('does not publish a flash flair until a tag is selected', async () => {
    testState.resolvedCommunityAddress = 'flash-posting.bso';

    await renderPostForm('/f');
    await clickByText(container, 'start_new_thread');

    const table = container.querySelector('table');
    const linkInput = Array.from(table?.querySelectorAll<HTMLInputElement>('input[type="text"]') || []).find((input) => input.getAttribute('aria-label') === 'link');
    const textarea = table?.querySelector<HTMLTextAreaElement>('textarea');

    await dispatchInput(linkInput as HTMLInputElement, 'https://files.catbox.moe/movie.swf');
    await dispatchInput(textarea as HTMLTextAreaElement, 'flash thread');
    await clickByText(table as HTMLTableElement, 'post');

    expect(testState.publishPostMock).toHaveBeenCalledWith({
      content: 'flash thread',
    });
  });

  it('validates unsupported options and keeps fortune output out of preview state until post publish', async () => {
    const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.25);
    testState.resolvedCommunityAddress = 'random-nsfw.bso';

    await renderPostForm('/b');
    await clickByText(container, 'start_new_thread');

    const table = container.querySelector('table');
    const optionsInput = table?.querySelector<HTMLInputElement>('input[aria-label="options"]');
    const textarea = table?.querySelector<HTMLTextAreaElement>('textarea');

    expect(optionsInput).toBeTruthy();
    expect(textarea).toBeTruthy();

    await dispatchInput(optionsInput as HTMLInputElement, 'x y z');
    expect(container.textContent).not.toContain('Unsupported options');

    await waitForOptionsValidation();
    expect(container.textContent).toContain('Unsupported options: x, y, z.');
    const delayedOptionsError = Array.from(container.querySelectorAll('div')).find((element) => element.textContent === 'Unsupported options: x, y, z.');
    expect(delayedOptionsError?.className).toContain('error');
    expect(delayedOptionsError?.className).toContain('formError');
    expect(delayedOptionsError?.closest('tfoot')).toBeTruthy();

    await dispatchInput(textarea as HTMLTextAreaElement, 'fortune body');
    await clickByText(table as HTMLTableElement, 'post');

    expect(testState.publishPostMock).not.toHaveBeenCalled();

    await dispatchInput(optionsInput as HTMLInputElement, 'fortune');

    expect(container.textContent).not.toContain('Unsupported options');
    expect(testState.publishPostOptions.content).toBe('fortune body');

    await clickByText(table as HTMLTableElement, 'post');

    expect(testState.publishPostMock).toHaveBeenCalledTimes(1);
    expect(testState.publishPostMock).toHaveBeenCalledWith({
      content: 'fortune body[fortune color=#fd4d32]Excellent Luck[/fortune]',
    });
    randomSpy.mockRestore();
  });

  it('counts hidden fortune output in post length validation without revealing it', async () => {
    testState.resolvedCommunityAddress = 'random-nsfw.bso';

    await renderPostForm('/b');
    await clickByText(container, 'start_new_thread');

    const table = container.querySelector('table') as HTMLTableElement;
    const optionsInput = table.querySelector<HTMLInputElement>('input[aria-label="options"]') as HTMLInputElement;
    const textarea = table.querySelector<HTMLTextAreaElement>('textarea') as HTMLTextAreaElement;
    const longContent = 'x'.repeat(1930);

    await dispatchInput(optionsInput, 'fortune');
    await dispatchInput(textarea, longContent);
    await waitForContentLengthValidation();

    expect(testState.publishPostOptions.content).toBe(longContent);
    expect(container.textContent).toContain('comment_field_too_long');
    expect(table.querySelector('tfoot')?.textContent).toContain('comment_field_too_long');
    expect(container.textContent).not.toContain('[fortune color=');
    expect(testState.publishPostMock).not.toHaveBeenCalled();
  });

  it('supports fortune on the /s5s/ route when directory metadata is not loaded', async () => {
    const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.25);
    testState.resolvedCommunityAddress = 'silly-stuff.bso';
    testState.directories = testState.directories.filter((entry) => entry.address !== 'silly-stuff.bso');

    await renderPostForm('/s5s');
    await clickByText(container, 'start_new_thread');

    const table = container.querySelector('table');
    const optionsInput = table?.querySelector<HTMLInputElement>('input[aria-label="options"]');
    const textarea = table?.querySelector<HTMLTextAreaElement>('textarea');

    await dispatchInput(optionsInput as HTMLInputElement, 'fortune');
    await waitForOptionsValidation();

    expect(container.textContent).not.toContain('Unsupported options');

    await dispatchInput(textarea as HTMLTextAreaElement, 'silly fortune');
    await clickByText(table as HTMLTableElement, 'post');

    expect(testState.publishPostMock).toHaveBeenCalledTimes(1);
    expect(testState.publishedPostOptions?.content).toBe('silly fortune[fortune color=#fd4d32]Excellent Luck[/fortune]');
    expect(testState.setPublishPostOptionsMock).toHaveBeenCalledWith({ content: 'silly fortune' });
    randomSpy.mockRestore();
  });

  it('stores dice rolls in post content on dice-enabled boards', async () => {
    const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.5);
    testState.resolvedCommunityAddress = 'quests.bso';

    await renderPostForm('/qst');
    await clickByText(container, 'start_new_thread');

    const table = container.querySelector('table');
    const optionsInput = table?.querySelector<HTMLInputElement>('input[aria-label="options"]');
    const textarea = table?.querySelector<HTMLTextAreaElement>('textarea');

    await dispatchInput(optionsInput as HTMLInputElement, 'dice+1d6+3');
    await waitForOptionsValidation();

    expect(container.textContent).not.toContain('Unsupported options');

    await dispatchInput(textarea as HTMLTextAreaElement, 'dice body');
    await clickByText(table as HTMLTableElement, 'post');

    expect(testState.publishPostMock).toHaveBeenCalledTimes(1);
    expect(testState.publishedPostOptions?.content).toBe('<b>Rolled 4 + 3 = 7 (1d6 + 3)<br><br></b>dice body');
    randomSpy.mockRestore();
  });

  it('treats fortune as unsupported outside /b/ and /s5s/', async () => {
    testState.resolvedCommunityAddress = 'music-posting.eth';

    await renderPostForm('/mu');
    await clickByText(container, 'start_new_thread');

    const table = container.querySelector('table');
    const optionsInput = table?.querySelector<HTMLInputElement>('input[aria-label="options"]');
    const textarea = table?.querySelector<HTMLTextAreaElement>('textarea');

    await dispatchInput(optionsInput as HTMLInputElement, 'fortune');
    expect(container.textContent).not.toContain('Unsupported options');

    await waitForOptionsValidation();
    expect(container.textContent).toContain('Unsupported options: fortune. Option "fortune" is supported on: /b/, /s5s/.');
    expect(container.querySelector<HTMLAnchorElement>('a[href="/b"]')?.textContent).toBe('/b/');
    expect(container.querySelector<HTMLAnchorElement>('a[href="/s5s"]')?.textContent).toBe('/s5s/');

    await dispatchInput(textarea as HTMLTextAreaElement, 'plain body');
    await clickByText(table as HTMLTableElement, 'post');

    expect(testState.publishPostMock).not.toHaveBeenCalled();
    expect(testState.publishPostOptions.content).toBe('plain body');
  });

  it('combines unavailable and unknown options in one clear post-form message', async () => {
    testState.resolvedCommunityAddress = 'politically-incorrect.bso';
    testState.directories = [...testState.directories, { address: 'politically-incorrect.bso', features: {}, title: '/pol/ - Politically Incorrect' }];

    await renderPostForm('/pol');
    await clickByText(container, 'start_new_thread');

    const table = container.querySelector('table');
    const optionsInput = table?.querySelector<HTMLInputElement>('input[aria-label="options"]');

    await dispatchInput(optionsInput as HTMLInputElement, 'sage fortune');
    await waitForOptionsValidation();

    expect(container.textContent).toContain('Unsupported options: sage [learn why], fortune. Option "fortune" is supported on: /b/, /s5s/.');
    expect(container.querySelector<HTMLAnchorElement>('a[href="/faq#sage"]')?.textContent).toBe('learn why');
    expect(container.querySelector<HTMLAnchorElement>('a[href="/b"]')?.textContent).toBe('/b/');
    expect(container.querySelector<HTMLAnchorElement>('a[href="/s5s"]')?.textContent).toBe('/s5s/');
  });

  it('treats dice rolls as unsupported outside /tg/ and /qst/', async () => {
    testState.resolvedCommunityAddress = 'random-nsfw.bso';

    await renderPostForm('/b');
    await clickByText(container, 'start_new_thread');

    const table = container.querySelector('table');
    const optionsInput = table?.querySelector<HTMLInputElement>('input[aria-label="options"]');
    const textarea = table?.querySelector<HTMLTextAreaElement>('textarea');

    await dispatchInput(optionsInput as HTMLInputElement, 'dice+1d6');
    expect(container.textContent).not.toContain('Unsupported options');

    await waitForOptionsValidation();
    expect(container.textContent).toContain('Unsupported options: dice+1d6. Option "dice+1d6" is supported on: /qst/, /tg/.');
    expect(container.querySelector<HTMLAnchorElement>('a[href="/qst"]')?.textContent).toBe('/qst/');
    expect(container.querySelector<HTMLAnchorElement>('a[href="/tg"]')?.textContent).toBe('/tg/');

    await dispatchInput(textarea as HTMLTextAreaElement, 'plain dice');
    await clickByText(table as HTMLTableElement, 'post');

    expect(testState.publishPostMock).not.toHaveBeenCalled();
    expect(testState.publishPostOptions.content).toBe('plain dice');
  });

  it('shows BBCode controls only for board mods and inserts tags into the post textarea', async () => {
    testState.account = {
      author: { address: 'mod.eth', displayName: 'Alice' },
      subscriptions: ['music-posting.eth'],
    };
    testState.resolvedCommunityAddress = 'music-posting.eth';
    testState.rolesByCommunity = {
      'music-posting.eth': {
        'mod.eth': { role: 'moderator' },
      },
    };

    await renderPostForm('/mu');
    await clickByText(container, 'start_new_thread');

    const table = container.querySelector('table');
    const textarea = table?.querySelector<HTMLTextAreaElement>('textarea');
    const boldButton = table?.querySelector<HTMLButtonElement>('button[aria-label="Bold"]');
    const redButton = table?.querySelector<HTMLButtonElement>('button[aria-label="Red text"]');
    const linkButton = table?.querySelector<HTMLButtonElement>('button[aria-label="Link"]');
    const sizeSelect = table?.querySelector<HTMLSelectElement>('select[aria-label="Text size"]');
    const rows = Array.from(table?.querySelectorAll('tr') || []);
    expect(textarea).toBeTruthy();
    expect(boldButton).toBeTruthy();
    expect(redButton).toBeTruthy();
    expect(linkButton).toBeTruthy();
    expect(sizeSelect).toBeTruthy();
    expect(table?.querySelector('select[aria-label="Text color"]')).toBeNull();
    expect(rows.some((row) => row.querySelector('td')?.textContent === 'format')).toBe(true);
    expect(rows.some((row) => row.querySelector('td')?.textContent === 'comment')).toBe(true);
    expect(container.textContent).toContain('warning: posting as moderator');
    const moderatorWarning = Array.from(container.querySelectorAll('div')).find((element) => element.textContent === 'warning: posting as moderator');
    expect(moderatorWarning?.className).toContain('error');
    expect(moderatorWarning?.className).toContain('formError');
    expect(moderatorWarning?.closest('tfoot')).toBeTruthy();
    expect(table?.textContent).not.toContain('Mod editor');
    expect(table?.textContent).not.toContain('mods only');
    expect(table?.querySelector('button[aria-label="Quote"]')).toBeNull();

    await dispatchInput(textarea as HTMLTextAreaElement, 'hello world');
    textarea?.setSelectionRange(0, 5);
    await act(async () => {
      boldButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(textarea?.value).toBe('[b]hello[/b] world');
    expect(testState.setPublishPostOptionsMock).toHaveBeenCalledWith({ content: '[b]hello[/b] world' });

    const worldStart = textarea?.value.indexOf('world') ?? 0;
    textarea?.setSelectionRange(worldStart, worldStart + 'world'.length);
    await act(async () => {
      redButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(textarea?.value).toBe('[b]hello[/b] [color=red]world[/color]');
    expect(testState.setPublishPostOptionsMock).toHaveBeenCalledWith({ content: '[b]hello[/b] [color=red]world[/color]' });

    const helloStart = textarea?.value.indexOf('hello') ?? 0;
    textarea?.setSelectionRange(helloStart, helloStart + 'hello'.length);
    await dispatchChange(sizeSelect as HTMLSelectElement, '24');

    expect(textarea?.value).toBe('[b][size=24]hello[/size][/b] [color=red]world[/color]');
    expect(testState.setPublishPostOptionsMock).toHaveBeenCalledWith({ content: '[b][size=24]hello[/size][/b] [color=red]world[/color]' });

    const linkedWorldStart = textarea?.value.indexOf('world') ?? 0;
    textarea?.setSelectionRange(linkedWorldStart, linkedWorldStart + 'world'.length);
    await act(async () => {
      linkButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    const linkedContent = '[b][size=24]hello[/size][/b] [color=red][url=https://example.com]world[/url][/color]';
    expect(textarea?.value).toBe(linkedContent);
    expect(testState.setPublishPostOptionsMock).toHaveBeenCalledWith({ content: linkedContent });

    await clickByText(table as HTMLTableElement, 'Preview');
    const preview = table?.querySelector('[aria-label="BBCode preview"]');
    expect(preview?.textContent).toContain('hello');
    expect(preview?.textContent).toContain('world');
    expect(preview?.querySelector('a')?.getAttribute('href')).toBe('https://example.com/');
    expect(table?.querySelector<HTMLTextAreaElement>('textarea')?.value).toBe(linkedContent);

    await clickByText(table as HTMLTableElement, 'Edit');
    expect(table?.querySelector('[aria-label="BBCode preview"]')).toBeNull();

    testState.rolesByCommunity = {};
    await renderPostForm('/mu');
    await clickByText(container, 'start_new_thread');

    expect(container.querySelector('button[aria-label="Bold"]')).toBeNull();
    expect(container.textContent).not.toContain('mods only');
    expect(container.textContent).not.toContain('warning: posting as moderator');
  });

  it('uses the 5chan dev label for known developer moderator posts', async () => {
    testState.account = {
      author: { address: 'bitsocialist.bso', displayName: 'Tom' },
      subscriptions: ['music-posting.eth'],
    };
    testState.resolvedCommunityAddress = 'music-posting.eth';
    testState.rolesByCommunity = {
      'music-posting.eth': {
        'bitsocialist.bso': { role: 'owner' },
      },
    };

    await renderPostForm('/mu');
    await clickByText(container, 'start_new_thread');

    expect(container.textContent).toContain('warning: posting as 5chan dev');
  });

  it('shows the pasted file-link filename next to the upload button', async () => {
    testState.uploadedFileName = null;

    await renderPostForm('/all');
    await clickByText(container, 'start_new_thread');

    const table = container.querySelector('table');
    const textInputs = table?.querySelectorAll<HTMLInputElement>('input[type="text"]') || [];
    const linkInput = textInputs[3];

    expect(table?.textContent).toContain('no_file_chosen');

    await dispatchInput(linkInput as HTMLInputElement, 'https://example.com/images/file%20name.jpg?size=large');

    expect(table?.textContent).toContain('file name.jpg');
  });

  it('does not show a pasted non-file path segment next to the upload button', async () => {
    testState.uploadedFileName = null;

    await renderPostForm('/all');
    await clickByText(container, 'start_new_thread');

    const table = container.querySelector('table');
    const textInputs = table?.querySelectorAll<HTMLInputElement>('input[type="text"]') || [];
    const linkInput = textInputs[3];

    await dispatchInput(linkInput as HTMLInputElement, 'https://imgur.com/8EJ2T76');

    expect(table?.textContent).toContain('not_a_file');
    expect(table?.textContent).toContain('no_file_chosen');
    expect(table?.textContent).not.toContain('8EJ2T76');
  });

  it('shows the rules and FAQ prompt at the bottom of the form with a board-specific rules link', async () => {
    testState.resolvedCommunityAddress = 'music-posting.eth';

    await renderPostForm('/mu');
    await clickByText(container, 'start_new_thread');

    const table = container.querySelector('table');
    const rows = Array.from(table?.querySelectorAll('tr') || []);
    const fileRowIndex = rows.findIndex((row) => row.querySelector('td')?.textContent === 'file');
    const promptRowIndex = rows.findIndex((row) => row.textContent === 'Please read the Rules and FAQ before posting.');
    const promptRow = rows[promptRowIndex];
    const links = Array.from(promptRow?.querySelectorAll('a') || []);

    expect(fileRowIndex).toBeGreaterThan(-1);
    expect(promptRowIndex).toBeGreaterThan(fileRowIndex);
    expect(promptRowIndex).toBe(rows.length - 1);
    expect(promptRow?.className).toBe('rules');
    expect(promptRow?.querySelector('ul')?.className).toBe('rules');
    expect(links.map((link) => link.textContent)).toEqual(['Rules', 'FAQ']);
    expect(links.map((link) => link.getAttribute('href'))).toEqual(['/rules#mu', '/faq']);
  });

  it('shows the code tag prompt on /g/ forms', async () => {
    testState.resolvedCommunityAddress = 'technology-posting.bso';
    await renderPostForm('/g');
    await clickByText(container, 'start_new_thread');

    const rulesItems = Array.from(container.querySelectorAll('tr.rules li')).map((item) => item.textContent);
    expect(rulesItems).toEqual(['Please read the Rules and FAQ before posting.', 'You may highlight syntax and preserve whitespace by using [code] tags.']);
  });

  it('shows the code tag prompt on /q/ forms', async () => {
    testState.resolvedCommunityAddress = 'site-feedback.bso';
    await renderPostForm('/q');
    await clickByText(container, 'start_new_thread');

    const rulesItems = Array.from(container.querySelectorAll('tr.rules li')).map((item) => item.textContent);
    expect(rulesItems).toEqual(['Please read the Rules and FAQ before posting.', 'You may highlight syntax and preserve whitespace by using [code] tags.']);
  });

  it('does not show the code tag prompt off code-tag boards', async () => {
    testState.resolvedCommunityAddress = 'music-posting.eth';
    await renderPostForm('/mu');
    await clickByText(container, 'start_new_thread');

    const rulesItems = Array.from(container.querySelectorAll('tr.rules li')).map((item) => item.textContent);
    expect(rulesItems).toEqual(['Please read the Rules and FAQ before posting.']);
  });

  it('uses the plain rules page link for custom boards without a directory hash', async () => {
    testState.resolvedCommunityAddress = 'custom-board.bso';

    await renderPostForm('/custom-board.bso');
    await clickByText(container, 'start_new_thread');

    const promptRow = Array.from(container.querySelectorAll('tr')).find((row) => row.textContent === 'Please read the Rules and FAQ before posting.');
    const links = Array.from(promptRow?.querySelectorAll('a') || []);

    expect(links.map((link) => link.textContent)).toEqual(['Rules', 'FAQ']);
    expect(links.map((link) => link.getAttribute('href'))).toEqual(['/rules', '/faq']);
  });

  it('shortens long pasted file-link filenames next to the upload button', async () => {
    testState.uploadedFileName = null;

    await renderPostForm('/all');
    await clickByText(container, 'start_new_thread');

    const table = container.querySelector('table');
    const textInputs = table?.querySelectorAll<HTMLInputElement>('input[type="text"]') || [];
    const linkInput = textInputs[3];
    const longFilename = 'TELEMMGLPICT000378070158_17159651831200_trans_NvBQzQNjv4BqpVlberWd9EgFPZtcLiMQf0Rf_Wk3V23H2268P_XkPxc.jpeg';

    await dispatchInput(linkInput as HTMLInputElement, `https://www.telegraph.co.uk/multimedia/${longFilename}`);

    expect(table?.textContent).toContain('TELEMMGLPICT...P_XkPxc.jpeg');
    expect(table?.textContent).not.toContain(longFilename);
  });

  it('uses the shared loading ellipsis while a post form upload is running', async () => {
    testState.isUploading = true;

    await renderPostForm('/all');
    await clickByText(container, 'start_new_thread');

    expect(container.querySelector('[data-testid="loading-ellipsis"]')?.textContent).toBe('uploading');
  });

  it('redirects to the pending route when a post publish index is already available on mount', async () => {
    testState.postIndex = 7;
    testState.resolvedCommunityAddress = 'music-posting.eth';

    await renderPostForm('/mu');
    await clickByText(container, 'start_new_thread');
    await flushEffects();

    expect(testState.resetPublishPostOptionsMock).toHaveBeenCalled();
    expect(usePostFormDraftsStore.getState().forms['/mu']).toBeUndefined();
    expect(testState.navigateMock).toHaveBeenCalledWith('/pending/7', { state: { boardPath: 'mu' } });
  });

  it('navigates as soon as the pending comment is created without waiting for index state', async () => {
    testState.resolvedCommunityAddress = 'music-posting.eth';
    const pendingPost = {
      communityAddress: 'music-posting.eth',
      content: 'Thread body',
      index: 7,
    };
    testState.publishPostMock.mockImplementation(() => {
      testState.onPendingPost?.(7, pendingPost);
    });
    const pendingNavigationStates: boolean[] = [];
    const unsubscribe = usePendingPostNavigationStore.subscribe((state) => pendingNavigationStates.push(state.isNavigatingToPendingPost));

    await renderPostForm('/mu');
    await clickByText(container, 'start_new_thread');

    const table = container.querySelector('table') as HTMLTableElement;
    const textarea = table.querySelector('textarea') as HTMLTextAreaElement;
    await dispatchInput(textarea, 'Thread body');
    await clickByText(table, 'post');

    expect(testState.navigateMock).toHaveBeenCalledWith('/pending/7', {
      flushSync: true,
      state: { boardPath: 'mu', pendingPost },
    });
    expect(pendingNavigationStates).toEqual([true]);
    expect(usePendingPostNavigationStore.getState().pendingPostNavigationIndex).toBe(7);
    expect(container.querySelector('table')).toBeNull();
    unsubscribe();
    usePendingPostNavigationStore.getState().clearPendingPostNavigation();
  });

  it('clears the optimistic handoff when pending navigation throws', async () => {
    testState.navigateMock.mockImplementation(() => {
      throw new Error('navigation failed');
    });
    const pendingPost = {
      communityAddress: 'music-posting.eth',
      index: 7,
    };

    await renderPostForm('/mu');
    await clickByText(container, 'start_new_thread');

    expect(() => testState.onPendingPost?.(7, pendingPost)).toThrow('navigation failed');
    expect(usePendingPostNavigationStore.getState()).toMatchObject({
      isNavigatingToPendingPost: false,
      pendingPostNavigationIndex: null,
    });
  });

  it('redirects new posts to the board index when nonoko is used', async () => {
    testState.resolvedCommunityAddress = 'music-posting.eth';
    testState.publishPostMock.mockImplementation(() => {
      testState.onPendingPost?.(8, {
        communityAddress: 'music-posting.eth',
        index: 8,
      });
      testState.onPendingPost?.(7, {
        communityAddress: 'music-posting.eth',
        index: 7,
      });
    });

    await renderPostForm('/mu');
    await clickByText(container, 'start_new_thread');

    const table = container.querySelector('table');
    const optionsInput = table?.querySelector<HTMLInputElement>('input[aria-label="options"]');
    const subjectInput = table?.querySelector<HTMLInputElement>('input[aria-label="subject"]');

    await dispatchInput(optionsInput as HTMLInputElement, 'nonoko');
    await dispatchInput(subjectInput as HTMLInputElement, 'Thread title');
    await clickByText(table as HTMLTableElement, 'post');

    expect(testState.publishPostMock).toHaveBeenCalledTimes(1);
    expect(testState.navigateMock).toHaveBeenCalledWith('/mu', { flushSync: true, state: { nonokoPendingAccountCommentIndex: 8 } });
    expect(testState.navigateMock).toHaveBeenCalledWith('/mu', { flushSync: true, state: { nonokoPendingAccountCommentIndex: 7 } });
    expect(testState.navigateMock.mock.calls.some(([path]) => typeof path === 'string' && path.startsWith('/pending/'))).toBe(false);
  });

  it('clears the optimistic handoff when publishing fails after navigation', async () => {
    testState.resolvedCommunityAddress = 'music-posting.eth';
    testState.publishPostMock.mockImplementation(() => {
      testState.onPendingPost?.(7, {
        communityAddress: 'music-posting.eth',
        index: 7,
      });
      testState.onPublishError?.(new Error('persistence failed'));
    });

    await renderPostForm('/mu');
    await clickByText(container, 'start_new_thread');

    const table = container.querySelector('table') as HTMLTableElement;
    await dispatchInput(table.querySelector('textarea') as HTMLTextAreaElement, 'Thread body');
    await clickByText(table, 'post');

    expect(testState.navigateMock).toHaveBeenLastCalledWith('/pending/7', {
      flushSync: true,
      state: {
        boardPath: 'mu',
        pendingPost: {
          communityAddress: 'music-posting.eth',
          index: 7,
        },
      },
    });
    expect(usePendingPostNavigationStore.getState()).toMatchObject({
      isNavigatingToPendingPost: true,
      pendingPostNavigationIndex: null,
    });
  });

  it('does not let a late publish error clear a newer optimistic handoff', async () => {
    testState.resolvedCommunityAddress = 'music-posting.eth';

    await renderPostForm('/mu');
    await clickByText(container, 'start_new_thread');
    testState.onPendingPost?.(7, {
      communityAddress: 'music-posting.eth',
      index: 7,
    });
    const oldPublishError = testState.onPublishError;
    usePendingPostNavigationStore.getState().beginPendingPostNavigation(8);

    oldPublishError?.(new Error('late failure'));

    expect(usePendingPostNavigationStore.getState().pendingPostNavigationIndex).toBe(8);
  });

  it('resets the reply form after a completed reply publish', async () => {
    testState.comments = {
      'thread-cid': {
        postCid: 'thread-cid',
      },
    };
    testState.replyIndex = 4;
    testState.resolvedCommunityAddress = 'music-posting.eth';

    await renderPostForm('/mu/thread/thread-cid');
    await clickByText(container, 'post_a_reply');
    await flushEffects();

    expect(testState.resetPublishReplyOptionsMock).toHaveBeenCalledTimes(1);
    expect(container.querySelector('table')).toBeNull();
  });

  it('redirects replies from the inline form to the board index when nonoko is used', async () => {
    testState.comments = {
      'thread-cid': {
        postCid: 'thread-cid',
      },
    };
    testState.resolvedCommunityAddress = 'music-posting.eth';
    testState.publishReplyMock.mockImplementation(() => {
      testState.replyIndex = 4;
    });

    await renderPostForm('/mu/thread/thread-cid');
    await clickByText(container, 'post_a_reply');

    const table = container.querySelector('table');
    const optionsInput = table?.querySelector<HTMLInputElement>('input[aria-label="options"]');
    const textarea = table?.querySelector<HTMLTextAreaElement>('textarea');

    await dispatchInput(optionsInput as HTMLInputElement, 'nonoko');
    await dispatchInput(textarea as HTMLTextAreaElement, 'Reply body');
    await clickByText(table as HTMLTableElement, 'post');
    await flushEffects();

    expect(testState.publishReplyMock).toHaveBeenCalledTimes(1);
    expect(testState.resetPublishReplyOptionsMock).toHaveBeenCalledTimes(1);
    expect(testState.navigateMock).toHaveBeenCalledWith('/mu');
    expect(container.querySelector('table')).toBeNull();
  });

  it('publishes replies from the open reply form', async () => {
    testState.comments = {
      'thread-cid': {
        postCid: 'thread-cid',
      },
    };
    testState.isOffline = true;
    testState.resolvedCommunityAddress = 'music-posting.eth';

    await renderPostForm('/mu/thread/thread-cid');
    await clickByText(container, 'post_a_reply');

    const table = container.querySelector('table');
    const textarea = table?.querySelector('textarea');
    expect(table).toBeTruthy();
    expect(textarea).toBeTruthy();
    expect(container.textContent).toContain('offline board');

    await clickByText(table as HTMLTableElement, 'post');
    expect(globalThis.alert).not.toHaveBeenCalled();
    expect(container.textContent).toContain('error: empty_comment_alert');

    const textInputs = table?.querySelectorAll<HTMLInputElement>('input[type="text"]') || [];
    const linkInput = textInputs[2];
    expect(linkInput).toBeTruthy();

    await dispatchInput(linkInput as HTMLInputElement, 'not-a-url');
    await clickByText(table as HTMLTableElement, 'post');
    expect(globalThis.alert).not.toHaveBeenCalled();
    expect(container.textContent).toContain('error: invalid_url_alert');

    await dispatchInput(linkInput as HTMLInputElement, '');
    await dispatchInput(textarea as HTMLTextAreaElement, 'Reply body');
    await clickByText(table as HTMLTableElement, 'post');

    expect(testState.publishReplyMock).toHaveBeenCalledTimes(1);
  });

  it('does not require an inline reply link when only post links are required', async () => {
    testState.comments = {
      'thread-cid': {
        postCid: 'thread-cid',
      },
    };
    testState.resolvedCommunityAddress = 'music-posting.eth';
    testState.communities['music-posting.eth'] = {
      address: 'music-posting.eth',
      features: { requirePostLink: true },
    };

    await renderPostForm('/mu/thread/thread-cid');
    await clickByText(container, 'post_a_reply');

    const table = container.querySelector('table') as HTMLTableElement;
    const textarea = table.querySelector('textarea') as HTMLTextAreaElement;

    await dispatchInput(textarea, 'Reply body');
    await clickByText(table, 'post');

    expect(container.textContent).not.toContain('post_link_required_alert');
    expect(testState.publishReplyMock).toHaveBeenCalledTimes(1);
  });

  it('requires an inline reply link when reply links are required', async () => {
    testState.comments = {
      'thread-cid': {
        postCid: 'thread-cid',
      },
    };
    testState.resolvedCommunityAddress = 'music-posting.eth';
    testState.communities['music-posting.eth'] = {
      address: 'music-posting.eth',
      features: { requireReplyLink: true },
    };

    await renderPostForm('/mu/thread/thread-cid');
    await clickByText(container, 'post_a_reply');

    const table = container.querySelector('table') as HTMLTableElement;
    const textarea = table.querySelector('textarea') as HTMLTextAreaElement;
    const linkInput = table.querySelector<HTMLInputElement>('input[aria-label="link"]') as HTMLInputElement;

    await dispatchInput(textarea, 'Reply body');
    await clickByText(table, 'post');

    expect(container.textContent).toContain('error: reply_link_required_alert');
    expect(testState.publishReplyMock).not.toHaveBeenCalled();

    await dispatchInput(linkInput, 'https://example.com/reply');
    await clickByText(table, 'post');

    expect(testState.setPublishReplyOptionsMock).toHaveBeenCalledWith({ link: 'https://example.com/reply' });
    expect(testState.publishReplyMock).toHaveBeenCalledTimes(1);
    expect(testState.publishReplyMock).toHaveBeenCalledWith(expect.objectContaining({ content: 'Reply body' }));
  });

  it('rejects inline reply links when reply links are disabled', async () => {
    testState.comments = {
      'thread-cid': {
        postCid: 'thread-cid',
      },
    };
    testState.resolvedCommunityAddress = 'music-posting.eth';
    testState.communities['music-posting.eth'] = {
      address: 'music-posting.eth',
      features: { noReplyLinks: true },
    };

    await renderPostForm('/mu/thread/thread-cid');
    await clickByText(container, 'post_a_reply');

    const table = container.querySelector('table') as HTMLTableElement;
    const textarea = table.querySelector('textarea') as HTMLTextAreaElement;
    const linkInput = table.querySelector<HTMLInputElement>('input[aria-label="link"]') as HTMLInputElement;
    expect(linkInput.disabled).toBe(true);

    linkInput.disabled = false;
    await dispatchInput(textarea, 'Reply body');
    await dispatchInput(linkInput, 'https://example.com/reply.png');
    await clickByText(table, 'post');

    expect(container.textContent).toContain('error: reply_links_not_allowed_alert');
    expect(testState.publishReplyMock).not.toHaveBeenCalled();
  });

  it('publishes known twimg query-format reply links with a path extension without editing the field', async () => {
    const twimgLink = 'https://pbs.twimg.com/media/HJxnhNKWMAAhqFU?format=jpg&name=medium';
    const publishLink = 'https://pbs.twimg.com/media/HJxnhNKWMAAhqFU.jpg';

    testState.comments = {
      'thread-cid': {
        postCid: 'thread-cid',
      },
    };
    testState.resolvedCommunityAddress = 'music-posting.eth';

    await renderPostForm('/mu/thread/thread-cid');
    await clickByText(container, 'post_a_reply');

    const table = container.querySelector('table') as HTMLTableElement;
    const textarea = table.querySelector('textarea') as HTMLTextAreaElement;
    const linkInput = table.querySelectorAll<HTMLInputElement>('input[type="text"]')[2];

    await dispatchInput(textarea, 'Twimg reply');
    await dispatchInput(linkInput, twimgLink);
    await clickByText(table, 'post');

    expect(linkInput.value).toBe(twimgLink);
    expect(testState.publishReplyMock).toHaveBeenCalledTimes(1);
    expect(testState.publishReplyMock).toHaveBeenCalledWith({
      content: 'Twimg reply',
      link: publishLink,
    });
  });
});

describe('LinkTypePreviewer', () => {
  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  it('describes gif previews and invalid links for the post form link helper', async () => {
    testState.gifFrameStatus = 'ready';
    await act(async () => {
      root.render(createElement(LinkTypePreviewer, { link: 'https://example.com/file.gif' }));
    });
    expect(container.textContent).toBe('file: animated_gif');

    await act(async () => {
      root.render(createElement(LinkTypePreviewer, { link: 'https://example.com/file.mp4' }));
    });
    expect(container.textContent).toBe('file: video');

    await act(async () => {
      root.render(createElement(LinkTypePreviewer, { link: 'not-a-url' }));
    });
    expect(container.textContent).toBe('invalid_url');
  });

  it('shows unsupported file links as not a file on media-only forms', async () => {
    await act(async () => {
      root.render(createElement(LinkTypePreviewer, { link: 'https://example.com/file.mp3', requireFile: true }));
    });
    expect(container.textContent).toBe('not_a_file');
    expect(container.querySelector('span')?.className).toContain('linkTypeError');

    await act(async () => {
      root.render(createElement(LinkTypePreviewer, { link: 'https://www.youtube.com/watch?v=abc123', requireFile: true }));
    });
    expect(container.textContent).toBe('not_a_file');

    await act(async () => {
      root.render(createElement(LinkTypePreviewer, { link: 'https://example.com/page', requireFile: true }));
    });
    expect(container.textContent).toBe('not_a_file');
  });
});
