import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { Placement } from '@floating-ui/react';
import { useTranslation } from 'react-i18next';
import { useDismiss, useFloating, useFocus, useHover, useInteractions, offset, shift, size, autoUpdate, FloatingPortal } from '@floating-ui/react';
import { getLinkMediaInfo, getHasThumbnail } from '../../lib/utils/media-utils';
import { isCatalogView } from '../../lib/utils/view-utils';
import useIsMobile from '../../hooks/use-is-mobile';
import CommentMedia from '../comment-media';
import styles from './markdown.module.css';
import { Link, useLocation, useParams } from 'react-router-dom';
import { canEmbed } from '../embed';
import { is5chanLink, transform5chanLinkToInternal, isValidCrossboardPattern } from '../../lib/utils/url-utils';
import { CROSSBOARD_NUMBER_QUOTE_TOKEN_REGEX, type ExternalQuoteReference } from '../../lib/utils/external-quote-utils';
import { isUnavailableQuoteTarget } from '../../lib/utils/quote-link-utils';
import usePostNumberStore, { getCidForPostNumber } from '../../stores/use-post-number-store';
import useCommunitiesPagesStore from '@bitsocial/bitsocial-react-hooks/dist/stores/communities-pages';
import { useComment } from '@bitsocial/bitsocial-react-hooks';
import ReplyQuotePreview from '../reply-quote-preview';
import ExternalNumberQuoteLink from './external-number-quote-link';
import { findDirectoryByAddress, useDirectories, type DirectoryCommunity } from '../../hooks/use-directories';
import { getDirectoryCodeForBoardAddress } from '../../lib/utils/directory-list-lookup-utils';
import {
  createDiceRollMarkupRegex,
  createFortuneBbcodeRegex,
  createLegacyFortuneMarkupRegex,
  getMatchingFortuneEntry,
  isFortuneDirectoryCode,
} from '../../lib/utils/post-options-utils';

const safeParseUrl = (href: string): URL | null => {
  try {
    return href.startsWith('http') ? new URL(href) : null;
  } catch {
    return null;
  }
};

interface ContentLinkEmbedProps {
  children: any;
  href: string;
  linkMediaInfo: any;
}

const ContentLinkEmbed = ({ children, href, linkMediaInfo }: ContentLinkEmbedProps) => {
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  const [isOpen, setIsOpen] = useState(false);
  const [showMedia, setShowMedia] = useState(false);
  const [placement, setPlacement] = useState<Placement>('right');
  const availableWidthRef = useRef<number>(0);

  const { refs, floatingStyles, update, context } = useFloating({
    open: isOpen,
    onOpenChange: setIsOpen,
    placement,
    middleware: [
      shift({ padding: 10 }),
      offset({ mainAxis: 5 }),
      size({
        apply({ availableWidth, elements }) {
          availableWidthRef.current = availableWidth;
          if (availableWidth >= 250) {
            elements.floating.style.maxWidth = `${availableWidth - 12}px`;
          } else if (placement === 'right') {
            setPlacement('left');
          }
        },
      }),
    ],
    whileElementsMounted: autoUpdate,
  });

  const hover = useHover(context, { move: false });
  const focus = useFocus(context);
  const dismiss = useDismiss(context);

  const { getReferenceProps, getFloatingProps } = useInteractions([hover, focus, dismiss]);

  useEffect(() => {
    const handleResize = () => {
      const availableWidth = availableWidthRef.current;
      if (availableWidth >= 250) {
        setPlacement('right');
      } else {
        setPlacement('left');
      }
      update();
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [update]);

  return (
    <>
      <a href={href} target='_blank' rel='noopener noreferrer'>
        {children}
      </a>{' '}
      [
      <button
        type='button'
        className={styles.embedButton}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setShowMedia(!showMedia);
          }
        }}
        onClick={() => setShowMedia(!showMedia)}
        ref={refs.setReference}
        {...getReferenceProps()}
      >
        {showMedia ? t('remove') : isMobile ? t('open') : t('embed')}
      </button>
      ]
      {showMedia && (
        <>
          <br />
          <CommentMedia commentMediaInfo={linkMediaInfo} disableToggle={true} isReply={false} setShowThumbnail={setShowMedia} showThumbnail={false} />
        </>
      )}
      {getHasThumbnail(linkMediaInfo, href) && (
        <FloatingPortal>
          {isOpen && !isMobile && (
            <div className={styles.floatingEmbed} ref={refs.setFloating} style={floatingStyles} {...getFloatingProps()}>
              <CommentMedia
                commentMediaInfo={linkMediaInfo}
                disableToggle={true}
                isFloatingEmbed={true}
                isReply={false}
                setShowThumbnail={() => {}}
                showThumbnail={true}
              />
            </div>
          )}
        </FloatingPortal>
      )}
    </>
  );
};

