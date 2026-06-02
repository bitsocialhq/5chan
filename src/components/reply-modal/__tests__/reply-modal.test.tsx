import * as React from 'react';
import { createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ReplyModal from '../reply-modal';
import { OEKAKI_WEB_WARNING_TEXT } from '../../../lib/oekaki/oekaki-copy';
import { POST_OPTIONS_VALIDATION_DELAY_MS } from '../../../lib/utils/post-options-utils';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
const act = (React as { act?: (cb: () => void | Promise<void>) => void | Promise<void> }).act as (cb: () => void | Promise<void>) => void | Promise<void>;

const testState = vi.hoisted(() => ({
  account: { author: { address: 'alice.eth', displayName: 'Alice' } } as { author?: { address?: string; displayName?: string } },
  closeModalMock: vi.fn(),
  directoryByAddress: {
    'music-posting.eth': {
      address: 'music-posting.eth',
      features: {},
      title: '/mu/ - Music',
    },
  } as Record<string, { address: string; directoryCode?: string; features?: Record<string, unknown>; title?: string }>,
  handleUploadMock: vi.fn(),
  uploadFileMock: vi.fn(),
  isMobile: false,
  mediaHostingRuntime: 'web' as 'web' | 'android' | 'electron',
  isResolvingExternalQuotes: false,
  isUploading: false,
  navigateMock: vi.fn(),
  offlineTitle: '' as string | false,
  offlineStates: {} as Record<string, { isOffline: boolean; isOnlineStatusLoading: boolean; offlineTitle: string | false }>,
  offlineStatusLoading: false,
  offlineWarningVisible: false,
  openEmpty: false,
  publishReplyMock: vi.fn(),
  publishReplyError: null as string | null,
  publishReplyStateMessage: null as string | null,
  quoteInsertNumber: undefined as number | undefined,
  quoteInsertRequestId: 0,
  quoteInsertSelectedText: '',
  dragHandler: undefined as ((state: { active: boolean; event: Pick<Event, 'preventDefault'>; offset: [number, number] }) => void) | undefined,
  replyIndex: undefined as number | undefined,
  resetPublishReplyOptionsMock: vi.fn(),
  resolvedCommunityAddress: undefined as string | undefined,
  rolesByCommunity: {} as Record<string, Record<string, { role?: string }>>,
  selectedText: 'selected text',
  setAccountMock: vi.fn(),
  setPublishReplyOptionsMock: vi.fn(),
  springStartMock: vi.fn(),
  useSpringMock: vi.fn(),
  communities: {
    'music-posting.eth': {
      address: 'music-posting.eth',
    },
  } as Record<string, { address: string }>,
  showUploadControls: true,
  uploadComplete: undefined as ((url: string) => void) | undefined,
  uploadedFileName: null as string | null,
  uploadMode: 'always',
}));

vi.mock('react-i18next', () => ({
  Trans: ({ i18nKey, values }: { i18nKey: string; values?: Record<string, unknown> }) =>
    createElement('span', { 'data-testid': `trans-${i18nKey}` }, `${i18nKey}:${JSON.stringify(values || {})}`),
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) => {
      if (!options) {
        return key;
      }
      if (typeof options.no !== 'undefined') {
        return `${key}:${options.no}`;
      }
      if (typeof options.length !== 'undefined') {
        return `${key}:${options.length}`;
      }
      return `${key}:${JSON.stringify(options)}`;
    },
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
  useCommunity: (options?: { community?: { name?: string; publicKey?: string } }) => {
    const communityKey = options?.community?.name ?? options?.community?.publicKey;
    return communityKey ? testState.communities[communityKey] : undefined;
  },
}));

vi.mock('@bitsocial/bitsocial-react-hooks/dist/stores/communities', () => ({
  default: <T,>(selector: (state: { communities: typeof testState.communities }) => T) =>
    selector({
      communities: testState.communities,
    }),
}));

vi.mock('../../../hooks/use-is-community-offline', () => ({
  default: (community?: { address?: string }) =>
    (community?.address ? testState.offlineStates[community.address] : undefined) || {
      isOffline: testState.offlineWarningVisible,
      isOnlineStatusLoading: testState.offlineStatusLoading,
      offlineTitle: testState.offlineTitle,
    },
}));

vi.mock('../../../stores/use-selected-text-store', () => ({
  default: () => ({
    selectedText: testState.selectedText,
  }),
}));

vi.mock('../../../stores/use-reply-modal-store', () => ({
  default: <T,>(selector?: (state: { openEmpty: boolean; quoteInsertNumber?: number; quoteInsertRequestId: number; quoteInsertSelectedText: string }) => T) => {
    const state = {
      openEmpty: testState.openEmpty,
      quoteInsertNumber: testState.quoteInsertNumber,
      quoteInsertRequestId: testState.quoteInsertRequestId,
      quoteInsertSelectedText: testState.quoteInsertSelectedText,
    };
    return selector ? selector(state) : (state as T);
  },
}));

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

