import * as React from 'react';
import { createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Markdown from '../markdown';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
const act = (React as { act?: (cb: () => void | Promise<void>) => void | Promise<void> }).act as (cb: () => void | Promise<void>) => void | Promise<void>;

type TestComment = {
  cid?: string;
  number?: number;
};

const testState = vi.hoisted(() => ({
  comments: {} as Record<string, TestComment>,
  directories: [{ address: 'music-posting.eth', name: 'music-posting.bso', title: '/mu/ - Music' }] as Array<{
    address: string;
    directoryCode?: string;
    name?: string;
    title?: string;
  }>,
  embeddableHosts: new Set<string>(),
  cidToNumber: {} as Record<string, number>,
  internalPathByHref: {} as Record<string, string | null>,
  isMobile: false,
  mediaInfoByHref: {} as Record<string, { patternThumbnailUrl?: string; thumbnail?: string; type: string; url: string }>,
  floatingMediaProps: null as { showThumbnail?: boolean } | null,
  floatingOnOpenChange: null as ((open: boolean) => void) | null,
  numberToCid: {} as Record<string, Record<number, string>>,
  unavailableCids: new Set<string>(),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock('@floating-ui/react', () => ({
  FloatingPortal: ({ children }: { children?: React.ReactNode }) => createElement(React.Fragment, {}, children),
  autoUpdate: () => undefined,
  offset: () => ({}),
  shift: () => ({}),
  size: () => ({}),
  useDismiss: () => ({}),
  useFloating: ({ onOpenChange, open }: { onOpenChange?: (open: boolean) => void; open?: boolean }) => {
    testState.floatingOnOpenChange = onOpenChange ?? null;
    return {
      context: {},
      floatingStyles: {},
      open,
      onOpenChange,
      refs: {
        setFloating: () => undefined,
        setReference: () => undefined,
      },
      update: () => undefined,
    };
  },
  useFocus: () => ({}),
  useHover: () => ({
    getReferenceProps: (props?: Record<string, unknown>) => ({
      ...props,
      onMouseEnter: () => testState.floatingOnOpenChange?.(true),
      onMouseLeave: () => testState.floatingOnOpenChange?.(false),
    }),
  }),
  useInteractions: (interactions: Array<{ getReferenceProps?: (props?: Record<string, unknown>) => Record<string, unknown> }>) => ({
    getFloatingProps: (props?: Record<string, unknown>) => props || {},
    getReferenceProps: (props?: Record<string, unknown>) =>
      interactions.reduce((mergedProps, interaction) => interaction.getReferenceProps?.(mergedProps) || mergedProps, props || {}),
  }),
}));

vi.mock('@bitsocial/bitsocial-react-hooks', () => ({
  useComment: ({ commentCid }: { commentCid?: string }) => (commentCid ? testState.comments[commentCid] : undefined),
}));

vi.mock('@bitsocial/bitsocial-react-hooks/dist/stores/communities-pages', () => ({
  default: (selector: (state: { comments: typeof testState.comments }) => unknown) =>
    selector({
      comments: testState.comments,
    }),
}));

vi.mock('../../../hooks/use-is-mobile', () => ({
  default: () => testState.isMobile,
}));

vi.mock('../../../lib/utils/media-utils', () => ({
  getHasThumbnail: (linkMediaInfo?: { patternThumbnailUrl?: string; thumbnail?: string; type?: string }, href?: string) =>
    Boolean(
      linkMediaInfo?.thumbnail ||
      linkMediaInfo?.patternThumbnailUrl ||
      linkMediaInfo?.type === 'image' ||
      (href && (testState.mediaInfoByHref[href]?.thumbnail || testState.mediaInfoByHref[href]?.patternThumbnailUrl)),
    ),
  getLinkMediaInfo: (href: string) => testState.mediaInfoByHref[href],
}));

vi.mock('../../../lib/utils/quote-link-utils', () => ({
  isUnavailableQuoteTarget: (comment?: TestComment) => Boolean(comment?.cid && testState.unavailableCids.has(comment.cid)),
}));

vi.mock('../../../lib/utils/view-utils', () => ({
  isCatalogView: (pathname: string) => pathname.includes('/catalog'),
}));

vi.mock('../../../lib/utils/url-utils', () => ({
  is5chanLink: (href: string) => href in testState.internalPathByHref,
  isValidCrossboardPattern: (pattern: string) => pattern.startsWith('>>>/'),
  transform5chanLinkToInternal: (href: string) => testState.internalPathByHref[href] ?? null,
}));

vi.mock('../../../hooks/use-directories', () => ({
  findDirectoryByAddress: (directories: Array<{ address: string; name?: string }>, address: string | undefined) => {
    if (!address) {
      return undefined;
    }

    const normalize = (value: string) => value.replace(/(\.bso|\.eth)$/, '');
    return directories.find((directory) => [directory.address, directory.name].some((identifier) => identifier && normalize(identifier) === normalize(address)));
  },
  useDirectories: () => testState.directories,
}));

vi.mock('../../../stores/use-post-number-store', () => ({
  getCidForPostNumber: (numberToCid: typeof testState.numberToCid, communityAddress: string | undefined, postNumber: number) => {
    if (!communityAddress) {
      return undefined;
    }

    const normalize = (value: string) => value.replace(/(\.bso|\.eth)$/, '');
    const exactMatch = numberToCid[communityAddress];
    const matchingEntries = Object.entries(numberToCid).filter(([address]) => normalize(address) === normalize(communityAddress));
    const scoped =
      exactMatch && matchingEntries.length <= 1
        ? exactMatch
        : matchingEntries.reduce<Record<number, string>>(
            (mergedMap, [address, scopedMap]) => {
              if (address === communityAddress) {
                return { ...mergedMap, ...scopedMap };
              }

              return { ...scopedMap, ...mergedMap };
            },
            exactMatch ? { ...exactMatch } : {},
          );

    return scoped?.[postNumber];
  },
  default: (selector: (state: { cidToNumber: typeof testState.cidToNumber; numberToCid: typeof testState.numberToCid }) => unknown) =>
    selector({
      cidToNumber: testState.cidToNumber,
      numberToCid: testState.numberToCid,
    }),
}));

vi.mock('../../comment-media', () => ({
  default: ({
    commentMediaInfo,
    isFloatingEmbed,
    showThumbnail,
  }: {
    commentMediaInfo?: { type?: string; url?: string };
    isFloatingEmbed?: boolean;
    showThumbnail?: boolean;
  }) => {
    if (isFloatingEmbed) {
      testState.floatingMediaProps = { showThumbnail };
    }
    return createElement(
      'div',
      {
        'data-floating': String(Boolean(isFloatingEmbed)),
        'data-show-thumbnail': String(showThumbnail),
        'data-testid': 'comment-media',
      },
      `${commentMediaInfo?.type}:${commentMediaInfo?.url}`,
    );
  },
}));

vi.mock('../../embed', () => ({
  canEmbed: (parsedUrl: URL) => testState.embeddableHosts.has(parsedUrl.host),
}));

vi.mock('../../reply-quote-preview', () => ({
  default: ({
    isOP,
    isQuotelinkUnavailable,
    quotelinkNumber,
    quotelinkReply,
  }: {
    isOP?: boolean;
    isQuotelinkUnavailable?: boolean;
    quotelinkNumber?: number;
    quotelinkReply?: TestComment;
  }) =>
    createElement(
      'span',
      {
        'data-number': String(quotelinkNumber ?? ''),
        'data-op': String(Boolean(isOP)),
        'data-testid': 'reply-quote-preview',
        'data-unavailable': String(Boolean(isQuotelinkUnavailable)),
      },
      quotelinkReply?.cid || 'missing',
    ),
}));

vi.mock('../external-number-quote-link', () => ({
  default: ({ isOP, reference }: { isOP?: boolean; reference: { raw: string } }) =>
    createElement('a', { 'data-op': String(Boolean(isOP)), 'data-testid': 'external-number-quote-link', href: '#' }, `${reference.raw}${isOP ? ' (OP)' : ''}`),
}));

let container: HTMLDivElement;
let root: Root;

const renderMarkdown = async (
  props: { content: string; postCid?: string; communityAddress?: string; title?: string; parseSpoilers?: boolean },
  initialEntry = '/mu/thread/post-1',
) => {
  await act(async () => {
    root.render(createElement(MemoryRouter, { initialEntries: [initialEntry] }, createElement(Markdown, props)));
  });
};

describe('Markdown', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    testState.comments = {};
    testState.directories = [{ address: 'music-posting.eth', name: 'music-posting.bso', title: '/mu/ - Music' }];
    testState.embeddableHosts = new Set<string>();
    testState.cidToNumber = {};
    testState.internalPathByHref = {};
    testState.isMobile = false;
    testState.mediaInfoByHref = {};
    testState.floatingMediaProps = null;
    testState.floatingOnOpenChange = null;
    testState.numberToCid = {};
    testState.unavailableCids = new Set<string>();

    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  it('renders catalog prefixes, greentext, spoilers, and cross-board/internal links', async () => {
    testState.internalPathByHref = {
      'https://5chan.local/p/mu': '/mu',
    };

    await renderMarkdown(
      {
        content: '>green line\n[spoiler]spoiled[/spoiler] >>>/fit/ https://5chan.local/p/mu',
        title: 'Subject',
      },
      '/mu/catalog',
    );

    expect(container.textContent).toContain('Subject:');
    expect(container.querySelector('.greentext')?.textContent).toContain('>green line');
    expect(container.querySelector('.spoilertext')?.textContent).toBe('spoiled');

    const links = Array.from(container.querySelectorAll('a'));
    expect(links.map((link) => link.getAttribute('href'))).toEqual(expect.arrayContaining(['/fit', '/mu']));
    expect(links.find((link) => link.getAttribute('href') === '/fit')?.textContent).toBe('>>>/fit/');
  });

  it('keeps spoiler markup visible when parseSpoilers is false', async () => {
    await renderMarkdown({
      content: 'enclose it like so: [spoiler]spoiled text[/spoiler].',
      parseSpoilers: false,
    });

    expect(container.querySelector('.spoilertext')).toBeNull();
    expect(container.textContent).toContain('[spoiler]spoiled text[/spoiler]');
  });

  it('renders greentext for any leading marker run while preserving quote links', async () => {
    await renderMarkdown({
      content: '>green line\n>>test\n>>>>>>>test\n>>42\n>>>/fit/',
      communityAddress: 'music-posting.eth',
    });

    expect(Array.from(container.querySelectorAll('.greentext')).map((node) => node.textContent)).toEqual(['>green line', '>>test', '>>>>>>>test']);
    expect(container.querySelector('[data-testid="external-number-quote-link"]')?.textContent).toBe('>>42');
    expect(Array.from(container.querySelectorAll('a')).find((link) => link.getAttribute('href') === '/fit')?.textContent).toBe('>>>/fit/');
  });

  it('preserves trailing punctuation outside cross-board links', async () => {
    await renderMarkdown({
      content: 'see >>>/fit/, next',
    });

    const link = container.querySelector('a');
    expect(link?.getAttribute('href')).toBe('/fit');
    expect(link?.textContent).toBe('>>>/fit/');
    expect(container.textContent).toBe('see >>>/fit/, next');
  });

  it('normalizes hash-routed 5chan links before passing them to React Router', async () => {
    testState.internalPathByHref = {
      'https://5chan.local/#/mu': '#/mu',
    };

    await renderMarkdown({
      content: 'https://5chan.local/#/mu',
    });

    const link = container.querySelector('a');
    expect(link?.getAttribute('href')).toBe('/mu');
    expect(link?.textContent).toBe('https://5chan.local/#/mu');
  });

  it('renders inline Markdown links through the standard link renderer', async () => {
    await renderMarkdown({
      content: '[AI moderation](https://bitsocial.net/apps/ai-moderation-challenge) sent this reply to the mod queue because the fortune check is missing',
    });

    const link = container.querySelector<HTMLAnchorElement>('a[href="https://bitsocial.net/apps/ai-moderation-challenge"]');
    expect(link?.textContent).toBe('AI moderation');
    expect(link?.getAttribute('target')).toBe('_blank');
    expect(container.textContent).toBe('AI moderation sent this reply to the mod queue because the fortune check is missing');
  });

  it('renders inline Markdown links for app routes and inert empty hrefs', async () => {
    await renderMarkdown({
      content: '[Rules](/rules/biz) [AI moderation]( )',
    });

    const links = Array.from(container.querySelectorAll('a'));
    expect(links).toHaveLength(1);
    expect(links[0]?.getAttribute('href')).toBe('/rules/biz');
    expect(links[0]?.textContent).toBe('Rules');
    expect(container.textContent).toBe('Rules AI moderation');
  });

  it('does not render unsafe inline Markdown hrefs', async () => {
    await renderMarkdown({
      content: '[bad](javascript:alert(1))',
    });

    expect(container.querySelector('a')).toBeNull();
    expect(container.textContent).toBe('[bad](javascript:alert(1))');
  });

  it('preserves balanced URL parentheses and leaves unmatched trailing punctuation outside links', async () => {
    await renderMarkdown({
      content: 'https://en.wikipedia.org/wiki/Function_(mathematics) https://example.com/path),',
    });

    const links = Array.from(container.querySelectorAll('a'));
    expect(links[0]?.textContent).toBe('https://en.wikipedia.org/wiki/Function_(mathematics)');
    expect(links[0]?.getAttribute('href')).toBe('https://en.wikipedia.org/wiki/Function_(mathematics)');
    expect(links[1]?.textContent).toBe('https://example.com/path');
    expect(links[1]?.getAttribute('href')).toBe('https://example.com/path');
    expect(container.textContent).toBe('https://en.wikipedia.org/wiki/Function_(mathematics) https://example.com/path),');
  });

  it('renders generated fortune BBCode on fortune boards without parsing surrounding user BBCode', async () => {
    await renderMarkdown(
      {
        content: '[b]not bold[/b][fortune color=#fd4d32]Excellent Luck[/fortune]',
      },
      '/s5s/thread/post-1',
    );

    const fortune = container.querySelector<HTMLElement>('.fortune');
    expect(fortune?.textContent).toBe('Your fortune: Excellent Luck');
    expect(fortune?.style.color).toBe('rgb(253, 77, 50)');
    expect(fortune?.querySelectorAll('br')).toHaveLength(2);
    expect(container.querySelectorAll('strong')).toHaveLength(1);
    expect(container.textContent).toBe('[b]not bold[/b]Your fortune: Excellent Luck');
  });

  it('renders legacy fortune HTML text on fortune boards for existing posts', async () => {
    const legacyFortune = '<span class="fortune" style="color:#fd4d32"><br><br><b>Your fortune: Excellent Luck</b></span>';

    await renderMarkdown({ content: `old${legacyFortune}` }, '/s5s/thread/post-1');

    const fortune = container.querySelector<HTMLElement>('.fortune');
    expect(fortune?.textContent).toBe('Your fortune: Excellent Luck');
    expect(fortune?.style.color).toBe('rgb(253, 77, 50)');
    expect(fortune?.querySelectorAll('br')).toHaveLength(2);
    expect(container.textContent).toBe('oldYour fortune: Excellent Luck');
  });

  it('leaves generated fortune markers raw outside fortune boards', async () => {
    const legacyFortune = '<span class="fortune" style="color:#fd4d32"><br><br><b>Your fortune: Excellent Luck</b></span>';

    await renderMarkdown({
      content: `body[fortune color=#fd4d32]Excellent Luck[/fortune]${legacyFortune}`,
    });

    expect(container.querySelector('.fortune')).toBeNull();
    expect(container.querySelector('strong')).toBeNull();
    expect(container.textContent).toBe(`body[fortune color=#fd4d32]Excellent Luck[/fortune]${legacyFortune}`);
  });

  it('renders generated fortune BBCode for s5s comments in multiboard views', async () => {
    testState.directories = [...testState.directories, { address: 'silly-stuff.bso', directoryCode: 's5s', title: '/s5s/ - Shit 5chan Says' }];

    await renderMarkdown(
      {
        content: 'silly[fortune color=#fd4d32]Excellent Luck[/fortune]',
        communityAddress: 'silly-stuff.eth',
      },
      '/all',
    );

    expect(container.querySelector<HTMLElement>('.fortune')?.textContent).toBe('Your fortune: Excellent Luck');
    expect(container.textContent).toBe('sillyYour fortune: Excellent Luck');
  });

  it('renders whitelisted 4chan dice roll markup as bold post content', async () => {
    await renderMarkdown({
      content: '<b>Rolled 2, 2 = 4 (2d6)<br><br></b>dice body',
    });

    const diceRoll = container.querySelector('strong');
    expect(diceRoll?.textContent).toBe('Rolled 2, 2 = 4 (2d6)');
    expect(diceRoll?.querySelectorAll('br')).toHaveLength(2);
    expect(container.textContent).toBe('Rolled 2, 2 = 4 (2d6)dice body');
  });

  it('renders only the /qst/ author formatting BBCode tags on qst routes', async () => {
    await renderMarkdown(
      {
        content: '[b]bold[/b] [i]italic[/i] [red]red[/red] [green]green[/green] [blue]blue[/blue] [u]raw[/u] [spoiler][b]hidden[/b][/spoiler]',
      },
      '/qst/thread/post-1',
    );

    expect(container.querySelector('strong')?.textContent).toBe('bold');
    expect(container.querySelector('em')?.textContent).toBe('italic');

    const red = Array.from(container.querySelectorAll<HTMLElement>('span')).find((node) => node.textContent === 'red');
    const green = Array.from(container.querySelectorAll<HTMLElement>('span')).find((node) => node.textContent === 'green');
    const blue = Array.from(container.querySelectorAll<HTMLElement>('span')).find((node) => node.textContent === 'blue');
    expect(red?.style.color).toBe('rgb(196, 30, 58)');
    expect(green?.style.color).toBe('rgb(0, 165, 80)');
    expect(blue?.style.color).toBe('rgb(29, 141, 196)');
    expect(container.querySelector('.spoilertext strong')?.textContent).toBe('hidden');
    expect(container.textContent).toContain('[u]raw[/u]');
  });

  it('leaves qst-only BBCode raw outside qst routes', async () => {
    await renderMarkdown(
      {
        content: '[b]bold[/b] [red]red[/red]',
      },
      '/tg/thread/post-1',
    );

    expect(container.querySelector('strong')).toBeNull();
    expect(Array.from(container.querySelectorAll<HTMLElement>('span')).some((node) => node.style.color)).toBe(false);
    expect(container.textContent).toBe('[b]bold[/b] [red]red[/red]');
  });

  it('renders number quote links with op and unavailable state derived from cached comments', async () => {
    testState.comments = {
      'comment-42': { cid: 'comment-42', number: 42 },
    };
    testState.cidToNumber = {
      'comment-42': 42,
    };
    testState.numberToCid = {
      'music-posting.eth': {
        42: 'comment-42',
      },
    };
    testState.unavailableCids = new Set(['comment-42']);

    await renderMarkdown({
      content: '>>42',
      postCid: 'comment-42',
      communityAddress: 'music-posting.eth',
    });

    const quotePreview = container.querySelector('[data-testid="reply-quote-preview"]');
    expect(quotePreview?.getAttribute('data-number')).toBe('42');
    expect(quotePreview?.getAttribute('data-op')).toBe('true');
    expect(quotePreview?.getAttribute('data-unavailable')).toBe('true');
    expect(quotePreview?.textContent).toBe('comment-42');
  });

  it('resolves same-board OP quotes across alias-scoped post number store entries', async () => {
    testState.comments = {
      'thread-cid': { cid: 'thread-cid', number: 42 },
    };
    testState.cidToNumber = {
      'thread-cid': 42,
    };
    testState.numberToCid = {
      'music-posting.eth': {
        42: 'thread-cid',
      },
    };
    testState.directories = [{ address: 'music-posting.bso', title: '/mu/ - Music' }];

    await renderMarkdown({
      content: '>>42',
      postCid: 'thread-cid',
      communityAddress: 'music-posting.bso',
    });

    expect(container.querySelector('[data-testid="external-number-quote-link"]')).toBeNull();
    const quotePreview = container.querySelector('[data-testid="reply-quote-preview"]');
    expect(quotePreview?.getAttribute('data-number')).toBe('42');
    expect(quotePreview?.getAttribute('data-op')).toBe('true');
    expect(quotePreview?.textContent).toBe('thread-cid');
  });

  it('resolves board-preview quotes when the exact alias scope exists but another alias owns the quoted number', async () => {
    testState.comments = {
      'thread-cid': { cid: 'thread-cid', number: 3 },
    };
    testState.cidToNumber = {
      'thread-cid': 3,
    };
    testState.numberToCid = {
      'music-posting.eth': {
        3: 'thread-cid',
        6: 'reply-cid',
      },
      'music-posting.bso': {
        28: 'later-reply-cid',
      },
    };

    await renderMarkdown({
      content: '>>3',
      postCid: 'thread-cid',
      communityAddress: 'music-posting.bso',
    });

    expect(container.querySelector('[data-testid="external-number-quote-link"]')).toBeNull();
    const quotePreview = container.querySelector('[data-testid="reply-quote-preview"]');
    expect(quotePreview?.getAttribute('data-number')).toBe('3');
    expect(quotePreview?.getAttribute('data-op')).toBe('true');
    expect(quotePreview?.textContent).toBe('thread-cid');
  });

  it('preserves the OP label when a same-board quote still falls back to external resolution', async () => {
    testState.cidToNumber = {
      'thread-cid': 42,
    };
    testState.directories = [{ address: 'music-posting.bso', title: '/mu/ - Music' }];

    await renderMarkdown({
      content: '>>42',
      postCid: 'thread-cid',
      communityAddress: 'music-posting.bso',
    });

    const externalLink = container.querySelector('[data-testid="external-number-quote-link"]');
    expect(externalLink?.getAttribute('data-op')).toBe('true');
    expect(externalLink?.textContent).toBe('>>42 (OP)');
  });

  it('renders lazy same-board and cross-board number quotes when the cid is not cached', async () => {
    await renderMarkdown({
      content: '>>42 >>>/fit/77',
      communityAddress: 'music-posting.eth',
    });

    const lazyLinks = Array.from(container.querySelectorAll('[data-testid="external-number-quote-link"]'));
    expect(lazyLinks.map((node) => node.textContent)).toEqual(['>>42', '>>>/fit/77']);
  });

  it('shows youtube thumbnails in the floating hover preview instead of loading the iframe', async () => {
    testState.embeddableHosts = new Set(['www.youtube.com']);
    testState.mediaInfoByHref = {
      'https://www.youtube.com/watch?v=abc123': {
        patternThumbnailUrl: 'https://img.youtube.com/vi/abc123/0.jpg',
        type: 'iframe',
        url: 'https://www.youtube.com/watch?v=abc123',
      },
    };

    await renderMarkdown({
      content: 'https://www.youtube.com/watch?v=abc123',
    });

    const embedButton = Array.from(container.querySelectorAll('button')).find((node) => node.textContent === 'embed');
    expect(embedButton).toBeTruthy();

    await act(async () => {
      testState.floatingOnOpenChange?.(true);
    });

    const floatingMedia = container.querySelector('[data-floating="true"]');
    expect(floatingMedia).toBeTruthy();
    expect(floatingMedia?.getAttribute('data-show-thumbnail')).toBe('true');
    expect(testState.floatingMediaProps?.showThumbnail).toBe(true);
  });

  it('toggles inline media embeds for embeddable links outside catalog view', async () => {
    testState.mediaInfoByHref = {
      'https://cdn.example/image.png': {
        thumbnail: 'https://cdn.example/thumb.png',
        type: 'image',
        url: 'https://cdn.example/image.png',
      },
    };

    await renderMarkdown({
      content: 'https://cdn.example/image.png',
    });

    const toggle = Array.from(container.querySelectorAll('button')).find((node) => node.textContent === 'embed');
    expect(toggle).toBeTruthy();
    expect(container.querySelector('[data-testid="comment-media"]')).toBeNull();

    await act(async () => {
      toggle?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(container.querySelector('[data-testid="comment-media"]')?.textContent).toBe('image:https://cdn.example/image.png');

    const removeToggle = Array.from(container.querySelectorAll('button')).find((node) => node.textContent === 'remove');
    await act(async () => {
      removeToggle?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(container.querySelector('[data-testid="comment-media"]')).toBeNull();
  });
});
