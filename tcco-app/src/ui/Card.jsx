export default function Card({
  flush = false,
  quiet = false,
  interactive = false,
  as: Tag = 'div',
  className = '',
  children,
  ...rest
}) {
  const cls = [
    'cc-card',
    flush ? 'cc-card-flush' : '',
    quiet ? 'cc-card-quiet' : '',
    interactive ? 'cc-card-interactive' : '',
    className,
  ].filter(Boolean).join(' ');

  // An interactive card must be reachable and operable by keyboard. The old
  // card-as-clickable-div pattern was mouse-only.
  const a11y = interactive && Tag === 'div'
    ? {
        role: 'button',
        tabIndex: 0,
        onKeyDown: (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            rest.onClick?.(e);
          }
          rest.onKeyDown?.(e);
        },
      }
    : {};

  return <Tag className={cls} {...a11y} {...rest}>{children}</Tag>;
}
