import { useState } from 'react';

// One avatar. The initials + deterministic-colour helpers were copy-pasted
// verbatim into five files, each with its own palette.
export function initials(name) {
  if (!name) return '?';
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  return parts.length >= 2
    ? (parts[0][0] + parts[parts.length - 1][0])
    : parts[0][0];
}

export default function Avatar({ name, src, size = 'md', alt }) {
  const [broken, setBroken] = useState(false);
  const showImage = src && !broken;

  return (
    <span className={`cc-avatar cc-avatar-${size}`} aria-hidden={alt ? undefined : 'true'}>
      {showImage
        ? <img src={src} alt={alt || name || ''} onError={() => setBroken(true)} />
        : initials(name)}
    </span>
  );
}
