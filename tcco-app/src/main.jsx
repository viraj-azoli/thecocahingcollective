import React from 'react'
import ReactDOM from 'react-dom/client'
import { HelmetProvider } from 'react-helmet-async'
import * as Sentry from '@sentry/react'
import App from './App.jsx'
import { PageErrorBoundary } from './components/Shared/ErrorBoundary.jsx'
import { initAnalytics } from './lib/analytics.js'
import './index.css'

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
