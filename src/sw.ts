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

// Precache revisioned assets, but let navigations fetch fresh HTML first.
cleanupOutdatedCaches();
precacheAndRoute(precacheEntries);

registerRoute(
  ({ request, url }) => request.mode === 'navigate' && !url.pathname.startsWith('/api') && !/^\/_\(.*\)/.test(url.pathname),
  new NetworkFirst({
    cacheName: 'html-cache',
    networkTimeoutSeconds: 3,
  }),
);

registerRoute(
  ({ request, url }) =>
    url.origin === self.location.origin &&
    (runtimeAssetDestinations.has(request.destination) || url.pathname.startsWith('/assets/') || url.pathname.startsWith('/translations/')),
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
