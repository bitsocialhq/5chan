import { lazy, Suspense, useEffect } from 'react';
import { Navigate, Outlet, Route, Routes, useLocation, useParams } from 'react-router-dom';
import { useAccount, useCommunity } from '@bitsocialnet/bitsocial-react-hooks';
import { initSnow, removeSnow } from './lib/snow';
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
import { useResolvedCommunityAddress } from './hooks/use-resolved-community-address';
import useSafeAccountComment from './hooks/use-safe-account-comment';
import {
  getBoardPath,
  getSubplebbitAddress,
  isBoardModRoute,
  isDirectoryBoard,
  isArchiveRoute,
  isLegacyBoardModQueueRoute,
  isPostRoute,
  isPendingPostRoute,
  isModQueueRoute,
  isValidBoardModRoute,
  isValidModRoute,
} from './lib/utils/route-utils';
import styles from './app.module.css';
import { DesktopBoardButtons, MobileAllFeedFilter, MobileBoardButtons } from './components/board-buttons';
import Board from './views/board';
import Blotter from './views/blotter';
import Catalog from './views/catalog';
import FAQ from './views/faq';
import Home from './views/home';
import Archive from './views/archive/archive';
import ModQueueView from './views/mod-queue';
import NotAllowed from './views/not-allowed';
import NotFound from './views/not-found';
import PendingPost from './views/pending-post';
import Post from './views/post';
import Rules from './views/rules';
import BoardHeader from './components/board-header';
import FeedCacheContainer from './components/feed-cache-container';
import PostForm from './components/post-form';
import BoardBlotter from './components/board-blotter';
import BoardsBar from './components/boards-bar';
import ExternalQuoteStatus from './components/external-quote-status/external-quote-status';

const AccountDataEditor = lazy(() => import('./views/account-data-editor'));
const BoardsBarEditModal = lazy(() => import('./components/boards-bar-edit-modal'));
const CreateBoardModal = lazy(() => import('./components/create-board-modal'));
const ChallengeModal = lazy(() => import('./components/challenge-modal'));
const DirectoryModal = lazy(() => import('./components/directory-modal'));
const DisclaimerModal = lazy(() => import('./components/disclaimer-modal'));
const ReplyModal = lazy(() => import('./components/reply-modal'));
const SettingsModal = lazy(() => import('./components/settings-modal'));

// Preload all theme assets (buttons, backgrounds) immediately on app load
// to prevent visible loading delays when switching themes
preloadThemeAssets();
preloadReplyModal();

const BoardLayout = () => {
  const params = useParams();
  const { accountCommentIndex, boardIdentifier, pageNumber } = params;
  const location = useLocation();
  const isMobile = useIsMobile();
  const isInAllView = isAllView(location.pathname);
  const isInSubscriptionsView = isSubscriptionsView(location.pathname, useParams());
  const isInModView = isModView(location.pathname);
  const directories = useDirectories();
  const communityAddress = boardIdentifier ? getSubplebbitAddress(boardIdentifier, directories) : undefined;
  const pendingPost = useSafeAccountComment({ commentIndex: accountCommentIndex });
  const pendingPostCommunityAddress = pendingPost?.communityAddress || pendingPost?.subplebbitAddress;
  const { closeCreateBoardModal } = useCreateBoardModalStore();
  const isOnPostRoute = isPostRoute(location.pathname);
  const isOnPendingPostRoute = isPendingPostRoute(location.pathname);
  const isOnModQueueRoute = isModQueueRoute(location.pathname);
  const isOnArchiveRoute = isArchiveRoute(location.pathname);
  const shouldRenderOutlet = isOnPostRoute || isOnPendingPostRoute || isOnModQueueRoute || isOnArchiveRoute;
  const isInCatalogView = isCatalogView(location.pathname, params);
  // Christmas theme
  const { isEnabled: isSpecialEnabled } = useSpecialThemeStore();
  useEffect(() => {
    if (isSpecialEnabled && !isMobile) {
      initSnow({ flakeCount: 150 });
    }
    return () => {
      removeSnow();
    };
  }, [isSpecialEnabled, isMobile]);

  // Close create board modal when navigating to a different page
  useEffect(() => {
    closeCreateBoardModal();
  }, [location.pathname, closeCreateBoardModal]);

  // force rerender of post form when navigating between pages, except when opening settings modal in current view
  const key = location.pathname.endsWith('/settings')
    ? `${communityAddress}-${location.pathname.replace(/\/settings$/, '')}`
    : `${communityAddress}-${location.pathname}`;

  if (pageNumber === '1') {
    return <Navigate to='/not-found' replace />;
  }

  // Invalid /mod/ paths (e.g. /mod/modqueue, /mod/asdoijasd) -> not-found
  if (location.pathname.startsWith('/mod/') && !isValidModRoute(location.pathname)) {
    return <Navigate to='/not-found' replace />;
  }

  if (isLegacyBoardModQueueRoute(location.pathname)) {
    return <Navigate to='/not-found' replace />;
  }

  // Invalid board-scoped mod paths (e.g. /biz/mod, /biz/mod/asdoijasd) -> not-found
  if (isBoardModRoute(location.pathname) && !isValidBoardModRoute(location.pathname)) {
    return <Navigate to='/not-found' replace />;
  }

  // Normalize address URLs to directory codes: /anime-and-manga.eth/thread/xxx -> /a/thread/xxx
  if (boardIdentifier && !isDirectoryBoard(boardIdentifier, directories)) {
    const canonicalBoardIdentifier = getBoardPath(boardIdentifier, directories);
    if (canonicalBoardIdentifier !== boardIdentifier) {
      const canonicalPath = location.pathname.replace(`/${boardIdentifier}`, `/${canonicalBoardIdentifier}`);
      return <Navigate to={canonicalPath + (location.search || '')} replace />;
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
          !isOnArchiveRoute && (
            <>
              <PostForm key={key} />
              {!(isInAllView || isInSubscriptionsView || isInModView) && !isOnModQueueRoute && <BoardBlotter />}
              <DesktopBoardButtons />
            </>
          )}
      <FeedCacheContainer />
      {shouldRenderOutlet && <Outlet />}
    </div>
  );
};

