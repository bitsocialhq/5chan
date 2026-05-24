import * as React from 'react';
import { createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { Link, MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import PostForm, { LinkTypePreviewer } from '../post-form';
import { POST_OPTIONS_VALIDATION_DELAY_MS } from '../../../lib/utils/post-options-utils';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
const act = (React as { act?: (cb: () => void | Promise<void>) => void | Promise<void> }).act as (cb: () => void | Promise<void>) => void | Promise<void>;

const testState = vi.hoisted(() => ({
  account: {
    author: { address: 'alice.eth', displayName: 'Alice' },
    subscriptions: ['music-posting.eth'],
  },
  accountComment: undefined as { communityAddress?: string } | undefined,
  accountCommunityAddresses: ['mod.eth'] as string[],
  comments: {} as Record<string, { commentModeration?: { archived?: boolean }; deleted?: boolean; locked?: boolean; postCid?: string; removed?: boolean }>,
  directories: [
    { address: 'music-posting.eth', features: {}, title: '/mu/ - Music' },
    { address: 'mod.eth', features: {}, title: '/mod/ - Moderation' },
  ] as Array<{ address: string; directoryCode?: string; features?: Record<string, unknown>; title?: string }>,
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

      return i18nKey;
    },
    useTranslation: () => ({
      t: (key: string, options?: Record<string, unknown>) => (options?.domain ? `${key}:${options.domain}` : key),
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

vi.mock('../../../hooks/use-community-identifiers', () => ({
  useCommunityIdentifier: (address?: string) => (address ? { name: address } : undefined),
}));

vi.mock('../../../hooks/use-resolved-community-address', () => ({
  useResolvedCommunityAddress: () => testState.resolvedCommunityAddress,
}));

vi.mock('../../../hooks/use-stable-community', () => ({
  useCommunityField: <T,>(communityAddress: string | undefined, selector: (community?: { roles?: Record<string, { role?: string }> }) => T) =>
    selector(communityAddress ? { roles: testState.rolesByCommunity[communityAddress] } : undefined),
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

const waitForOptionsValidation = async () => {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, POST_OPTIONS_VALIDATION_DELAY_MS + 20));
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
      author: { address: 'alice.eth', displayName: 'Alice' },
      subscriptions: ['music-posting.eth'],
    };
    testState.accountComment = undefined;
    testState.accountCommunityAddresses = ['mod.eth'];
    testState.comments = {};
    testState.directories = [
      { address: 'music-posting.eth', features: {}, title: '/mu/ - Music' },
      { address: 'politically-incorrect.bso', directoryCode: 'pol', features: { hasFlags: true }, title: '/pol/ - Politically Incorrect' },
      { address: 'random-nsfw.bso', features: {}, title: '/b/ - Random' },
      { address: 'silly-stuff.bso', features: {}, title: '/s5s/ - Silly Stuff' },
      { address: 'traditional-games.bso', features: {}, title: '/tg/ - Traditional Games' },
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
    const linkInput = textInputs[3];

    expect(textarea?.value).toBe('');
    expect(linkInput).toBeTruthy();

    await dispatchInput(linkInput as HTMLInputElement, 'https://example.com/fresh.png');
    await clickByText(table as HTMLTableElement, 'post');

    expect(testState.publishPostMock).toHaveBeenCalledTimes(1);
    expect(testState.publishedPostOptions?.link).toBe('https://example.com/fresh.png');
    expect(testState.publishedPostOptions?.content).toBeUndefined();
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
      challengeRequest: {
        challengeAnswers: ['bitsocial-flags:5chan:flag:pol:AC'],
      },
      flairs: [{ type: 'pol', code: 'AC', text: 'flag:pol:AC' }],
    });
  });

  it('validates unsupported options and stores fortune output in post content', async () => {
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
    expect(container.textContent).not.toContain('unsupported options');

    await waitForOptionsValidation();
    expect(container.textContent).toContain('unsupported options: x, y, z');
    const delayedOptionsError = Array.from(container.querySelectorAll('div')).find((element) => element.textContent === 'unsupported options: x, y, z');
    expect(delayedOptionsError?.className).toContain('error');
    expect(delayedOptionsError?.className).toContain('formError');

    await dispatchInput(textarea as HTMLTextAreaElement, 'fortune body');
    await clickByText(table as HTMLTableElement, 'post');

    expect(testState.publishPostMock).not.toHaveBeenCalled();

    await dispatchInput(optionsInput as HTMLInputElement, 'fortune');

    expect(container.textContent).not.toContain('unsupported options');
    expect(testState.publishPostOptions.content).toBe('fortune body<span class="fortune" style="color:#fd4d32"><br><br><b>Your fortune: Excellent Luck</b></span>');

    await clickByText(table as HTMLTableElement, 'post');

    expect(testState.publishPostMock).toHaveBeenCalledTimes(1);
    randomSpy.mockRestore();
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

    expect(container.textContent).not.toContain('unsupported options');

    await dispatchInput(textarea as HTMLTextAreaElement, 'silly fortune');
    await clickByText(table as HTMLTableElement, 'post');

    expect(testState.publishPostMock).toHaveBeenCalledTimes(1);
    expect(testState.publishedPostOptions?.content).toBe('silly fortune<span class="fortune" style="color:#fd4d32"><br><br><b>Your fortune: Excellent Luck</b></span>');
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

    expect(container.textContent).not.toContain('unsupported options');

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
    expect(container.textContent).not.toContain('unsupported options');

    await waitForOptionsValidation();
    expect(container.textContent).toContain('unsupported options: fortune');

    await dispatchInput(textarea as HTMLTextAreaElement, 'plain body');
    await clickByText(table as HTMLTableElement, 'post');

    expect(testState.publishPostMock).not.toHaveBeenCalled();
    expect(testState.publishPostOptions.content).toBe('plain body');
  });

  it('treats dice rolls as unsupported outside /tg/ and /qst/', async () => {
    testState.resolvedCommunityAddress = 'random-nsfw.bso';

    await renderPostForm('/b');
    await clickByText(container, 'start_new_thread');

    const table = container.querySelector('table');
    const optionsInput = table?.querySelector<HTMLInputElement>('input[aria-label="options"]');
    const textarea = table?.querySelector<HTMLTextAreaElement>('textarea');

    await dispatchInput(optionsInput as HTMLInputElement, 'dice+1d6');
    expect(container.textContent).not.toContain('unsupported options');

    await waitForOptionsValidation();
    expect(container.textContent).toContain('unsupported options: dice+1d6');

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
    expect(links.map((link) => link.getAttribute('href'))).toEqual(['/rules/mu', '/faq']);
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

    expect(testState.resetPublishPostOptionsMock).toHaveBeenCalledTimes(1);
    expect(testState.navigateMock).toHaveBeenCalledWith('/pending/7', { state: { boardPath: 'mu' } });
  });

  it('redirects new posts to the board index when nonoko is used', async () => {
    testState.resolvedCommunityAddress = 'music-posting.eth';
    testState.publishPostMock.mockImplementation(() => {
      testState.postIndex = 7;
    });

    await renderPostForm('/mu');
    await clickByText(container, 'start_new_thread');

    const table = container.querySelector('table');
    const optionsInput = table?.querySelector<HTMLInputElement>('input[aria-label="options"]');
    const subjectInput = table?.querySelector<HTMLInputElement>('input[aria-label="subject"]');

    await dispatchInput(optionsInput as HTMLInputElement, 'nonoko');
    await dispatchInput(subjectInput as HTMLInputElement, 'Thread title');
    await clickByText(table as HTMLTableElement, 'post');
    await flushEffects();

    expect(testState.publishPostMock).toHaveBeenCalledTimes(1);
    expect(testState.resetPublishPostOptionsMock).toHaveBeenCalledTimes(1);
    expect(testState.navigateMock).toHaveBeenCalledWith('/mu', { state: { nonokoPendingAccountCommentIndex: 7 } });
    expect(testState.navigateMock).not.toHaveBeenCalledWith('/pending/7');
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
