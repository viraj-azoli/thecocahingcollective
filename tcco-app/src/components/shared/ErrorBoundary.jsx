import React from 'react';
import * as Sentry from '@sentry/react';

/* ── Generic fallback UI ─────────────────────────────────────────────── */
function DefaultFallback({ error, resetError }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', minHeight: '60vh', padding: '32px', textAlign: 'center',
    }}>
      <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚠️</div>
      <h2 style={{ fontSize: '22px', fontWeight: 700, marginBottom: '8px', color: 'var(--text-h, #111)' }}>
        Something went wrong
      </h2>
      <p style={{ color: 'var(--text-soft, #6b7280)', marginBottom: '24px', maxWidth: '400px' }}>
        {error?.message || 'An unexpected error occurred. Our team has been notified.'}
      </p>
      <div style={{ display: 'flex', gap: '12px' }}>
        {resetError && (
          <button
            onClick={resetError}
            style={{
              padding: '10px 20px', background: 'var(--primary, #1B9B7D)', color: '#fff',
              border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', fontSize: '14px',
            }}
          >
            Try again
          </button>
        )}
        <button
          onClick={() => window.location.href = '/dashboard'}
          style={{
            padding: '10px 20px', background: 'transparent', color: 'var(--primary, #1B9B7D)',
            border: '1.5px solid var(--primary, #1B9B7D)', borderRadius: '8px',
            fontWeight: 600, cursor: 'pointer', fontSize: '14px',
          }}
        >
          Go to dashboard
        </button>
      </div>
    </div>
  );
}

/* ── Page-level boundary (wraps entire routes) ───────────────────────── */
export function PageErrorBoundary({ children, fallback }) {
  return (
    <Sentry.ErrorBoundary
      fallback={({ error, resetError }) =>
        fallback
          ? fallback({ error, resetError })
          : <DefaultFallback error={error} resetError={resetError} />
      }
    >
      {children}
    </Sentry.ErrorBoundary>
  );
}

/* ── Section-level boundary (wraps cards/widgets) ────────────────────── */
export function SectionErrorBoundary({ children, label = 'section' }) {
  return (
    <Sentry.ErrorBoundary
      fallback={() => (
        <div style={{
          padding: '20px', border: '1px dashed var(--border-card, #e5e7eb)',
          borderRadius: '12px', textAlign: 'center', color: 'var(--text-soft, #6b7280)',
          fontSize: '14px',
        }}>
          Could not load this {label}.
        </div>
      )}
    >
      {children}
    </Sentry.ErrorBoundary>
  );
}

export default PageErrorBoundary;
