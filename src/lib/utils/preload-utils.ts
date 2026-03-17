import { THEME_BUTTON_IMAGES, THEME_BACKGROUND_IMAGES } from '../../generated/asset-manifest';

export const resolveAssetUrl = (path: string, baseUrl = import.meta.env.BASE_URL): string => `${baseUrl}${path}`;

/**
 * Preloads an array of image URLs by creating Image objects.
 * Images are loaded in the background and cached by the browser.
 */
const preloadImages = (imagePaths: readonly string[]): void => {
  imagePaths.forEach((path) => {
    const img = new Image();
    img.src = resolveAssetUrl(path);
  });
};

/**
 * Preloads all theme-related assets (buttons, backgrounds) on app startup.
 * This prevents visible loading delays when switching themes.
 */
export const preloadThemeAssets = (): void => {
  preloadImages(THEME_BUTTON_IMAGES);
  preloadImages(THEME_BACKGROUND_IMAGES);
};

const scheduleIdlePreload = (callback: () => void): void => {
  if (typeof globalThis === 'undefined') {
    callback();
    return;
  }

  const requestIdle = (
    globalThis as typeof globalThis & {
      requestIdleCallback?: (callback: IdleRequestCallback, options?: IdleRequestOptions) => number;
    }
  ).requestIdleCallback;

  if (typeof requestIdle === 'function') {
    requestIdle(() => callback(), { timeout: 1500 });
    return;
  }

  globalThis.setTimeout(callback, 500);
};

/**
 * Preloads the reply modal chunk during idle time so the first `No.` click
 * doesn't have to wait for the lazy import to resolve.
 */
export const preloadReplyModal = (): void => {
  scheduleIdlePreload(() => {
    void import('../../components/reply-modal');
  });
};
