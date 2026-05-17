import * as React from 'react';
import { createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { Link, MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import PostForm, { LinkTypePreviewer } from '../post-form';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
const act = (React as { act?: (cb: () => void | Promise<void>) => void | Promise<void> }).act as (cb: () => void | Promise<void>) => void | Promise<void>;

const testState = vi.hoisted(() => ({
  account: {
    author: { displayName: 'Alice' },
    subscriptions: ['music-posting.eth'],
  },
  accountComment: undefined as { communityAddress?: string } | undefined,
  accountCommunityAddresses: ['mod.eth'] as string[],
  comments: {} as Record<string, { commentModeration?: { archived?: boolean }; deleted?: boolean; locked?: boolean; postCid?: string; removed?: boolean }>,
  directories: [
    { address: 'music-posting.eth', features: {}, title: '/mu/ - Music' },
    { address: 'mod.eth', features: {}, title: '/mod/ - Moderation' },
  ] as Array<{ address: string; features?: Record<string, unknown>; title?: string }>,
  editedComment: undefined as { commentModeration?: { archived?: boolean }; deleted?: boolean; locked?: boolean; postCid?: string; removed?: boolean } | undefined,
  gifFrameStatus: 'idle' as 'idle' | 'ready',
  handleUploadMock: vi.fn(),
  isOffline: false,
  isOnlineStatusLoading: false,
  isUploading: false,
  isResolvingExternalQuotes: false,
  navigateMock: vi.fn(),
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

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) => (options?.domain ? `${key}:${options.domain}` : key),
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
  useDirectories: () => testState.directories,
  useDirectoryByAddress: (address: string | undefined) => testState.directories.find((entry) => entry.address === address),
  normalizeBoardAddress: (address: string) => address.replace(/\.(bso|eth)$/, ''),
}));

vi.mock('../../../hooks/use-community-identifiers', () => ({
  useCommunityIdentifier: (address?: string) => (address ? { name: address } : undefined),
}));

vi.mock('../../../hooks/use-resolved-community-address', () => ({
  useResolvedCommunityAddress: () => testState.resolvedCommunityAddress,
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
    default: ({ communityAddress }: { communityAddress?: string }) => {
      const [, forceUpdate] = React.useReducer((value: number) => value + 1, 0);
      const getPublishPostOptions = React.useCallback(
        () => ({
          ...(communityAddress ? { communityAddress } : {}),
          ...testState.publishPostOptions,
        }),
        [communityAddress],
      );
      const publishPost = React.useCallback(() => {
        testState.publishedPostOptions = getPublishPostOptions();
        return testState.publishPostMock();
      }, [getPublishPostOptions]);
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
      const publishReply = React.useCallback(() => testState.publishReplyMock(), []);
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
      isUploading: testState.isUploading,
      uploadedFileName: testState.uploadedFileName,
    };
  },
}));

vi.mock('../../loading-ellipsis', () => ({
  default: ({ string }: { string: string }) => createElement('span', { 'data-testid': 'loading-ellipsis' }, string),
}));

vi.mock('../../../lib/utils/media-utils', () => ({
  getDisplayMediaInfoType: (type: string, t: (key: string) => string) => t(type),
  getLinkMediaInfo: (link: string) => {
    if (link.endsWith('.gif')) {
      return { type: 'gif', url: link };
    }
    if (link.endsWith('.png')) {
      return { type: 'image', url: link };
    }
    if (link.endsWith('.mp4')) {
      return { type: 'video', url: link };
    }
    return { type: 'link', url: link };
  },
}));

vi.mock('../../../lib/media-hosting/show-upload-controls', () => ({
  getShowUploadControls: () => testState.showUploadControls,
  isWebRuntime: () => true,
}));

