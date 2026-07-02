import React, { useState, useEffect, useCallback } from 'react';

const listeners = [];
let toastId = 0;

export function showToast(message, type = 'success', duration = 3000) {
  const id = ++toastId;
  listeners.forEach(fn => fn({ id, message, type, duration }));
}

export function ToastContainer() {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((toast) => {
    setToasts(prev => [...prev, toast]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== toast.id));
    }, toast.duration);
  }, []);

  useEffect(() => {
    listeners.push(addToast);
    return () => {
      const idx = listeners.indexOf(addToast);
      if (idx > -1) listeners.splice(idx, 1);
    };
  }, [addToast]);

  const icons = { success: '✓', error: '✕', info: 'ℹ' };

  return (
    <div className="toast-container">
      {toasts.map(t => (
        <div key={t.id} className={`toast toast-${t.type}`}>
          <span>{icons[t.type] || '✓'}</span>
          <span>{t.message}</span>
        </div>
      ))}
    </div>
  );
}
