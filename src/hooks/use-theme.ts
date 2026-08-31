import { useCallback, useEffect, useMemo } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import { useAccountComment } from '@bitsocial/bitsocial-react-hooks';
import { isAllView, isModView, isNotFoundView, isSearchView, isSubscriptionsView } from '../lib/utils/view-utils';
import useThemeStore from '../stores/use-theme-store';
import { useDirectories } from './use-directories';
import { useResolvedCommunityAddress } from './use-resolved-community-address';
import useSpecialThemeStore from '../stores/use-special-theme-store';
import { getActiveSpecialTheme, getSpecialThemeClass } from '../lib/utils/time-utils';
import { getSpecialBoardByAddress } from '../lib/special-boards';
import { isSfwBoard, updateFavicon } from '../lib/update-favicon';
import { getCommentCommunityAddress } from '../lib/utils/comment-utils';
import { normalizeAccountCommentIndex } from '../lib/utils/account-comment-index-utils';
import { getPendingPostRoutePost } from '../lib/utils/pending-post-route-state';
import { deriveCommunityNsfw } from '../lib/utils/directory-list-utils';
import { useCommunityField } from './use-stable-community';

const themeClasses = ['yotsuba', 'yotsuba-b', 'futaba', 'burichan', 'tomorrow', 'photon', 'spooky'];

type UseThemeOptions = {
  applyDocumentEffects?: boolean;
};

const updateThemeClass = (newTheme: string) => {
  document.body.classList.remove(...themeClasses);
  if (newTheme) {
    document.body.classList.add(newTheme);
  }
};

const useTheme = ({ applyDocumentEffects = false }: UseThemeOptions = {}): [string, (theme: string) => void] => {
  const location = useLocation();
  const params = useParams<{ accountCommentIndex?: string; boardIdentifier?: string; commentCid?: string }>();
  const pendingPost = useAccountComment({ commentIndex: normalizeAccountCommentIndex(params?.accountCommentIndex) });
  const pendingPostCommunityAddress = getCommentCommunityAddress(pendingPost);
  const routePendingPostCommunityAddress = getCommentCommunityAddress(getPendingPostRoutePost(location.state));

  const { isEnabled, setIsEnabled } = useSpecialThemeStore();

  const setThemeStore = useThemeStore((state) => state.setTheme);
  const themes = useThemeStore((state) => state.themes);
  const directories = useDirectories();

  const isInAllView = isAllView(location.pathname);
  const isInSubscriptionsView = isSubscriptionsView(location.pathname, params);
  const isInModView = isModView(location.pathname);
  const isInNotFoundView = isNotFoundView(location.pathname, params);
  // Search spans every board, so it shares the theme of the other multiboard views.
  const isMultiboardView = isInAllView || isInSubscriptionsView || isInModView || isSearchView(location.pathname);
  const routeIdentifier = params.boardIdentifier;
  const resolvedAddress = useResolvedCommunityAddress();
  const communityAddress = resolvedAddress || pendingPostCommunityAddress || routePendingPostCommunityAddress || routeIdentifier;
  const activeSpecialTheme = getActiveSpecialTheme();

  // Select the primitive rather than the whole `features` object: pkc-js replaces the community on
  // every loading tick, so subscribing to an object would rerender the app shell on each one.
  const liveSafeForWork = useCommunityField(communityAddress, (community) => community?.features?.safeForWork);
  const directoryEntry = communityAddress ? directories.find((entry) => entry.address === communityAddress) : undefined;
  const communityNsfw = deriveCommunityNsfw({ features: { safeForWork: liveSafeForWork } }, directoryEntry);

  useEffect(() => {
    if (activeSpecialTheme && isEnabled === null && communityAddress && !isInAllView && !isInSubscriptionsView && !isInModView) {
      setIsEnabled(true);
    } else if (!activeSpecialTheme && isEnabled) {
      setIsEnabled(false);
    }
  }, [activeSpecialTheme, isEnabled, setIsEnabled, communityAddress, isInAllView, isInSubscriptionsView, isInModView]);

  const currentTheme = useMemo(() => {
    if (location.pathname === '/') {
      return 'yotsuba';
    }

    if (location.pathname.startsWith('/rules')) {
      return 'yotsuba';
    }

    if (isEnabled && activeSpecialTheme) {
      return getSpecialThemeClass(activeSpecialTheme);
    }

    let storedTheme = null;
    if (isMultiboardView) {
      storedTheme = themes.nsfw;
    } else if (communityAddress) {
      const specialBoard = getSpecialBoardByAddress(communityAddress);
      if (communityNsfw || specialBoard?.nsfw) {
        storedTheme = themes.nsfw;
      } else {
        storedTheme = themes.sfw;
      }
    }

    return storedTheme || 'yotsuba';
  }, [location.pathname, isEnabled, activeSpecialTheme, isMultiboardView, communityAddress, communityNsfw, themes]);

  const sfw = isSfwBoard({
    pathname: location.pathname,
    isSpecialTheme: !!isEnabled,
    isInAllView,
    isInSubscriptionsView,
    isInModView,
    communityAddress,
    communityNsfw,
    directories,
  });

  useEffect(() => {
    if (!applyDocumentEffects) return;
    updateThemeClass(currentTheme);
  }, [applyDocumentEffects, currentTheme]);

  useEffect(() => {
    if (!applyDocumentEffects) return;
    const faviconVariant = isInNotFoundView ? 'not-found' : sfw ? 'sfw' : 'default';
    updateFavicon(faviconVariant);
  }, [applyDocumentEffects, isInNotFoundView, sfw]);

  const setCommunityTheme = useCallback(
    async (newTheme: string) => {
      if (isMultiboardView) {
        await setThemeStore('nsfw', newTheme);
      } else if (communityAddress) {
        const specialBoard = getSpecialBoardByAddress(communityAddress);
        if (communityNsfw || specialBoard?.nsfw) {
          await setThemeStore('nsfw', newTheme);
        } else {
          await setThemeStore('sfw', newTheme);
        }
      }
    },
    [isMultiboardView, communityAddress, communityNsfw, setThemeStore],
  );

  return [currentTheme, setCommunityTheme];
};

export default useTheme;
