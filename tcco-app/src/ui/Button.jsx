import Icon from './Icon';

const VARIANTS = { primary: 'cc-btn-primary', secondary: 'cc-btn-secondary', ghost: 'cc-btn-ghost', danger: 'cc-btn-danger' };
const SIZES = { sm: 'cc-btn-sm', md: '', lg: 'cc-btn-lg' };

export default function Button({
  variant = 'secondary',
  size = 'md',
  icon,
  iconAfter,
  loading = false,
  block = false,
  disabled = false,
  className = '',
  children,
  ...rest
}) {
  const cls = [
    'cc-btn',
    VARIANTS[variant] || VARIANTS.secondary,
    SIZES[size] || '',
    block ? 'cc-btn-block' : '',
    className,
  ].filter(Boolean).join(' ');

  return (
    <button
      className={cls}
      disabled={disabled || loading}
      // Loading used to be communicated by swapping the label text, which
      // told assistive tech nothing.
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading
        ? <Icon name="spinner" size={size === 'lg' ? 16 : 14} className="cc-spin" />
        : icon && <Icon name={icon} size={size === 'lg' ? 16 : 14} />}
      {children}
      {iconAfter && !loading && <Icon name={iconAfter} size={size === 'lg' ? 16 : 14} />}
    </button>
  );
}
