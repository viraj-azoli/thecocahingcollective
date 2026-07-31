// One mood scale. The 1–5 table was duplicated in SeekerDashboard,
// JournalPage and ProgressPage, each with its own emoji and hex colours.
//
// Emoji faces are replaced by a numbered, labelled scale — closer to how a
// clinical instrument presents a Likert item, and it renders identically on
// every platform.
export const MOODS = [
  { rating: 1, label: 'Low' },
  { rating: 2, label: 'Off' },
  { rating: 3, label: 'Okay' },
  { rating: 4, label: 'Good' },
  { rating: 5, label: 'Bright' },
];

export function moodLabel(rating) {
  return MOODS.find(m => m.rating === rating)?.label ?? '—';
}

export default function MoodScale({ value, onChange, readOnly = false, name = 'mood' }) {
  if (readOnly) {
    return (
      <div className="cc-mood cc-mood-readonly">
        {MOODS.map(m => (
          <div key={m.rating} className={`cc-mood-item${value === m.rating ? ' cc-mood-on' : ''}`}>
            <span className="cc-mood-num">{m.rating}</span>
            <span className="cc-mood-label">{m.label}</span>
          </div>
        ))}
      </div>
    );
  }

  // A real radiogroup, so arrow keys work and screen readers announce it.
  return (
    <div className="cc-mood" role="radiogroup" aria-label="How are you arriving today?">
      {MOODS.map(m => (
        <button
          key={m.rating}
          type="button"
          role="radio"
          aria-checked={value === m.rating}
          name={name}
          className={`cc-mood-item${value === m.rating ? ' cc-mood-on' : ''}`}
          onClick={() => onChange?.(m.rating)}
        >
          <span className="cc-mood-num">{m.rating}</span>
          <span className="cc-mood-label">{m.label}</span>
        </button>
      ))}
    </div>
  );
}
