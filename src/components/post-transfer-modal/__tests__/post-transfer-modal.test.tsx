import * as React from 'react';
import { createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import PostTransferModal from '../post-transfer-modal';
import { TRASH_BOARD_ADDRESS, TRASH_BOARD_PUBLIC_KEY, TRASH_BOARD_TITLE } from '../../../lib/special-boards';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
const act = (React as { act?: (cb: () => void | Promise<void>) => void | Promise<void> }).act as (cb: () => void | Promise<void>) => void | Promise<void>;
const TRANSFER_MODAL_POSITION_SESSION_STORAGE_KEY = '5chan:transfer-modal-position';

const testState = vi.hoisted(() => ({
  createAccountMock: vi.fn().mockResolvedValue(undefined),
  deleteAccountMock: vi.fn().mockResolvedValue(undefined),
  deleteCommentMock: vi.fn().mockResolvedValue(undefined),
  directories: [
    { address: 'music-posting.eth', directoryCode: 'mu', title: '/mu/ - Music' },
    { address: 'random-nsfw.bso', directoryCode: 'b', title: '/b/ - Random' },
  ] as Array<{ address: string; directoryCode?: string; title?: string }>,
  dragHandler: undefined as ((state: { active: boolean; event: Pick<Event, 'preventDefault'>; offset: [number, number] }) => void) | undefined,
  onCloseMock: vi.fn(),
  publishCommentMock: vi.fn().mockResolvedValue(undefined),
  publishCommentModerationMock: vi.fn().mockResolvedValue(undefined),
  springStartMock: vi.fn(),
  useSpringMock: vi.fn(),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) => (options ? `${key}:${JSON.stringify(options)}` : key),
  }),
}));

vi.mock('../../../hooks/use-directories', () => ({
  normalizeBoardAddress: (address: string) => address.replace(/\.(bso|eth)$/, ''),
  useDirectories: () => testState.directories,
}));

vi.mock('../../../stores/use-challenges-store', () => ({
  default: {
    getState: () => ({
      addChallenge: vi.fn(),
    }),
  },
}));

