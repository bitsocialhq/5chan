import { getSpecialBoardByAddress } from './special-boards';

const DEFAULT_FAVICON = '/favicon.ico?variant=nsfw';
const SFW_FAVICON = '/favicon2.ico?variant=sfw';
const NOT_FOUND_FAVICON = '/favicon-404.ico?variant=404';
const FAVICON_RELS = ['icon', 'shortcut icon'] as const;
const FAVICON_SELECTOR = ['link[data-fivechan-tab-favicon="true"]', ...FAVICON_RELS.map((rel) => `link[rel="${rel}"][sizes="16x16"]`)].join(', ');

export type FaviconVariant = 'default' | 'sfw' | 'not-found';

const FAVICONS: Record<FaviconVariant, { href: string; type: string }> = {
  default: { href: DEFAULT_FAVICON, type: 'image/png' },
  sfw: { href: SFW_FAVICON, type: 'image/png' },
  'not-found': { href: NOT_FOUND_FAVICON, type: 'image/x-icon' },
};

let currentHref: string | null = null;

const hasExpectedFaviconLinks = (href: string): boolean =>
  FAVICON_RELS.every((rel) => document.querySelector(`link[rel="${rel}"][href="${href}"][data-fivechan-tab-favicon="true"]`));

const createFaviconLink = (rel: (typeof FAVICON_RELS)[number], favicon: (typeof FAVICONS)[FaviconVariant]): HTMLLinkElement => {
  const link = document.createElement('link');
  link.rel = rel;
  link.type = favicon.type;
  link.setAttribute('sizes', '16x16');
  link.href = favicon.href;
  link.dataset.fivechanTabFavicon = 'true';
  return link;
};

/**
 * Swap the tab favicon between the default (NSFW/home), SFW, and 404 variants.
 * Uses remove-and-recreate plus cache-busted URLs to bypass sticky favicon caching.
 */
export const updateFavicon = (variant: FaviconVariant): void => {
  const favicon = FAVICONS[variant];
  const { href } = favicon;
  if (href === currentHref && hasExpectedFaviconLinks(href)) return;
  currentHref = href;

  document.querySelectorAll<HTMLLinkElement>(FAVICON_SELECTOR).forEach((link) => link.remove());
  FAVICON_RELS.forEach((rel) => {
    document.head.appendChild(createFaviconLink(rel, favicon));
  });
};

/**
 * Determine whether the current navigation context is a SFW board.
 *
 * `communityNsfw` is the already-derived verdict from `deriveCommunityNsfw` when the caller has
 * one; it takes precedence over the directory lookup because it already folds that lookup in.
 * Callers without a live community can omit it and keep the directory-only behaviour.
 *
 * Pure function — no hooks, no side-effects, fully testable.
 */
export const isSfwBoard = ({
  pathname,
  isSpecialTheme,
  isInAllView,
  isInSubscriptionsView,
  isInModView,
  communityAddress,
  communityNsfw,
  directories,
}: {
  pathname: string;
  isSpecialTheme: boolean;
  isInAllView: boolean;
  isInSubscriptionsView: boolean;
  isInModView: boolean;
  communityAddress: string | undefined;
  communityNsfw?: boolean;
  directories: { address: string; nsfw?: boolean }[];
}): boolean => {
  if (pathname === '/' || pathname.startsWith('/rules')) return false;
  if (isSpecialTheme) return false;
  if (isInAllView || isInSubscriptionsView || isInModView) return false;

  if (!communityAddress) return false;

  const entry = directories.find((d) => d.address === communityAddress);
  const specialBoard = getSpecialBoardByAddress(communityAddress);
  if (specialBoard) return !specialBoard.nsfw;

  return !(communityNsfw ?? entry?.nsfw);
};
