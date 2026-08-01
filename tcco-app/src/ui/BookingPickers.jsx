// The date and time pickers from the booking wizard, which were ~60 lines of
// inline styling each with booked/selected/disabled states hand-rolled.

export function DateGrid({ days, value, onChange }) {
  const key = d => {
    // Local date, not toISOString — that shifts to UTC and can land on the
    // previous day for anyone west of Greenwich.
    const p = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  };

  const relative = (d) => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const t = new Date(d); t.setHours(0, 0, 0, 0);
    const diff = Math.round((t - today) / 86400000);
    if (diff === 0) return 'Today';
    if (diff === 1) return 'Tomorrow';
    return null;
  };

  return (
    <div className="cc-dategrid" role="radiogroup" aria-label="Session date">
      {days.map(d => {
        const ds = key(d);
        const on = value === ds;
        return (
          <button
            key={ds}
            type="button"
            role="radio"
            aria-checked={on}
            className={`cc-date${on ? ' cc-date-on' : ''}`}
            onClick={() => onChange(ds)}
          >
            <span className="cc-date-dow">
              {relative(d) || d.toLocaleDateString('en-US', { weekday: 'short' })}
            </span>
            <span className="cc-date-num">{d.getDate()}</span>
            <span className="cc-date-mon">{d.toLocaleDateString('en-US', { month: 'short' })}</span>
          </button>
        );
      })}
    </div>
  );
}

export function TimeSlotGrid({ slots, value, taken = [], onChange }) {
  const label = (t) => {
    const h = parseInt(t.split(':')[0], 10);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
    return `${h12}:00 ${ampm}`;
  };

  return (
    <div className="cc-slots" role="radiogroup" aria-label="Session time">
      {slots.map(t => {
        const booked = taken.includes(t);
        const on = value === t;
        return (
          <button
            key={t}
            type="button"
            role="radio"
            aria-checked={on}
            disabled={booked}
            // Struck-through text alone did not say why a slot was unavailable.
            aria-label={booked ? `${label(t)} — already booked` : label(t)}
            className={`cc-slot${on ? ' cc-slot-on' : ''}${booked ? ' cc-slot-taken' : ''}`}
            onClick={() => onChange(t)}
          >
            {label(t)}
          </button>
        );
      })}
    </div>
  );
}
