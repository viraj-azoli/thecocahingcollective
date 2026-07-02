import React, { useState, useEffect } from 'react';
import { useAuth } from '../../auth/useAuth';
import { supabase } from '../../lib/supabase';
import AppLayout from '../Layout/AppLayout';
import { showToast } from '../shared/Toast';
import '../Layout/AppLayout.css';

const DAY_ABBR  = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const HOURS     = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19];

const TIMEZONES = [
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Phoenix',
  'America/Anchorage',
  'Pacific/Honolulu',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Asia/Tokyo',
  'Asia/Singapore',
  'Asia/Kolkata',
  'Australia/Sydney',
];

function formatHour(h) {
  if (h === 12) return '12:00 PM';
  if (h < 12) return `${h}:00 AM`;
  return `${h - 12}:00 PM`;
}

function buildEmptyGrid() {
  const g = {};
  for (let d = 0; d < 7; d++) {
    g[d] = {};
    HOURS.forEach((h, hi) => { g[d][hi] = false; });
  }
  return g;
}

export default function AvailabilityPage() {
  const { user } = useAuth();
  const [coachId, setCoachId]       = useState(null);
  const [grid, setGrid]             = useState(buildEmptyGrid);
  const [timezone, setTimezone]     = useState('America/New_York');
  const [loading, setLoading]       = useState(true);
  const [saving, setSaving]         = useState(false);

  useEffect(() => { if (!user?.id) return; loadAvailability(); }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadAvailability = async () => {
    try {
      const { data: coachRow } = await supabase
        .from('coach_profiles').select('id').eq('user_id', user?.id).single();
      const cid = coachRow?.id;
      if (!cid) { setLoading(false); return; }
      setCoachId(cid);

      const { data, error } = await supabase
        .from('availability')
        .select('*')
        .eq('coach_id', cid);

      if (error) throw error;

      const newGrid = buildEmptyGrid();

      (data || []).forEach(row => {
        const day = row.day_of_week; // 0-6 where 0=Monday
        if (day === undefined || day === null) return;

        const slots = Array.isArray(row.time_slots) ? row.time_slots : [];
        slots.forEach(slot => {
          const startHour = parseInt((slot.start || '').split(':')[0]);
          const hi = HOURS.indexOf(startHour);
          if (hi !== -1 && newGrid[day]) {
            newGrid[day][hi] = true;
          }
        });

        if (row.timezone && !data.find(r => r.timezone && r !== row)) {
          // use last encountered timezone
          setTimezone(row.timezone);
        }
      });

      // Set timezone from first row that has it
      const tzRow = (data || []).find(r => r.timezone);
      if (tzRow) setTimezone(tzRow.timezone);

      setGrid(newGrid);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const toggleCell = (day, hi) => {
    setGrid(prev => ({
      ...prev,
      [day]: { ...prev[day], [hi]: !prev[day][hi] },
    }));
  };

  const clearAll = () => {
    setGrid(buildEmptyGrid());
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      for (let day = 0; day < 7; day++) {
        const timeSlots = [];
        HOURS.forEach((h, hi) => {
          if (grid[day][hi]) {
            timeSlots.push({ start: `${String(h).padStart(2,'0')}:00`, end: `${String(h+1).padStart(2,'0')}:00` });
          }
        });

        await supabase
          .from('availability')
          .upsert({
            coach_id: coachId,
            day_of_week: day,
            time_slots: timeSlots,
            recurring: true,
            timezone,
          }, { onConflict: 'coach_id,day_of_week' });
      }
      showToast('Availability saved!');
    } catch (err) {
      console.error(err);
      showToast('Failed to save availability', 'error');
    } finally {
      setSaving(false);
    }
  };

  const totalSlots = Object.values(grid).reduce((sum, dayObj) => {
    return sum + Object.values(dayObj).filter(Boolean).length;
  }, 0);

  if (loading) {
    return (
      <AppLayout role="coach">
        <div className="page-loading"><div className="spinner" /><p>Loading availability…</p></div>
      </AppLayout>
    );
  }

  return (
    <AppLayout role="coach">
      <div className="page-body">
        <div className="page-header">
          <div>
            <h1 className="page-title">Availability</h1>
            <p className="page-subtitle">
              {totalSlots} slot{totalSlots !== 1 ? 's' : ''} selected · Click cells to toggle
            </p>
          </div>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <button className="btn btn-outline btn-sm" onClick={clearAll}>
              Clear all
            </button>
            <button
              className="btn btn-primary"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? 'Saving…' : 'Save availability'}
            </button>
          </div>
        </div>

        {/* Timezone selector */}
        <div className="card" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <label className="form-label" style={{ marginBottom: 0, whiteSpace: 'nowrap' }}>Timezone</label>
          <select
            className="form-select"
            style={{ maxWidth: '280px' }}
            value={timezone}
            onChange={e => setTimezone(e.target.value)}
          >
            {TIMEZONES.map(tz => (
              <option key={tz} value={tz}>{tz.replace(/_/g, ' ')}</option>
            ))}
          </select>
        </div>

        {/* Weekly grid */}
        <div className="card" style={{ overflowX: 'auto', padding: '20px' }}>
          <div style={{ minWidth: '640px' }}>
            {/* Column headers */}
            <div style={{ display: 'grid', gridTemplateColumns: '80px repeat(7, 1fr)', gap: '4px', marginBottom: '4px' }}>
              <div />
              {DAY_ABBR.map(d => (
                <div
                  key={d}
                  style={{
                    textAlign: 'center', fontSize: '12px', fontWeight: 700,
                    color: 'var(--text-soft)', padding: '6px 0',
                  }}
                >
                  {d}
                </div>
              ))}
            </div>

            {/* Hour rows */}
            {HOURS.map((hour, hi) => (
              <div
                key={hour}
                style={{ display: 'grid', gridTemplateColumns: '80px repeat(7, 1fr)', gap: '4px', marginBottom: '4px' }}
              >
                <div style={{
                  fontSize: '11px', color: 'var(--text-soft)',
                  display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
                  paddingRight: '8px',
                }}>
                  {formatHour(hour)}
                </div>
                {[0, 1, 2, 3, 4, 5, 6].map(day => {
                  const active = grid[day]?.[hi] || false;
                  return (
                    <button
                      key={day}
                      onClick={() => toggleCell(day, hi)}
                      style={{
                        height: '36px',
                        borderRadius: '6px',
                        border: active ? 'none' : '1px solid var(--border-card)',
                        background: active ? 'var(--accent)' : '#fff',
                        cursor: 'pointer',
                        transition: 'background .15s',
                        color: active ? '#fff' : 'transparent',
                        fontSize: '14px',
                        fontWeight: 700,
                      }}
                      title={`${DAY_ABBR[day]} ${formatHour(hour)}`}
                    >
                      {active ? '✓' : ''}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        {/* Legend */}
        <div style={{ display: 'flex', gap: '20px', fontSize: '13px', color: 'var(--text-soft)', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            <div style={{ width: '16px', height: '16px', borderRadius: '4px', background: 'var(--accent)' }} />
            Available
          </div>
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            <div style={{ width: '16px', height: '16px', borderRadius: '4px', border: '1px solid var(--border-card)', background: '#fff' }} />
            Unavailable
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
