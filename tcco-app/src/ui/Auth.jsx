import { useState } from 'react';
import Icon from './Icon';

// Auth screens had three conflicting page treatments (a green gradient, flat
// cream, and a hardcoded #F4EFE6) and two incompatible card implementations.
// One shell, one card.
export function AuthShell({ children }) {
  return (
    <div className="cc cc-auth">
      <div className="cc-auth-card">{children}</div>
    </div>
  );
}

export function AuthHeader({ title, subtitle }) {
  return (
    <div className="cc-auth-head">
      <img
        src={`${import.meta.env.BASE_URL}logo-green-crop.png`}
        alt="The Coaching Collective"
        className="cc-auth-logo"
      />
      <h1 className="cc-auth-title">{title}</h1>
      {subtitle && <p className="cc-auth-sub">{subtitle}</p>}
    </div>
  );
}

// One message component. .error-message (a red filled block) and .auth-error
// (bare red text) were two unrelated looks for the same job, and neither
// announced itself to assistive tech.
export function Alert({ tone = 'danger', children }) {
  if (!children) return null;
  const icon = tone === 'success' ? 'success' : tone === 'info' ? 'pending' : 'alert';
  return (
    <p className={`cc-alert cc-alert-${tone}`} role={tone === 'danger' ? 'alert' : 'status'}>
      <Icon name={icon} size={14} />
      <span>{children}</span>
    </p>
  );
}

// Password field with a reveal toggle — there was no way to check what you had
// typed before submitting.
export function PasswordInput({ id, value, onChange, placeholder = '••••••••', autoComplete, hint, ...rest }) {
  const [shown, setShown] = useState(false);
  return (
    <div className="cc-pw">
      <input
        id={id}
        className="cc-input"
        type={shown ? 'text' : 'password'}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        autoComplete={autoComplete}
        {...rest}
      />
      <button
        type="button"
        className="cc-pw-toggle"
        onClick={() => setShown(s => !s)}
        aria-label={shown ? 'Hide password' : 'Show password'}
        aria-pressed={shown}
        tabIndex={-1}
      >
        {shown ? 'Hide' : 'Show'}
      </button>
      {hint && <span className="cc-field-hint">{hint}</span>}
    </div>
  );
}

export function AuthDivider({ label = 'or' }) {
  return <div className="cc-auth-divider"><span>{label}</span></div>;
}

// The Google button used a literal "G" character as the mark.
export function GoogleButton({ onClick, children = 'Continue with Google' }) {
  return (
    <button type="button" className="cc-google" onClick={onClick}>
      <svg width="16" height="16" viewBox="0 0 18 18" aria-hidden="true">
        <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62z"/>
        <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.34A9 9 0 0 0 9 18z"/>
        <path fill="#FBBC05" d="M3.97 10.72a5.4 5.4 0 0 1 0-3.44V4.94H.96a9 9 0 0 0 0 8.12l3.01-2.34z"/>
        <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.46 3.44 1.35l2.58-2.58C13.46.9 11.43 0 9 0A9 9 0 0 0 .96 4.94l3.01 2.34C4.68 5.16 6.66 3.58 9 3.58z"/>
      </svg>
      {children}
    </button>
  );
}

// AuthCallback's "Signing you in…" and ResetPassword's "Check your inbox" were
// the same shape built two different ways.
export function StatusScreen({ icon = 'spinner', spinning = false, title, body, action }) {
  return (
    <AuthShell>
      <div className="cc-auth-status">
        <span className={`cc-auth-status-icon${spinning ? ' cc-spin' : ''}`}>
          <Icon name={icon} size={26} />
        </span>
        <h1 className="cc-auth-title">{title}</h1>
        {body && <p className="cc-auth-sub">{body}</p>}
        {action && <div className="cc-auth-status-action">{action}</div>}
      </div>
    </AuthShell>
  );
}
