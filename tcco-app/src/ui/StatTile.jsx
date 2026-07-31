import Icon from './Icon';

// The one stat tile. This existed twice with byte-identical CSS
// (.stat-card and .db-stat-card), plus ad-hoc numerals in several modals.
//
// `visual` is an optional slot on the right of the figure — a StreakDots row,
// a Sparkline, anything that gives the number some shape. The figure alone
// says "6"; the visual says whether those six were consecutive.
export default function StatTile({ icon, value, label, delta, direction = 'flat', visual }) {
  return (
    <div className="cc-stat">
      {icon && (
        <div className="cc-stat-head">
          <span className="cc-stat-icon"><Icon name={icon} size={15} /></span>
        </div>
      )}
      <div className="cc-stat-body">
        <div className="cc-stat-main">
          {/* Serif, tabular figures — numbers must not jitter as they update. */}
          <div className="cc-stat-value">{value}</div>
          <div className="cc-stat-label">{label}</div>
          {delta && <div className={`cc-stat-delta cc-stat-delta-${direction}`}>{delta}</div>}
        </div>
        {visual && <div className="cc-stat-visual">{visual}</div>}
      </div>
    </div>
  );
}

export function StatRow({ columns = 4, children }) {
  return <div className={`cc-stats cc-stats-${columns}`}>{children}</div>;
}
