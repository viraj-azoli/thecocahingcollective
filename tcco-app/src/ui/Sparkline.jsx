// A bar sparkline sized in CSS, not SVG, so it inherits tokens and needs no
// charting dependency. Deliberately unlabelled — it shows shape, and the
// figure beside it carries the actual number.
export default function Sparkline({ values = [], max, label }) {
  if (!values.length) return null;
  const ceiling = max ?? Math.max(...values, 1);

  return (
    <div className="cc-spark" role="img" aria-label={label || 'Recent trend'}>
      {values.map((v, i) => (
        <span
          key={i}
          className="cc-spark-bar"
          // Height is genuinely dynamic, so it belongs inline.
          style={{ height: `${Math.max(8, (Number(v) / ceiling) * 100)}%` }}
        />
      ))}
    </div>
  );
}
