import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/useAuth';
import { supabase } from '../../lib/supabase';
import { ToastContainer } from '../shared/Toast';
import NotificationsDropdown from '../shared/NotificationsDropdown';
import Icon from '../../ui/Icon';
import './AppLayout.css';

const SEEKER_NAV = [
  { section: 'PRACTICE', items: [
    { icon: 'home',      label: 'Home',      to: '/dashboard' },
    { icon: 'coaches',   label: 'Coaches',   to: '/coaches' },
    { icon: 'sessions',  label: 'Sessions',  to: '/sessions' },
    { icon: 'messages',  label: 'Messages',  to: '/messages' },
    { icon: 'journal',   label: 'Journal',   to: '/journal' },
    { icon: 'library',   label: 'Library',   to: '/library' },
  ]},
  { section: 'GROWTH', items: [
    { icon: 'progress',  label: 'Progress',  to: '/progress' },
    { icon: 'saved',     label: 'Saved',     to: '/favourites' },
    { icon: 'community', label: 'Community', to: '/community' },
  ]},
];

const COACH_NAV = [
  { section: 'COACHING', items: [
    { icon: 'home',         label: 'Home',         to: '/coach/dashboard' },
    { icon: 'coaches',      label: 'Clients',      to: '/coach/clients' },
    { icon: 'sessions',     label: 'Sessions',     to: '/coach/sessions' },
    { icon: 'messages',     label: 'Messages',     to: '/coach/messages' },
    { icon: 'content',      label: 'Content',      to: '/coach/content' },
    { icon: 'availability', label: 'Availability', to: '/coach/availability' },
    { icon: 'earnings',     label: 'Earnings',     to: '/coach/earnings' },
    { icon: 'intake',       label: 'Intake Forms', to: '/coach/intake' },
    { icon: 'packages',     label: 'Packages',     to: '/coach/packages' },
  ]},
];

const ADMIN_NAV = [
  { section: 'PLATFORM', items: [
    { icon: 'overview',  label: 'Overview',   to: '/admin/dashboard' },
    { icon: 'progress',  label: 'Analytics',  to: '/admin/analytics' },
    { icon: 'coaches',   label: 'Coaches',    to: '/admin/coaches' },
    { icon: 'seekers',   label: 'Seekers',    to: '/admin/seekers' },
    { icon: 'sessions',  label: 'Sessions',   to: '/admin/sessions' },
    { icon: 'content',   label: 'Content',    to: '/admin/content' },
    { icon: 'whitelist', label: 'Whitelist',  to: '/admin/whitelist' },
  ]},
];

function getNavGroups(role) {
  if (role === 'coach') return COACH_NAV;
  if (role === 'admin') return ADMIN_NAV;
  return SEEKER_NAV;
}

function getSettingsPath(role) {
  if (role === 'coach') return '/coach/settings';
  if (role === 'admin') return null; // no admin settings page yet
  return '/settings';
}

export default function AppLayout({ children, role = 'seeker', seekerProfile, profileName, profileInitial, profileAvatar }) {
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [localProfile, setLocalProfile] = useState(null);
  const navGroups = getNavGroups(role);
  const tier = seekerProfile?.tier || '';

  React.useEffect(() => {
    if (!user?.id) return;
    if (profileName && profileAvatar) return;

    const fetchLocalProfile = async () => {
      try {
        if (role === 'seeker') {
          const { data } = await supabase
            .from('seeker_profiles')
            .select('name, avatar_url')
            .eq('user_id', user.id)
            .maybeSingle();
          if (data) setLocalProfile(data);
        } else if (role === 'coach') {
          const { data } = await supabase
            .from('coach_profiles')
            .select('name, avatar_url')
            .eq('user_id', user.id)
            .maybeSingle();
          if (data) setLocalProfile(data);
        }
      } catch (err) {
        console.error('Error fetching layout profile:', err);
      }
    };

    fetchLocalProfile();
  }, [user?.id, role, profileName, profileAvatar]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const avatar = profileAvatar || localProfile?.avatar_url;
  const displayName = profileName || localProfile?.name || user?.email?.split('@')[0] || 'User';
  const initial = profileInitial || displayName?.[0]?.toUpperCase() || '?';

  return (
    <div className="al-wrapper">
      {/* Skip to main content (a11y) */}
      <a href="#main-content" className="skip-link">Skip to main content</a>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="al-overlay" onClick={() => setMobileOpen(false)} />
      )}

      {/* Hamburger */}
      <button
        className="al-hamburger"
        onClick={() => setMobileOpen(v => !v)}
        aria-label="Toggle menu"
      >
        <span /><span /><span />
      </button>

      {/* ── Sidebar ── */}
      <aside className={`al-sidebar ${mobileOpen ? 'al-sidebar-open' : ''}`}>
        <div className="al-logo">
          <img src={`${import.meta.env.BASE_URL}logo-green-crop.png`} alt="The Coaching Collective" className="al-logo-img" />
        </div>

        <nav className="al-nav" role="navigation" aria-label="Main navigation">
          {navGroups.map(group => (
            <div key={group.section}>
              <p className="al-nav-label">{group.section}</p>
              <ul>
                {group.items.map(item => (
                  <li key={item.to}>
                    <NavLink
                      to={item.to}
                      end={item.to === '/dashboard' || item.to === '/coach/dashboard' || item.to === '/admin/dashboard'}
                      className={({ isActive }) =>
                        `al-nav-link${isActive ? ' al-nav-active' : ''}`
                      }
                      onClick={() => setMobileOpen(false)}
                    >
                      <Icon name={item.icon} size={17} />
                      {item.label}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>



        <div className="al-sidebar-footer">
          {getSettingsPath(role) && (
            <NavLink
              to={getSettingsPath(role)}
              className={({ isActive }) =>
                `al-nav-link${isActive ? ' al-nav-active' : ''}`
              }
              onClick={() => setMobileOpen(false)}
            >
              <Icon name="settings" size={17} /> Settings
            </NavLink>
          )}
          <button className="al-logout-btn" onClick={handleLogout}>
            <Icon name="logout" size={17} /> Sign out
          </button>
          <div className="al-profile-pill">
            <div
              className="avatar avatar-sm"
              style={avatar ? {
                backgroundImage: `url(${avatar})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              } : {}}
            >
              {!avatar && (initial || '?')}
            </div>
            <div>
              <p style={{fontSize:'13px',fontWeight:600,color:'rgba(255,255,255,.9)'}}>{displayName}</p>
              <p style={{fontSize:'11px',color:'rgba(255,255,255,.5)'}}>View profile</p>
            </div>
          </div>
        </div>
      </aside>

      {/* ── Main ── */}
      <main className="al-main" id="main-content">
        <div className="al-topbar">
          <NotificationsDropdown />
        </div>
        {children}
      </main>

      {/* ── Mobile bottom nav ── */}
      <nav className="al-bottom-nav" aria-label="Mobile navigation">
        {navGroups[0].items.slice(0, 5).map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/dashboard' || item.to === '/coach/dashboard' || item.to === '/admin/dashboard'}
            className={({ isActive }) => `al-bottom-item${isActive ? ' al-bottom-active' : ''}`}
            onClick={() => setMobileOpen(false)}
          >
            <span className="al-bottom-icon"><Icon name={item.icon} size={19} /></span>
            <span className="al-bottom-label">{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <ToastContainer />
    </div>
  );
}
