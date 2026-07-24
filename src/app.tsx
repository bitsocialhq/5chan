import { lazy, Suspense, useCallback, useEffect } from 'react';
import { Navigate, Outlet, Route, Routes, useLocation, useParams } from 'react-router-dom';
import { useAccount, useAccountComment, useCommunity } from '@bitsocial/bitsocial-react-hooks';
import { initSnow, removeSnow, shouldShowSnow } from './lib/snow';
import { isAllView, isCatalogView, isModView, isSubscriptionsView } from './lib/utils/view-utils';
import { preloadReplyModal, preloadThemeAssets } from './lib/utils/preload-utils';
import { hasModQueueAccessRole } from './lib/utils/mod-access';
import useReplyModalStore from './stores/use-reply-modal-store';
import useCreateBoardModalStore from './stores/use-create-board-modal-store';
import useSpecialThemeStore from './stores/use-special-theme-store';
import useIsMobile from './hooks/use-is-mobile';
import { useAccountCommunityAddresses } from './hooks/use-account-community-addresses';
import useTheme from './hooks/use-theme';
import { useDirectories } from './hooks/use-directories';
import { useBrowserPureP2PAccountUpgrade } from './hooks/use-browser-pure-p2p-account-upgrade';
import { useCommunityIdentifier } from './hooks/use-community-identifiers';
import { useResolvedCommunityAddress, useResolvedDirectoryBoardPath } from './hooks/use-resolved-community-address';
import useSuspendOffscreenMediaPlayback from './hooks/use-suspend-offscreen-media-playback';
import { normalizeAccountCommentIndex } from './lib/utils/account-comment-index-utils';
import { getCommentCommunityAddress } from './lib/utils/comment-utils';
import { getPageDraftKey } from './lib/utils/location-draft-utils';
import {
  getBoardPath,
  isBoardModRoute,
  isDirectoryBoard,
  isArchiveRoute,
  isDirectoryListRoute,
  isLegacyBoardModQueueRoute,
  isPostRoute,
  isPendingPostRoute,
  isModQueueRoute,
  isValidBoardModRoute,
  isValidModRoute,
  isFlashBoardRoute,
  isBoardFeedPageNumber,
  getCatalogSearchRoute,
} from './lib/utils/route-utils';
import styles from './app.module.css';
import { DesktopBoardButtons, MobileAllFeedFilter, MobileBoardButtons } from './components/board-buttons/board-buttons';
import Blotter from './views/blotter/blotter';
import Faq from './views/faq/faq';
import Home from './views/home/home';
import Archive from './views/archive/archive';
import Directory from './views/directory/directory';
import ModQueueView from './views/mod-queue/mod-queue';
import NotAllowed from './views/not-allowed/not-allowed';
import NotFound from './views/not-found/not-found';
import Pass from './views/pass/pass';
import PendingPost from './views/pending-post/pending-post';
import Post from './views/post/post';
import Rules from './views/rules/rules';
import BoardHeader from './components/board-header/board-header';
import FeedCacheContainer from './components/feed-cache-container/feed-cache-container';
import PostForm from './components/post-form/post-form';
import BoardBlotter from './components/board-blotter/board-blotter';
import BoardsBar from './components/boards-bar/boards-bar';
import ExternalQuoteStatus from './components/external-quote-status/external-quote-status';
import ModEmptyState from './components/mod-empty-state/mod-empty-state';

const AccountDataEditor = lazy(() => import('./views/account-data-editor'));
const BoardsBarEditModal = lazy(() => import('./components/boards-bar-edit-modal'));
const CreateBoardModal = lazy(() => import('./components/create-board-modal'));
const ChallengeModal = lazy(() => import('./components/challenge-modal'));
const DirectoryModal = lazy(() => import('./components/directory-modal'));
const DisclaimerModal = lazy(() => import('./components/disclaimer-modal'));
const ReplyModal = lazy(() => import('./components/reply-modal'));
const SettingsModal = lazy(() => import('./components/settings-modal'));
const SettingsUpgradeModal = lazy(() => import('./components/settings-upgrade-modal'));

// Preload all theme assets (buttons, backgrounds) immediately on app load
// to prevent visible loading delays when switching themes
preloadThemeAssets();
preloadReplyModal();

const getPostFormRouteKeyPath = (pathname: string) => pathname.replace(/\/settings$/, '').replace(/\/$/, '');

const getPageOneCanonicalPath = (boardIdentifier: string, pathname: string) => `/${boardIdentifier}${pathname.endsWith('/settings') ? '/settings' : ''}`;

