import * as React from 'react';
import { createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import CommentContent from '../comment-content';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
const act = (React as { act?: (cb: () => void | Promise<void>) => void | Promise<void> }).act as (cb: () => void | Promise<void>) => void | Promise<void>;

type TestComment = {
  author?: {
    address?: string;
    community?: {
      banExpiresAt?: number;
    };
  };
  cid?: string;
  commentModeration?: {
    purged?: boolean;
  };
  content?: string;
  deleted?: boolean;
  edit?: {
    timestamp: number;
  };
  error?: unknown;
  errors?: unknown[];
  number?: number;
  original?: {
    content?: string;
  };
  parentCid?: string;
  pendingApproval?: boolean;
  postCid?: string;
  quotedCids?: string[];
  reason?: string;
  removed?: boolean;
  state?: string;
  communityAddress?: string;
};

const testState = vi.hoisted(() => ({
  commentsByCid: {} as Record<string, TestComment>,
  formattedDate: '2024-01-01 12:00:00',
  formattedTimeAgo: '2 hours ago',
  isMobile: false,
  params: {} as Record<string, string>,
  pathname: '/mu',
  postNumbers: {} as Record<string, number>,
  stateString: 'Publishing',
  unavailableCids: new Set<string>(),
}));

vi.mock('react-i18next', () => ({
  Trans: ({ components, i18nKey, values }: { components?: Record<number, React.ReactElement>; i18nKey: string; values?: Record<string, unknown> }) =>
    createElement(
      'span',
      { 'data-testid': `trans-${i18nKey}` },
      values?.timestamp ? `${i18nKey}:${values.timestamp}` : i18nKey,
      components?.[1]
        ? React.cloneElement(components[1], {
            'data-testid': `trans-action-${i18nKey}`,
            children: i18nKey,
          })
        : null,
    ),
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) => {
      if (key === 'reason_reason') {
        return `reason:${options?.reason}`;
      }
      if (key === 'ban_expires_at') {
        return `ban:${options?.address}:${options?.timestamp}`;
      }
      return key;
    },
  }),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useLocation: () => ({ pathname: testState.pathname }),
    useParams: () => testState.params,
  };
});

vi.mock('@bitsocial/bitsocial-react-hooks', () => ({
  useComment: ({ commentCid }: { commentCid?: string }) => (commentCid ? testState.commentsByCid[commentCid] : undefined),
}));

vi.mock('@bitsocial/bitsocial-react-hooks/dist/stores/communities-pages', () => ({
  default: (selector: (state: { comments: Record<string, TestComment> }) => unknown) =>
    selector({
      comments: testState.commentsByCid,
    }),
}));

vi.mock('../../../stores/use-post-number-store', () => ({
  default: (selector: (state: { cidToNumber: Record<string, number> }) => unknown) =>
    selector({
      cidToNumber: testState.postNumbers,
    }),
}));

vi.mock('../../../lib/get-short-address', () => ({
  default: (address?: string) => `short:${address}`,
}));

vi.mock('../../../lib/utils/time-utils', () => ({
  getFormattedDate: () => testState.formattedDate,
  getFormattedTimeAgo: () => testState.formattedTimeAgo,
}));

vi.mock('../../../lib/utils/quote-link-utils', () => ({
  isUnavailableQuoteTarget: (comment?: TestComment) => Boolean(comment?.cid && testState.unavailableCids.has(comment.cid)),
}));

vi.mock('../../../hooks/use-is-mobile', () => ({
  default: () => testState.isMobile,
}));

vi.mock('../../../hooks/use-state-string', () => ({
  default: () => testState.stateString,
}));

vi.mock('../../loading-ellipsis', () => ({
  default: ({ string }: { string: string }) => createElement('span', { 'data-testid': 'loading-ellipsis' }, string),
}));

vi.mock('../../error-display/error-display', () => ({
  default: ({ displayMessage, error, inline, showImmediately }: { displayMessage?: string; error?: Error; inline?: boolean; showImmediately?: boolean }) =>
    createElement(
      'button',
      {
        'data-display-message': displayMessage,
        'data-testid': 'error-display',
        'data-inline': String(Boolean(inline)),
        'data-show-immediately': String(Boolean(showImmediately)),
      },
      displayMessage || error?.message || String(error),
    ),
}));

