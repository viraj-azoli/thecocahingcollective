// Last N days as filled/empty marks. Gives a streak number some texture —
// six in a row reads differently from six scattered.
export default function StreakDots({ streak = 0, days = 7 }) {
  const filled = Math.min(streak, days);
  return (
    <div
      className="cc-streak"
      role="img"
      aria-label={`${streak} day streak over the last ${days} days`}
    >
      {Array.from({ length: days }, (_, i) => (
        <span key={i} className={`cc-streak-dot${i < filled ? ' cc-streak-on' : ''}`} />
      ))}
    </div>
  );
}
