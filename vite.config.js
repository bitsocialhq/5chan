import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { readFileSync } from 'fs';
import { VitePWA } from 'vite-plugin-pwa';

const { version: packageVersion } = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));
const appVersion = `${process.env.VITE_APP_VERSION || packageVersion}`.trim() || packageVersion;
const publicBase = process.env.PUBLIC_URL || '/';
const buildOutDir = 'build';
const basePathPrefix = (() => {
  const pathname = new URL(publicBase, 'https://example.invalid/').pathname;
  return pathname === '/' ? '' : pathname.replace(/^\/+|\/+$/g, '');
})();
const neverPrecacheUrls = new Set(['index.html', 'version.json']);
const vitePwaManagedAssetUrls = new Set([
  'manifest.webmanifest',
  'favicon.ico',
  'favicon2.ico',
  'robots.txt',
  'apple-touch-icon.png',
  'manifest-icon-192x192.png',
  'manifest-icon-512x512.png',
]);
const baselineAppShellUrls = new Set([
  'registerSW.js',
  'manifest.json',
  'manifest.webmanifest',
  'favicon.ico',
  'favicon2.ico',
  'robots.txt',
  'apple-touch-icon.png',
  'manifest-icon-192x192.png',
  'manifest-icon-512x512.png',
]);

function normalizePrecacheUrl(url) {
  const normalizedUrl = url.split('?')[0].replace(/^[./]+/, '');

  if (basePathPrefix && normalizedUrl.startsWith(`${basePathPrefix}/`)) {
    return normalizedUrl.slice(basePathPrefix.length + 1);
  }

  return normalizedUrl;
}

function collectIndexAssetUrls() {
  const indexHtml = readFileSync(new URL(`./${buildOutDir}/index.html`, import.meta.url), 'utf8');
  const urls = new Set(baselineAppShellUrls);
  const assetAttributePattern = /\b(?:href|src)=["'](?:\.\/|\/)?([^"']+\.(?:css|ico|js|json|png|webmanifest))(?:\?[^"']*)?["']/g;

  for (const match of indexHtml.matchAll(assetAttributePattern)) {
    urls.add(normalizePrecacheUrl(match[1]));
  }

  return urls;
}

function keepAppShellPrecacheOnly(manifestEntries) {
  const appShellUrls = collectIndexAssetUrls();
  const manifest = manifestEntries.filter((entry) => {
    const normalizedUrl = normalizePrecacheUrl(entry.url);

    if (neverPrecacheUrls.has(normalizedUrl)) {
      return false;
    }

    if (vitePwaManagedAssetUrls.has(normalizedUrl)) {
      return false;
    }

    return appShellUrls.has(normalizedUrl);
  });

  return { manifest };
}

function appVersionMetadataPlugin() {
  const payload = `${JSON.stringify({ version: appVersion })}\n`;

  return {
    name: 'fivechan-version-metadata',
    configureServer(server) {
      server.middlewares.use('/version.json', (_req, res) => {
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.end(payload);
      });
    },
    generateBundle() {
      this.emitFile({
        type: 'asset',
        fileName: 'version.json',
        source: payload,
      });
    },
  };
}

function adaptReactPluginForRolldown(plugin) {
  if (!plugin?.config || plugin.name !== 'vite:react-babel') {
    return plugin;
  }

  return {
    ...plugin,
    async config(userConfig, configEnv) {
      const config = await plugin.config.call(this, userConfig, configEnv);
      const optimizeDeps = config?.optimizeDeps;

      if (optimizeDeps?.esbuildOptions?.jsx !== 'automatic') {
        return config;
      }

      const { esbuildOptions, ...remainingOptimizeDeps } = optimizeDeps;

      return {
        ...config,
        optimizeDeps: {
          ...remainingOptimizeDeps,
          rolldownOptions: {
            ...optimizeDeps.rolldownOptions,
            transform: {
              ...optimizeDeps.rolldownOptions?.transform,
              jsx: optimizeDeps.rolldownOptions?.transform?.jsx ?? {
                runtime: 'automatic',
              },
            },
          },
        },
      };
    },
  };
}

