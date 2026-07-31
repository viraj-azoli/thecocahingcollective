import { useState } from 'react';

// One star rating, read-only or interactive. Four implementations existed:
// StarDisplay in CoachesPage, a sized variant in CoachProfilePage,
// StarPicker + StaticStars in SessionsPage, and a raw inline loop in the
// reviews list.
export default function StarRating({
  value = 0,
  onChange,
  readOnly = false,
  size = 16,
  showValue = false,
  count,
}) {
  const [hover, setHover] = useState(0);
  const shown = hover || value;

  if (readOnly) {
    return (
      <span className="cc-stars" role="img" aria-label={`${value} out of 5`}>
        {[1, 2, 3, 4, 5].map(i => (
          <span key={i} className={`cc-star${i <= Math.round(value) ? ' cc-star-on' : ''}`} style={{ fontSize: size }}>★</span>
        ))}
        {showValue && <span className="cc-stars-value">{Number(value).toFixed(1)}</span>}
        {typeof count === 'number' && <span className="cc-stars-count">({count})</span>}
      </span>
    );
  }

  return (
    <span className="cc-stars" role="radiogroup" aria-label="Rating">
      {[1, 2, 3, 4, 5].map(i => (
        <button
          key={i}
          type="button"
          role="radio"
          aria-checked={value === i}
          aria-label={`${i} star${i > 1 ? 's' : ''}`}
          className={`cc-star cc-star-btn${i <= shown ? ' cc-star-on' : ''}`}
          style={{ fontSize: size }}
          onMouseEnter={() => setHover(i)}
          onMouseLeave={() => setHover(0)}
          onClick={() => onChange?.(i)}
        >
          ★
        </button>
      ))}
    </span>
  );
}
