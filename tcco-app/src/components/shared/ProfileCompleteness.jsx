import React from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * ProfileCompleteness — inline banner nudging users to fill out their profile.
 *
 * Props:
 *   fields      – array of { label: string, done: boolean }
 *   settingsPath – where to link (e.g. '/settings', '/coach/settings')
 *   role        – 'seeker' | 'coach'
 */
export default function ProfileCompleteness({ fields = [], settingsPath = '/settings' }) {
  const navigate = useNavigate();
  const done = fields.filter(f => f.done).length;
  const total = fields.length;
  const pct = total === 0 ? 100 : Math.round((done / total) * 100);
  const missing = fields.filter(f => !f.done);

  // Fully complete — don't render anything
  if (pct === 100) return null;

  const color = pct < 40 ? 'var(--error)' : pct < 75 ? 'var(--warning)' : 'var(--success)';

  return (
    <div style={{
      background: 'var(--card-bg)',
      border: '1px solid var(--border-card)',
      borderLeft: `4px solid ${color}`,
      borderRadius: 'var(--r-md)',
      padding: '16px 20px',
      display: 'flex',
      alignItems: 'center',
      gap: '20px',
      flexWrap: 'wrap',
    }}>
      {/* Progress ring / percentage */}
      <div style={{ textAlign: 'center', flexShrink: 0 }}>
        <div style={{
          width: 52, height: 52, borderRadius: '50%',
          background: `conic-gradient(${color} ${pct * 3.6}deg, var(--gray-200) 0deg)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{
            width: 38, height: 38, borderRadius: '50%',
            background: 'var(--card-bg)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '12px', fontWeight: 700, color: 'var(--text-h)',
          }}>
            {pct}%
          </div>
        </div>
      </div>

      {/* Text */}
      <div style={{ flex: 1, minWidth: 180 }}>
        <p style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text-h)', marginBottom: '4px' }}>
          Complete your profile ({done}/{total} done)
        </p>
        <p style={{ fontSize: '13px', color: 'var(--text-soft)' }}>
          Missing: {missing.map(f => f.label).join(', ')}
        </p>
      </div>

      {/* CTA */}
      <button
        className="btn btn-primary"
        style={{ whiteSpace: 'nowrap', fontSize: '13px', padding: '8px 16px' }}
        onClick={() => navigate(settingsPath)}
      >
        Complete profile →
      </button>
    </div>
  );
}