vi.mock('../../reply-quote-preview', () => ({
  default: ({
    isOP,
    isQuotelinkReply,
    isQuotelinkUnavailable,
    quotelinkNumber,
    quotelinkReply,
  }: {
    isOP?: boolean;
    isQuotelinkReply?: boolean;
    isQuotelinkUnavailable?: boolean;
    quotelinkNumber?: number;
    quotelinkReply?: TestComment;
  }) =>
    createElement(
      'span',
      {
        'data-number': quotelinkNumber,
        'data-op': String(Boolean(isOP)),
        'data-testid': isQuotelinkReply ? 'reply-quote-preview' : 'quote-preview',
        'data-unavailable': String(Boolean(isQuotelinkUnavailable)),
      },
      quotelinkReply?.cid || `quote:${quotelinkNumber}`,
    ),
}));

vi.mock('../../markdown', () => ({
  default: ({ content }: { content?: string }) => createElement('div', { 'data-testid': 'markdown' }, content),
}));

vi.mock('../../tooltip', () => ({
  default: ({ children, content }: { children?: React.ReactNode; content: string }) => createElement('span', { 'data-testid': 'tooltip', title: content }, children),
}));

let container: HTMLDivElement;
let root: Root;

type TestRoleMap = Record<string, { role?: string }>;

const renderContent = async (comment: TestComment, roles?: TestRoleMap) => {
  await act(async () => {
    root.render(createElement(CommentContent, { comment, roles } as any));
  });
};

const renderContentWithProps = async (props: { appendContent?: React.ReactNode; comment: TestComment; prependContent?: React.ReactNode }) => {
  await act(async () => {
    root.render(createElement(CommentContent, props as any));
  });
};

const queryMarkdownText = () => Array.from(container.querySelectorAll('[data-testid="markdown"]')).map((node) => node.textContent ?? '');

