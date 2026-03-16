import * as React from 'react';
import { createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ReplyModal from '../reply-modal';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
const act = (React as { act?: (cb: () => void | Promise<void>) => void | Promise<void> }).act as (cb: () => void | Promise<void>) => void | Promise<void>;

const testState = vi.hoisted(() => ({
  account: { author: { displayName: 'Alice' } } as { author?: { displayName?: string } },
  closeModalMock: vi.fn(),
  directoryByAddress: {
    'music-posting.eth': {
      address: 'music-posting.eth',
      features: {},
    },
  } as Record<string, { address: string; features?: Record<string, unknown> }>,
  handleUploadMock: vi.fn(),
  isMobile: false,
  isResolvingExternalQuotes: false,
  isUploading: false,
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
  replyIndex: undefined as number | undefined,
  resetPublishReplyOptionsMock: vi.fn(),
  resolvedCommunityAddress: undefined as string | undefined,
  selectedText: 'selected text',
  setAccountMock: vi.fn(),
  setPublishReplyOptionsMock: vi.fn(),
  springStartMock: vi.fn(),
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

vi.mock('@bitsocialnet/bitsocial-react-hooks', () => ({
  setAccount: (account: unknown) => testState.setAccountMock(account),
  useAccount: () => testState.account,
}));

vi.mock('@bitsocialnet/bitsocial-react-hooks/dist/stores/communities', () => ({
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
  getShowUploadControls: () => testState.showUploadControls,
  isWebRuntime: () => true,
}));

vi.mock('../../../stores/use-media-hosting-store', () => ({
  default: (selector: (state: { uploadMode: string }) => unknown) =>
    selector({
      uploadMode: testState.uploadMode,
    }),
}));

vi.mock('../../../hooks/use-directories', () => ({
  useDirectoryByAddress: (address: string) => testState.directoryByAddress[address],
  normalizeBoardAddress: (address: string) => address.replace(/\.(bso|eth)$/, ''),
}));

vi.mock('../../../hooks/use-resolved-community-address', () => ({
  useResolvedCommunityAddress: () => testState.resolvedCommunityAddress,
}));

vi.mock('../../../hooks/use-publish-reply', () => ({
  default: () => ({
    isResolvingExternalQuotes: testState.isResolvingExternalQuotes,
    publishReply: testState.publishReplyMock,
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
      isUploading: testState.isUploading,
      uploadedFileName: testState.uploadedFileName,
    };
  },
}));

vi.mock('lodash/debounce', () => ({
  default: <T extends (...args: any[]) => void>(fn: T) => {
    const wrapped = ((...args: Parameters<T>) => fn(...args)) as T & { cancel: () => void };
    wrapped.cancel = () => undefined;
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
    useSpring: () => [
      {
        left: { get: () => 120 },
        top: { get: () => 80 },
      },
      {
        start: testState.springStartMock,
      },
    ],
  };
});

vi.mock('@use-gesture/react', () => ({
  useDrag: () => () => ({}),
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

const clickButtonByText = async (text: string) => {
  const button = Array.from(container.querySelectorAll('button')).find((candidate) => candidate.textContent === text);
  await act(async () => {
    button?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
};

describe('ReplyModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    testState.account = { author: { displayName: 'Alice' } };
    testState.closeModalMock.mockReset();
    testState.directoryByAddress = {
      'music-posting.eth': {
        address: 'music-posting.eth',
        features: {},
      },
    };
    testState.handleUploadMock.mockReset();
    testState.isMobile = false;
    testState.isResolvingExternalQuotes = false;
    testState.isUploading = false;
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
    testState.replyIndex = undefined;
    testState.resetPublishReplyOptionsMock.mockReset();
    testState.resolvedCommunityAddress = undefined;
    testState.selectedText = 'selected text';
    testState.setAccountMock.mockReset();
    testState.setPublishReplyOptionsMock.mockReset();
    testState.springStartMock.mockReset();
    testState.communities = {
      'music-posting.eth': {
        address: 'music-posting.eth',
      },
    };
    testState.showUploadControls = true;
    testState.uploadComplete = undefined;
    testState.uploadedFileName = null;
    testState.uploadMode = 'always';
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  it('initializes quoted content, display name, upload controls, and shared offline warning on board routes', async () => {
    testState.offlineTitle = 'posts_last_synced_info:{"time":"ago:1000"}';
    testState.offlineWarningVisible = true;

    await renderReplyModal('/mu/thread/post-1');

    const nameInput = container.querySelectorAll<HTMLInputElement>('input[type="text"]')[0];
    const linkInput = container.querySelectorAll<HTMLInputElement>('input[type="text"]')[1];
    const textarea = container.querySelector<HTMLTextAreaElement>('textarea');

    expect(nameInput?.value).toBe('Alice');
    expect(linkInput?.getAttribute('placeholder')).toContain('Link');
    expect(textarea?.value).toBe('>>42\nselected text');
    expect(container.textContent).toContain('choose_file');
    expect(container.textContent).toContain('Spoiler?');
    expect(container.textContent).toContain('posts_last_synced_info:{"time":"ago:1000"}');
    expect(testState.setPublishReplyOptionsMock).toHaveBeenCalledWith({ content: '>>42\nselected text' });
    expect(testState.setPublishReplyOptionsMock).toHaveBeenCalledWith({ displayName: 'Alice' });
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

    const linkInput = container.querySelectorAll<HTMLInputElement>('input[type="text"]')[1];
    const spoilerCheckbox = container.querySelector<HTMLInputElement>('input[type="checkbox"]');
    await dispatchInput(linkInput, 'not-a-url');
    await act(async () => {
      spoilerCheckbox?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    await clickButtonByText('post');

    expect(container.textContent).toContain('error: invalid_url_alert');
    expect(testState.setPublishReplyOptionsMock).toHaveBeenCalledWith({ spoiler: true });

    await dispatchInput(linkInput, 'https://example.com/file.png');
    await clickButtonByText('post');

    expect(testState.setPublishReplyOptionsMock).toHaveBeenCalledWith({ link: 'https://example.com/file.png' });
    expect(testState.publishReplyMock).toHaveBeenCalledTimes(1);
  });

  it('updates account state, applies upload completions, and closes once publishing succeeds', async () => {
    await renderReplyModal('/mu/thread/post-1');

    const nameInput = container.querySelectorAll<HTMLInputElement>('input[type="text"]')[0];
    const linkInput = container.querySelectorAll<HTMLInputElement>('input[type="text"]')[1];

    await dispatchInput(nameInput, 'Alicia');
    expect(testState.setAccountMock).toHaveBeenCalledWith({
      author: { displayName: 'Alicia' },
    });
    expect(testState.setPublishReplyOptionsMock).toHaveBeenCalledWith({ displayName: 'Alicia' });

    await act(async () => {
      testState.uploadComplete?.('https://cdn.example/uploaded.png');
    });

    expect(linkInput?.value).toBe('https://cdn.example/uploaded.png');
    expect(testState.setPublishReplyOptionsMock).toHaveBeenCalledWith({ link: 'https://cdn.example/uploaded.png' });

    testState.replyIndex = 3;
    await rerenderReplyModal('/mu/thread/post-1');

    expect(testState.resetPublishReplyOptionsMock).toHaveBeenCalledTimes(1);
    expect(testState.closeModalMock).toHaveBeenCalledTimes(1);
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

    const linkInput = container.querySelectorAll<HTMLInputElement>('input[type="text"]')[1];
    expect(linkInput?.getAttribute('placeholder')).toContain('Link_to_file');
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
});