const normalizeContent = (content: string): string => {
  if (!content) return '';
  let normalized = content.replace(/\n&nbsp;\n/g, '\n\n');
  normalized = normalized.replace(/\n{3,}/g, '\n\n');
  return normalized;
};

type Token =
  | { key: string; type: 'text'; value: string }
  | { key: string; type: 'url'; href: string }
  | { key: string; type: 'quoteLink'; number: number }
  | { key: string; type: 'crossBoardNumberQuoteLink'; reference: ExternalQuoteReference }
  | { key: string; type: 'crossBoardLink'; display: string; route: string }
  | { key: string; type: 'spoiler'; tokens: Token[] };

const SPOILER_REGEX = /\[[sS][pP][oO][iI][lL][eE][rR]\]([\s\S]*?)\[\/[sS][pP][oO][iI][lL][eE][rR]\]/;
const CROSSBOARD_REGEX = />>>\/((?:[a-zA-Z0-9]{1,10}\/(?:[a-zA-Z0-9]{46})?|[a-zA-Z0-9\-.]+(?:\/[a-zA-Z0-9]{46})?))[.,:;!?]*/;
const QUOTE_LINK_REGEX = /(?<![>/\w])>>(\d+)(?![\d/])/;
const URL_REGEX = /https?:\/\/[^\s<>[\]]+/;
type QstBbcodeTag = 'b' | 'i' | 'red' | 'green' | 'blue';
const QST_BBCODE_OPEN_REGEX = /\[(b|i|red|green|blue)\]/g;
const QST_BBCODE_COLORS = {
  red: '#C41E3A',
  green: '#00A550',
  blue: '#1d8dc4',
} satisfies Record<Extract<QstBbcodeTag, 'red' | 'green' | 'blue'>, string>;
const QST_BBCODE_COLOR_STYLES = {
  red: { color: QST_BBCODE_COLORS.red },
  green: { color: QST_BBCODE_COLORS.green },
  blue: { color: QST_BBCODE_COLORS.blue },
} satisfies Record<Extract<QstBbcodeTag, 'red' | 'green' | 'blue'>, React.CSSProperties>;