vi.mock('@bitsocial/bitsocial-react-hooks/dist/stores/accounts/index.js', () => ({
  default: <T,>(selector: (state: { accountsActions: Record<string, unknown> }) => T) =>
    selector({
      accountsActions: {
        createAccount: testState.createAccountMock,
        deleteAccount: testState.deleteAccountMock,
        deleteComment: testState.deleteCommentMock,
        publishComment: testState.publishCommentMock,
        publishCommentModeration: testState.publishCommentModerationMock,
      },
    }),
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

const baseComment = {
  author: { displayName: 'Alice' },
  cid: 'comment-1',
  content: 'Original content',
  communityAddress: 'music-posting.eth',
  number: 42,
  parentCid: undefined,
  postCid: 'post-1',
  title: 'Subject',
} as any;

const renderTransferModal = async (comment = baseComment) => {
  await act(async () => {
    root.render(createElement(PostTransferModal, { comment, onClose: testState.onCloseMock }));
  });
};

describe('PostTransferModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    testState.dragHandler = undefined;
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
    window.sessionStorage.clear();
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
    document.body.innerHTML = '';
    window.sessionStorage.clear();
  });

  it('positions the draggable transfer modal with left/top styles instead of a transform layer', async () => {
    await renderTransferModal();

    const modal = document.body.querySelector<HTMLDivElement>('[role="dialog"]');

    expect(modal?.style.left).toBe('120px');
    expect(modal?.style.top).toBe('80px');
    expect(modal?.style.transform).toBe('');
  });

  it('renders the hidden trash board as the fixed transfer target', async () => {
    await renderTransferModal();

    expect(document.body.textContent).toContain(TRASH_BOARD_TITLE);
    expect(document.body.querySelector('select')).toBeNull();
  });

  it('publishes hidden trash board transfers with the board public key identity', async () => {
    await renderTransferModal();

    expect(document.body.querySelector('select')).toBeNull();

    const form = document.body.querySelector<HTMLFormElement>('form');
    expect(form).not.toBeNull();
    await act(async () => {
      form!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
      await Promise.resolve();
    });

    const [publishOptions] = testState.publishCommentMock.mock.calls[0] as [Record<string, unknown>, string];
    expect(publishOptions).toMatchObject({
      communityAddress: TRASH_BOARD_PUBLIC_KEY,
      communityPublicKey: TRASH_BOARD_PUBLIC_KEY,
    });
    expect(publishOptions).not.toHaveProperty('communityName');
  });

  it('unlocks after hidden trash board challenge verification fails', async () => {
    await renderTransferModal();

    const form = document.body.querySelector<HTMLFormElement>('form');
    expect(form).not.toBeNull();
    await act(async () => {
      form!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
      await Promise.resolve();
    });

    const [publishOptions] = testState.publishCommentMock.mock.calls[0] as [Record<string, unknown>, string];
    (publishOptions._onPendingCommentIndex as (index: number) => void)(12);
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => undefined);
    await act(async () => {
      await (publishOptions.onChallengeVerification as (verification: unknown, comment: unknown) => Promise<void>)(
        { challengeSuccess: false, reason: 'try again' },
        { cid: 'challenge-comment' },
      );
      await Promise.resolve();
    });

    expect(alertSpy).toHaveBeenCalledTimes(1);
    expect(testState.deleteCommentMock).toHaveBeenCalledWith(12, expect.stringMatching(/^5chan-transfer-comment-/));
    expect(testState.deleteAccountMock).toHaveBeenCalledWith(expect.stringMatching(/^5chan-transfer-comment-/));
    expect(document.body.textContent).toContain('try again');
    const closeButton = Array.from(document.body.querySelectorAll<HTMLButtonElement>('button')).find((button) => button.textContent === 'close');
    const submitButton = Array.from(document.body.querySelectorAll<HTMLButtonElement>('button')).find((button) => button.type === 'submit');
    expect(closeButton?.disabled).toBe(false);
    expect(submitButton?.disabled).toBe(false);
    alertSpy.mockRestore();
  });

  it('disables submission when the hidden trash board is the transfer source', async () => {
    await renderTransferModal({ ...baseComment, communityAddress: TRASH_BOARD_ADDRESS });

    expect(document.body.textContent).toContain(TRASH_BOARD_TITLE);
    expect(document.body.querySelector('select')).toBeNull();
    const submitButton = Array.from(document.body.querySelectorAll<HTMLButtonElement>('button')).find((button) => button.type === 'submit');
    expect(submitButton?.disabled).toBe(true);

    const form = document.body.querySelector<HTMLFormElement>('form');
    expect(form).not.toBeNull();
    await act(async () => {
      form!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    });

    expect(testState.publishCommentMock).not.toHaveBeenCalled();
    expect(testState.publishCommentModerationMock).not.toHaveBeenCalled();
  });

  it('disables submission when the transfer source uses the trash public key alias', async () => {
    await renderTransferModal({ ...baseComment, communityAddress: TRASH_BOARD_PUBLIC_KEY });

    expect(document.body.textContent).toContain(TRASH_BOARD_TITLE);
    expect(document.body.querySelector('select')).toBeNull();
    const submitButton = Array.from(document.body.querySelectorAll<HTMLButtonElement>('button')).find((button) => button.type === 'submit');
    expect(submitButton?.disabled).toBe(true);
  });

  it('reopens desktop transfer modals at the last dragged session position', async () => {
    await renderTransferModal();

    await act(async () => {
      testState.dragHandler?.({
        active: true,
        event: { preventDefault: vi.fn() },
        offset: [232.4, 146.6],
      });
      testState.dragHandler?.({
        active: false,
        event: { preventDefault: vi.fn() },
        offset: [232.4, 146.6],
      });
    });

    expect(JSON.parse(window.sessionStorage.getItem(TRANSFER_MODAL_POSITION_SESSION_STORAGE_KEY) ?? '{}')).toEqual({ left: 232, top: 147 });

    await act(async () => {
      root.render(createElement(React.Fragment));
    });

    testState.springStartMock.mockClear();
    testState.useSpringMock.mockClear();
    await renderTransferModal({ ...baseComment, cid: 'comment-2', number: 43 });

    const [configFactory] = testState.useSpringMock.mock.calls[0] as [() => Record<string, unknown>, unknown[]];
    expect(configFactory()).toEqual({
      from: {
        left: 232,
        top: 147,
      },
    });
    expect(testState.springStartMock).not.toHaveBeenCalled();
  });

  it('ignores the stored desktop position when first opened in a mobile viewport', async () => {
    const originalInnerWidth = window.innerWidth;
    const originalInnerHeight = window.innerHeight;
    window.sessionStorage.setItem(TRANSFER_MODAL_POSITION_SESSION_STORAGE_KEY, JSON.stringify({ left: 500, top: 210 }));
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 390 });
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 760 });

    try {
      await renderTransferModal();

      const [configFactory] = testState.useSpringMock.mock.calls[0] as [() => Record<string, unknown>, unknown[]];
      expect(configFactory()).toEqual({
        from: {
          left: 10,
          top: 380,
        },
      });
    } finally {
      Object.defineProperty(window, 'innerWidth', { configurable: true, value: originalInnerWidth });
      Object.defineProperty(window, 'innerHeight', { configurable: true, value: originalInnerHeight });
    }
  });
});