describe('CommentContent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    testState.commentsByCid = {};
    testState.formattedDate = '2024-01-01 12:00:00';
    testState.formattedTimeAgo = '2 hours ago';
    testState.isMobile = false;
    testState.params = {};
    testState.pathname = '/mu';
    testState.postNumbers = {};
    testState.stateString = 'Publishing';
    testState.unavailableCids = new Set<string>();

    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  it('renders quote previews for replies and filters out inline quoted numbers', async () => {
    testState.commentsByCid = {
      'quoted-1': { cid: 'quoted-1', number: 11 },
      'quoted-2': { cid: 'quoted-2', number: 12 },
    };
    testState.postNumbers = {
      'quoted-1': 11,
      'quoted-2': 12,
    };

    await renderContent({
      cid: 'reply-1',
      content: '>>11 already referenced inline',
      parentCid: 'quoted-1',
      postCid: 'post-1',
      quotedCids: ['quoted-1', 'quoted-2'],
    });

    const previews = container.querySelectorAll('[data-testid="reply-quote-preview"]');
    expect(previews).toHaveLength(1);
    expect(previews[0]?.textContent).toBe('quoted-2');
  });

  it('renders prepended content before reply quote previews and markdown', async () => {
    testState.commentsByCid = {
      'quoted-1': { cid: 'quoted-1', number: 11 },
    };
    testState.postNumbers = {
      'quoted-1': 11,
    };

    await renderContentWithProps({
      comment: {
        cid: 'reply-1',
        content: 'body',
        parentCid: 'quoted-1',
        postCid: 'post-1',
      },
      prependContent: createElement('span', { 'data-testid': 'prepend' }, 'failed notice'),
    });

    const blockquote = container.querySelector('blockquote');
    const prepend = container.querySelector('[data-testid="prepend"]');
    const preview = container.querySelector('[data-testid="reply-quote-preview"]');
    const markdown = container.querySelector('[data-testid="markdown"]');

    expect(blockquote?.firstChild).toBe(prepend);
    expect(preview?.textContent).toBe('quoted-1');
    expect(markdown?.textContent).toBe('body');
    expect(blockquote?.querySelectorAll('br')).toHaveLength(1);
  });

  it('renders appended content after markdown with a two-line break separator', async () => {
    await renderContentWithProps({
      appendContent: createElement('span', { 'data-testid': 'append' }, 'media failed'),
      comment: {
        cid: 'post-1',
        content: 'body',
        postCid: 'post-1',
      },
    });

    const blockquote = container.querySelector('blockquote');
    const markdown = container.querySelector('[data-testid="markdown"]');
    const append = container.querySelector('[data-testid="append"]');

    expect(markdown?.textContent).toBe('body');
    expect(append?.textContent).toBe('media failed');
    expect(blockquote?.lastChild).toBe(append);
    expect(blockquote?.querySelectorAll('br')).toHaveLength(2);
  });

  it('renders whitelisted BBCode only for board moderator authors', async () => {
    await renderContent(
      {
        author: { address: '0xmod' },
        cid: 'post-1',
        communityAddress: 'music-posting.eth',
        content: '[b]bold[/b] [color=red][size=24][url=https://example.com]large red[/url][/size][/color] [x]literal[/x]',
        postCid: 'post-1',
      },
      {
        '0xmod': { role: 'moderator' },
      },
    );

    expect(container.querySelector('strong')?.textContent).toBe('bold');
    expect(container.querySelector('[class*="colorRed"]')?.textContent).toBe('large red');
    expect(container.querySelector('[class*="size24"]')?.textContent).toBe('large red');
    expect(container.querySelector('a')?.getAttribute('href')).toBe('https://example.com/');
    expect(container.textContent).toContain('[x]literal[/x]');

    await renderContent(
      {
        author: { address: '0xuser' },
        cid: 'post-2',
        communityAddress: 'music-posting.eth',
        content: '[b]plain[/b]',
        postCid: 'post-2',
      },
      {
        '0xuser': { role: 'user' },
      },
    );

    expect(container.querySelector('strong')).toBeNull();
    expect(queryMarkdownText()).toEqual(['[b]plain[/b]']);
  });

  it('ignores unsupported BBCode styling values for moderator authors', async () => {
    await renderContent(
      {
        author: { address: '0xmod' },
        cid: 'post-1',
        content: '[color=#ff0000]hex[/color] [color=blue]blue[/color] [url=javascript:alert(1)]bad[/url] [size=huge]huge[/size]',
        postCid: 'post-1',
      },
      {
        '0xmod': { role: 'admin' },
      },
    );

    expect(container.textContent).toContain('hex');
    expect(container.textContent).toContain('blue');
    expect(container.textContent).toContain('bad');
    expect(container.textContent).toContain('huge');
    expect(container.querySelector('[class*="colorRed"]')).toBeNull();
    expect(container.querySelector('[class*="colorBlue"]')).toBeNull();
    expect(container.querySelector('a')).toBeNull();
    expect(container.querySelector('[class*="sizeLarge"]')).toBeNull();
    expect(container.querySelector('[class*="size24"]')).toBeNull();
  });

  it('truncates long comments outside the post view and expands them on demand', async () => {
    const longComment = 'x'.repeat(1105);

    await renderContent({
      cid: 'post-1',
      content: longComment,
      postCid: 'post-1',
    });

    expect(queryMarkdownText()[0]).toHaveLength(1000);

    const expandButton = container.querySelector('[data-testid="trans-action-comment_too_long"]');
    expect(expandButton).toBeTruthy();

    await act(async () => {
      expandButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(queryMarkdownText()[0]).toHaveLength(1105);
  });

  it('shows the ban indicator from the canonical author community data', async () => {
    await renderContent({
      author: {
        community: {
          banExpiresAt: 1700000000,
        },
      },
      cid: 'post-1',
      communityAddress: 'music-posting.eth',
      content: 'body',
      postCid: 'post-1',
    });

    expect(container.textContent).toContain('(user_banned)');
    expect(container.querySelector('[data-testid="tooltip"]')?.getAttribute('title')).toContain('ban:short:music-posting.eth:2024-01-01 12:00:00');
  });

  it('shows and hides the original content for edited comments', async () => {
    await renderContent({
      cid: 'post-1',
      content: 'edited body',
      edit: {
        timestamp: 1_704_067_200,
      },
      original: {
        content: 'original body',
      },
      postCid: 'post-1',
      reason: 'typo',
    });

    expect(queryMarkdownText()).toEqual(['edited body']);
    expect(container.textContent).toContain('comment_edited_at_timestamp:2024-01-01 12:00:00');
    expect(container.textContent).toContain('reason:typo');

    const showOriginal = container.querySelector('[data-testid="trans-action-click_here_to_show_original"]');
    expect(showOriginal).toBeTruthy();

    await act(async () => {
      showOriginal?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(queryMarkdownText()).toEqual(['original body']);

    const hideOriginal = container.querySelector('[data-testid="trans-action-click_here_to_hide_original"]');
    await act(async () => {
      hideOriginal?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(queryMarkdownText()).toEqual(['edited body']);
  });

  it('renders moderation and deletion states with the expected messaging', async () => {
    await renderContent({
      cid: 'post-1',
      commentModeration: {
        purged: true,
      },
      content: 'ignored',
      postCid: 'post-1',
    });
    expect(container.textContent).toContain('This_post_was_purged');

    await renderContent({
      cid: 'post-2',
      content: 'ignored',
      postCid: 'post-2',
      reason: 'spam',
      removed: true,
    });
    expect(container.textContent).toContain('this_post_was_removed');
    expect(container.textContent).toContain('Reason: "spam"');

    await renderContent({
      cid: 'post-3',
      content: 'ignored',
      deleted: true,
      postCid: 'post-3',
      reason: 'self-delete',
    });
    expect(container.textContent).toContain('user_deleted_this_post');
    expect(container.textContent).toContain('Reason: "self-delete"');
  });

  it('renders pending approval, ban details, and loading or failed states', async () => {
    await renderContent({
      author: {
        community: {
          banExpiresAt: 1_704_067_200,
        },
      },
      cid: 'post-1',
      content: 'queued body',
      pendingApproval: true,
      postCid: 'post-1',
      reason: 'rules violation',
      communityAddress: 'music-posting.eth',
    });

    expect(container.textContent).toContain('pending_mod_approval');
    const tooltip = container.querySelector('[data-testid="tooltip"]');
    expect(tooltip?.getAttribute('title')).toContain('ban:short:music-posting.eth:2024-01-01 12:00:00');

    testState.stateString = 'Failed to publish';
    await renderContent({
      content: 'still pending',
      postCid: 'post-2',
      state: 'failed',
    });
    expect(container.textContent).not.toContain('Failed to publish');
    expect(container.textContent).toContain('still pending');
    expect(container.querySelector('[data-testid="loading-ellipsis"]')).toBeNull();

    testState.stateString = 'Publishing';
    await renderContent({
      content: 'still pending',
      postCid: 'post-3',
      state: 'publishing',
    });
    expect(container.querySelector('[data-testid="loading-ellipsis"]')?.textContent).toBe('Publishing');
  });

  it('renders failed unpublished comment errors through ErrorDisplay', async () => {
    testState.stateString = 'Failed';
    await renderContent({
      content: 'still pending',
      errors: [new Error('spam blocker server error')],
      postCid: 'post-2',
      state: 'failed',
    });

    const errorDisplay = container.querySelector('[data-testid="error-display"]');
    expect(errorDisplay?.textContent).toBe('spam blocker server error');
    expect(errorDisplay?.getAttribute('data-display-message')).toBe('spam blocker server error');
    expect(errorDisplay?.getAttribute('data-inline')).toBe('true');
    expect(errorDisplay?.getAttribute('data-show-immediately')).toBe('true');
    expect(container.querySelector('[data-testid="loading-ellipsis"]')).toBeNull();
  });

  it('falls back to a short label for failed unpublished comments without a message', async () => {
    testState.stateString = 'Failed';
    await renderContent({
      content: 'still pending',
      errors: [{ details: { provider: 'gateway', reason: 'timeout' } }],
      postCid: 'post-2',
      state: 'failed',
    });

    const errorDisplay = container.querySelector('[data-testid="error-display"]');
    expect(errorDisplay?.textContent).toBe('Error');
    expect(errorDisplay?.getAttribute('data-display-message')).toBe('Error');
    expect(container.textContent).not.toContain('provider: gateway');
  });
});
