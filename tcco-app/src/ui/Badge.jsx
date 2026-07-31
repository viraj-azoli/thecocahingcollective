// Semantic tone, never a colour name. The legacy .badge-* set was
// green/blue/yellow/red/gray/purple/teal, which meant callers picked a hue
// and the meaning was implicit.
//
// Every tone carries a glyph as well as a colour, so status survives
// greyscale printing and colour-blindness — colour is never the sole signal.
const TONES = {
  success: { cls: 'cc-badge-success', glyph: '✓' },
  warning: { cls: 'cc-badge-warning', glyph: '◷' },
  danger:  { cls: 'cc-badge-danger',  glyph: '✕' },
  info:    { cls: 'cc-badge-info',    glyph: '◉' },
  neutral: { cls: 'cc-badge-neutral', glyph: null },
};

// Domain status -> tone, resolved in one place instead of four competing maps.
const STATUS_TONE = {
  scheduled: 'info',
  in_progress: 'info',
  completed: 'success',
  verified: 'success',
  published: 'success',
  active: 'success',
  pending: 'warning',
  pending_payment: 'warning',
  cancelled: 'danger',
  no_show: 'danger',
  draft: 'neutral',
};

export default function Badge({ tone = 'neutral', status, glyph = true, children }) {
  const resolved = status ? (STATUS_TONE[status] || 'neutral') : tone;
  const { cls, glyph: g } = TONES[resolved] || TONES.neutral;
  return (
    <span className={`cc-badge ${cls}`}>
      {glyph && g && <span className="cc-badge-glyph" aria-hidden="true">{g}</span>}
      {children ?? String(status || '').replace(/_/g, ' ')}
    </span>
  );
}

export function Tag({ children }) {
  return <span className="cc-tag">{children}</span>;
}
