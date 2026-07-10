import './polyfills.js';
import './lib/react-scan';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter as Router } from 'react-router-dom';
import './lib/init-translations';
import './index.css';
import './themes.css';
import AppUpdateRegistration from './components/app-update-registration';
import { App as CapacitorApp } from '@capacitor/app';
import { configureP2PBrowserPkcOptions } from './lib/p2p-browser-config';
import { canonicalizeNestedHashRoute } from './lib/utils/hash-route-utils';

// Only enable analytics on 5chan.app (Vercel deployment)
// Exclude Electron (file:// or localhost), Capacitor/APK (capacitor:// or localhost), and IPFS (ipfs:// or different domain)
const isVercelDeployment =
  typeof window !== 'undefined' && (window.location.hostname === '5chan.app' || window.location.hostname === 'www.5chan.app') && !window.isElectron;
const shouldLoadAnalytics = import.meta.env.VITE_APP_DISTRIBUTION !== 'fdroid' && isVercelDeployment;
const e2eStartHash = import.meta.env.VITE_E2E_START_HASH?.trim();
const requestedE2EHarness = import.meta.env.DEV && typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('e2e') : null;

if (typeof window !== 'undefined') {
  const canonicalHash = canonicalizeNestedHashRoute(window.location.hash);
  if (canonicalHash !== window.location.hash) {
    window.history.replaceState(window.history.state, '', `${window.location.pathname}${window.location.search}${canonicalHash}`);
  }
}

if (typeof window !== 'undefined' && e2eStartHash && window.location.hash.length === 0) {
  window.location.hash = e2eStartHash.startsWith('#') ? e2eStartHash : `#${e2eStartHash}`;
}

configureP2PBrowserPkcOptions();

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);
const renderRoot = async () => {
  let e2eHarness: React.ComponentType | null = null;
  let Analytics: React.ComponentType | null = null;

  if (requestedE2EHarness === 'thread-auto-update') {
    e2eHarness = (await import('./e2e/thread-auto-update-harness')).default;
  } else if (requestedE2EHarness === 'pretext-benchmark') {
    e2eHarness = (await import('./e2e/pretext-benchmark-harness')).default;
  }

  if (e2eHarness) {
    root.render(<React.StrictMode>{React.createElement(e2eHarness)}</React.StrictMode>);
    return;
  }

  const App = (await import('./app')).default;
  if (shouldLoadAnalytics) {
    Analytics = (await import('@vercel/analytics/react')).Analytics;
  }

  root.render(
    <React.StrictMode>
      <Router>
        <AppUpdateRegistration />
        <App />
        {Analytics && <Analytics />}
      </Router>
    </React.StrictMode>,
  );
};

void renderRoot();

// add back button in android app
CapacitorApp.addListener('backButton', ({ canGoBack }) => {
  if (canGoBack) {
    window.history.back();
  } else {
    CapacitorApp.exitApp();
  }
});
