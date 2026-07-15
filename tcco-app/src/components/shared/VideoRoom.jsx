import React, { useEffect, useRef, useState } from 'react';
import DailyIframe from '@daily-co/daily-js';
import './VideoRoom.css';

export default function VideoRoom({ roomUrl, sessionTitle, onLeave }) {
  const containerRef = useRef(null);
  const callRef      = useRef(null);
  const [status, setStatus] = useState('connecting'); // connecting | connected | left | error

  useEffect(() => {
    if (!roomUrl || !containerRef.current) return;
    // Guard against double-mount (React StrictMode) — Daily throws on
    // duplicate iframe instances.
    if (callRef.current) return;

    const call = DailyIframe.createFrame(containerRef.current, {
      showLeaveButton:      true,
      showFullscreenButton: true,
      iframeStyle: {
        width: '100%',
        height: '100%',
        border: 'none',
        borderRadius: '12px',
      },
    });
    callRef.current = call;

    call.on('joined-meeting', () => setStatus('connected'));
    call.on('left-meeting',   () => { setStatus('left'); onLeave?.(); });
    call.on('error',          () => setStatus('error'));

    call.join({ url: roomUrl });

    return () => {
      call.leave();
      call.destroy();
      callRef.current = null;
    };
  }, [roomUrl]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="video-room">
      {/* Header bar */}
      <div className="video-header">
        <span className="video-header-title">{sessionTitle || 'Coaching Session'}</span>
        <button className="video-leave-btn" onClick={() => { callRef.current?.leave(); onLeave?.(); }}>
          ✕ Leave
        </button>
      </div>

      {/* Connecting overlay */}
      {status === 'connecting' && (
        <div className="video-connecting">
          <div className="spinner" style={{ borderTopColor: '#2D9E6B' }} />
          <p>Connecting to session…</p>
          <p style={{ fontSize: '13px', opacity: 0.6 }}>Allow camera and microphone access when prompted</p>
        </div>
      )}

      {/* Daily iframe container */}
      <div
        ref={containerRef}
        className="video-frame"
        style={{ opacity: status === 'connected' ? 1 : 0, pointerEvents: status === 'connected' ? 'auto' : 'none' }}
      />

      {/* Error state */}
      {status === 'error' && (
        <div className="video-connecting">
          <span style={{ fontSize: '48px' }}>⚠️</span>
          <p style={{ fontWeight: 600 }}>Could not connect to session</p>
          <p style={{ fontSize: '13px', opacity: 0.7 }}>Please check your camera and microphone permissions, then try again.</p>
          <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
            <button className="btn btn-primary" onClick={() => { setStatus('connecting'); callRef.current?.join({ url: roomUrl }); }}>
              Retry
            </button>
            <button className="btn btn-outline" style={{ color: '#fff', borderColor: 'rgba(255,255,255,.3)' }} onClick={onLeave}>
              Leave
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
