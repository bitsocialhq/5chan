import * as React from 'react';
import { createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ReplyQuotePreview from '../reply-quote-preview';
import styles from '../../../views/post/post.module.css';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
const act = (React as { act?: (cb: () => void | Promise<void>) => void | Promise<void> }).act as (cb: () => void | Promise<void>) => void | Promise<void>;

type TestComment = {
  author?: {
    address?: string;
  };
  cid?: string;
  number?: number;
  communityAddress?: string;
};

const testState = vi.hoisted(() => ({
  account: {
    id: 'account-1',
    author: {
      address: '0xme',
    },
  } as { id?: string; author?: { address?: string } },
  accountCommentByCid: {} as Record<string, { cid?: string }>,
  accountCommentCalls: [] as Array<{ commentCid?: string } | undefined>,
  directories: [{ address: 'music-posting.eth', title: '/mu/ - Music' }] as Array<{ address: string; title?: string }>,
  isMobile: false,
  locationPath: '/mu/thread/thread-cid',
  navigateMock: vi.fn(),
  quoteAvailability: 'available' as 'available' | 'unavailable' | 'unresolved',
  updateMock: vi.fn(),
}));

vi.mock('react-router-dom', async () => {
  const ReactModule = await vi.importActual<typeof import('react')>('react');

  return {
    Link: ReactModule.forwardRef(
      (
        {
          children,
          to,
          ...props
        }: {
          children?: React.ReactNode;
          to: string;
          [key: string]: unknown;
        },
        ref,
      ) => ReactModule.createElement('a', { ...props, href: to, ref }, children),
    ),
    useLocation: () => ({
      pathname: testState.locationPath,
    }),
    useNavigate: () => testState.navigateMock,
  };
});

vi.mock('@bitsocialnet/bitsocial-react-hooks', () => ({
  useAccount: () => testState.account,
  useAccountComment: (options?: { commentCid?: string }) => {
    testState.accountCommentCalls.push(options);
    return (options?.commentCid && testState.accountCommentByCid[options.commentCid]) || {};
  },
}));

vi.mock('@floating-ui/react', () => ({
  autoUpdate: vi.fn(),
  offset: vi.fn(),
  shift: vi.fn(),
  size: vi.fn(),
  useFloating: () => ({
    floatingStyles: { position: 'fixed' },
    refs: {
      setFloating: () => undefined,
      setReference: () => undefined,
    },
    update: testState.updateMock,
  }),
}));

vi.mock('../../../hooks/use-directories', () => ({
  useDirectories: () => testState.directories,
}));

vi.mock('../../../lib/utils/route-utils', () => ({
  getBoardPath: (address: string) => (address === 'music-posting.eth' ? 'mu' : address),
}));

vi.mock('../../../lib/utils/quote-link-utils', () => ({
  formatQuoteNumber: (number?: number) => `>>${number ?? '?'}`,
  getQuoteTargetAvailability: () => testState.quoteAvailability,
  shouldShowFloatingQuotePreview: ({
    hoveredCid,
    isUnavailable,
    outOfViewCid,
    quoteCid,
  }: {
    hoveredCid: string | null;
    isUnavailable?: boolean;
    outOfViewCid: string | null;
    quoteCid?: string;
  }) => Boolean(quoteCid && !isUnavailable && hoveredCid === quoteCid && outOfViewCid === quoteCid),
}));

vi.mock('../../../hooks/use-is-mobile', () => ({
  default: () => testState.isMobile,
}));

vi.mock('../../../views/post', () => ({
  Post: ({ post }: { post?: TestComment }) => createElement('div', { 'data-testid': 'post-preview' }, post?.cid),
}));

let container: HTMLDivElement;
let root: Root;

const renderPreview = async (props: Record<string, unknown>) => {
  await act(async () => {
    root.render(createElement(ReplyQuotePreview, props as any));
  });
};

const queryAnchorByText = (text: string) => Array.from(container.querySelectorAll<HTMLAnchorElement>('a')).find((anchor) => anchor.textContent === text) ?? null;

const appendReplyElement = ({
  cid,
  inViewport = true,
  isThreadCard = false,
  withHighlight = false,
  parent = document.body,
}: {
  cid: string;
  inViewport?: boolean;
  isThreadCard?: boolean;
  withHighlight?: boolean;
  parent?: HTMLElement;
}) => {
  const element = document.createElement('div');
  element.dataset.cid = cid;
  element.dataset.postCid = isThreadCard ? cid : 'thread-cid';
  if (withHighlight) {
    element.classList.add('highlight');
  }
  element.scrollIntoView = vi.fn();
  element.getBoundingClientRect = () =>
    ({
      bottom: inViewport ? 100 : window.innerHeight + 500,
      left: 0,
      right: 100,
      top: inViewport ? 0 : -500,
    }) as DOMRect;
  parent.appendChild(element);
  return element;
};

const appendThreadContainer = ({ cid, top = 240, parent = document.body }: { cid: string; top?: number; parent?: HTMLElement }) => {
  const element = document.createElement('div');
  element.dataset.threadContainerCid = cid;
  element.getBoundingClientRect = () =>
    ({
      bottom: top + 100,
      height: 100,
      left: 0,
      right: 100,
      top,
      width: 100,
    }) as DOMRect;
  parent.appendChild(element);
  return element;
};

describe('ReplyQuotePreview', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    testState.account = {
      id: 'account-1',
      author: {
        address: '0xme',
      },
    };
    testState.accountCommentByCid = {};
    testState.accountCommentCalls = [];
    testState.directories = [{ address: 'music-posting.eth', title: '/mu/ - Music' }];
    testState.isMobile = false;
    testState.locationPath = '/mu/thread/thread-cid';
    testState.navigateMock.mockReset();
    testState.quoteAvailability = 'available';
    testState.updateMock.mockReset();
    Object.defineProperty(window, 'scrollTo', {
      configurable: true,
      value: vi.fn(),
      writable: true,
    });
    Object.defineProperty(window, 'scrollY', {
      configurable: true,
      value: 0,
      writable: true,
    });

    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    document.querySelectorAll('[data-cid]').forEach((node) => node.remove());
    document.querySelectorAll('[data-thread-container-cid]').forEach((node) => {
      node.remove();
    });
    document.querySelectorAll(`.${styles.replyQuotePreview}`).forEach((node) => node.remove());
    document.querySelectorAll('.scroll-highlight').forEach((node) => node.remove());
  });

  it('scrolls to an in-thread reply instead of navigating on desktop quotelinks', async () => {
    const target = appendReplyElement({ cid: 'reply-cid' });
    const previous = document.createElement('div');
    previous.classList.add('scroll-highlight');
    document.body.appendChild(previous);

    await renderPreview({
      isQuotelinkReply: true,
      quotelinkReply: {
        cid: 'reply-cid',
        number: 7,
        communityAddress: 'music-posting.eth',
      },
    });

    const link = queryAnchorByText('>>7');
    expect(link).toBeTruthy();

    await act(async () => {
      link?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(target.scrollIntoView as any).toHaveBeenCalledWith({ behavior: 'auto', block: 'center' });
    expect(target.classList.contains('scroll-highlight')).toBe(true);
    expect(previous.classList.contains('scroll-highlight')).toBe(false);
    expect(testState.navigateMock).not.toHaveBeenCalled();
  });

  it('scrolls to the OP thread container for quotes on the current desktop thread page', async () => {
    appendReplyElement({ cid: 'thread-cid', isThreadCard: true });
    appendThreadContainer({ cid: 'thread-cid', top: 180 });

    await renderPreview({
      isOP: true,
      isQuotelinkReply: true,
      quotelinkReply: {
        cid: 'thread-cid',
        number: 1,
        communityAddress: 'music-posting.eth',
      },
    });

    const link = queryAnchorByText('>>1 (OP)');
    expect(link).toBeTruthy();

    await act(async () => {
      link?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(window.scrollTo).toHaveBeenCalledWith({
      behavior: 'auto',
      left: 0,
      top: 180,
    });
    expect(testState.navigateMock).not.toHaveBeenCalled();
  });

  it('scrolls to the OP thread container on all-thread routes too', async () => {
    testState.locationPath = '/all/thread/thread-cid';
    appendThreadContainer({ cid: 'thread-cid', top: 140 });

    await renderPreview({
      isOP: true,
      isQuotelinkReply: true,
      quotelinkReply: {
        cid: 'thread-cid',
        number: 1,
        communityAddress: 'music-posting.eth',
      },
    });

    const link = queryAnchorByText('>>1 (OP)');
    expect(link).toBeTruthy();

    await act(async () => {
      link?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(window.scrollTo).toHaveBeenCalledWith({
      behavior: 'auto',
      left: 0,
      top: 140,
    });
    expect(testState.navigateMock).not.toHaveBeenCalled();
  });

  it('navigates OP quotelinks with thread-top state when the target thread differs', async () => {
    testState.locationPath = '/mu/thread/reply-cid';

    await renderPreview({
      isOP: true,
      isQuotelinkReply: true,
      quotelinkReply: {
        cid: 'thread-cid',
        number: 1,
        communityAddress: 'music-posting.eth',
      },
    });

    const link = queryAnchorByText('>>1 (OP)');
    expect(link).toBeTruthy();

    await act(async () => {
      link?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(testState.navigateMock).toHaveBeenCalledWith('/mu/thread/thread-cid', {
      state: {
        scrollThreadContainerCid: 'thread-cid',
      },
    });
  });

  it('navigates to the reply route when only a floating preview copy matches the CID', async () => {
    const previewWrapper = document.createElement('div');
    previewWrapper.className = styles.replyQuotePreview;
    previewWrapper.dataset.threadScrollPreview = 'true';
    document.body.appendChild(previewWrapper);
    const previewTarget = appendReplyElement({ cid: 'reply-cid', parent: previewWrapper });

    await renderPreview({
      backlinkReply: {
        cid: 'reply-cid',
        number: 7,
        communityAddress: 'music-posting.eth',
      },
      isBacklinkReply: true,
    });

    const link = queryAnchorByText('>>7');
    expect(link).toBeTruthy();

    await act(async () => {
      link?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(previewTarget.scrollIntoView as any).not.toHaveBeenCalled();
    expect(testState.navigateMock).toHaveBeenCalledWith('/mu/thread/reply-cid');
  });

  it('handles desktop hover highlights and floating previews for quotelinks', async () => {
    const inView = appendReplyElement({ cid: 'reply-cid', inViewport: true });

    await renderPreview({
      isQuotelinkReply: true,
      quotelinkReply: {
        cid: 'reply-cid',
        number: 9,
        communityAddress: 'music-posting.eth',
      },
    });

    const link = queryAnchorByText('>>9');
    expect(link).toBeTruthy();

    await act(async () => {
      link?.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
    });

    expect(inView.classList.contains('highlight')).toBe(true);
    expect(document.querySelector('[data-testid="post-preview"]')).toBeNull();

    await act(async () => {
      link?.dispatchEvent(new MouseEvent('mouseout', { bubbles: true }));
    });

    expect(inView.classList.contains('highlight')).toBe(false);

    inView.remove();
    const outOfView = appendReplyElement({ cid: 'reply-cid', inViewport: false });

    await act(async () => {
      link?.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
    });

    expect(document.querySelector('[data-testid="post-preview"]')?.textContent).toBe('reply-cid');

    await act(async () => {
      link?.dispatchEvent(new MouseEvent('mouseout', { bubbles: true }));
    });

    expect(document.querySelector('[data-testid="post-preview"]')).toBeNull();
    outOfView.remove();
  });

  it('marks quotelinks as your own via the direct account comment lookup before author fallback', async () => {
    testState.account = {
      id: 'account-1',
      author: {
        address: '0xsomeone-else',
      },
    };
    testState.accountCommentByCid = {
      'reply-cid': {
        cid: 'reply-cid',
      },
    };

    await renderPreview({
      isQuotelinkReply: true,
      quotelinkReply: {
        author: {
          address: '0xother',
        },
        cid: 'reply-cid',
        number: 11,
        communityAddress: 'music-posting.eth',
      },
    });

    expect(container.textContent).toContain('>>11 (You)');
    expect(testState.accountCommentCalls).toContainEqual({ commentCid: 'reply-cid' });
  });

  it('does not mark quotelinks as your own when the lookup misses and no author address matches', async () => {
    testState.account = {
      id: 'account-1',
      author: { address: undefined } as { address?: string },
    };
    testState.accountCommentByCid = {
      'reply-cid': {
        cid: 'different-cid',
      },
    };

    await renderPreview({
      isQuotelinkReply: true,
      quotelinkReply: {
        cid: 'reply-cid',
        number: 12,
        communityAddress: 'music-posting.eth',
      },
    });

    expect(container.textContent).not.toContain('(You)');
  });

  it('renders unavailable desktop quotelinks without navigation and includes OP/You labels', async () => {
    testState.quoteAvailability = 'unavailable';

    await renderPreview({
      isOP: true,
      isQuotelinkReply: true,
      quotelinkReply: {
        author: {
          address: '0xme',
        },
        cid: 'reply-cid',
        number: 10,
        communityAddress: 'music-posting.eth',
      },
      showTrailingBreak: false,
    });

    expect(container.textContent).toContain('>>10 (OP) (You)');
    expect(queryAnchorByText('>>10 (OP) (You)')).toBeNull();
    expect(container.querySelector('br')).toBeNull();
  });

  it('renders mobile backlinks with a hash link that navigates to the target thread', async () => {
    testState.isMobile = true;

    await renderPreview({
      backlinkReply: {
        cid: 'reply-cid',
        number: 5,
        communityAddress: 'music-posting.eth',
      },
      isBacklinkReply: true,
    });

    expect(container.textContent).toContain('>>5');

    const hashLink = queryAnchorByText(' #');
    expect(hashLink).toBeTruthy();

    await act(async () => {
      hashLink?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(testState.navigateMock).toHaveBeenCalledWith('/mu/thread/reply-cid');
  });

  it('scrolls mobile OP quotelinks on all-thread routes too', async () => {
    testState.isMobile = true;
    testState.locationPath = '/all/thread/thread-cid';
    appendThreadContainer({ cid: 'thread-cid', top: 90 });

    await renderPreview({
      isOP: true,
      isQuotelinkReply: true,
      quotelinkReply: {
        cid: 'thread-cid',
        number: 1,
        communityAddress: 'music-posting.eth',
      },
    });

    const hashLink = queryAnchorByText(' #');
    expect(hashLink).toBeTruthy();

    await act(async () => {
      hashLink?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(window.scrollTo).toHaveBeenCalledWith({
      behavior: 'auto',
      left: 0,
      top: 90,
    });
    expect(testState.navigateMock).not.toHaveBeenCalled();
  });

  it('navigates mobile reply hash links even when the reply is already on the current thread page', async () => {
    testState.isMobile = true;
    const target = appendReplyElement({ cid: 'reply-cid' });

    await renderPreview({
      backlinkReply: {
        cid: 'reply-cid',
        number: 5,
        communityAddress: 'music-posting.eth',
      },
      isBacklinkReply: true,
    });

    const hashLink = queryAnchorByText(' #');
    expect(hashLink).toBeTruthy();

    await act(async () => {
      hashLink?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(target.scrollIntoView as any).not.toHaveBeenCalled();
    expect(testState.navigateMock).toHaveBeenCalledWith('/mu/thread/reply-cid');
  });

  it('renders unresolved mobile quotelinks as plain text without a hash link', async () => {
    testState.isMobile = true;
    testState.quoteAvailability = 'unresolved';

    await renderPreview({
      isQuotelinkReply: true,
      quotelinkNumber: 42,
      quotelinkReply: undefined,
    });

    expect(container.textContent).toContain('>>42');
    expect(Array.from(container.querySelectorAll('a')).some((anchor) => anchor.textContent?.includes('#'))).toBe(false);
  });
});