const BoardLayout = () => {
  const params = useParams();
  const { accountCommentIndex, boardIdentifier, pageNumber } = params;
  const { pathname, search, hash } = useLocation();
  const isMobile = useIsMobile();
  const isInAllView = isAllView(pathname);
  const isInSubscriptionsView = isSubscriptionsView(pathname, useParams());
  const isInModView = isModView(pathname);
  const directories = useDirectories();
  const communityAddress = useResolvedCommunityAddress(boardIdentifier);
  const { boardPath: resolvedDirectoryBoardPath, isDirectoryCandidate } = useResolvedDirectoryBoardPath(boardIdentifier);
  const pendingPost = useAccountComment({ commentIndex: normalizeAccountCommentIndex(accountCommentIndex) });
  const pendingPostCommunityAddress = getCommentCommunityAddress(pendingPost);
  const { closeCreateBoardModal } = useCreateBoardModalStore();
  const isOnPostRoute = isPostRoute(pathname);
  const isOnPendingPostRoute = isPendingPostRoute(pathname);
  const isOnModQueueRoute = isModQueueRoute(pathname);
  const isOnArchiveRoute = isArchiveRoute(pathname);
  const isOnDirectoryRoute = isDirectoryListRoute(pathname);
  const shouldRenderOutlet = isOnPostRoute || isOnPendingPostRoute || isOnModQueueRoute || isOnArchiveRoute || isOnDirectoryRoute;
  const shouldRenderBoardBlotter = !isOnArchiveRoute && !isOnDirectoryRoute && !isOnModQueueRoute;
  const isInCatalogView = isCatalogView(pathname, params);
  // Christmas snow
  const { isEnabled: isSpecialEnabled } = useSpecialThemeStore();
  useEffect(() => {
    if (isSpecialEnabled && shouldShowSnow() && !isMobile) {
      initSnow({ flakeCount: 150 });
    }
    return () => {
      removeSnow();
    };
  }, [isSpecialEnabled, isMobile]);

  // Close create board modal when navigating to a different page
  useEffect(() => {
    closeCreateBoardModal();
  }, [pathname, closeCreateBoardModal]);

  // force rerender of post form when navigating between pages, except when opening settings modal in current view
  const key = `${communityAddress}-${getPostFormRouteKeyPath(pathname)}`;

  if (pageNumber === '1' && boardIdentifier) {
    return <Navigate to={{ pathname: getPageOneCanonicalPath(boardIdentifier, pathname), search, hash }} replace />;
  }

  if (boardIdentifier && pageNumber && !isBoardFeedPageNumber(pageNumber)) {
    return <Navigate to={getCatalogSearchRoute(boardIdentifier, pageNumber, search, { settings: pathname.endsWith('/settings') })} replace />;
  }

  if (isCatalogView(pathname, params) && isFlashBoardRoute(boardIdentifier, directories)) {
    return <Navigate to='/not-found' replace />;
  }

  // Invalid /mod/ paths (e.g. /mod/modqueue, /mod/asdoijasd) -> not-found
  if (pathname.startsWith('/mod/') && !isValidModRoute(pathname)) {
    return <Navigate to='/not-found' replace />;
  }

  if (isLegacyBoardModQueueRoute(pathname)) {
    return <Navigate to='/not-found' replace />;
  }

  // Invalid board-scoped mod paths (e.g. /biz/mod, /biz/mod/asdoijasd) -> not-found
  if (isBoardModRoute(pathname) && !isValidBoardModRoute(pathname)) {
    return <Navigate to='/not-found' replace />;
  }

  // Normalize address URLs to directory codes: /anime-and-manga.eth/thread/xxx -> /a/thread/xxx
  if (boardIdentifier && !isDirectoryBoard(boardIdentifier, directories)) {
    const canonicalBoardIdentifier = resolvedDirectoryBoardPath ?? (isDirectoryCandidate ? boardIdentifier : getBoardPath(boardIdentifier, directories));
    if (canonicalBoardIdentifier !== boardIdentifier) {
      const canonicalPath = pathname.replace(`/${boardIdentifier}`, `/${canonicalBoardIdentifier}`);
      return <Navigate to={canonicalPath + (search || '') + (hash || '')} replace />;
    }
  }

  return (
    <div className={styles.boardLayout}>
      <BoardsBar />
      <Suspense fallback={null}>
        <CreateBoardModal />
      </Suspense>
      <Suspense fallback={null}>
        <BoardsBarEditModal />
      </Suspense>
      <Suspense fallback={null}>
        <DirectoryModal />
      </Suspense>
      <Suspense fallback={null}>
        <DisclaimerModal />
      </Suspense>
      <BoardHeader />
      {isMobile
        ? (communityAddress || isInAllView || isInModView || isInSubscriptionsView || pendingPostCommunityAddress || isOnModQueueRoute) &&
          !isOnArchiveRoute &&
          !isOnDirectoryRoute &&
          (isInCatalogView ? (
            <>
              <PostForm key={key} />
              <MobileBoardButtons />
            </>
          ) : (
            <>
              <MobileBoardButtons />
              <PostForm key={key} />
              {isInAllView && <MobileAllFeedFilter />}
            </>
          ))
        : (communityAddress || isInAllView || isInModView || isInSubscriptionsView || pendingPostCommunityAddress || isOnModQueueRoute) &&
          !isOnArchiveRoute &&
          !isOnDirectoryRoute && (
            <>
              <PostForm key={key} />
              {shouldRenderBoardBlotter ? <BoardBlotter /> : null}
              <DesktopBoardButtons />
            </>
          )}
      {!isOnModQueueRoute && <FeedCacheContainer />}
      {shouldRenderOutlet && <Outlet />}
    </div>
  );
};

