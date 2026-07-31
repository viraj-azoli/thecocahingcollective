import React from 'react'
import ReactDOM from 'react-dom/client'
import { HelmetProvider } from 'react-helmet-async'
import * as Sentry from '@sentry/react'
import App from './App.jsx'
import { PageErrorBoundary } from './components/shared/ErrorBoundary.jsx'
import { initAnalytics } from './lib/analytics.js'
import './index.css'
// Tokens plus the legacy bridge, loaded globally so screens that have not
// been individually converted still render in the new design language.
import './ui/tokens.css'
import './ui/bridge.css'

// This app briefly shipped a service worker that was later removed (it kept
// hitting Hostinger FTP overwrite locks on the non-hashed sw.js filename).
// Browsers that installed it will keep running it indefinitely — silently
// serving old cached responses — until it's explicitly unregistered. Clean
// up any leftover registration/caches from that period on every load.
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((regs) => {
    regs.forEach((reg) => reg.unregister());
  });
}
if ('caches' in window) {
  caches.keys().then((keys) => keys.forEach((key) => caches.delete(key)));
}

initAnalytics()

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN || '',
  environment: import.meta.env.MODE,
  enabled: !!import.meta.env.VITE_SENTRY_DSN,
  tracesSampleRate: 0.2,
  replaysOnErrorSampleRate: 1.0,
})

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <HelmetProvider>
      <PageErrorBoundary>
        <App />
      </PageErrorBoundary>
    </HelmetProvider>
  </React.StrictMode>,
)
