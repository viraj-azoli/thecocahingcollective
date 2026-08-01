import React from 'react';

/* ── Base shimmer block ──────────────────────────────────────────────── */
export function SkeletonBlock({ width = '100%', height = '16px', borderRadius = '6px', style = {} }) {
  return (
    <div
      className="skeleton-shimmer"
      style={{ width, height, borderRadius, ...style }}
      aria-hidden="true"
    />
  );
}

/* ── Text line(s) ────────────────────────────────────────────────────── */
export function SkeletonText({ lines = 3, lastWidth = '60%' }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {Array.from({ length: lines }).map((_, i) => (
        <SkeletonBlock
          key={i}
          width={i === lines - 1 ? lastWidth : '100%'}
          height="14px"
        />
      ))}
    </div>
  );
}

/* ── Generic card ────────────────────────────────────────────────────── */
export function SkeletonCard({ style = {} }) {
  return (
    <div
      style={{
        background: 'var(--cc-surface-card)',
        border: '1px solid var(--cc-border-hairline)',
        borderRadius: 'var(--cc-r-md)',
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        ...style,
      }}
    >
      <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
        <SkeletonBlock width="44px" height="44px" borderRadius="50%" />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <SkeletonBlock width="55%" height="16px" />
          <SkeletonBlock width="35%" height="12px" />
        </div>
      </div>
      <SkeletonText lines={2} lastWidth="40%" />
    </div>
  );
}

/* ── Stat card ───────────────────────────────────────────────────────── */
function SkeletonStatCard() {
  return (
    <div style={{
      background: 'var(--cc-surface-card)',
      border: '1px solid var(--cc-border-hairline)',
      borderRadius: 'var(--cc-r-md)', padding: '20px',
      display: 'flex', flexDirection: 'column', gap: '8px',
    }}>
      <SkeletonBlock width="32px" height="32px" borderRadius="8px" />
      <SkeletonBlock width="50%" height="28px" />
      <SkeletonBlock width="70%" height="12px" />
      <SkeletonBlock width="45%" height="12px" />
    </div>
  );
}

/* ── Full dashboard skeleton ─────────────────────────────────────────── */
export function SkeletonDashboard() {
  return (
    <div className="db-main" aria-busy="true" aria-label="Loading dashboard…">
      {/* Hero */}
      <div className="db-hero" style={{ gap: '16px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1 }}>
          <SkeletonBlock width="260px" height="32px" />
          <SkeletonBlock width="180px" height="18px" />
          <SkeletonBlock width="320px" height="14px" />
          <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
            <SkeletonBlock width="140px" height="38px" borderRadius="8px" />
            <SkeletonBlock width="140px" height="38px" borderRadius="8px" />
          </div>
        </div>
        <div style={{
          background: 'var(--cc-surface-card)', border: '1px solid var(--cc-border-hairline)',
          borderRadius: 'var(--cc-r-md)', padding: '20px', minWidth: '220px', display: 'flex',
          flexDirection: 'column', gap: '10px',
        }}>
          <SkeletonBlock width="100px" height="12px" />
          <SkeletonBlock width="80%" height="20px" />
        </div>
      </div>

      {/* Quick paths */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <SkeletonBlock width="100px" height="12px" />
        <div className="db-quick-grid">
          {[1,2,3,4].map(i => (
            <div key={i} style={{
              background: 'var(--cc-surface-card)', border: '1px solid var(--cc-border-hairline)',
              borderRadius: 'var(--cc-r-md)', padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px',
            }}>
              <SkeletonBlock width="32px" height="32px" borderRadius="8px" />
              <SkeletonBlock width="70%" height="14px" />
              <SkeletonBlock width="55%" height="12px" />
            </div>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className="db-stats-grid">
        {[1,2,3,4].map(i => <SkeletonStatCard key={i} />)}
      </div>

      {/* Cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <SkeletonBlock width="160px" height="12px" />
        <SkeletonCard />
      </div>
    </div>
  );
}

/* ── Coaches grid skeleton ───────────────────────────────────────────── */
export function SkeletonCoachesGrid({ count = 6 }) {
  return (
    <div className="coaches-grid" aria-busy="true" aria-label="Loading coaches…">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}
