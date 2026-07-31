import Icon from './Icon';

// The quick-path tile: icon, label, supporting line. A real <button>, so it
// is keyboard-operable — the previous version was a styled div.
export default function ActionCard({ icon, label, sub, onClick }) {
  return (
    <button type="button" className="cc-action" onClick={onClick}>
      <span className="cc-action-icon"><Icon name={icon} size={17} /></span>
      <span className="cc-action-label">{label}</span>
      {sub && <span className="cc-action-sub">{sub}</span>}
    </button>
  );
}

export function ActionGrid({ children }) {
  return <div className="cc-action-grid">{children}</div>;
}
