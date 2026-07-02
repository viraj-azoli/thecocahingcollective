import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/useAuth';
import { supabase } from '../../lib/supabase';
import AppLayout from '../Layout/AppLayout';
import SEO from '../Shared/SEO';
import '../Layout/AppLayout.css';

const AVATAR_COLORS = [
  'linear-gradient(135deg,#2D9E6B,#1a7a52)',
  'linear-gradient(135deg,#6366f1,#4f46e5)',
  'linear-gradient(135deg,#f59e0b,#d97706)',
  'linear-gradient(135deg,#ec4899,#be185d)',
  'linear-gradient(135deg,#06b6d4,#0284c7)',
];

function avatarColor(name) {
  let sum = 0;
  for (let c of (name || '')) sum += c.charCodeAt(0);
  return AVATAR_COLORS[sum % AVATAR_COLORS.length];
}

function initials(name) {
  if (!name) return '?';
  const p = name.trim().split(' ');
  return p.length >= 2 ? p[0][0] + p[p.length-1][0] : p[0][0];
}

export default function FavouritesPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [favourites, setFavourites] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [seekerProfileId, setSeekerProfileId] = useState(null);

  useEffect(() => { if (user?.id) load(); }, [user?.id]); // eslint-disable-line

  const load = async () => {
    const { data: profile } = await supabase
      .from('seeker_profiles').select('id').eq('user_id', user.id).single();
    if (!profile) { setLoading(false); return; }
    setSeekerProfileId(profile.id);

    const { data } = await supabase
      .from('favourites')
      .select('id, coach:coach_profiles(*)')
      .eq('seeker_id', profile.id)
      .order('created_at', { ascending: false });
    setFavourites(data || []);
    setLoading(false);
  };

  const remove = async (coachId) => {
    await supabase.from('favourites').delete().eq('seeker_id', seekerProfileId).eq('coach_id', coachId);
    setFavourites(f => f.filter(x => x.coach?.id !== coachId));
  };

  if (loading) return (
    <AppLayout role="seeker">
      <div className="page-loading"><div className="spinner" /><p>Loading…</p></div>
    </AppLayout>
  );

  return (
    <AppLayout role="seeker">
      <SEO title="Saved Coaches" noIndex />
      <div className="page-body">
        <div className="page-header">
          <div>
            <h1 className="page-title">Saved Coaches</h1>
            <p className="page-subtitle">{favourites.length} coach{favourites.length !== 1 ? 'es' : ''} saved</p>
          </div>
        </div>

        {favourites.length === 0 ? (
          <div className="empty-state">
            <span className="empty-icon">🤍</span>
            <p>No saved coaches yet. Heart a coach to save them here.</p>
            <button className="btn btn-primary" onClick={() => navigate('/coaches')}>Browse coaches →</button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
            {favourites.map(fav => {
              const coach = fav.coach;
              if (!coach) return null;
              return (
                <div key={fav.id} style={{
                  background: 'var(--card-bg)', border: '1px solid var(--border-card)',
                  borderRadius: 'var(--r-md)', padding: '20px',
                  display: 'flex', flexDirection: 'column', gap: '12px',
                  boxShadow: 'var(--shadow-sm)',
                }}>
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <div
                      className="avatar avatar-md"
                      style={{ background: avatarColor(coach.name), color: '#fff', fontWeight: 700, flexShrink: 0 }}
                    >
                      {initials(coach.name)}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontWeight: 700, fontSize: '16px', color: 'var(--text-h)' }}>{coach.name}</p>
                      <p style={{ fontSize: '13px', color: 'var(--text-soft)' }}>{coach.title}</p>
                    </div>
                    <button
                      onClick={() => remove(coach.id)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '20px', padding: '4px' }}
                      title="Remove from saved"
                    >❤️</button>
                  </div>

                  {coach.specialties?.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {coach.specialties.slice(0,3).map(s => (
                        <span key={s} style={{ background: '#f0fdf4', color: '#15803d', fontSize: '11px', fontWeight: 600, padding: '3px 8px', borderRadius: '99px' }}>
                          {s}
                        </span>
                      ))}
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: '8px', borderTop: '1px solid var(--border-card)', paddingTop: '12px' }}>
                    <button
                      className="btn btn-outline btn-sm"
                      style={{ flex: 1 }}
                      onClick={() => navigate(`/coaches/${coach.id}`)}
                    >View profile</button>
                    <button
                      className="btn btn-primary btn-sm"
                      style={{ flex: 1 }}
                      onClick={() => navigate(`/coaches/${coach.id}?book=true`)}
                    >Book now</button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
