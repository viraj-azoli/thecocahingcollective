// One tab bar. Three competing implementations existed (.tabs/.tab,
// .chip/.chip-active used as tabs, and a legacy .tcco-tab set).
//
// A real tablist: arrow keys move between tabs, and the count sits inside
// the tab rather than being appended to the label string.
export default function Tabs({ tabs, value, onChange }) {
  const onKeyDown = (e) => {
    const i = tabs.findIndex(t => t.value === value);
    if (i < 0) return;
    let next = null;
    if (e.key === 'ArrowRight') next = tabs[(i + 1) % tabs.length];
    if (e.key === 'ArrowLeft')  next = tabs[(i - 1 + tabs.length) % tabs.length];
    if (next) { e.preventDefault(); onChange(next.value); }
  };

  return (
    <div className="cc-tabs" role="tablist" onKeyDown={onKeyDown}>
      {tabs.map(t => {
        const active = t.value === value;
        return (
          <button
            key={t.value}
            role="tab"
            type="button"
            aria-selected={active}
            tabIndex={active ? 0 : -1}
            className={`cc-tab${active ? ' cc-tab-on' : ''}`}
            onClick={() => onChange(t.value)}
          >
            {t.label}
            {typeof t.count === 'number' && <span className="cc-tab-count">{t.count}</span>}
          </button>
        );
      })}
    </div>
  );
}