const GlobalLayout = () => {
  useTheme({ applyDocumentEffects: true });
  useSuspendOffscreenMediaPlayback();

  const location = useLocation();
  const { pathname } = location;
  const locationDraftKey = getPageDraftKey(location);
  const modal = useReplyModalStore((state) => state.modals[locationDraftKey]);
  const closeReplyModal = useReplyModalStore((state) => state.closeModal);
  const closeModal = useCallback(() => closeReplyModal(locationDraftKey), [closeReplyModal, locationDraftKey]);
  const activeCid = modal?.activeCid;
  const parentNumber = modal?.parentNumber ?? null;
  const threadNumber = modal?.threadNumber ?? null;
  const threadCid = modal?.threadCid;
  const activeCommunityAddress = modal?.communityAddress;
  const showReplyModal = modal?.showReplyModal ?? false;
  const scrollY = modal?.scrollY ?? 0;
  const isInSettingsView = pathname.endsWith('/settings');

  return (
    <>
      <ExternalQuoteStatus />
      <Suspense fallback={null}>
        <ChallengeModal />
      </Suspense>
      <Suspense fallback={null}>
        <SettingsUpgradeModal />
      </Suspense>
      {activeCid && threadCid && activeCommunityAddress && (
        <Suspense fallback={null}>
          <ReplyModal
            key={locationDraftKey}
            closeModal={closeModal}
            locationDraftKey={locationDraftKey}
            parentCid={activeCid}
            parentNumber={parentNumber}
            threadNumber={threadNumber}
            postCid={threadCid}
            scrollY={scrollY}
            showReplyModal={showReplyModal}
            communityAddress={activeCommunityAddress}
          />
        </Suspense>
      )}
      {isInSettingsView && (
        <Suspense fallback={null}>
          <SettingsModal />
        </Suspense>
      )}
      <Outlet />
    </>
  );
};

const ModQueueRoute = () => {
  const { boardIdentifier } = useParams();
  const account = useAccount();
  const accountAddress = account?.author?.address;
  const communityAddress = useResolvedCommunityAddress();
  const communityIdentifier = useCommunityIdentifier(communityAddress);
  const community = useCommunity(communityIdentifier ? { community: communityIdentifier } : undefined);
  const accountCommunityAddresses = useAccountCommunityAddresses();

  if (!account) {
    return null;
  }

  if (!accountAddress) {
    return <Navigate to='/not-allowed' replace />;
  }

  if (!boardIdentifier) {
    return accountCommunityAddresses.length > 0 ? <ModQueueView /> : <ModEmptyState />;
  }

  // Wait for board role metadata before enforcing access to avoid false redirects during initial load.
  const boardState = community?.state;
  const isBoardLoading = !community || !boardState || (boardState !== 'succeeded' && boardState !== 'failed');
  if (isBoardLoading) {
    return null;
  }

  const accountRole = community?.roles?.[accountAddress]?.role;
  return hasModQueueAccessRole(accountRole) ? <ModQueueView /> : <Navigate to='/not-allowed' replace />;
};

