// One set of date/time formatters. Seven near-identical functions were
// spread across six files (formatSessionDate, formatDate with two different
// signatures, formatShort, formatFullDate, formatTime12, formatTimeAgo).

const startOfDay = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };

/** 'YYYY-MM-DD' -> Date, parsed as local midnight rather than UTC. */
export function parseDate(dateStr) {
  if (!dateStr) return null;
  return dateStr instanceof Date ? dateStr : new Date(`${dateStr}T00:00`);
}

/** '14:30:00' -> '2:30 PM' */
export function formatTime(timeStr) {
  if (!timeStr) return '';
  return new Date(`1970-01-01T${String(timeStr).slice(0, 8)}`)
    .toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

/** 'Jul 30, 2026' */
export function formatDate(dateStr) {
  const d = parseDate(dateStr);
  if (!d || Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

/** 'Thursday, 30 July' */
export function formatDateLong(dateStr) {
  const d = parseDate(dateStr);
  if (!d || Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
}

/** 'Today at 2:30 PM' / 'Tomorrow at 2:30 PM' / 'Thursday · 2:30 PM' */
export function formatWhen(dateStr, timeStr) {
  const d = parseDate(dateStr);
  if (!d || Number.isNaN(d.getTime())) return '—';
  const time = timeStr ? formatTime(timeStr) : '';
  const today = startOfDay(new Date());
  const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
  const target = startOfDay(d);

  if (target.getTime() === today.getTime())    return time ? `Today at ${time}` : 'Today';
  if (target.getTime() === tomorrow.getTime()) return time ? `Tomorrow at ${time}` : 'Tomorrow';

  const day = d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
  return time ? `${day} · ${time}` : day;
}

/** '3 days ago' */
export function formatRelative(input) {
  if (!input) return '';
  const then = new Date(input);
  if (Number.isNaN(then.getTime())) return '';
  const secs = Math.floor((Date.now() - then.getTime()) / 1000);
  if (secs < 60) return 'just now';
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return formatDate(then);
}

/** Time-of-day greeting. */
export function greeting(date = new Date()) {
  const h = date.getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

/** Forward-looking countdown: 'in 2 days', 'in 3 hours', 'starting now'. */
export function formatUntil(dateStr, timeStr) {
  const d = parseDate(dateStr);
  if (!d || Number.isNaN(d.getTime())) return '';
  if (timeStr) {
    const [h, m] = String(timeStr).split(':');
    d.setHours(Number(h) || 0, Number(m) || 0, 0, 0);
  }
  const mins = Math.round((d.getTime() - Date.now()) / 60000);
  if (mins < -60) return 'passed';
  if (mins <= 5) return 'starting now';
  if (mins < 60) return `in ${mins} min`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `in ${hours} ${hours === 1 ? 'hour' : 'hours'}`;
  // Floor, not round: 37 hours away is "tomorrow", so rounding to 2 days
  // contradicted the date label sitting right beside it.
  const days = Math.floor(hours / 24);
  if (days === 1) return 'tomorrow';
  return `in ${days} days`;
}