const GlobalLayout = () => {
  useTheme();

  const { activeCid, parentNumber, threadNumber, threadCid, subplebbitAddress: activeCommunityAddress, closeModal, showReplyModal, scrollY } = useReplyModalStore();

  const location = useLocation();
  const isInSettingsView = location.pathname.endsWith('/settings');

  return (
    <>
      <ExternalQuoteStatus />
      <Suspense fallback={null}>
        <ChallengeModal />
      </Suspense>
      {activeCid && threadCid && activeCommunityAddress && (
        <Suspense fallback={null}>
          <ReplyModal
            closeModal={closeModal}
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

/** Wraps Board with viewType/boardIdentifier derived from current route. Used when infinite scroll is OFF. */
const BoardFeedRoute = () => {
  const location = useLocation();
  const params = useParams();
  const viewType: 'all' | 'subs' | 'mod' | 'board' = isAllView(location.pathname)
    ? 'all'
    : isSubscriptionsView(location.pathname, params)
      ? 'subs'
      : isModView(location.pathname)
        ? 'mod'
        : 'board';
  return <Board viewType={viewType} boardIdentifier={params.boardIdentifier} />;
};

/** Wraps Catalog with viewType/boardIdentifier derived from current route. Used when infinite scroll is OFF. */
const CatalogFeedRoute = () => {
  const location = useLocation();
  const params = useParams();
  const viewType: 'all' | 'subs' | 'mod' | 'board' = isAllView(location.pathname)
    ? 'all'
    : isSubscriptionsView(location.pathname, params)
      ? 'subs'
      : isModView(location.pathname)
        ? 'mod'
        : 'board';
  return <Catalog viewType={viewType} boardIdentifier={params.boardIdentifier} />;
};

const ModQueueRoute = () => {
  const { boardIdentifier } = useParams();
  const account = useAccount();
  const accountAddress = account?.author?.address;
  const communityAddress = useResolvedCommunityAddress();
  const community = useCommunity({ communityAddress });
  const accountCommunityAddresses = useAccountCommunityAddresses();

  if (!account) {
    return null;
  }

  if (!accountAddress) {
    return <Navigate to='/not-allowed' replace />;
  }

  if (!boardIdentifier) {
    return accountCommunityAddresses.length > 0 ? <ModQueueView /> : <Navigate to='/not-allowed' replace />;
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
  // Feed routes are always rendered by FeedCacheContainer (Virtuoso used for all modes)
  const boardFeedElement = null;
  const catalogFeedElement = null;

  return (
    <div className={styles.app}>
      <Routes>
        <Route element={<GlobalLayout />}>
          <Route path='/' element={<Home />} />
          <Route path='/faq' element={<FAQ />} />
          <Route path='/rules/:boardIdentifier?' element={<Rules />} />
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
            {/* Canonical multiboard routes (no time filter) */}
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

            {/* Invalid subpaths: old URLs and unknown paths -> not-found */}
            <Route path='/mod/modqueue' element={<Navigate to='/not-found' replace />} />
            <Route path='/mod/modqueue/settings' element={<Navigate to='/not-found' replace />} />
            <Route path='/all/*' element={<Navigate to='/not-found' replace />} />
            <Route path='/subs/*' element={<Navigate to='/not-found' replace />} />
            <Route path='/mod/*' element={<Navigate to='/not-found' replace />} />

            <Route path='/:boardIdentifier/:pageNumber' element={boardFeedElement} />
            <Route path='/:boardIdentifier/:pageNumber/settings' element={boardFeedElement} />
            <Route path='/:boardIdentifier' element={boardFeedElement} />
            <Route path='/:boardIdentifier/settings' element={boardFeedElement} />
            <Route path='/:boardIdentifier/catalog' element={catalogFeedElement} />
            <Route path='/:boardIdentifier/catalog/settings' element={catalogFeedElement} />
            <Route path='/:boardIdentifier/archive' element={<Archive />} />
            <Route path='/:boardIdentifier/archive/settings' element={<Archive />} />

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