const App = () => {
  useBrowserPureP2PAccountUpgrade();

  // Feed routes are always rendered by FeedCacheContainer (Virtuoso used for all modes)
  const boardFeedElement = null;
  const catalogFeedElement = null;

  return (
    <div className={styles.app}>
      <Routes>
        <Route element={<GlobalLayout />}>
          <Route path='/' element={<Home />} />
          <Route path='/faq' element={<Faq />} />
          <Route path='/pass' element={<Pass />} />
          <Route path='/rules' element={<Rules />} />
          <Route path='/rules/*' element={<Navigate to='/not-found' replace />} />
          <Route path='/blotter' element={<Blotter />} />
          <Route
            path='/settings/account-data'
            element={
              <Suspense fallback={null}>
                <AccountDataEditor />
              </Suspense>
            }
          />
          <Route element={<BoardLayout />}>
            {/* Canonical multiboard routes (time filter lives in ?t=) */}
            <Route path='/all' element={boardFeedElement} />
            <Route path='/all/settings' element={boardFeedElement} />
            <Route path='/all/catalog' element={catalogFeedElement} />
            <Route path='/all/catalog/settings' element={catalogFeedElement} />

            <Route path='/subs' element={boardFeedElement} />
            <Route path='/subs/settings' element={boardFeedElement} />
            <Route path='/subs/catalog' element={catalogFeedElement} />
            <Route path='/subs/catalog/settings' element={catalogFeedElement} />

            <Route path='/mod' element={boardFeedElement} />
            <Route path='/mod/settings' element={boardFeedElement} />
            <Route path='/mod/catalog' element={catalogFeedElement} />
            <Route path='/mod/catalog/settings' element={catalogFeedElement} />

            <Route path='/mod/queue' element={<ModQueueRoute />} />
            <Route path='/mod/queue/settings' element={<ModQueueRoute />} />
            <Route path='/all/archive' element={<Navigate to='/not-found' replace />} />
            <Route path='/all/archive/settings' element={<Navigate to='/not-found' replace />} />
            <Route path='/subs/archive' element={<Navigate to='/not-found' replace />} />
            <Route path='/subs/archive/settings' element={<Navigate to='/not-found' replace />} />
            <Route path='/mod/archive' element={<Navigate to='/not-found' replace />} />
            <Route path='/mod/archive/settings' element={<Navigate to='/not-found' replace />} />
            <Route path='/all/directory' element={<Navigate to='/not-found' replace />} />
            <Route path='/all/directory/settings' element={<Navigate to='/not-found' replace />} />
            <Route path='/subs/directory' element={<Navigate to='/not-found' replace />} />
            <Route path='/subs/directory/settings' element={<Navigate to='/not-found' replace />} />
            <Route path='/mod/directory' element={<Navigate to='/not-found' replace />} />
            <Route path='/mod/directory/settings' element={<Navigate to='/not-found' replace />} />
            <Route path='/directory' element={<Navigate to='/not-found' replace />} />
            <Route path='/directory/settings' element={<Navigate to='/not-found' replace />} />

            {/* Invalid subpaths: old URLs and unknown paths -> not-found */}
            <Route path='/mod/modqueue' element={<Navigate to='/not-found' replace />} />
            <Route path='/mod/modqueue/settings' element={<Navigate to='/not-found' replace />} />
            <Route path='/all/*' element={<Navigate to='/not-found' replace />} />
            <Route path='/subs/*' element={<Navigate to='/not-found' replace />} />
            <Route path='/mod/*' element={<Navigate to='/not-found' replace />} />

            <Route path='/:boardIdentifier/catalog' element={catalogFeedElement} />
            <Route path='/:boardIdentifier/catalog/settings' element={catalogFeedElement} />
            <Route path='/:boardIdentifier/:pageNumber' element={boardFeedElement} />
            <Route path='/:boardIdentifier/:pageNumber/settings' element={boardFeedElement} />
            <Route path='/:boardIdentifier' element={boardFeedElement} />
            <Route path='/:boardIdentifier/settings' element={boardFeedElement} />
            <Route path='/:boardIdentifier/archive' element={<Archive />} />
            <Route path='/:boardIdentifier/archive/settings' element={<Archive />} />
            <Route path='/:boardIdentifier/directory' element={<Directory />} />
            <Route path='/:boardIdentifier/directory/settings' element={<Directory />} />

            <Route path='/:boardIdentifier/mod/queue' element={<ModQueueRoute />} />
            <Route path='/:boardIdentifier/mod/queue/settings' element={<ModQueueRoute />} />

            <Route path='/:boardIdentifier/modqueue' element={<Navigate to='/not-found' replace />} />
            <Route path='/:boardIdentifier/modqueue/settings' element={<Navigate to='/not-found' replace />} />
            <Route path='/:boardIdentifier/mod' element={<Navigate to='/not-found' replace />} />
            <Route path='/:boardIdentifier/mod/*' element={<Navigate to='/not-found' replace />} />

            <Route path='/:boardIdentifier/thread/:commentCid' element={<Post />} />
            <Route path='/:boardIdentifier/thread/:commentCid/settings' element={<Post />} />

            <Route path='/pending/:accountCommentIndex' element={<PendingPost />} />
            <Route path='/pending/:accountCommentIndex/settings' element={<PendingPost />} />
          </Route>
          <Route path='/not-allowed' element={<NotAllowed />} />
          <Route path='/not-found' element={<NotFound />} />
          <Route path='*' element={<NotFound />} />
        </Route>
      </Routes>
    </div>
  );
};

export default App;
