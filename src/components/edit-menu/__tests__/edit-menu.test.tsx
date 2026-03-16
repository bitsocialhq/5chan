import * as React from 'react';
import { createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import EditMenu from '../edit-menu';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
const act = (React as { act?: (cb: () => void | Promise<void>) => void | Promise<void> }).act as (cb: () => void | Promise<void>) => void | Promise<void>;

const testState = vi.hoisted(() => ({
  account: {
    author: {
      address: '0xmod',
      displayName: 'Moderator',
      shortAddress: '0xmod',
    },
    signer: {
      address: '0xauthor',
    },
  } as Record<string, any>,
  addChallengeMock: vi.fn(),
  authorOptions: undefined as Record<string, any> | undefined,
  authorPrivilegesOptions: undefined as Record<string, any> | undefined,
  isMobile: false,
  modOptions: undefined as Record<string, any> | undefined,
  pseudonymityMode: undefined as string | undefined,
  privileges: {
    isAccountCommentAuthor: false,
    isAccountMod: false,
    isCommentAuthorMod: false,
  },
  publishAuthorEditMock: vi.fn().mockResolvedValue(undefined),
  publishCommentModerationMock: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('react-i18next', () => ({
  Trans: ({ components, i18nKey }: { components?: Record<number, React.ReactElement>; i18nKey: string }) =>
    createElement(
      'span',
      { 'data-testid': `trans-${i18nKey}` },
      i18nKey,
      components?.[1] ? React.cloneElement(components[1], { 'data-testid': 'ban-duration-input' }) : null,
    ),
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock('@floating-ui/react', () => ({
  FloatingFocusManager: ({ children }: { children?: React.ReactNode }) => createElement(React.Fragment, {}, children),
  FloatingPortal: ({ children }: { children?: React.ReactNode }) => createElement(React.Fragment, {}, children),
  autoUpdate: () => undefined,
  offset: () => ({}),
  shift: () => ({}),
  useClick: () => ({}),
  useDismiss: () => ({}),
  useFloating: ({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) => ({
    context: {
      open,
      onOpenChange,
    },
    floatingStyles: {},
    refs: {
      setFloating: () => undefined,
      setReference: () => undefined,
    },
  }),
  useId: () => 'edit-menu-heading',
  useInteractions: () => ({
    getFloatingProps: (props?: Record<string, unknown>) => props || {},
    getReferenceProps: (props?: Record<string, unknown>) => props || {},
  }),
  useRole: () => ({}),
}));

vi.mock('@bitsocialnet/bitsocial-react-hooks', () => ({
  useAccount: () => testState.account,
  usePublishCommentEdit: (options: Record<string, any>) => {
    testState.authorOptions = options;
    return { publishCommentEdit: testState.publishAuthorEditMock };
  },
  usePublishCommentModeration: (options: Record<string, any>) => {
    testState.modOptions = options;
    return { publishCommentModeration: testState.publishCommentModerationMock };
  },
}));

vi.mock('../../../hooks/use-author-privileges', () => ({
  default: (options: Record<string, any>) => {
    testState.authorPrivilegesOptions = options;
    return testState.privileges;
  },
}));

vi.mock('../../../hooks/use-is-mobile', () => ({
  default: () => testState.isMobile,
}));

vi.mock('../../../hooks/use-board-pseudonymity-mode', () => ({
  useBoardPseudonymityMode: () => testState.pseudonymityMode,
}));

vi.mock('../../../stores/use-challenges-store', () => {
  const hook = () => ({ challenges: [] });
  return {
    default: Object.assign(hook, {
      getState: () => ({
        addChallenge: testState.addChallengeMock,
      }),
    }),
  };
});

let alertSpy: ReturnType<typeof vi.spyOn>;
let confirmSpy: ReturnType<typeof vi.spyOn>;
let container: HTMLDivElement;
let root: Root;

const basePost = {
  author: {
    address: '0xauthor',
    displayName: 'Alice',
  },
  cid: 'comment-1',
  content: 'Original content',
  deleted: false,
  locked: false,
  parentCid: undefined as string | undefined,
  pinned: false,
  postCid: 'post-1',
  removed: false,
  spoiler: false,
  communityAddress: 'music-posting.eth',
  commentModeration: {
    archived: false,
  },
} as Record<string, any>;

const renderMenu = async (post = basePost) => {
  await act(async () => {
    root.render(createElement(EditMenu, { post } as any));
  });
};

const click = async (element: Element | null | undefined) => {
  await act(async () => {
    element?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
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

const openMenu = async () => {
  await click(container.querySelector('span input[type="checkbox"]'));
};

const getCheckbox = (id: string) => container.querySelector<HTMLInputElement>(`#${id}`);

const getLabelCheckbox = (text: string) =>
  Array.from(container.querySelectorAll('label input[type="checkbox"]')).find((candidate) => candidate.parentElement?.textContent?.includes(text)) ?? null;

const clickButton = async (text: string) => {
  const button = Array.from(container.querySelectorAll('button')).find((candidate) => candidate.textContent === text);
  await click(button);
};

describe('EditMenu', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-08T00:00:00Z'));
    testState.account = {
      author: {
        address: '0xmod',
        displayName: 'Moderator',
        shortAddress: '0xmod',
      },
      signer: {
        address: '0xauthor',
      },
    };
    testState.authorOptions = undefined;
    testState.authorPrivilegesOptions = undefined;
    testState.isMobile = false;
    testState.modOptions = undefined;
    testState.pseudonymityMode = undefined;
    testState.privileges = {
      isAccountCommentAuthor: false,
      isAccountMod: false,
      isCommentAuthorMod: false,
    };
    testState.publishAuthorEditMock.mockReset().mockResolvedValue(undefined);
    testState.publishCommentModerationMock.mockReset().mockResolvedValue(undefined);
    alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => undefined);
    confirmSpy = vi.spyOn(window, 'confirm').mockImplementation(() => true);
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    alertSpy.mockRestore();
    confirmSpy.mockRestore();
    vi.useRealTimers();
  });

  it('alerts when a user without privileges tries to edit a thread or reply', async () => {
    await renderMenu(basePost);
    await openMenu();
    expect(alertSpy).toHaveBeenCalledWith('cannot_edit_thread');

    await renderMenu({
      ...basePost,
      parentCid: 'parent-1',
    });
    await openMenu();
    expect(alertSpy).toHaveBeenLastCalledWith('cannot_edit_reply');
  });

  it('lets comment authors update content and deletion', async () => {
    testState.privileges = {
      isAccountCommentAuthor: true,
      isAccountMod: false,
      isCommentAuthorMod: false,
    };

    await renderMenu(basePost);
    await openMenu();

    await click(getCheckbox('deleted'));
    await click(getLabelCheckbox('Edit?'));

    const textarea = container.querySelector('textarea');
    expect(textarea).not.toBeNull();

    await dispatchInput(textarea as HTMLTextAreaElement, 'Updated body');
    await clickButton('save');

    expect(testState.publishAuthorEditMock).toHaveBeenCalledOnce();
    expect(testState.publishCommentModerationMock).not.toHaveBeenCalled();
    expect(testState.authorOptions).toMatchObject({
      author: {
        address: '0xauthor',
        displayName: 'Alice',
      },
      commentCid: 'comment-1',
      content: 'Updated body',
      deleted: true,
      spoiler: false,
      communityAddress: 'music-posting.eth',
    });
    expect(testState.authorPrivilegesOptions).toMatchObject({
      commentAuthorAddress: '0xauthor',
      communityAddress: 'music-posting.eth',
      postCid: 'post-1',
    });
    expect(testState.authorPrivilegesOptions).not.toHaveProperty('subplebbitAddress');
  });

  it('allows pseudonymous boards to attempt author-side deletion without a local author address match', async () => {
    testState.pseudonymityMode = 'per-post';
    testState.privileges = {
      isAccountCommentAuthor: false,
      isAccountMod: false,
      isCommentAuthorMod: false,
    };

    await renderMenu(basePost);
    await openMenu();

    expect(alertSpy).not.toHaveBeenCalled();
    expect(getCheckbox('deleted')).not.toBeNull();
    expect(getLabelCheckbox('Edit?')).toBeNull();

    const saveButton = Array.from(container.querySelectorAll('button')).find((candidate) => candidate.textContent === 'save');
    expect(saveButton).not.toBeNull();
    expect((saveButton as HTMLButtonElement).disabled).toBe(true);

    await click(getCheckbox('deleted'));
    expect((saveButton as HTMLButtonElement).disabled).toBe(false);

    await clickButton('save');

    expect(testState.publishAuthorEditMock).toHaveBeenCalledOnce();
    expect(testState.publishCommentModerationMock).not.toHaveBeenCalled();
    expect(testState.authorOptions).toMatchObject({
      commentCid: 'comment-1',
      communityAddress: 'music-posting.eth',
      deleted: true,
    });
    expect(testState.authorOptions?.content).toBeUndefined();
    expect(testState.authorOptions?.spoiler).toBeUndefined();
    expect(testState.authorOptions).not.toHaveProperty('author');
    expect(testState.authorOptions).not.toHaveProperty('signer');
  });

  it("does not allow delete-only access when pseudonymity mode is 'none'", async () => {
    testState.pseudonymityMode = 'none';
    testState.privileges = {
      isAccountCommentAuthor: false,
      isAccountMod: false,
      isCommentAuthorMod: false,
    };

    await renderMenu(basePost);
    await openMenu();

    expect(alertSpy).toHaveBeenCalledWith('cannot_edit_thread');
    expect(testState.publishAuthorEditMock).not.toHaveBeenCalled();
  });

  it('lets moderators change moderation flags, ban duration, and save them', async () => {
    testState.privileges = {
      isAccountCommentAuthor: false,
      isAccountMod: true,
      isCommentAuthorMod: false,
    };

    await renderMenu(basePost);
    await openMenu();

    await click(getCheckbox('removed'));
    await click(getCheckbox('purged'));
    await click(getCheckbox('locked'));
    await click(getCheckbox('archived'));
    await click(getCheckbox('spoiler'));
    await click(getCheckbox('pinned'));
    await click(getCheckbox('banUser'));

    const banDurationInput = container.querySelector<HTMLInputElement>('[data-testid="ban-duration-input"]');
    expect(banDurationInput).not.toBeNull();

    await dispatchInput(banDurationInput as HTMLInputElement, '7');
    await clickButton('save');

    expect(confirmSpy).toHaveBeenCalledWith('purge_confirm');
    expect(testState.publishCommentModerationMock).toHaveBeenCalledOnce();
    expect(testState.modOptions).toMatchObject({
      author: {
        address: '0xmod',
        displayName: 'Moderator',
        shortAddress: '0xmod',
      },
      commentCid: 'comment-1',
      communityAddress: 'music-posting.eth',
    });
    expect(testState.modOptions?.commentModeration).toMatchObject({
      archived: true,
      locked: true,
      pinned: true,
      purged: true,
      removed: true,
      spoiler: true,
      author: {
        banExpiresAt: Math.floor(new Date('2026-03-15T00:00:00Z').getTime() / 1000),
      },
    });
  });

  it('does not enable purge when the confirmation is rejected', async () => {
    confirmSpy.mockReturnValue(false);
    testState.privileges = {
      isAccountCommentAuthor: false,
      isAccountMod: true,
      isCommentAuthorMod: false,
    };

    await renderMenu(basePost);
    await openMenu();
    await click(getCheckbox('purged'));

    expect(getCheckbox('purged')?.checked).toBe(false);
    expect(testState.modOptions?.commentModeration?.purged).toBe(false);
  });

  it('shows archive control only for top-level comments', async () => {
    testState.privileges = {
      isAccountCommentAuthor: false,
      isAccountMod: true,
      isCommentAuthorMod: false,
    };

    await renderMenu(basePost);
    await openMenu();
    expect(getCheckbox('archived')).not.toBeNull();

    await renderMenu({
      ...basePost,
      cid: 'reply-comment',
      parentCid: 'parent-cid',
    });
    await openMenu();
    expect(getCheckbox('archived')).toBeNull();
  });

  it('runs both the author edit and moderation publication paths when the user has both privileges', async () => {
    testState.privileges = {
      isAccountCommentAuthor: true,
      isAccountMod: true,
      isCommentAuthorMod: false,
    };

    await renderMenu(basePost);
    await openMenu();
    await clickButton('save');

    expect(testState.publishAuthorEditMock).toHaveBeenCalledOnce();
    expect(testState.publishCommentModerationMock).toHaveBeenCalledOnce();
  });
});
