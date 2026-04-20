/// <reference lib="webworker" />
/* eslint-disable no-restricted-globals */

import { clientsClaim } from 'workbox-core';
import { ExpirationPlugin } from 'workbox-expiration';
import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { NetworkFirst, StaleWhileRevalidate } from 'workbox-strategies';

declare const self: ServiceWorkerGlobalScope;

const precacheEntries = self.__WB_MANIFEST.filter((entry) => (typeof entry === 'string' ? entry !== 'index.html' : entry.url !== 'index.html'));
const runtimeAssetDestinations = new Set<RequestDestination>(['font', 'image', 'manifest', 'script', 'style']);
const scopeRoot = self.registration.scope.endsWith('/') ? self.registration.scope : `${self.registration.scope}/`;
const scopePath = (path: string) => new URL(path, scopeRoot).pathname;
const apiPath = scopePath('api');
const apiPathPrefix = scopePath('api/');
const internalPathPrefix = scopePath('_(');
const runtimeAssetPathPrefixes = ['assets/', 'translations/'].map(scopePath);
const isApiPath = (pathname: string) => pathname === apiPath || pathname.startsWith(apiPathPrefix);

// Precache revisioned assets, but let navigations fetch fresh HTML first.
cleanupOutdatedCaches();
precacheAndRoute(precacheEntries);

registerRoute(
  ({ request, url }) => request.mode === 'navigate' && !isApiPath(url.pathname) && !url.pathname.startsWith(internalPathPrefix),
  new NetworkFirst({
    cacheName: 'html-cache',
    networkTimeoutSeconds: 3,
  }),
);

registerRoute(
  ({ request, url }) =>
    url.origin === self.location.origin &&
    (runtimeAssetDestinations.has(request.destination) || runtimeAssetPathPrefixes.some((prefix) => url.pathname.startsWith(prefix))),
  new StaleWhileRevalidate({
    cacheName: 'runtime-static-assets',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 200,
        maxAgeSeconds: 60 * 60 * 24 * 30,
        purgeOnQuotaError: true,
      }),
    ],
  }),
);

// Standard SW lifecycle methods
self.skipWaiting();
clientsClaim();
