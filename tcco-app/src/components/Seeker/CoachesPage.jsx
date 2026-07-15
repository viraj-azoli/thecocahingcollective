import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/useAuth';
import { supabase } from '../../lib/supabase';
import AppLayout from '../Layout/AppLayout';
import SEO from '../shared/SEO';
import { SkeletonCoachesGrid } from '../shared/Skeleton';
import '../Layout/AppLayout.css';

const SPECIALTIES = ['All', 'Leadership', 'Career', 'Life', 'Executive', 'Wellness', 'Mindfulness', 'Relationships'];
const PRICE_RANGES = ['Any price', 'Under $100', '$100–$200', '$200+'];

function initials(name) {
  if (!name) return '?';
  const parts = name.trim().split(' ');
  return parts.length >= 2 ? parts[0][0] + parts[parts.length - 1][0] : parts[0][0];
}

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

function StarDisplay({ rating = 0 }) {
  return (
    <div className="stars-row">
      {[1,2,3,4,5].map(i => (
        <span key={i} className={`star star-static ${i <= Math.round(rating) ? 'filled' : ''}`}>★</span>
      ))}
    </div>
  );
}

const MIN_RATING_OPTIONS = [
  { value: 0, label: 'Any rating' },
  { value: 3, label: '3+ ★' },
  { value: 4, label: '4+ ★' },
  { value: 4.5, label: '4.5+ ★' },
];

