import React, { useState, useEffect } from 'react';
import Icon from '../../ui/Icon';
import { useAuth } from '../../auth/useAuth';
import { supabase } from '../../lib/supabase';
import AppLayout from '../Layout/AppLayout';
import { showToast } from '../shared/Toast';
import '../Layout/AppLayout.css';

const emptyPkg = () => ({
  id: null,
  name: '',
  description: '',
  session_count: 3,
  price: '',
  validity_days: 90,
  is_active: true,
});

export default function PackagesPage() {
  const { user } = useAuth();
  const [coachId, setCoachId] = useState(null);
  const [packages, setPackages] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [editing, setEditing]   = useState(null); // emptyPkg or existing pkg
  const [saving, setSaving]     = useState(false);

  useEffect(() => { if (user?.id) load(); }, [user?.id]); // eslint-disable-line

  const load = async () => {
    const { data: cp } = await supabase.from('coach_profiles').select('id').eq('user_id', user.id).single();
    if (!cp) { setLoading(false); return; }
    setCoachId(cp.id);

    const { data } = await supabase
      .from('session_packages')
      .select('*')
      .eq('coach_id', cp.id)
      .order('created_at');
    setPackages(data || []);
    setLoading(false);
  };

  const save = async () => {
    if (!coachId || !editing) return;
    setSaving(true);
    const { id, ...payload } = editing;
    payload.coach_id = coachId;
    payload.price = Number(payload.price);
    payload.session_count = Number(payload.session_count);
    payload.validity_days = Number(payload.validity_days);

    let error;
    if (id) {
      ({ error } = await supabase.from('session_packages').update(payload).eq('id', id));
    } else {
      const { data, error: e } = await supabase.from('session_packages').insert(payload).select().single();
      error = e;
      if (data) setPackages(p => [...p, data]);
    }

    setSaving(false);
    if (error) { showToast('Save failed: ' + error.message, 'error'); return; }
    showToast(id ? 'Package updated!' : 'Package created!');
    setEditing(null);
    await load();
  };

  const toggleActive = async (pkg) => {
    await supabase.from('session_packages').update({ is_active: !pkg.is_active }).eq('id', pkg.id);
    setPackages(p => p.map(x => x.id === pkg.id ? { ...x, is_active: !x.is_active } : x));
  };

  if (loading) return (
    <AppLayout role="coach">
      <div className="page-loading"><div className="spinner" /><p>Loading…</p></div>
    </AppLayout>
  );

  return (
    <AppLayout role="coach">
      <div className="page-body">
        <div className="page-header">
          <div>
            <h1 className="page-title">Session Packages</h1>
            <p className="page-subtitle">Sell multi-session bundles to your clients</p>
          </div>
          <button className="btn btn-primary" onClick={() => setEditing(emptyPkg())}>+ New package</button>
        </div>

        {packages.length === 0 && !editing ? (
          <div className="empty-state">
            <span className="empty-icon"><Icon name="packages" size={22} /></span>
            <p>No packages yet. Create your first package to offer session bundles.</p>
            <button className="btn btn-primary" onClick={() => setEditing(emptyPkg())}>Create package</button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
            {packages.map(pkg => (
              <div key={pkg.id} style={{
                background: 'var(--card-bg)', border: '1px solid var(--border-card)',
                borderRadius: 'var(--r-md)', padding: '20px',
                display: 'flex', flexDirection: 'column', gap: '12px',
                opacity: pkg.is_active ? 1 : 0.6,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <p style={{ fontWeight: 700, fontSize: '16px', color: 'var(--text-h)' }}>{pkg.name}</p>
                    {pkg.description && (
                      <p style={{ fontSize: '13px', color: 'var(--text-soft)', marginTop: '2px' }}>{pkg.description}</p>
                    )}
                  </div>
                  <span style={{
                    fontSize: '11px', fontWeight: 600, padding: '3px 8px', borderRadius: '99px',
                    background: pkg.is_active ? '#f0fdf4' : '#f3f4f6',
                    color: pkg.is_active ? '#15803d' : '#6b7280',
                  }}>
                    {pkg.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>

                <div style={{ display: 'flex', gap: '12px', fontSize: '13px', color: 'var(--text-soft)' }}>
                  <span>📅 {pkg.session_count} sessions</span>
                  {pkg.validity_days && <span>⏳ {pkg.validity_days} days</span>}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-card)', paddingTop: '12px' }}>
                  <span style={{ fontWeight: 700, fontSize: '20px', color: 'var(--accent)' }}>${pkg.price}</span>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button className="btn btn-outline btn-sm" onClick={() => setEditing({ ...pkg })}>Edit</button>
                    <button className="btn btn-outline btn-sm" onClick={() => toggleActive(pkg)}>
                      {pkg.is_active ? 'Deactivate' : 'Activate'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Edit modal */}
        {editing && (
          <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setEditing(null); }}>
            <div className="modal">
              <div className="modal-header">
                <h3>{editing.id ? 'Edit package' : 'New package'}</h3>
                <button className="modal-close" onClick={() => setEditing(null)}>×</button>
              </div>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label className="form-label">Package name</label>
                  <input
                    className="form-input"
                    value={editing.name}
                    onChange={e => setEditing(x => ({ ...x, name: e.target.value }))}
                    placeholder="e.g. Starter Pack · 3 sessions"
                  />
                </div>
                <div>
                  <label className="form-label">Description (optional)</label>
                  <input
                    className="form-input"
                    value={editing.description || ''}
                    onChange={e => setEditing(x => ({ ...x, description: e.target.value }))}
                    placeholder="Brief description shown to seekers"
                  />
                </div>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <div style={{ flex: 1 }}>
                    <label className="form-label">Sessions</label>
                    <input
                      className="form-input"
                      type="number" min="1" max="100"
                      value={editing.session_count}
                      onChange={e => setEditing(x => ({ ...x, session_count: e.target.value }))}
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label className="form-label">Price (USD)</label>
                    <input
                      className="form-input"
                      type="number" min="0"
                      value={editing.price}
                      onChange={e => setEditing(x => ({ ...x, price: e.target.value }))}
                      placeholder="e.g. 250"
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label className="form-label">Validity (days)</label>
                    <input
                      className="form-input"
                      type="number" min="1"
                      value={editing.validity_days || 90}
                      onChange={e => setEditing(x => ({ ...x, validity_days: e.target.value }))}
                    />
                  </div>
                </div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px' }}>
                  <input
                    type="checkbox"
                    checked={editing.is_active}
                    onChange={e => setEditing(x => ({ ...x, is_active: e.target.checked }))}
                  />
                  Active (visible to seekers)
                </label>
              </div>
              <div className="modal-footer">
                <button className="btn btn-outline" onClick={() => setEditing(null)}>Cancel</button>
                <button className="btn btn-primary" onClick={save} disabled={saving || !editing.name || !editing.price}>
                  {saving ? 'Saving…' : 'Save package'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
