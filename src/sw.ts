/// <reference lib="webworker" />
/* eslint-disable no-restricted-globals */

import { clientsClaim } from 'workbox-core';
import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { NetworkFirst } from 'workbox-strategies';

declare const self: ServiceWorkerGlobalScope;

const precacheEntries = self.__WB_MANIFEST.filter((entry) => (typeof entry === 'string' ? entry !== 'index.html' : entry.url !== 'index.html'));

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

// Standard SW lifecycle methods
self.skipWaiting();
clientsClaim();