const getDirectoryCodeFromDirectory = (directory: Pick<DirectoryCommunity, 'directoryCode' | 'title'> | undefined): string | undefined =>
  directory?.directoryCode?.trim().toLowerCase() || directory?.title?.match(/^\/([^/]+)\//)?.[1]?.toLowerCase();

const getRouteBoardIdentifier = (pathname: string): string | undefined => pathname.split('/').filter(Boolean)[0]?.toLowerCase();

const getDirectoryCodeForIdentifier = (identifier: string | undefined, directories: DirectoryCommunity[]): string | undefined => {
  if (!identifier) return undefined;

  const normalizedIdentifier = identifier.trim().toLowerCase();
  if (!normalizedIdentifier) return undefined;

  const matchingDirectory = directories.find((directory) => getDirectoryCodeFromDirectory(directory) === normalizedIdentifier);
  if (matchingDirectory) {
    return getDirectoryCodeFromDirectory(matchingDirectory);
  }

  return getDirectoryCodeFromDirectory(findDirectoryByAddress(directories, identifier)) ?? getDirectoryCodeForBoardAddress(identifier) ?? normalizedIdentifier;
};

const getActiveDirectoryCode = (pathname: string, communityAddress: string | undefined, directories: DirectoryCommunity[]): string | undefined => {
  const routeDirectoryCode = getDirectoryCodeForIdentifier(getRouteBoardIdentifier(pathname), directories);
  if (isFortuneDirectoryCode(routeDirectoryCode)) {
    return routeDirectoryCode;
  }

  return getDirectoryCodeForIdentifier(communityAddress, directories);
};

const COMBINED_REGEX = new RegExp(
  `(${SPOILER_REGEX.source})|(${CROSSBOARD_NUMBER_QUOTE_TOKEN_REGEX.source})|(${CROSSBOARD_REGEX.source})|(${QUOTE_LINK_REGEX.source})|(${URL_REGEX.source})`,
  'g',
);

const COMBINED_REGEX_WITHOUT_SPOILER = new RegExp(
  `(${CROSSBOARD_NUMBER_QUOTE_TOKEN_REGEX.source})|(${CROSSBOARD_REGEX.source})|(${QUOTE_LINK_REGEX.source})|(${URL_REGEX.source})`,
  'g',
);

const makeTokenKey = (prefix: string, type: Token['type'], start: number, end: number): string => `${prefix}${type}:${start}:${end}`;

const isGreentextLine = (line: string): boolean => {
  if (line === '>') return true;
  if (!/^>+[^>]/.test(line)) return false;
  return !/^>>\d/.test(line) && !line.startsWith('>>>/');
};

function normalizeInternalRouteHref(href: string): string {
  if (href.startsWith('/#/')) {
    return href.slice(2);
  }
  if (href.startsWith('#/')) {
    return href.slice(1);
  }
  return href;
}

function splitUrlTrailingText(rawHref: string): { href: string; trailingText: string } {
  let href = rawHref;
  let trailingText = '';

  while (href) {
    const trailingPunctuationMatch = href.match(/[.,;:!?"']+$/);
    if (trailingPunctuationMatch) {
      trailingText = `${trailingPunctuationMatch[0]}${trailingText}`;
      href = href.slice(0, -trailingPunctuationMatch[0].length);
      continue;
    }

    if (href.endsWith(')')) {
      const openingParens = (href.match(/\(/g) || []).length;
      const closingParens = (href.match(/\)/g) || []).length;
      if (closingParens > openingParens) {
        trailingText = `)${trailingText}`;
        href = href.slice(0, -1);
        continue;
      }
    }

    break;
  }

  return { href, trailingText };
}

function getCrossboardRoute(fullPattern: string): string | null {
  const pathPart = fullPattern.replace(/^>>>\//, '').replace(/[.,:;!?]+$/, '');
  if (!isValidCrossboardPattern(`>>>/${pathPart}`)) {
    return null;
  }
  if (/^[a-zA-Z0-9]{1,10}\/$/.test(pathPart)) {
    return `/${pathPart.slice(0, -1)}`;
  }
  if (/^[a-zA-Z0-9]{1,10}\/[a-zA-Z0-9]{46}$/.test(pathPart)) {
    const [code, cid] = pathPart.split('/');
    return `/${code}/thread/${cid}`;
  }
  if (/^[^/]+\/[a-zA-Z0-9]{46}$/.test(pathPart)) {
    const [address, cid] = pathPart.split('/');
    return `/${address}/thread/${cid}`;
  }
  return `/${pathPart}`;
}

function tokenize(text: string, keyPrefix = '', parseSpoilers = true): Token[] {
  const tokens: Token[] = [];
  let lastIndex = 0;

  const regex = new RegExp((parseSpoilers ? COMBINED_REGEX : COMBINED_REGEX_WITHOUT_SPOILER).source, 'g');
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    const fullMatch = match[0];
    const matchStart = match.index;
    const matchEnd = regex.lastIndex;

    if (matchStart > lastIndex) {
      tokens.push({
        key: makeTokenKey(keyPrefix, 'text', lastIndex, matchStart),
        type: 'text',
        value: text.slice(lastIndex, matchStart),
      });
    }

    if (parseSpoilers && match[1] !== undefined) {
      const innerContent = match[2];
      const key = makeTokenKey(keyPrefix, 'spoiler', matchStart, matchEnd);
      tokens.push({ key, type: 'spoiler', tokens: tokenize(innerContent, `${key}/`, parseSpoilers) });
    } else if (match[parseSpoilers ? 3 : 1] !== undefined) {
      const boardIdentifier = match[parseSpoilers ? 4 : 2];
      const number = parseInt(match[parseSpoilers ? 5 : 3], 10);
      if (boardIdentifier && !Number.isNaN(number)) {
        tokens.push({
          key: makeTokenKey(keyPrefix, 'crossBoardNumberQuoteLink', matchStart, matchEnd),
          type: 'crossBoardNumberQuoteLink',
          reference: {
            boardIdentifier,
            kind: 'cross-board',
            number,
            raw: `>>>/${boardIdentifier}/${number}`,
          },
        });
      } else {
        tokens.push({ key: makeTokenKey(keyPrefix, 'text', matchStart, matchEnd), type: 'text', value: fullMatch });
      }
    } else if (match[parseSpoilers ? 6 : 4] !== undefined) {
      const pathPart = match[parseSpoilers ? 7 : 5];
      const fullPattern = `>>>/${pathPart}`;
      const route = getCrossboardRoute(fullPattern);
      if (route) {
        const trailingText = fullMatch.startsWith(fullPattern) ? fullMatch.slice(fullPattern.length) : '';
        const linkEnd = trailingText ? matchEnd - trailingText.length : matchEnd;
        tokens.push({ key: makeTokenKey(keyPrefix, 'crossBoardLink', matchStart, linkEnd), type: 'crossBoardLink', display: fullPattern, route });
        if (trailingText) {
          tokens.push({ key: makeTokenKey(keyPrefix, 'text', linkEnd, matchEnd), type: 'text', value: trailingText });
        }
      } else {
        tokens.push({ key: makeTokenKey(keyPrefix, 'text', matchStart, matchEnd), type: 'text', value: fullMatch });
      }
    } else if (match[parseSpoilers ? 8 : 6] !== undefined) {
      const number = parseInt(match[parseSpoilers ? 9 : 7], 10);
      tokens.push({ key: makeTokenKey(keyPrefix, 'quoteLink', matchStart, matchEnd), type: 'quoteLink', number });
    } else if (match[parseSpoilers ? 10 : 8] !== undefined) {
      const { href, trailingText } = splitUrlTrailingText(fullMatch);
      const linkEnd = trailingText ? matchEnd - trailingText.length : matchEnd;
      tokens.push({ key: makeTokenKey(keyPrefix, 'url', matchStart, linkEnd), type: 'url', href });
      if (trailingText) {
        tokens.push({ key: makeTokenKey(keyPrefix, 'text', linkEnd, matchEnd), type: 'text', value: trailingText });
      }
    }

    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    tokens.push({
      key: makeTokenKey(keyPrefix, 'text', lastIndex, text.length),
      type: 'text',
      value: text.slice(lastIndex),
    });
  }

  return tokens;
}

interface RenderContext {
  isInCatalogView: boolean;
  postCid?: string;
  communityAddress?: string;
  enableFortuneMarkup: boolean;
  enableQstBbcode: boolean;
  parseSpoilers: boolean;
}

interface MarkdownProps {
  content: string;
  title?: string;
  postCid?: string;
  communityAddress?: string;
  /** When false, [spoiler] tags stay visible (e.g. rules text teaching the syntax). Default true. */
  parseSpoilers?: boolean;
}

const NumberQuoteLink = ({ number, threadPostCid, communityAddress }: { number: number; threadPostCid?: string; communityAddress?: string }) => {
  const cid = usePostNumberStore((state) => getCidForPostNumber(state.numberToCid, communityAddress, number));
  const threadPostNumber = usePostNumberStore((state) => (threadPostCid ? state.cidToNumber[threadPostCid] : undefined));
  const commentFromStore = useCommunitiesPagesStore((state) => (cid ? state.comments[cid] : undefined));
  const commentFromHook = useComment({ commentCid: cid, onlyIfCached: true });
  const comment = commentFromHook?.number !== undefined ? commentFromHook : commentFromStore;
  const isOP = Boolean((threadPostCid && cid === threadPostCid) || (threadPostNumber !== undefined && number === threadPostNumber));

  if (isUnavailableQuoteTarget(comment)) {
    return (
      <ReplyQuotePreview isQuotelinkReply={true} quotelinkReply={comment} quotelinkNumber={number} isQuotelinkUnavailable={true} isOP={isOP} showTrailingBreak={false} />
    );
  }

  if (!cid && communityAddress) {
    return (
      <ExternalNumberQuoteLink
        isOP={isOP}
        reference={{
          kind: 'same-board',
          number,
          raw: `>>${number}`,
          communityAddress,
        }}
      />
    );
  }

  return <ReplyQuotePreview isQuotelinkReply={true} quotelinkReply={comment} quotelinkNumber={number} isOP={isOP} showTrailingBreak={false} />;
};

const AnchorLink = ({ href, text }: { href: string; text: string }) => {
  if (!href) {
    return <span>{text}</span>;
  }

  if (is5chanLink(href)) {
    const internalPath = transform5chanLinkToInternal(href);
    if (internalPath) {
      const internalRoute = normalizeInternalRouteHref(internalPath);
      let displayText: React.ReactNode = text;
      const isAutolinkedUrl = text.startsWith('http');

      if (isAutolinkedUrl) {
        displayText = text;
      } else if (internalRoute.match(/^\/[^/]+$/)) {
        displayText = internalRoute.substring(1);
      } else {
        displayText = internalRoute;
      }

      return <Link to={internalRoute}>{displayText}</Link>;
    } else {
      console.warn('Failed to transform 5chan link to internal path:', href);
      return <Link to={href}>{text}</Link>;
    }
  }

  if (
    href.startsWith('#/') ||
    href.startsWith('/#/') ||
    href.startsWith('/p/') ||
    href.match(/^\/p\/[^/]+(\/c\/[^/]+)?$/) ||
    href.match(/^\/[^/]+(\/thread\/[^/]+)?$/) ||
    href.match(/^\/[^/]+\/(catalog|description|rules)(\/settings)?$/)
  ) {
    return <Link to={normalizeInternalRouteHref(href)}>{text}</Link>;
  }

  return (
    <a href={href} target='_blank' rel='noopener noreferrer'>
      {text}
    </a>
  );
};

const TokenNode = ({ token, context }: { token: Token; context: RenderContext }) => {
  const { isInCatalogView, postCid, communityAddress } = context;

  switch (token.type) {
    case 'text':
      return context.enableQstBbcode ? <QstBbcodeText text={token.value} tokenKey={token.key} /> : <>{token.value}</>;
    case 'url': {
      const href = token.href;
      const linkMediaInfo = getLinkMediaInfo(href);
      const embedUrl = safeParseUrl(href);
      if (!isInCatalogView && ((embedUrl && canEmbed(embedUrl)) || getHasThumbnail(linkMediaInfo, href))) {
        return (
          <ContentLinkEmbed href={href} linkMediaInfo={linkMediaInfo}>
            {href}
          </ContentLinkEmbed>
        );
      }
      return <AnchorLink href={href} text={href} />;
    }
    case 'quoteLink':
      return (
        <span className={styles.inlineQuoteLink}>
          <NumberQuoteLink number={token.number} threadPostCid={postCid} communityAddress={communityAddress} />
        </span>
      );
    case 'crossBoardNumberQuoteLink':
      return (
        <span className={styles.inlineQuoteLink}>
          <ExternalNumberQuoteLink reference={token.reference} />
        </span>
      );
    case 'crossBoardLink':
      return <Link to={token.route}>{token.display}</Link>;
    case 'spoiler':
      return (
        <span className='spoilertext'>
          <TokenList tokens={token.tokens} context={context} />
        </span>
      );
  }
};

const TokenList = ({ tokens, context }: { tokens: Token[]; context: RenderContext }) => {
  return (
    <>
      {tokens.map((token) => (
        <TokenNode key={token.key} token={token} context={context} />
      ))}
    </>
  );
};

const findMatchingQstBbcodeClose = (text: string, tag: QstBbcodeTag, searchStart: number): number => {
  const tagRegex = new RegExp(`\\[(/?)${tag}\\]`, 'g');
  tagRegex.lastIndex = searchStart;
  let depth = 1;
  let match: RegExpExecArray | null;

  while ((match = tagRegex.exec(text)) !== null) {
    depth += match[1] ? -1 : 1;
    if (depth === 0) {
      return match.index;
    }
  }

  return -1;
};

const renderQstBbcodeElement = (tag: QstBbcodeTag, key: string, children: React.ReactNode[]) => {
  if (tag === 'b') {
    return <strong key={key}>{children}</strong>;
  }
  if (tag === 'i') {
    return <em key={key}>{children}</em>;
  }
  return (
    <span key={key} style={QST_BBCODE_COLOR_STYLES[tag]}>
      {children}
    </span>
  );
};

const getQstBbcodeTextNodes = (text: string, keyPrefix: string): React.ReactNode[] => {
  const elements: React.ReactNode[] = [];
  const regex = new RegExp(QST_BBCODE_OPEN_REGEX.source, 'g');
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    const tag = match[1] as QstBbcodeTag;
    const matchStart = match.index;
    const contentStart = regex.lastIndex;
    const closeStart = findMatchingQstBbcodeClose(text, tag, contentStart);

    if (closeStart === -1) {
      continue;
    }

    if (matchStart > lastIndex) {
      elements.push(<React.Fragment key={`${keyPrefix}text-${lastIndex}-${matchStart}`}>{text.slice(lastIndex, matchStart)}</React.Fragment>);
    }

    const closeEnd = closeStart + tag.length + 3;
    const childKeyPrefix = `${keyPrefix}${tag}-${matchStart}-`;
    elements.push(
      renderQstBbcodeElement(tag, `${keyPrefix}${tag}-${matchStart}-${closeEnd}`, getQstBbcodeTextNodes(text.slice(contentStart, closeStart), childKeyPrefix)),
    );
    lastIndex = closeEnd;
    regex.lastIndex = closeEnd;
  }

  if (lastIndex < text.length) {
    elements.push(<React.Fragment key={`${keyPrefix}text-${lastIndex}-${text.length}`}>{text.slice(lastIndex)}</React.Fragment>);
  }

  return elements;
};

const QstBbcodeText = ({ text, tokenKey }: { text: string; tokenKey: string }) => <>{getQstBbcodeTextNodes(text, `${tokenKey}/`)}</>;

const Fortune = ({ color, text }: { color: string; text: string }) => (
  <span className='fortune' style={{ color }}>
    <br />
    <br />
    <strong>Your fortune: {text}</strong>
  </span>
);

const DiceRoll = ({ text }: { text: string }) => (
  <strong>
    {text}
    <br />
    <br />
  </strong>
);

const renderLineContent = (line: string, context: RenderContext): React.ReactNode[] => {
  const elements: React.ReactNode[] = [];
  let lastIndex = 0;
  const fortuneBbcodeRegex = context.enableFortuneMarkup ? createFortuneBbcodeRegex() : null;
  const legacyFortuneMarkupRegex = context.enableFortuneMarkup ? createLegacyFortuneMarkupRegex() : null;
  const diceRollMarkupRegex = createDiceRollMarkupRegex();

  while (lastIndex < line.length) {
    if (fortuneBbcodeRegex) {
      fortuneBbcodeRegex.lastIndex = lastIndex;
    }
    if (legacyFortuneMarkupRegex) {
      legacyFortuneMarkupRegex.lastIndex = lastIndex;
    }
    diceRollMarkupRegex.lastIndex = lastIndex;

    const fortuneBbcodeMatch = fortuneBbcodeRegex?.exec(line) ?? null;
    const legacyFortuneMatch = legacyFortuneMarkupRegex?.exec(line) ?? null;
    const diceMatch = diceRollMarkupRegex.exec(line);
    let nextMatch: { type: 'dice'; match: RegExpExecArray } | { type: 'fortune'; match: RegExpExecArray } | null = null;

    for (const candidate of [
      fortuneBbcodeMatch ? { type: 'fortune' as const, match: fortuneBbcodeMatch } : null,
      legacyFortuneMatch ? { type: 'fortune' as const, match: legacyFortuneMatch } : null,
      diceMatch ? { type: 'dice' as const, match: diceMatch } : null,
    ]) {
      if (candidate && (!nextMatch || candidate.match.index < nextMatch.match.index)) {
        nextMatch = candidate;
      }
    }

    if (!nextMatch) {
      break;
    }

    const [fullMatch] = nextMatch.match;
    const matchStart = nextMatch.match.index;
    const matchEnd = matchStart + fullMatch.length;

    if (matchStart > lastIndex) {
      elements.push(
        <TokenList
          key={`text-${lastIndex}-${matchStart}`}
          tokens={tokenize(line.slice(lastIndex, matchStart), `${lastIndex}:`, context.parseSpoilers)}
          context={context}
        />,
      );
    }

    if (nextMatch.type === 'dice') {
      elements.push(<DiceRoll key={`dice-${matchStart}`} text={nextMatch.match[1]} />);
    } else {
      const [, color, text] = nextMatch.match;
      const fortune = getMatchingFortuneEntry(color, text);
      if (fortune) {
        elements.push(<Fortune key={`fortune-${matchStart}`} color={fortune.color} text={fortune.text} />);
      } else {
        elements.push(<TokenList key={`text-${matchStart}-${matchEnd}`} tokens={tokenize(fullMatch, `${matchStart}:`, context.parseSpoilers)} context={context} />);
      }
    }

    lastIndex = matchEnd;
  }

  if (lastIndex < line.length) {
    elements.push(
      <TokenList key={`text-${lastIndex}-${line.length}`} tokens={tokenize(line.slice(lastIndex), `${lastIndex}:`, context.parseSpoilers)} context={context} />,
    );
  }

  return elements;
};

const Markdown = ({ content, title, postCid, communityAddress, parseSpoilers = true }: MarkdownProps) => {
  const location = useLocation();
  const params = useParams();
  const directories = useDirectories();
  const isInCatalogView = isCatalogView(location.pathname, params);
  const enableQstBbcode = location.pathname.split('/').filter(Boolean)[0] === 'qst';
  const activeDirectoryCode = getActiveDirectoryCode(location.pathname, communityAddress, directories);
  const enableFortuneMarkup = isFortuneDirectoryCode(activeDirectoryCode);

  const rendered = useMemo(() => {
    const normalized = normalizeContent(content || '');
    const lines = normalized.split('\n');
    const elements: React.ReactNode[] = [];
    let lineOffset = 0;

    const context = { isInCatalogView, postCid, communityAddress, enableFortuneMarkup, enableQstBbcode, parseSpoilers };

    lines.forEach((line, lineIndex) => {
      const lineKey = `line-${lineOffset}`;
      lineOffset += line.length + 1;

      if (lineIndex > 0) {
        elements.push(<br key={`br-${lineKey}`} />);
      }

      if (line.length === 0) return;

      const isGreentext = isGreentextLine(line);

      const lineElements = renderLineContent(line, context);

      if (isGreentext) {
        elements.push(
          <span key={lineKey} className='greentext'>
            {lineElements}
          </span>,
        );
      } else {
        elements.push(<React.Fragment key={lineKey}>{lineElements}</React.Fragment>);
      }
    });

    return elements;
  }, [content, isInCatalogView, postCid, communityAddress, enableFortuneMarkup, enableQstBbcode, parseSpoilers]);

  return (
    <span className={styles.markdown}>
      {isInCatalogView && title && (
        <span>
          <b>{title}</b>
          {content ? ': ' : ''}
        </span>
      )}
      {rendered}
    </span>
  );
};
export default React.memo(Markdown);