vi.mock('../../../hooks/use-directories', () => ({
  findDirectoryByAddress: (directories: Array<{ address: string; features?: Record<string, unknown>; title?: string }>, address: string | undefined) =>
    directories.find((entry) => entry.address === address),
  useDirectories: () => Object.values(testState.directoryByAddress),
  useDirectoryByAddress: (address: string) => testState.directoryByAddress[address],
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

vi.mock('../../../hooks/use-publish-reply', () => ({
  default: () => ({
    isResolvingExternalQuotes: testState.isResolvingExternalQuotes,
    publishReply: (options?: Record<string, unknown>) => {
      if (options) {
        testState.setPublishReplyOptionsMock(options);
      }
      return testState.publishReplyMock(options);
    },
    publishReplyError: testState.publishReplyError,
    publishReplyStateMessage: testState.publishReplyStateMessage,
    replyIndex: testState.replyIndex,
    resetPublishReplyOptions: testState.resetPublishReplyOptionsMock,
    setPublishReplyOptions: (options: Record<string, unknown>) => testState.setPublishReplyOptionsMock(options),
  }),
}));

vi.mock('../../../hooks/use-is-mobile', () => ({
  default: () => testState.isMobile,
}));

vi.mock('../../../hooks/use-file-upload', () => ({
  useFileUpload: ({ onUploadComplete }: { onUploadComplete: (url: string) => void }) => {
    testState.uploadComplete = onUploadComplete;
    return {
      handleUpload: testState.handleUploadMock,
      uploadFile: testState.uploadFileMock,
      isUploading: testState.isUploading,
      uploadedFileName: testState.uploadedFileName,
    };
  },
}));

vi.mock('../../loading-ellipsis', () => ({
  default: ({ string }: { string: string }) => createElement('span', { 'data-testid': 'loading-ellipsis' }, string),
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

vi.mock('@react-spring/web', async () => {
  const React = await vi.importActual<typeof import('react')>('react');
  const normalizeStyle = (style: Record<string, unknown> | undefined) =>
    style
      ? Object.fromEntries(
          Object.entries(style).map(([key, value]) => [
            key,
            typeof value === 'object' && value !== null && 'get' in value && typeof (value as { get: unknown }).get === 'function'
              ? (value as { get: () => unknown }).get()
              : value,
          ]),
        )
      : undefined;

  return {
    animated: {
      div: React.forwardRef(({ style, ...props }: any, ref) => React.createElement('div', { ...props, ref, style: normalizeStyle(style) })),
    },
    useSpring: testState.useSpringMock.mockImplementation(() => [
      {
        left: { get: () => 120 },
        top: { get: () => 80 },
      },
      {
        start: testState.springStartMock,
      },
    ]),
  };
});

vi.mock('@use-gesture/react', () => ({
  useDrag: (handler: (state: { active: boolean; event: Pick<Event, 'preventDefault'>; offset: [number, number] }) => void) => {
    testState.dragHandler = handler;
    return () => ({});
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

const renderReplyModal = async (initialEntry = '/mu/thread/post-1', communityAddress = 'music-posting.eth') => {
  await act(async () => {
    root.render(
      createElement(
        MemoryRouter,
        { initialEntries: [initialEntry] },
        createElement(ReplyModal, {
          closeModal: testState.closeModalMock,
          parentCid: 'parent-cid',
          parentNumber: 42,
          postCid: 'post-cid',
          scrollY: 120,
          showReplyModal: true,
          communityAddress,
          threadNumber: 42,
        }),
      ),
    );
  });
  await flushEffects();
};

const rerenderReplyModal = async (initialEntry = '/mu/thread/post-1') => {
  await renderReplyModal(initialEntry);
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

const clickButtonByText = async (text: string) => {
  const button = Array.from(container.querySelectorAll('button')).find((candidate) => candidate.textContent === text);
  await act(async () => {
    button?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
};

describe('ReplyModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    testState.account = { author: { address: 'alice.eth', displayName: 'Alice' } };
    testState.closeModalMock.mockReset();
    testState.directoryByAddress = {
      'music-posting.eth': {
        address: 'music-posting.eth',
        features: {},
        title: '/mu/ - Music',
      },
      'politically-incorrect.bso': {
        address: 'politically-incorrect.bso',
        directoryCode: 'pol',
        features: { hasFlags: true },
        title: '/pol/ - Politically Incorrect',
      },
      'international-nsfw.bso': {
        address: 'international-nsfw.bso',
        directoryCode: 'bant',
        features: { hasFlags: true },
        title: '/bant/ - International/Random',
      },
      'international-sfw.bso': {
        address: 'international-sfw.bso',
        directoryCode: 'int',
        features: { hasFlags: true },
        title: '/int/ - International',
      },
      'sports-posting.bso': {
        address: 'sports-posting.bso',
        directoryCode: 'sp',
        features: { hasFlags: true },
        title: '/sp/ - Sports',
      },
      'random-nsfw.bso': {
        address: 'random-nsfw.bso',
        features: {},
        title: '/b/ - Random',
      },
      'silly-stuff.bso': {
        address: 'silly-stuff.bso',
        features: {},
        title: '/s5s/ - Silly Stuff',
      },
      'traditional-games.bso': {
        address: 'traditional-games.bso',
        features: {},
        title: '/tg/ - Traditional Games',
      },
    };
    testState.handleUploadMock.mockReset();
    testState.uploadFileMock.mockReset();
    testState.isMobile = false;
    testState.isResolvingExternalQuotes = false;
    testState.isUploading = false;
    testState.navigateMock.mockReset();
    testState.offlineTitle = '';
    testState.offlineStates = {};
    testState.offlineStatusLoading = false;
    testState.offlineWarningVisible = false;
    testState.openEmpty = false;
    testState.publishReplyMock.mockReset();
    testState.publishReplyError = null;
    testState.publishReplyStateMessage = null;
    testState.quoteInsertNumber = undefined;
    testState.quoteInsertRequestId = 0;
    testState.quoteInsertSelectedText = '';
    testState.dragHandler = undefined;
    testState.replyIndex = undefined;
    testState.resetPublishReplyOptionsMock.mockReset();
    testState.resolvedCommunityAddress = undefined;
    testState.rolesByCommunity = {};
    testState.selectedText = 'selected text';
    testState.setAccountMock.mockReset();
    testState.setPublishReplyOptionsMock.mockReset();
    testState.springStartMock.mockReset();
    testState.useSpringMock.mockReset();
    testState.useSpringMock.mockImplementation(() => [
      {
        left: { get: () => 120 },
        top: { get: () => 80 },
      },
      {
        start: testState.springStartMock,
      },
    ]);
    testState.communities = {
      'music-posting.eth': {
        address: 'music-posting.eth',
      },
      'traditional-games.bso': {
        address: 'traditional-games.bso',
      },
    };
    testState.showUploadControls = true;
    testState.uploadComplete = undefined;
    testState.uploadedFileName = null;
    testState.uploadMode = 'always';
    testState.mediaHostingRuntime = 'web';
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    document.body.style.userSelect = '';
    document.body.style.webkitUserSelect = '';
  });

  it('initializes quoted content, display name, upload controls, and shared offline warning on board routes', async () => {
    testState.offlineTitle = 'posts_last_synced_info:{"time":"ago:1000"}';
    testState.offlineWarningVisible = true;

    await renderReplyModal('/mu/thread/post-1');

    const nameInput = container.querySelectorAll<HTMLInputElement>('input[type="text"]')[0];
    const optionsInput = container.querySelectorAll<HTMLInputElement>('input[type="text"]')[1];
    const linkInput = container.querySelectorAll<HTMLInputElement>('input[type="text"]')[2];
    const textarea = container.querySelector<HTMLTextAreaElement>('textarea');

    expect(optionsInput).toBeTruthy();
    expect(linkInput).toBeTruthy();
    expect(textarea).toBeTruthy();
    expect(nameInput?.value).toBe('Alice');
    expect(optionsInput?.getAttribute('placeholder')).toBe('Options');
    expect(linkInput?.getAttribute('placeholder')).toContain('Link');
    expect(textarea?.value).toBe('>>42\nselected text');
    expect(Boolean(optionsInput!.compareDocumentPosition(textarea!) & Node.DOCUMENT_POSITION_FOLLOWING)).toBe(true);
    expect(Boolean(textarea!.compareDocumentPosition(linkInput!) & Node.DOCUMENT_POSITION_FOLLOWING)).toBe(true);
    expect(container.textContent).toContain('choose_file');
    expect(container.textContent).toContain('Spoiler?');
    expect(container.textContent).toContain('posts_last_synced_info:{"time":"ago:1000"}');
    expect(testState.setPublishReplyOptionsMock).toHaveBeenCalledWith({ content: '>>42\nselected text' });
    expect(testState.setPublishReplyOptionsMock).toHaveBeenCalledWith({ displayName: 'Alice' });
  });

  it('shows Oekaki draw controls on /i/ replies', async () => {
    testState.directoryByAddress['oekaki-posting.bso'] = {
      address: 'oekaki-posting.bso',
      directoryCode: 'i',
      features: { requirePostLink: true, requirePostLinkIsMedia: true },
      title: '/i/ - Oekaki',
    };
    testState.communities['oekaki-posting.bso'] = { address: 'oekaki-posting.bso' };

    await renderReplyModal('/i/thread/post-1', 'oekaki-posting.bso');

    expect(container.textContent).toContain('Size');
    expect(container.textContent).toContain('Replay');
    expect(Array.from(container.querySelectorAll('span')).some((span) => span.textContent === '×')).toBe(true);
    expect(container.textContent).toContain(OEKAKI_WEB_WARNING_TEXT);
    expect(Array.from(container.querySelectorAll('button')).some((button) => button.textContent === 'Draw')).toBe(true);
    expect((Array.from(container.querySelectorAll('button')).find((button) => button.textContent === 'Clear') as HTMLButtonElement | undefined)?.disabled).toBe(true);

    testState.mediaHostingRuntime = 'android';
    await renderReplyModal('/i/thread/post-1', 'oekaki-posting.bso');

    expect(container.textContent).not.toContain(OEKAKI_WEB_WARNING_TEXT);
  });

  it('shows a flag selector on flag boards and publishes the default geographic request', async () => {
    await renderReplyModal('/pol/thread/post-1', 'politically-incorrect.bso');

    const flagSelect = container.querySelector<HTMLSelectElement>('select[aria-label="flag"]');

    expect(flagSelect).toBeTruthy();
    expect(flagSelect?.value).toBe('country:auto');
    expect(
      Array.from(flagSelect?.options || [])
        .slice(0, 3)
        .map((option) => option.textContent),
    ).toEqual(['Geographic Location', 'Anarcho-Capitalist', 'Anarchist']);
    const linkInput = container.querySelectorAll<HTMLInputElement>('input[type="text"]')[2];
    expect(Boolean(linkInput!.compareDocumentPosition(flagSelect!) & Node.DOCUMENT_POSITION_FOLLOWING)).toBe(true);

    await clickButtonByText('post');

    expect(testState.publishReplyMock).toHaveBeenCalledWith({
      content: '>>42\nselected text',
      challengeRequest: {
        challengeAnswers: ['bitsocial-flags:5chan:flag:country:auto'],
      },
      flairs: [{ type: 'country', code: 'auto', text: 'flag:country:auto' }],
    });
  });

  it.each([
    { boardPath: '/bant/thread/post-1', communityAddress: 'international-nsfw.bso' },
    { boardPath: '/int/thread/post-1', communityAddress: 'international-sfw.bso' },
    { boardPath: '/sp/thread/post-1', communityAddress: 'sports-posting.bso' },
  ])('publishes geographic location on country-only boards without showing a flag selector', async ({ boardPath, communityAddress }) => {
    await renderReplyModal(boardPath, communityAddress);

    expect(container.querySelector<HTMLSelectElement>('select[aria-label="flag"]')).toBeNull();

    await clickButtonByText('post');

    expect(testState.publishReplyMock).toHaveBeenCalledWith({
      content: '>>42\nselected text',
      challengeRequest: {
        challengeAnswers: ['bitsocial-flags:5chan:flag:country:auto'],
      },
      flairs: [{ type: 'country', code: 'auto', text: 'flag:country:auto' }],
    });
  });

  it('publishes selected political flags from the reply modal', async () => {
    await renderReplyModal('/pol/thread/post-1', 'politically-incorrect.bso');

    const flagSelect = container.querySelector<HTMLSelectElement>('select[aria-label="flag"]');
    await dispatchInput(container.querySelector<HTMLTextAreaElement>('textarea') as HTMLTextAreaElement, 'reply body');
    await act(async () => {
      if (flagSelect) {
        flagSelect.value = 'pol:AC';
        flagSelect.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });
    await clickButtonByText('post');

    expect(testState.publishReplyMock).toHaveBeenCalledWith({
      content: 'reply body',
      challengeRequest: {
        challengeAnswers: ['bitsocial-flags:5chan:flag:pol:AC'],
      },
      flairs: [{ type: 'pol', code: 'AC', text: 'flag:pol:AC' }],
    });
  });

  it('uses the shared loading ellipsis while a reply upload is running', async () => {
    testState.isUploading = true;

    await renderReplyModal('/mu/thread/post-1');

    expect(container.querySelector('[data-testid="loading-ellipsis"]')?.textContent).toBe('uploading');
  });

  it('does not render an offline warning when the shared offline hook reports the board as online', async () => {
    await renderReplyModal('/mu/thread/post-1');

    expect(container.querySelector('[class*="offlineBoard"]')).toBeNull();
    expect(container.textContent).not.toContain('community_offline_info');
  });

  it('prefers the resolved board entry when the modal prop address uses a different alias', async () => {
    testState.offlineTitle = 'community_offline_info';
    testState.offlineWarningVisible = true;
    testState.resolvedCommunityAddress = 'music-posting.eth';
    testState.communities = {
      'music-posting.eth': {
        address: 'music-posting.eth',
      },
    };
    testState.offlineStates = {
      'music-posting.eth': {
        isOffline: false,
        isOnlineStatusLoading: false,
        offlineTitle: '',
      },
    };

    await renderReplyModal('/mu/thread/post-1', 'music-posting.bso');

    expect(container.querySelector('[class*="offlineBoard"]')).toBeNull();
    expect(container.textContent).not.toContain('community_offline_info');
  });

  it('validates empty and invalid replies, then publishes once the payload is valid', async () => {
    testState.openEmpty = true;
    testState.selectedText = '';

    await renderReplyModal('/mu/thread/post-1');

    await clickButtonByText('post');
    expect(container.textContent).toContain('error: empty_comment_alert');
    expect(testState.publishReplyMock).not.toHaveBeenCalled();

    const linkInput = container.querySelectorAll<HTMLInputElement>('input[type="text"]')[2];
    const spoilerCheckbox = container.querySelector<HTMLInputElement>('input[type="checkbox"]');
    await dispatchInput(linkInput, 'not-a-url');
    await act(async () => {
      spoilerCheckbox?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    await clickButtonByText('post');

    expect(container.textContent).toContain('error: invalid_url_alert');
    expect(testState.setPublishReplyOptionsMock).toHaveBeenCalledWith({ spoiler: true });

    await dispatchInput(linkInput, 'https://temp.sh/example.png');
    await clickButtonByText('post');

    expect(container.textContent).toContain('error: expiring_media_link_alert:{"domain":"temp.sh"}');
    expect(testState.publishReplyMock).not.toHaveBeenCalled();

    await dispatchInput(linkInput, 'https://example.com/file.png');
    await clickButtonByText('post');

    expect(container.textContent).toContain('file.png');
    expect(testState.setPublishReplyOptionsMock).toHaveBeenCalledWith({ link: 'https://example.com/file.png' });
    expect(testState.publishReplyMock).toHaveBeenCalledTimes(1);
  });

  it('moves YouTube links into reply content and publishes the thumbnail link on media-only boards', async () => {
    const youtubeLink = 'https://youtu.be/reply123';
    const thumbnailLink = 'https://img.youtube.com/vi/reply123/0.jpg';
    testState.openEmpty = true;
    testState.selectedText = 'reply body';
    testState.directoryByAddress['music-posting.eth'] = {
      address: 'music-posting.eth',
      features: { requirePostLinkIsMedia: true },
      title: '/mu/ - Music',
    };

    await renderReplyModal('/mu/thread/post-1');

    const textarea = container.querySelector<HTMLTextAreaElement>('textarea') as HTMLTextAreaElement;
    const linkInput = container.querySelectorAll<HTMLInputElement>('input[type="text"]')[2];
    const linkContainer = linkInput.parentElement as HTMLElement;
    const getConversionNotice = () =>
      Array.from(container.querySelectorAll<HTMLDivElement>('div'))
        .reverse()
        .find((element) => element.textContent?.includes('youtube_thumbnail_link_conversion_notice'));

    await dispatchInput(linkInput, youtubeLink);

    expect(linkInput.value).toBe(youtubeLink);
    expect(container.textContent).toContain('youtube_thumbnail_link_conversion_notice:{"count":3}');
    expect(linkContainer.textContent).not.toContain('youtube_thumbnail_link_conversion_notice');
    expect(getConversionNotice()?.className).toContain('error');

    await clickButtonByText('post');

    expect(linkInput.value).toBe(thumbnailLink);
    expect(textarea.value).toBe(`${youtubeLink}\nreply body`);
    expect(testState.publishReplyMock).toHaveBeenCalledWith({
      content: `${youtubeLink}\nreply body`,
      link: thumbnailLink,
    });
  });

  it('validates unsupported options and stores fortune output in reply content', async () => {
    const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.25);
    testState.openEmpty = true;
    testState.selectedText = '';

    await renderReplyModal('/b/thread/post-1', 'random-nsfw.bso');

    const optionsInput = container.querySelectorAll<HTMLInputElement>('input[type="text"]')[1];
    const textarea = container.querySelector<HTMLTextAreaElement>('textarea');

    await dispatchInput(optionsInput, 'x y z');
    expect(container.textContent).not.toContain('Unsupported options');

    await waitForOptionsValidation();
    expect(container.textContent).toContain('Unsupported options: x, y, z.');
    const delayedOptionsError = Array.from(container.querySelectorAll('div')).find((element) => element.textContent === 'Unsupported options: x, y, z.');
    expect(delayedOptionsError?.className).toContain('error');

    await dispatchInput(textarea as HTMLTextAreaElement, 'reply body');
    await clickButtonByText('post');

    expect(testState.publishReplyMock).not.toHaveBeenCalled();

    await dispatchInput(optionsInput, 'fortune');

    expect(container.textContent).not.toContain('Unsupported options');
    expect(testState.setPublishReplyOptionsMock).toHaveBeenCalledWith({
      content: 'reply body<span class="fortune" style="color:#fd4d32"><br><br><b>Your fortune: Excellent Luck</b></span>',
    });

    await clickButtonByText('post');

    expect(testState.publishReplyMock).toHaveBeenCalledTimes(1);
    randomSpy.mockRestore();
  });

  it('links the unsupported sage option to its FAQ entry in reply modal', async () => {
    testState.openEmpty = true;
    testState.selectedText = '';

    await renderReplyModal('/b/thread/post-1', 'random-nsfw.bso');

    const optionsInput = container.querySelectorAll<HTMLInputElement>('input[type="text"]')[1];

    await dispatchInput(optionsInput, 'sage');
    await waitForOptionsValidation();

    expect(container.textContent).toContain('Unsupported options: sage [learn why].');
    expect(container.querySelector<HTMLAnchorElement>('a[href="/faq#sage"]')?.textContent).toBe('learn why');
  });

  it('supports fortune on the /s5s/ route when directory metadata is not loaded', async () => {
    const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.25);
    testState.openEmpty = true;
    testState.selectedText = '';
    delete testState.directoryByAddress['silly-stuff.bso'];

    await renderReplyModal('/s5s/thread/post-1', 'silly-stuff.bso');

    const optionsInput = container.querySelectorAll<HTMLInputElement>('input[type="text"]')[1];
    const textarea = container.querySelector<HTMLTextAreaElement>('textarea');

    await dispatchInput(optionsInput, 'fortune');
    await waitForOptionsValidation();

    expect(container.textContent).not.toContain('Unsupported options');

    await dispatchInput(textarea as HTMLTextAreaElement, 'silly reply');
    await clickButtonByText('post');

    expect(testState.publishReplyMock).toHaveBeenCalledTimes(1);
    expect(testState.setPublishReplyOptionsMock).toHaveBeenCalledWith({
      content: 'silly reply<span class="fortune" style="color:#fd4d32"><br><br><b>Your fortune: Excellent Luck</b></span>',
    });
    randomSpy.mockRestore();
  });

  it('stores dice rolls in reply content on dice-enabled boards', async () => {
    const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.25);
    testState.openEmpty = true;
    testState.selectedText = '';

    await renderReplyModal('/tg/thread/post-1', 'traditional-games.bso');

    const optionsInput = container.querySelectorAll<HTMLInputElement>('input[type="text"]')[1];
    const textarea = container.querySelector<HTMLTextAreaElement>('textarea');

    await dispatchInput(optionsInput, 'dice+2d6');
    await waitForOptionsValidation();

    expect(container.textContent).not.toContain('Unsupported options');

    await dispatchInput(textarea as HTMLTextAreaElement, 'dice reply');
    await clickButtonByText('post');

    expect(testState.publishReplyMock).toHaveBeenCalledTimes(1);
    expect(testState.setPublishReplyOptionsMock).toHaveBeenCalledWith({
      content: '<b>Rolled 2, 2 = 4 (2d6)<br><br></b>dice reply',
    });
    randomSpy.mockRestore();
  });

  it('treats dice rolls as unsupported outside /tg/ and /qst/ in reply modal', async () => {
    testState.openEmpty = true;
    testState.selectedText = '';

    await renderReplyModal('/b/thread/post-1', 'random-nsfw.bso');

    const optionsInput = container.querySelectorAll<HTMLInputElement>('input[type="text"]')[1];
    const textarea = container.querySelector<HTMLTextAreaElement>('textarea');

    await dispatchInput(optionsInput, 'dice+1d6');
    expect(container.textContent).not.toContain('Unsupported options');

    await waitForOptionsValidation();
    expect(container.textContent).toContain('Unsupported options: dice+1d6. Option "dice+1d6" is supported on: /qst/, /tg/.');
    expect(container.querySelector<HTMLAnchorElement>('a[href="/qst"]')?.textContent).toBe('/qst/');
    expect(container.querySelector<HTMLAnchorElement>('a[href="/tg"]')?.textContent).toBe('/tg/');

    await dispatchInput(textarea as HTMLTextAreaElement, 'plain dice reply');
    await clickButtonByText('post');

    expect(testState.publishReplyMock).not.toHaveBeenCalled();
    expect(testState.setPublishReplyOptionsMock).toHaveBeenCalledWith({ content: 'plain dice reply' });
  });

  it('treats fortune as unsupported outside /b/ and /s5s/ in reply modal', async () => {
    testState.openEmpty = true;
    testState.selectedText = '';

    await renderReplyModal('/mu/thread/post-1', 'music-posting.eth');

    const optionsInput = container.querySelectorAll<HTMLInputElement>('input[type="text"]')[1];
    const textarea = container.querySelector<HTMLTextAreaElement>('textarea');

    await dispatchInput(optionsInput, 'fortune');
    expect(container.textContent).not.toContain('Unsupported options');

    await waitForOptionsValidation();
    expect(container.textContent).toContain('Unsupported options: fortune. Option "fortune" is supported on: /b/, /s5s/.');
    expect(container.querySelector<HTMLAnchorElement>('a[href="/b"]')?.textContent).toBe('/b/');
    expect(container.querySelector<HTMLAnchorElement>('a[href="/s5s"]')?.textContent).toBe('/s5s/');

    await dispatchInput(textarea as HTMLTextAreaElement, 'plain reply');
    await clickButtonByText('post');

    expect(testState.publishReplyMock).not.toHaveBeenCalled();
    expect(testState.setPublishReplyOptionsMock).toHaveBeenCalledWith({ content: 'plain reply' });
  });

  it('shows BBCode controls only for board mods and inserts tags into the reply textarea', async () => {
    testState.account = { author: { address: 'mod.eth', displayName: 'Alice' } };
    testState.rolesByCommunity = {
      'music-posting.eth': {
        'mod.eth': { role: 'admin' },
      },
    };

    await renderReplyModal('/mu/thread/post-1');

    const textarea = container.querySelector<HTMLTextAreaElement>('textarea');
    const redButton = container.querySelector<HTMLButtonElement>('button[aria-label="Red text"]');
    const linkButton = container.querySelector<HTMLButtonElement>('button[aria-label="Link"]');
    expect(textarea).toBeTruthy();
    expect(redButton).toBeTruthy();
    expect(linkButton).toBeTruthy();
    expect(container.querySelector('select[aria-label="Text color"]')).toBeNull();
    expect(container.textContent).not.toContain('mods only');
    expect(container.textContent).not.toContain('Mod editor');
    expect(container.textContent).toContain('warning: posting as admin');
    const moderatorWarning = Array.from(container.querySelectorAll('div')).find((element) => element.textContent === 'warning: posting as admin');
    expect(moderatorWarning?.className).toContain('error');
    expect(container.querySelector('button[aria-label="Quote"]')).toBeNull();

    const selectionStart = textarea?.value.indexOf('selected text') ?? 0;
    textarea?.setSelectionRange(selectionStart, selectionStart + 'selected text'.length);
    await act(async () => {
      redButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(textarea?.value).toBe('>>42\n[color=red]selected text[/color]');
    expect(testState.setPublishReplyOptionsMock).toHaveBeenCalledWith({ content: '>>42\n[color=red]selected text[/color]' });

    testState.rolesByCommunity = {};
    await rerenderReplyModal('/mu/thread/post-1');

    expect(container.querySelector('button[aria-label="Red text"]')).toBeNull();
    expect(container.textContent).not.toContain('mods only');
    expect(container.textContent).not.toContain('warning: posting as admin');
  });

  it('updates account state, applies upload completions, and closes once publishing succeeds', async () => {
    await renderReplyModal('/mu/thread/post-1');

    const nameInput = container.querySelectorAll<HTMLInputElement>('input[type="text"]')[0];
    const linkInput = container.querySelectorAll<HTMLInputElement>('input[type="text"]')[2];

    await dispatchInput(nameInput, 'Alicia');
    expect(testState.setAccountMock).toHaveBeenCalledWith({
      author: { address: 'alice.eth', displayName: 'Alicia' },
    });
    expect(testState.setPublishReplyOptionsMock).toHaveBeenCalledWith({ displayName: 'Alicia' });

    await act(async () => {
      testState.uploadComplete?.('https://cdn.example/uploaded.png');
    });

    expect(linkInput?.value).toBe('https://cdn.example/uploaded.png');
    expect(container.textContent).toContain('uploaded.png');
    expect(testState.setPublishReplyOptionsMock).toHaveBeenCalledWith({ link: 'https://cdn.example/uploaded.png' });

    testState.replyIndex = 3;
    await rerenderReplyModal('/mu/thread/post-1');

    expect(testState.resetPublishReplyOptionsMock).toHaveBeenCalledTimes(1);
    expect(testState.closeModalMock).toHaveBeenCalledTimes(1);
  });

  it('redirects to the board index after a reply when nonoko is used', async () => {
    testState.openEmpty = true;
    testState.selectedText = '';
    testState.publishReplyMock.mockImplementation(() => {
      testState.replyIndex = 3;
    });

    await renderReplyModal('/mu/thread/post-1');

    const optionsInput = container.querySelectorAll<HTMLInputElement>('input[type="text"]')[1];
    const textarea = container.querySelector<HTMLTextAreaElement>('textarea');

    await dispatchInput(optionsInput, 'nonoko');
    await dispatchInput(textarea as HTMLTextAreaElement, 'reply body');
    await clickButtonByText('post');
    await rerenderReplyModal('/mu/thread/post-1');

    expect(testState.publishReplyMock).toHaveBeenCalledTimes(1);
    expect(testState.resetPublishReplyOptionsMock).toHaveBeenCalledTimes(1);
    expect(testState.closeModalMock).toHaveBeenCalledTimes(1);
    expect(testState.navigateMock).toHaveBeenCalledWith('/mu');
  });

  it('inserts quote requests only once and keeps the textarea content stable across rerenders', async () => {
    testState.isMobile = true;
    testState.openEmpty = true;
    testState.selectedText = 'Existing line';

    await renderReplyModal('/mu/thread/post-1');

    const textarea = container.querySelector<HTMLTextAreaElement>('textarea');
    expect(textarea?.value).toBe('Existing line');

    testState.quoteInsertNumber = 77;
    testState.quoteInsertRequestId = 1;
    testState.quoteInsertSelectedText = 'Quoted line';
    await rerenderReplyModal('/mu/thread/post-1');

    expect(textarea?.value).toBe('Existing line\n>>77\nQuoted line\n');
    expect(testState.setPublishReplyOptionsMock).toHaveBeenCalledWith({
      content: 'Existing line\n>>77\nQuoted line\n',
    });

    await rerenderReplyModal('/mu/thread/post-1');
    expect(textarea?.value).toBe('Existing line\n>>77\nQuoted line\n');
  });

  it('uses file-link placeholder defaults in all view and hides board-specific warnings or spoiler controls when disabled', async () => {
    testState.directoryByAddress = {
      'music-posting.eth': {
        address: 'music-posting.eth',
        features: { noSpoilerReplies: true },
      },
    };

    await renderReplyModal('/all/thread/post-1');

    const linkInput = container.querySelectorAll<HTMLInputElement>('input[type="text"]')[2];
    expect(linkInput?.getAttribute('placeholder')).toBe('https://website.com/image.jpg');
    expect(container.textContent).not.toContain('warning');
    expect(container.textContent).not.toContain('Spoiler?');
  });

  it('positions the draggable modal with left/top styles instead of a transform layer', async () => {
    await renderReplyModal('/mu/thread/post-1');

    const modal = container.querySelector<HTMLDivElement>('[class*="container"]');

    expect(modal?.style.left).toBe('120px');
    expect(modal?.style.top).toBe('80px');
    expect(modal?.style.transform).toBe('');
    expect(modal?.style.touchAction).toBe('none');
  });

  it('closes with Escape from the document on desktop', async () => {
    await renderReplyModal('/mu/thread/post-1');

    await act(async () => {
      document.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'Escape' }));
    });

    expect(testState.closeModalMock).toHaveBeenCalledTimes(1);
  });

  it('restores body selection styles if unmounted during a drag', async () => {
    document.body.style.userSelect = 'text';
    document.body.style.webkitUserSelect = 'auto';

    await renderReplyModal('/mu/thread/post-1');

    await act(async () => {
      testState.dragHandler?.({
        active: true,
        event: { preventDefault: vi.fn() },
        offset: [140, 100],
      });
    });

    expect(document.body.style.userSelect).toBe('none');
    expect(document.body.style.webkitUserSelect).toBe('none');

    await act(async () => {
      root.render(createElement(React.Fragment));
    });

    expect(document.body.style.userSelect).toBe('text');
    expect(document.body.style.webkitUserSelect).toBe('auto');
  });

  it('initializes the drag spring once so typing rerenders do not recenter the modal', async () => {
    await renderReplyModal('/mu/thread/post-1');

    expect(testState.useSpringMock).toHaveBeenCalledWith(expect.any(Function), []);

    const [configFactory, deps] = testState.useSpringMock.mock.calls[0] as [() => Record<string, unknown>, unknown[]];
    expect(deps).toEqual([]);
    expect(configFactory()).toEqual({
      from: {
        left: expect.any(Number),
        top: expect.any(Number),
      },
    });
  });
});