export default function CoachesPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [filtered, setFiltered]     = useState([]);
  const [favourites, setFavourites] = useState(new Set());
  const [seekerProfileId, setSeekerProfileId] = useState(null);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState('');
  const [specialty, setSpecialty]   = useState('All');
  const [priceRange, setPriceRange] = useState('Any price');
  const [minRating, setMinRating]   = useState(0);
  const [searchDebounce, setSearchDebounce] = useState('');

  // Debounce search input
  useEffect(() => {
    const t = setTimeout(() => setSearchDebounce(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => { loadCoaches(); }, [searchDebounce, specialty, priceRange, minRating]); // eslint-disable-line
  useEffect(() => { if (user?.id) loadFavourites(); }, [user?.id]); // eslint-disable-line

  const loadFavourites = async () => {
    const { data: profile } = await supabase.from('seeker_profiles').select('id').eq('user_id', user.id).single();
    if (!profile) return;
    setSeekerProfileId(profile.id);
    const { data } = await supabase.from('favourites').select('coach_id').eq('seeker_id', profile.id);
    setFavourites(new Set((data || []).map(f => f.coach_id)));
  };

  const toggleFavourite = async (coachId) => {
    if (!seekerProfileId) return;
    if (favourites.has(coachId)) {
      await supabase.from('favourites').delete().eq('seeker_id', seekerProfileId).eq('coach_id', coachId);
      setFavourites(prev => { const s = new Set(prev); s.delete(coachId); return s; });
    } else {
      await supabase.from('favourites').insert({ seeker_id: seekerProfileId, coach_id: coachId });
      setFavourites(prev => new Set([...prev, coachId]));
    }
  };

  const loadCoaches = async () => {
    setLoading(true);
    try {
      let q = supabase.from('coach_profiles').select('*').eq('verified', true);

      // Server-side full-text search
      if (searchDebounce.trim()) {
        q = q.textSearch('search_vector', searchDebounce.trim(), { type: 'websearch' });
      }

      // Server-side price filter
      if (priceRange !== 'Any price') {
        if (priceRange === 'Under $100') q = q.lt('price_per_session', 100);
        else if (priceRange === '$100–$200') q = q.gte('price_per_session', 100).lte('price_per_session', 200);
        else if (priceRange === '$200+') q = q.gt('price_per_session', 200);
      }

      // Rating filter
      if (minRating > 0) q = q.gte('rating', minRating);

      q = q.order('rating', { ascending: false });

      const { data, error } = await q;
      if (error) throw error;
      let result = data || [];

      // Client-side specialty filter (array contains)
      if (specialty !== 'All') {
        result = result.filter(c =>
          c.specialties?.some(s => s.toLowerCase().includes(specialty.toLowerCase()))
        );
      }

      setFiltered(result);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const clearFilters = () => {
    setSearch('');
    setSpecialty('All');
    setPriceRange('Any price');
    setMinRating(0);
  };

  return (
    <AppLayout role="seeker">
      <SEO title="Find a Coach" description="Browse verified coaches on The Coaching Collective Online. Find your perfect match." />
      <div className="page-body">
        <div className="page-header">
          <div>
            <h1 className="page-title">Find a Coach</h1>
            <p className="page-subtitle">Work with expert coaches who match your goals</p>
          </div>
        </div>

        {/* Search */}
        <div className="search-wrap">
          <span className="search-icon">🔍</span>
          <input
            className="search-bar"
            placeholder="Search by name, specialty, or keyword…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {/* Specialty filter chips */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span className="section-label" style={{ marginBottom: 0 }}>SPECIALTY</span>
            <div className="chips-row">
              {SPECIALTIES.map(s => (
                <button
                  key={s}
                  className={`chip ${specialty === s ? 'chip-active' : ''}`}
                  onClick={() => setSpecialty(s)}
                >{s}</button>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span className="section-label" style={{ marginBottom: 0 }}>PRICE</span>
            <div className="chips-row">
              {PRICE_RANGES.map(p => (
                <button
                  key={p}
                  className={`chip ${priceRange === p ? 'chip-active' : ''}`}
                  onClick={() => setPriceRange(p)}
                >{p}</button>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span className="section-label" style={{ marginBottom: 0 }}>RATING</span>
            <div className="chips-row">
              {MIN_RATING_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  className={`chip ${minRating === opt.value ? 'chip-active' : ''}`}
                  onClick={() => setMinRating(opt.value)}
                >{opt.label}</button>
              ))}
            </div>
          </div>
        </div>

        {loading ? (
          <SkeletonCoachesGrid count={6} />
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <span className="empty-icon">👥</span>
            <p>No coaches found matching your filters.</p>
            <button className="btn btn-outline btn-sm" onClick={clearFilters}>Clear filters</button>
          </div>
        ) : (
          <>
            <p style={{ fontSize: '13px', color: 'var(--text-soft)' }}>
              {filtered.length} coach{filtered.length !== 1 ? 'es' : ''} found
            </p>
            <div className="coaches-grid">
              {filtered.map(coach => (
                <CoachCard
                  key={coach.id}
                  coach={coach}
                  onView={() => navigate(`/coaches/${coach.id}`)}
                  onBook={() => navigate(`/coaches/${coach.id}?book=true`)}
                  isFavourited={favourites.has(coach.id)}
                  onToggleFavourite={e => { e.stopPropagation(); toggleFavourite(coach.id); }}
                />
              ))}
            </div>
          </>
        )}
      </div>

      <style>{`
        .coaches-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 20px;
        }
        @media (max-width: 1100px) { .coaches-grid { grid-template-columns: repeat(2, 1fr); } }
        @media (max-width: 680px)  { .coaches-grid { grid-template-columns: 1fr; } }
        .coach-card {
          background: var(--card-bg);
          border: 1px solid var(--border-card);
          border-radius: var(--r-md);
          padding: 24px;
          box-shadow: var(--shadow-sm);
          display: flex;
          flex-direction: column;
          gap: 14px;
          transition: box-shadow .15s, transform .15s;
        }
        .coach-card:hover { box-shadow: 0 6px 20px rgba(0,0,0,.12); transform: translateY(-2px); }
        .coach-specialty-chip {
          background: #f0fdf4;
          color: #15803d;
          font-size: 11px;
          font-weight: 600;
          padding: 3px 8px;
          border-radius: 99px;
        }
      `}</style>
    </AppLayout>
  );
}

function CoachCard({ coach, onView, onBook, isFavourited, onToggleFavourite }) {
  const bg = avatarColor(coach.name);
  return (
    <div className="coach-card">
      {/* Top: avatar + name + title + verified */}
      <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
        <div
          className="avatar avatar-lg"
          style={{
            background: coach.avatar_url ? 'transparent' : bg,
            backgroundImage: coach.avatar_url ? `url(${coach.avatar_url})` : undefined,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            color: '#fff', fontWeight: 700, fontSize: '20px', flexShrink: 0,
          }}
        >
          {!coach.avatar_url && initials(coach.name)}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-h)' }}>{coach.name}</span>
            {coach.verified && <span className="badge badge-green">✓ Verified</span>}
          </div>
          <p style={{ fontSize: '13px', color: 'var(--text-soft)', marginTop: '2px' }}>{coach.title}</p>
        </div>
        <button
          onClick={onToggleFavourite}
          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '20px', padding: '4px', flexShrink: 0, lineHeight: 1 }}
          title={isFavourited ? 'Remove from saved' : 'Save coach'}
        >
          {isFavourited ? '❤️' : '🤍'}
        </button>
      </div>

      {/* Specialty chips */}
      {coach.specialties?.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
          {coach.specialties.slice(0, 3).map(s => (
            <span key={s} className="coach-specialty-chip">{s}</span>
          ))}
        </div>
      )}

      {/* Rating + price */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <StarDisplay rating={coach.rating || 0} />
          <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-b)' }}>
            {coach.rating ? Number(coach.rating).toFixed(1) : '—'}
          </span>
          {coach.review_count > 0 && (
            <span style={{ fontSize: '12px', color: 'var(--text-soft)' }}>({coach.review_count})</span>
          )}
        </div>
        <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-h)' }}>
          {coach.price_per_session ? `$${coach.price_per_session}` : 'Free'}
          <span style={{ fontSize: '12px', fontWeight: 400, color: 'var(--text-soft)' }}> / session</span>
        </span>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: '8px', paddingTop: '4px', borderTop: '1px solid var(--border-card)' }}>
        <button className="btn btn-outline btn-sm" style={{ flex: 1 }} onClick={onView}>View profile</button>
        <button className="btn btn-primary btn-sm" style={{ flex: 1 }} onClick={onBook}>Book now</button>
      </div>
    </div>
  );
}
