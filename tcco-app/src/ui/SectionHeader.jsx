export default function SectionHeader({ label, action }) {
  return (
    <div className="cc-sectionhead">
      <p className="cc-eyebrow">{label}</p>
      {action}
    </div>
  );
}
