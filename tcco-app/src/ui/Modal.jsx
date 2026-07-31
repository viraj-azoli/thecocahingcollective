import { useEffect, useRef } from 'react';
import Button from './Button';
import Icon from './Icon';

// One dialog. Duplicated .modal-* and .tcco-modal-* systems existed, and
// every consumer re-specified maxWidth and width inline.
//
// Adds what the hand-rolled versions all lacked: Escape to close, focus moved
// into the dialog on open and restored on close, a focus trap, and the ARIA
// wiring that makes it announce as a dialog.
export default function Modal({ open, onClose, title, children, footer, size = 'md' }) {
  const panelRef = useRef(null);
  const restoreRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    restoreRef.current = document.activeElement;
    panelRef.current?.focus();

    const onKey = (e) => {
      if (e.key === 'Escape') { e.stopPropagation(); onClose?.(); return; }
      if (e.key !== 'Tab') return;
      const focusables = panelRef.current?.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (!focusables?.length) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };

    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
      restoreRef.current?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="cc-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose?.(); }}>
      <div
        ref={panelRef}
        className={`cc-modal cc-modal-${size}`}
        role="dialog"
        aria-modal="true"
        aria-label={typeof title === 'string' ? title : undefined}
        tabIndex={-1}
      >
        <div className="cc-modal-head">
          <h2 className="cc-modal-title">{title}</h2>
          <button type="button" className="cc-modal-close" onClick={onClose} aria-label="Close">
            <Icon name="close" size={16} />
          </button>
        </div>
        <div className="cc-modal-body">{children}</div>
        {footer && <div className="cc-modal-foot">{footer}</div>}
      </div>
    </div>
  );
}

// Replaces window.confirm(), which rendered product warnings — including the
// late-cancellation fee notice — in raw OS browser chrome.
export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  body,
  warning,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive = false,
  loading = false,
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <>
          <Button onClick={onClose} disabled={loading}>{cancelLabel}</Button>
          <Button
            variant={destructive ? 'danger' : 'primary'}
            onClick={onConfirm}
            loading={loading}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      {body && <p className="cc-muted" style={{ margin: 0 }}>{body}</p>}
      {warning && (
        <p className="cc-confirm-warning">
          <Icon name="alert" size={14} /> {warning}
        </p>
      )}
    </Modal>
  );
}
