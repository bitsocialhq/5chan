import { isArchiveRoute, isBoardModRoute, isModQueueRoute } from './route-utils';

type ParamsType = {
  accountCommentIndex?: string;
  boardIdentifier?: string;
  commentCid?: string;
};

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

export const isArchiveView = (pathname: string, params: ParamsType): boolean => {
  const { boardIdentifier } = params;
  const identifier = boardIdentifier;
  const decodedPathname = decodeURIComponent(pathname);

  return Boolean(identifier && isArchiveRoute(decodedPathname) && decodedPathname === `/${identifier}/archive`);
};

export const isNotFoundView = (pathname: string, params: ParamsType): boolean => {
  return (
    !isAllView(pathname) &&
    !isBoardView(pathname, params) &&
    !isArchiveView(pathname, params) &&
    !isCatalogView(pathname, params) &&
    !isHomeView(pathname) &&
    !isPendingPostView(pathname, params) &&
    !isPostPageView(pathname, params) &&
    !isSettingsView(pathname, params) &&
    !isSubscriptionsView(pathname, params) &&
    !isModQueueView(pathname)
  );
};
