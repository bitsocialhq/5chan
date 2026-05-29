import { useCallback, useEffect, useMemo } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import { isAllView, isModView, isSubscriptionsView } from '../lib/utils/view-utils';
import useThemeStore from '../stores/use-theme-store';
import { useDirectories } from './use-directories';
import { useResolvedCommunityAddress } from './use-resolved-community-address';
import useSpecialThemeStore from '../stores/use-special-theme-store';
import { getActiveSpecialTheme, getSpecialThemeClass } from '../lib/utils/time-utils';
import { isSfwBoard, updateFavicon } from '../lib/update-favicon';
import useSafeAccountComment from './use-safe-account-comment';
import { getCommentCommunityAddress } from '../lib/utils/comment-utils';

const themeClasses = ['yotsuba', 'yotsuba-b', 'futaba', 'burichan', 'tomorrow', 'photon', 'spooky'];

const updateThemeClass = (newTheme: string) => {
  document.body.classList.remove(...themeClasses);
  if (newTheme) {
    document.body.classList.add(newTheme);
  }
};

const useTheme = (): [string, (theme: string) => void] => {
  const location = useLocation();
  const params = useParams<{ boardIdentifier?: string }>();
  const pendingPostParams = useParams<{ accountCommentIndex?: string }>();
  const pendingPostCommentIndex = pendingPostParams?.accountCommentIndex ? parseInt(pendingPostParams.accountCommentIndex, 10) : undefined;
  const pendingPost = useSafeAccountComment({ commentIndex: pendingPostCommentIndex });
  const pendingPostCommunityAddress = getCommentCommunityAddress(pendingPost);

  const { isEnabled, setIsEnabled } = useSpecialThemeStore();

  const setThemeStore = useThemeStore((state) => state.setTheme);
  const themes = useThemeStore((state) => state.themes);
  const directories = useDirectories();

  const isInAllView = isAllView(location.pathname);
  const isInSubscriptionsView = isSubscriptionsView(location.pathname, params);
  const isInModView = isModView(location.pathname);
  const routeIdentifier = params.boardIdentifier;
  const resolvedAddress = useResolvedCommunityAddress();
  const communityAddress = resolvedAddress || pendingPostCommunityAddress || routeIdentifier;
  const activeSpecialTheme = getActiveSpecialTheme();

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
    if (isInAllView || isInSubscriptionsView || isInModView) {
      storedTheme = themes.nsfw;
    } else if (communityAddress) {
      const community = directories.find((entry) => entry.address === communityAddress);
      if (community?.nsfw) {
        storedTheme = themes.nsfw;
      } else {
        storedTheme = themes.sfw;
      }
    }

    return storedTheme || 'yotsuba';
  }, [location.pathname, isEnabled, activeSpecialTheme, isInAllView, isInSubscriptionsView, isInModView, communityAddress, directories, themes]);

  const sfw = isSfwBoard({
    pathname: location.pathname,
    isSpecialTheme: !!isEnabled,
    isInAllView,
    isInSubscriptionsView,
    isInModView,
    communityAddress,
    directories,
  });

  useEffect(() => {
    updateThemeClass(currentTheme);
  }, [currentTheme]);

  useEffect(() => {
    updateFavicon(sfw);
  }, [sfw]);

  const setCommunityTheme = useCallback(
    async (newTheme: string) => {
      if (isInAllView || isInSubscriptionsView || isInModView) {
        await setThemeStore('nsfw', newTheme);
      } else if (communityAddress) {
        const community = directories.find((entry) => entry.address === communityAddress);
        if (community?.nsfw) {
          await setThemeStore('nsfw', newTheme);
        } else {
          await setThemeStore('sfw', newTheme);
        }
      }
    },
    [isInAllView, isInSubscriptionsView, isInModView, communityAddress, directories, setThemeStore],
  );

  return [currentTheme, setCommunityTheme];
};

export default useTheme;