export default defineConfig({
  plugins: [
    appVersionMetadataPlugin(),
    ...react({
      babel: {
        plugins: [
          [
            'babel-plugin-react-compiler',
            {
              verbose: true,
            },
          ],
        ],
      },
    }).map(adaptReactPluginForRolldown),
    VitePWA({
      registerType: 'autoUpdate',
      strategies: 'injectManifest',
      injectManifest: {
        maximumFileSizeToCacheInBytes: 20000000,
        globPatterns: ['**/*.{css,html,ico,js,json,png,webmanifest}'],
        manifestTransforms: [keepAppShellPrecacheOnly],
      },
      srcDir: 'src',
      filename: 'sw.ts',
      devOptions: {
        enabled: true,
        type: 'module',
      },
      includeAssets: ['favicon.ico', 'favicon2.ico', 'robots.txt', 'apple-touch-icon.png'],
      manifest: {
        name: '5chan',
        short_name: '5chan',
        description: 'A serverless, adminless, decentralized imageboard',
        theme_color: '#ffffff',
        background_color: '#ffffee',
        display: 'standalone',
        icons: [
          {
            src: 'manifest-icon-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'manifest-icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: 'manifest-icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        clientsClaim: true,
        skipWaiting: true,
        cleanupOutdatedCaches: true,
        navigateFallback: 'index.html',
        navigateFallbackDenylist: [/^\/api/, /^\/_\(.*\)/],
        maximumFileSizeToCacheInBytes: 6000000,
        runtimeCaching: [
          // PNG caching
          {
            urlPattern: ({ url }) => url.pathname.endsWith('.png'),
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'images',
              expiration: {
                maxEntries: 50,
              },
            },
          },
          // Add additional asset caching
          {
            urlPattern: /\.(?:js|css|woff2?|svg|gif|jpg|jpeg)$/,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'assets-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
              },
            },
          },
          // Google Fonts caching
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365, // 365 days
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-webfonts',
              expiration: {
                maxEntries: 30,
                maxAgeSeconds: 60 * 60 * 24 * 365, // 365 days
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      'node-fetch': 'isomorphic-fetch',
      assert: 'assert',
      stream: 'stream-browserify',
      crypto: 'crypto-browserify',
      buffer: 'buffer',
      events: 'events',
      process: 'process',
      'node:buffer': 'buffer',
      'node:crypto': 'crypto-browserify',
      'node:events': 'events',
      'node:process': 'process',
      'node:stream': 'stream-browserify',
      'node:util': 'util/',
      'util/': 'util/',
      util: 'util/',
    },
  },
  server: {
    port: 3000,
    open: process.env.PORTLESS_URL ? false : true,
    watch: {
      usePolling: true,
    },
    hmr: {
      overlay: false,
    },
  },
  build: {
    // Use 'build' to match what electron/main.js expects (../build/index.html)
    outDir: buildOutDir,
    emptyOutDir: true,
    sourcemap: process.env.GENERATE_SOURCEMAP === 'true',
    target: process.env.ELECTRON ? 'electron-renderer' : 'esnext',
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (/[\\/]node_modules[\\/](@pkcprotocol[\\/]pkc-js)[\\/]/.test(id)) {
            return 'pkc-js';
          }
          if (/[\\/]node_modules[\\/](@bitsocialnet[\\/]bitsocial-react-hooks)[\\/]/.test(id)) {
            return 'bitsocial-react-hooks';
          }
          if (/[\\/]node_modules[\\/](@react-spring|@use-gesture)[\\/]/.test(id)) {
            return 'spring-gesture';
          }
          if (/[\\/]node_modules[\\/](react|react-dom|react-router-dom|react-i18next|i18next|i18next-browser-languagedetector|i18next-http-backend)[\\/]/.test(id)) {
            return 'vendor';
          }
          if (/[\\/]node_modules[\\/](react-markdown|remark-|rehype-|unified|micromark|mdast|hast|unist)[\\/]/.test(id)) {
            return 'markdown';
          }
          if (/[\\/]node_modules[\\/](react-virtuoso)[\\/]/.test(id)) {
            return 'virtuoso';
          }
          if (/[\\/]node_modules[\\/](@floating-ui)[\\/]/.test(id)) {
            return 'floating-ui';
          }
        },
      },
    },
  },
  base: publicBase,
  optimizeDeps: {
    include: ['ethers', 'assert', 'buffer', 'process', 'util', 'stream-browserify', 'isomorphic-fetch', 'workbox-core', 'workbox-precaching'],
  },
  define: {
    'process.env.VITE_COMMIT_REF': JSON.stringify(process.env.COMMIT_REF),
    'process.version': JSON.stringify(''),
    global: 'globalThis',
    __dirname: '""',
  },
});