vi.mock('../../../stores/use-media-hosting-store', () => ({
  default: (selector: (state: { uploadMode: string }) => unknown) =>
    selector({
      uploadMode: testState.uploadMode,
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
          createElement(Routes, {}, createElement(Route, { path: '/:boardIdentifier/*', element: createElement(KeyedPostForm) })),
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
    testState.account = {
      author: { displayName: 'Alice' },
      subscriptions: ['music-posting.eth'],
    };
    testState.accountComment = undefined;
    testState.accountCommunityAddresses = ['mod.eth'];
    testState.comments = {};
    testState.directories = [
      { address: 'music-posting.eth', features: {}, title: '/mu/ - Music' },
      { address: 'mod.eth', features: {}, title: '/mod/ - Moderation' },
    ];
    testState.editedComment = undefined;
    testState.gifFrameStatus = 'idle';
    testState.isOffline = false;
    testState.isOnlineStatusLoading = false;
    testState.isUploading = false;
    testState.isResolvingExternalQuotes = false;
    testState.offlineTitle = 'offline board';
    testState.postIndex = undefined;
    testState.publishedPostOptions = undefined;
    testState.publishPostOptions = {};
    testState.publishReplyError = null;
    testState.publishReplyStateMessage = null;
    testState.replyIndex = undefined;
    testState.resolvedCommunityAddress = undefined;
    testState.showUploadControls = true;
    testState.uploadComplete = undefined;
    testState.uploadMode = 'always';
    testState.uploadedFileName = 'picked.png';
    testState.communities = {
      'music-posting.eth': { address: 'music-posting.eth' },
    };
    testState.handleUploadMock.mockReset();
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

    const textInputs = table?.querySelectorAll<HTMLInputElement>('input[type="text"]') || [];
    const nameInput = textInputs[0];
    const subjectInput = textInputs[1];
    const linkInput = textInputs[2];
    const textarea = table?.querySelector('textarea');
    const select = table?.querySelector('select');

    expect(nameInput).toBeTruthy();
    expect(subjectInput).toBeTruthy();
    expect(linkInput).toBeTruthy();
    expect(linkInput?.getAttribute('placeholder')).toBe('https://website.com/image.jpg');
    expect(textarea).toBeTruthy();
    expect(select).toBeTruthy();

    await dispatchInput(linkInput as HTMLInputElement, 'not-a-url');
    await clickByText(table as HTMLTableElement, 'post');
    expect(globalThis.alert).not.toHaveBeenCalled();
    expect(container.textContent).toContain('error: invalid_url_alert');

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

  it('drops stale thread content when board navigation remounts the form before a link-only post', async () => {
    await renderNavigablePostForm('/mu');
    await clickByText(container, 'start_new_thread');

    let table = container.querySelector('table');
    let textarea = table?.querySelector('textarea');

    expect(table).toBeTruthy();
    expect(textarea).toBeTruthy();

    await dispatchInput(textarea as HTMLTextAreaElement, 'stale draft body');
    expect(testState.publishPostOptions.content).toBe('stale draft body');

    await clickLinkByText(container, 'go_biz');
    expect(testState.resetPublishPostOptionsMock).toHaveBeenCalledTimes(1);

    await clickByText(container, 'start_new_thread');

    table = container.querySelector('table');
    textarea = table?.querySelector('textarea');
    const textInputs = table?.querySelectorAll<HTMLInputElement>('input[type="text"]') || [];
    const linkInput = textInputs[2];

    expect(textarea?.value).toBe('');
    expect(linkInput).toBeTruthy();

    await dispatchInput(linkInput as HTMLInputElement, 'https://example.com/fresh.png');
    await clickByText(table as HTMLTableElement, 'post');

    expect(testState.publishPostMock).toHaveBeenCalledTimes(1);
    expect(testState.publishedPostOptions?.link).toBe('https://example.com/fresh.png');
    expect(testState.publishedPostOptions?.content).toBeUndefined();
  });

  it('shows the pasted file-link filename next to the upload button', async () => {
    testState.uploadedFileName = null;

    await renderPostForm('/all');
    await clickByText(container, 'start_new_thread');

    const table = container.querySelector('table');
    const textInputs = table?.querySelectorAll<HTMLInputElement>('input[type="text"]') || [];
    const linkInput = textInputs[2];

    expect(table?.textContent).toContain('no_file_chosen');

    await dispatchInput(linkInput as HTMLInputElement, 'https://example.com/images/file%20name.jpg?size=large');

    expect(table?.textContent).toContain('file name.jpg');
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

    expect(testState.resetPublishPostOptionsMock).toHaveBeenCalledTimes(1);
    expect(testState.navigateMock).toHaveBeenCalledWith('/pending/7');
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
    const linkInput = textInputs[1];
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
    expect(container.textContent).toBe('type: animated_gif');

    await act(async () => {
      root.render(createElement(LinkTypePreviewer, { link: 'https://example.com/file.mp4' }));
    });
    expect(container.textContent).toBe('type: video');

    await act(async () => {
      root.render(createElement(LinkTypePreviewer, { link: 'not-a-url' }));
    });
    expect(container.textContent).toBe('invalid_url');
  });
});
