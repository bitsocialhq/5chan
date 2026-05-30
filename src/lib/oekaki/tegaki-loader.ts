import { resolveAssetUrl } from '../utils/preload-utils';

export const TEGAKI_DRAWING_FILE_NAME = 'tegaki.png';

interface TegakiOpenOptions {
  width: number;
  height: number;
  saveReplay: boolean;
  onDone: () => void;
  onCancel: () => void;
}

export interface TegakiGlobal {
  open: (options: TegakiOpenOptions) => void;
  flatten: () => HTMLCanvasElement;
  onOpenImageLoaded?: (this: HTMLImageElement) => void;
}

declare global {
  interface Window {
    Tegaki?: TegakiGlobal;
  }
}

const TEGAKI_ASSET_BASE = 'vendor/tegaki/0.9.4';
const TEGAKI_SCRIPT_URL = resolveAssetUrl(`${TEGAKI_ASSET_BASE}/tegaki.min.js`);
const TEGAKI_STYLESHEET_URL = resolveAssetUrl(`${TEGAKI_ASSET_BASE}/tegaki.css`);

let tegakiLoadPromise: Promise<TegakiGlobal> | null = null;

const ensureTegakiStylesheet = (): void => {
  if (document.querySelector('link[data-tegaki-oekaki="stylesheet"]')) {
    return;
  }

  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = TEGAKI_STYLESHEET_URL;
  link.dataset.tegakiOekaki = 'stylesheet';
  document.head.appendChild(link);
};

const loadTegakiScript = (): Promise<TegakiGlobal> =>
  new Promise((resolve, reject) => {
    if (window.Tegaki) {
      resolve(window.Tegaki);
      return;
    }

    const existingScript = document.querySelector<HTMLScriptElement>('script[data-tegaki-oekaki="script"]');
    if (existingScript) {
      if (window.Tegaki) {
        resolve(window.Tegaki);
        return;
      }
      if (existingScript.dataset.failed === 'true') {
        existingScript.remove();
      } else {
        const readyState = (existingScript as HTMLScriptElement & { readyState?: string }).readyState;
        if (existingScript.dataset.loaded === 'true' || readyState === 'complete' || readyState === 'loaded') {
          reject(new Error('Tegaki did not initialize'));
          return;
        }
        existingScript.addEventListener('load', () => (window.Tegaki ? resolve(window.Tegaki) : reject(new Error('Tegaki did not initialize'))), { once: true });
        existingScript.addEventListener('error', () => reject(new Error('Failed to load Tegaki')), { once: true });
        return;
      }
    }

    const script = document.createElement('script');
    script.src = TEGAKI_SCRIPT_URL;
    script.async = true;
    script.dataset.tegakiOekaki = 'script';
    script.onload = () => {
      script.dataset.loaded = 'true';
      if (window.Tegaki) {
        resolve(window.Tegaki);
        return;
      }
      reject(new Error('Tegaki did not initialize'));
    };
    script.onerror = () => {
      script.dataset.failed = 'true';
      script.remove();
      reject(new Error('Failed to load Tegaki'));
    };
    document.head.appendChild(script);
  });

export const loadTegaki = (): Promise<TegakiGlobal> => {
  if (window.Tegaki) {
    ensureTegakiStylesheet();
    return Promise.resolve(window.Tegaki);
  }

  if (!tegakiLoadPromise) {
    ensureTegakiStylesheet();
    tegakiLoadPromise = loadTegakiScript().catch((error) => {
      tegakiLoadPromise = null;
      throw error;
    });
  }

  return tegakiLoadPromise;
};
