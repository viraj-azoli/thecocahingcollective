import Avatar from './Avatar';
import Badge from './Badge';
import Button from './Button';
import Icon from './Icon';
import { formatWhen, formatUntil } from '../lib/datetime';

// One session row. Four separate layouts existed for this: .db-session-card
// on the dashboard plus three JSX blocks in SessionsPage.
//
// Carries the detail the old card omitted — duration, a countdown, and whether
// prep notes are written — so a seeker can tell at a glance whether anything
// is owed before the session.
export default function SessionCard({
  session,
  variant = 'upcoming',
  onJoin,
  onPrep,
  onCancel,
  onRebook,
  showPrepHint = true,
}) {
  const coach = session.coach || {};
  const until = variant === 'upcoming' ? formatUntil(session.scheduled_date, session.scheduled_time) : '';
  const hasPrep = !!(session.notes_seeker && session.notes_seeker.trim());
  const duration = session.duration_minutes ?? 55;

  return (
    <div className="cc-session">
      <div className="cc-session-main">
        <Avatar name={coach.name} src={coach.avatar_url} size="md" />
        <div className="cc-grow">
          <div className="cc-row-title">{coach.name || 'Your coach'}</div>
          <div className="cc-row-meta">{coach.title || 'Coach'}</div>
        </div>

        <div className="cc-session-when">
          <div className="cc-session-date">{formatWhen(session.scheduled_date, session.scheduled_time)}</div>
          <div className="cc-row-meta">
            <Icon name="video" size={11} /> Video · {duration} min
          </div>
        </div>

        <div className="cc-session-actions">
          {variant === 'upcoming' && (
            <>
              {until && <Badge tone="info">{until}</Badge>}
              <Button variant="primary" size="sm" icon="video" onClick={() => onJoin?.(session)}>Join</Button>
            </>
          )}
          {variant === 'past' && (
            <>
              <Badge status={session.status} />
              {onRebook && <Button size="sm" onClick={() => onRebook(session)}>Book again</Button>}
            </>
          )}
          {variant === 'cancelled' && <Badge status="cancelled" />}
        </div>
      </div>

      {/* Prep-notes strip: the one thing a seeker can act on before a session. */}
      {variant === 'upcoming' && showPrepHint && (
        <div className="cc-session-foot">
          {hasPrep
            ? <Badge tone="success">Prep notes ready</Badge>
            : <Badge tone="warning">No prep notes yet</Badge>}
          <button type="button" className="cc-linkbtn" onClick={() => onPrep?.(session)}>
            {hasPrep ? 'Edit notes' : 'Add notes'}
          </button>
          {onCancel && (
            <button type="button" className="cc-linkbtn cc-linkbtn-quiet" onClick={() => onCancel(session)}>
              Cancel session
            </button>
          )}
        </div>
      )}
    </div>
  );
}
