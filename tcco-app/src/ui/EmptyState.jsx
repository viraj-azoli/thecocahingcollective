import Icon from './Icon';

export default function EmptyState({ icon = 'spark', title, body, action }) {
  return (
    <div className="cc-empty">
      <span className="cc-empty-icon"><Icon name={icon} size={22} /></span>
      {title && <p className="cc-empty-title">{title}</p>}
      {body && <p className="cc-empty-body">{body}</p>}
      {action && <div className="cc-empty-action">{action}</div>}
    </div>
  );
}
