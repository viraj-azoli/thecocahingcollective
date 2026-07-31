export default function PageHeader({ eyebrow, title, subtitle, actions }) {
  return (
    <header className="cc-pagehead">
      <div className="cc-pagehead-main">
        {eyebrow && <p className="cc-eyebrow">{eyebrow}</p>}
        <h1 className="cc-pagehead-title">{title}</h1>
        {subtitle && <p className="cc-pagehead-sub">{subtitle}</p>}
      </div>
      {actions && <div className="cc-pagehead-actions">{actions}</div>}
    </header>
  );
}
