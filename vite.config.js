import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { readFileSync } from 'fs';
import { createHash } from 'crypto';
import { execFileSync } from 'child_process';
import { VitePWA } from 'vite-plugin-pwa';

const { version: packageVersion } = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));
const appVersion = `${process.env.VITE_APP_VERSION || packageVersion}`.trim() || packageVersion;
process.env.VITE_APP_VERSION = appVersion;
const releaseTag = `v${appVersion.replace(/^v/i, '').split('-')[0]}`;
const publicBase = process.env.PUBLIC_URL || '/';
const buildOutDir = 'build';
const basePathPrefix = (() => {
  const pathname = new URL(publicBase, 'https://example.invalid/').pathname;
  return pathname === '/' ? '' : pathname.replace(/^\/+|\/+$/g, '');
})();
const devServerHmr = (() => {
  if (!process.env.PORTLESS_URL) {
    return { overlay: false };
  }

  try {
    const url = new URL(process.env.PORTLESS_URL);
    const isHttps = url.protocol === 'https:';

    return {
      overlay: false,
      protocol: isHttps ? 'wss' : 'ws',
      host: url.hostname,
      clientPort: Number(url.port || (isHttps ? 443 : 80)),
    };
  } catch {
    return { overlay: false };
  }
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

function readGitRef(args) {
  try {
    return execFileSync('git', args, {
      cwd: new URL('.', import.meta.url),
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
      timeout: 5000,
    }).trim();
  } catch {
    return '';
  }
}

function firstNonEmpty(...values) {
  return values.map((value) => `${value || ''}`.trim()).find(Boolean) || '';
}

function normalizeCommitRef(ref) {
  return `${ref || ''}`.trim().toLowerCase();
}

function isSameCommitRef(left, right) {
  const normalizedLeft = normalizeCommitRef(left);
  const normalizedRight = normalizeCommitRef(right);

  if (!normalizedLeft || !normalizedRight) {
    return false;
  }

  return normalizedLeft === normalizedRight || normalizedLeft.startsWith(normalizedRight) || normalizedRight.startsWith(normalizedLeft);
}

function readRemoteTagCommitRef(tagName) {
  const tagRef = `refs/tags/${tagName}`;
  const output = readGitRef(['ls-remote', '--tags', 'origin', tagRef, `${tagRef}^{}`]);
  const lines = output
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
  const releaseLine = lines.find((line) => line.endsWith(`${tagRef}^{}`)) || lines.find((line) => line.endsWith(tagRef)) || '';

  return releaseLine.split(/\s+/)[0] || '';
}

function resolveBuildCommitRef() {
  return firstNonEmpty(process.env.VITE_COMMIT_REF, process.env.VERCEL_GIT_COMMIT_SHA, process.env.GITHUB_SHA, process.env.COMMIT_REF, readGitRef(['rev-parse', 'HEAD']));
}

function resolveReleaseCommitRef() {
  const configuredReleaseCommitRef = firstNonEmpty(process.env.VITE_LATEST_RELEASE_COMMIT_REF, process.env.LATEST_RELEASE_COMMIT_REF);

  if (configuredReleaseCommitRef) {
    return configuredReleaseCommitRef;
  }

  if (process.env.GITHUB_REF_NAME === releaseTag) {
    return resolveBuildCommitRef();
  }

  const localReleaseCommitRef = readGitRef(['rev-list', '-n', '1', releaseTag]);

  return localReleaseCommitRef || readRemoteTagCommitRef(releaseTag);
}

const buildCommitRef = resolveBuildCommitRef();
const releaseCommitRef = resolveReleaseCommitRef();
const displayCommitRef = buildCommitRef && !isSameCommitRef(buildCommitRef, releaseCommitRef) ? buildCommitRef : '';

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
  const payload = `${JSON.stringify({
    version: appVersion,
    commitRef: buildCommitRef || undefined,
    releaseCommitRef: releaseCommitRef || undefined,
  })}\n`;

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

function getVercelContentSecurityPolicy() {
  const vercelConfig = JSON.parse(readFileSync(new URL('./vercel.json', import.meta.url), 'utf8'));
  const cspHeader = vercelConfig.headers
    ?.flatMap((entry) => entry.headers || [])
    .find((header) => typeof header.key === 'string' && header.key.toLowerCase() === 'content-security-policy');

  if (typeof cspHeader?.value !== 'string') {
    throw new Error('vercel.json is missing a Content-Security-Policy header.');
  }

  return cspHeader.value;
}

function getInlineScriptHashes(indexHtml) {
  const scriptPattern = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
  const hashes = [];

  for (const [, attributes, source] of indexHtml.matchAll(scriptPattern)) {
    if (/\bsrc\s*=/i.test(attributes) || source.trim().length === 0) {
      continue;
    }

    hashes.push(`sha256-${createHash('sha256').update(source).digest('base64')}`);
  }

  return [...new Set(hashes)];
}

function verifyVercelCspHashesPlugin() {
  return {
    name: 'fivechan-verify-vercel-csp-hashes',
    apply: 'build',
    enforce: 'post',
    closeBundle() {
      const indexHtml = readFileSync(new URL(`./${buildOutDir}/index.html`, import.meta.url), 'utf8');
      const contentSecurityPolicy = getVercelContentSecurityPolicy();
      const missingHashes = getInlineScriptHashes(indexHtml).filter(
        (hash) => !contentSecurityPolicy.includes(`'${hash}'`) && !contentSecurityPolicy.includes(hash),
      );

      if (missingHashes.length > 0) {
        const plural = missingHashes.length === 1 ? '' : 'es';

        throw new Error(`vercel.json Content-Security-Policy is missing inline script hash${plural}: ${missingHashes.join(', ')}`);
      }
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
    verifyVercelCspHashesPlugin(),
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
    hmr: devServerHmr,
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
    'import.meta.env.VITE_APP_VERSION': JSON.stringify(appVersion),
    'import.meta.env.VITE_COMMIT_REF': JSON.stringify(displayCommitRef),
    'process.version': JSON.stringify(''),
    global: 'globalThis',
    __dirname: '""',
  },
});
