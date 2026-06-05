import { create, StoreApi } from 'zustand';
import localForageLru from '@bitsocial/bitsocial-react-hooks/dist/lib/localforage-lru/index.js';

interface ThemeState {
  themes: {
    nsfw: string;
    sfw: string;
  };
  currentTheme: string | null;
  setTheme: (category: keyof ThemeState['themes'], theme: string) => void;
  getTheme: (category: keyof ThemeState['themes'], updateCurrentTheme?: boolean) => string | null;
  loadThemes: () => Promise<void>;
}

const DEFAULT_THEMES: ThemeState['themes'] = {
  nsfw: 'yotsuba',
  sfw: 'yotsuba-b',
};

// Synchronous localStorage mirror of the persisted themes. The canonical store is
// localForage (IndexedDB) below, but reads from it are async, so on a hard refresh the
// first render would fall back to DEFAULT_THEMES and flash the default theme before the
// saved one loads. Seeding the initial state from localStorage (read synchronously) lets
// the very first render use the saved theme, eliminating that flash.
const LOCALSTORAGE_KEY = '5chan-themes';

const readThemesFromLocalStorage = (): ThemeState['themes'] => {
  try {
    const stored = localStorage.getItem(LOCALSTORAGE_KEY);
    if (!stored) {
      return { ...DEFAULT_THEMES };
    }
    const parsed = JSON.parse(stored) as Partial<ThemeState['themes']>;
    return {
      nsfw: typeof parsed?.nsfw === 'string' && parsed.nsfw ? parsed.nsfw : DEFAULT_THEMES.nsfw,
      sfw: typeof parsed?.sfw === 'string' && parsed.sfw ? parsed.sfw : DEFAULT_THEMES.sfw,
    };
  } catch {
    return { ...DEFAULT_THEMES };
  }
};

const writeThemesToLocalStorage = (themes: ThemeState['themes']) => {
  try {
    localStorage.setItem(LOCALSTORAGE_KEY, JSON.stringify(themes));
  } catch (error) {
    console.warn('Failed to save themes to localStorage:', error);
  }
};

const themeStore = localForageLru.createInstance({
  name: 'themeStore',
  size: 1000,
});

const useThemeStore = create<ThemeState>((set: StoreApi<ThemeState>['setState'], get: StoreApi<ThemeState>['getState']) => ({
  themes: readThemesFromLocalStorage(),
  currentTheme: null,
  setTheme: async (category, theme) => {
    const currentThemes = get().themes;
    const updatedThemes = { ...currentThemes, [category]: theme };
    await themeStore.setItem(category, theme);
    writeThemesToLocalStorage(updatedThemes);
    set({ themes: updatedThemes, currentTheme: theme });
  },
  getTheme: (category, updateCurrentTheme = true) => {
    const currentThemes = get().themes;
    const theme = currentThemes[category] || null;
    if (updateCurrentTheme) {
      set({ currentTheme: theme });
    }
    return theme;
  },
  loadThemes: async () => {
    const entries: [keyof ThemeState['themes'], string][] = await themeStore.entries();
    const themes: Record<keyof ThemeState['themes'], string> = { ...DEFAULT_THEMES };
    entries.forEach(([key, value]) => {
      themes[key] = value;
    });
    // Mirror the canonical localForage values into the synchronous localStorage cache so the
    // next hard refresh can read the saved theme on the first render (migrates existing users).
    writeThemesToLocalStorage(themes);
    set({ themes, currentTheme: null });
  },
}));

// Load themes on store initialization
useThemeStore.getState().loadThemes();

export default useThemeStore;
