import { isArchiveRoute, isBoardModRoute, isModQueueRoute, isSearchRoute, isValidModRoute } from './route-utils';

type ParamsType = {
  accountCommentIndex?: string;
  boardIdentifier?: string;
  commentCid?: string;
};

const STATIC_APP_ROUTES = new Set(['/faq', '/pass', '/rules', '/blotter', '/settings/account-data', '/not-allowed']);

const isStaticAppRoute = (pathname: string): boolean => STATIC_APP_ROUTES.has(pathname);

const normalizeViewPathname = (pathname: string): string => pathname.replace(/\/+$/, '') || '/';

export const isAllView = (pathname: string): boolean => {
  return pathname.startsWith('/all');
};

export const isBoardView = (pathname: string, params: ParamsType): boolean => {
  // some subs might use emojis in their address, so we need to decode the pathname
  const decodedPathname = decodeURIComponent(pathname);
  // Check if it's a board view (not all, subscriptions, mod, pending, or special routes)
  if (
    pathname.startsWith('/all') ||
    pathname.startsWith('/subs') ||
    pathname.startsWith('/mod') ||
    isSearchRoute(pathname) ||
    isArchiveRoute(pathname) ||
    isBoardModRoute(pathname) ||
    pathname.startsWith('/pending') ||
    pathname === '/' ||
    pathname.startsWith('/faq') ||
    pathname.startsWith('/not-found')
  ) {
    return false;
  }
  const identifier = params.boardIdentifier;
  return identifier ? decodedPathname.startsWith(`/${identifier}`) : false;
};

export const isCatalogView = (pathname: string, params: ParamsType): boolean => {
  const { boardIdentifier } = params;
  const identifier = boardIdentifier;
  const decodedPathname = decodeURIComponent(pathname);

  return (
    (identifier && (decodedPathname === `/${identifier}/catalog` || decodedPathname === `/${identifier}/catalog/settings`)) ||
    decodedPathname === `/all/catalog` ||
    decodedPathname === `/all/catalog/settings` ||
    decodedPathname === `/subs/catalog` ||
    decodedPathname === `/subs/catalog/settings` ||
    decodedPathname === `/mod/catalog` ||
    decodedPathname === `/mod/catalog/settings`
  );
};

export const isHomeView = (pathname: string): boolean => {
  return pathname === '/';
};

export const isModView = (pathname: string): boolean => {
  return pathname === `/mod` || pathname.startsWith(`/mod/`);
};

export const isModQueueView = (pathname: string): boolean => {
  return isModQueueRoute(pathname);
};

export const isPendingPostView = (pathname: string, params: ParamsType): boolean => {
  return pathname === `/pending/${params.accountCommentIndex}` || pathname === `/pending/${params.accountCommentIndex}/settings`;
};

export const isPostPageView = (pathname: string, params: ParamsType): boolean => {
  const decodedPathname = decodeURIComponent(pathname);
  const identifier = params.boardIdentifier;
  return identifier && params.commentCid ? decodedPathname.startsWith(`/${identifier}/thread/${params.commentCid}`) : false;
};

export const isSettingsView = (pathname: string, params: ParamsType): boolean => {
  const { accountCommentIndex, boardIdentifier, commentCid } = params;
  const identifier = boardIdentifier;
  const decodedPathname = decodeURIComponent(pathname);
  return (
    (identifier && commentCid && decodedPathname === `/${identifier}/thread/${commentCid}/settings`) || decodedPathname === `/pending/${accountCommentIndex}/settings`
  );
};

export const isSubscriptionsView = (pathname: string, _params: ParamsType): boolean => {
  return pathname === '/subs' || pathname === '/subs/settings' || pathname === '/subs/catalog' || pathname === '/subs/catalog/settings';
};

export const isSearchView = (pathname: string): boolean => isSearchRoute(pathname);

export const isArchiveView = (pathname: string, params: ParamsType): boolean => {
  const { boardIdentifier } = params;
  const identifier = boardIdentifier;
  const decodedPathname = decodeURIComponent(normalizeViewPathname(pathname));
  const archivePathname = decodedPathname.replace(/\/settings$/, '');

  return Boolean(identifier && isArchiveRoute(decodedPathname) && archivePathname === `/${identifier}/archive`);
};

export const isNotFoundView = (pathname: string, params: ParamsType): boolean => {
  const normalizedPathname = normalizeViewPathname(pathname);

  return (
    !isAllView(normalizedPathname) &&
    !isBoardView(normalizedPathname, params) &&
    !isArchiveView(normalizedPathname, params) &&
    !isCatalogView(normalizedPathname, params) &&
    !isHomeView(normalizedPathname) &&
    !isStaticAppRoute(normalizedPathname) &&
    !isPendingPostView(normalizedPathname, params) &&
    !isPostPageView(normalizedPathname, params) &&
    !isSearchView(normalizedPathname) &&
    !isSettingsView(normalizedPathname, params) &&
    !isSubscriptionsView(normalizedPathname, params) &&
    !isValidModRoute(normalizedPathname) &&
    !isModQueueView(normalizedPathname)
  );
};
