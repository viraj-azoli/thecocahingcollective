import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/useAuth';
import { ToastContainer } from '../shared/Toast';
import NotificationsDropdown from '../Shared/NotificationsDropdown';
import './AppLayout.css';

const SEEKER_NAV = [
  { section: 'PRACTICE', items: [
    { icon: '🏠', label: 'Home',      to: '/dashboard' },
    { icon: '👥', label: 'Coaches',   to: '/coaches' },
    { icon: '📅', label: 'Sessions',  to: '/sessions' },
    { icon: '💬', label: 'Messages',  to: '/messages' },
    { icon: '📓', label: 'Journal',   to: '/journal' },
    { icon: '📚', label: 'Library',   to: '/library' },
  ]},
  { section: 'GROWTH', items: [
    { icon: '📈', label: 'Progress',  to: '/progress' },
    { icon: '❤️', label: 'Saved',     to: '/favourites' },
    { icon: '🤝', label: 'Community', to: '/community' },
  ]},
];

const COACH_NAV = [
  { section: 'COACHING', items: [
    { icon: '🏠', label: 'Home',         to: '/coach/dashboard' },
    { icon: '👥', label: 'Clients',      to: '/coach/clients' },
    { icon: '📅', label: 'Sessions',     to: '/coach/sessions' },
    { icon: '💬', label: 'Messages',     to: '/coach/messages' },
    { icon: '📚', label: 'Content',      to: '/coach/content' },
    { icon: '🗓️', label: 'Availability', to: '/coach/availability' },
    { icon: '💰', label: 'Earnings',     to: '/coach/earnings' },
    { icon: '📋', label: 'Intake Forms', to: '/coach/intake' },
    { icon: '📦', label: 'Packages',     to: '/coach/packages' },
  ]},
];

const ADMIN_NAV = [
  { section: 'PLATFORM', items: [
    { icon: '📊', label: 'Overview',   to: '/admin/dashboard' },
    { icon: '📈', label: 'Analytics',  to: '/admin/analytics' },
    { icon: '👥', label: 'Coaches',    to: '/admin/coaches' },
    { icon: '🧭', label: 'Seekers',    to: '/admin/seekers' },
    { icon: '📅', label: 'Sessions',   to: '/admin/sessions' },
    { icon: '📚', label: 'Content',    to: '/admin/content' },
  ]},
];

function getNavGroups(role) {
  if (role === 'coach') return COACH_NAV;
  if (role === 'admin') return ADMIN_NAV;
  return SEEKER_NAV;
}

function getSettingsPath(role) {
  if (role === 'coach') return '/coach/settings';
  if (role === 'admin') return '/admin/settings';
  return '/settings';
}

export default function AppLayout({ children, role = 'seeker', seekerProfile, profileName, profileInitial, profileAvatar }) {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const navGroups = getNavGroups(role);
  const tier = seekerProfile?.tier || '';

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

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
          <span className="al-logo-mark">TCCO</span>
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
                      <span>{item.icon}</span>
                      {item.label}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>

        {role === 'seeker' && tier && (
          <div className="al-membership">
            <p className="al-membership-label">MEMBERSHIP</p>
            <p className="al-membership-tier">{tier}</p>
            <NavLink to="/settings" className="al-upgrade-btn">⬆ Upgrade plan</NavLink>
          </div>
        )}

        <div className="al-sidebar-footer">
          <NavLink
            to={getSettingsPath(role)}
            className={({ isActive }) =>
              `al-nav-link${isActive ? ' al-nav-active' : ''}`
            }
            onClick={() => setMobileOpen(false)}
          >
            <span>⚙️</span> Settings
          </NavLink>
          <button className="al-logout-btn" onClick={handleLogout}>
            <span>🚪</span> Sign out
          </button>
          <div className="al-profile-pill">
            <div
              className="avatar avatar-sm"
              style={profileAvatar ? {
                backgroundImage: `url(${profileAvatar})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              } : {}}
            >
              {!profileAvatar && (profileInitial || '?')}
            </div>
            <div>
              <p style={{fontSize:'13px',fontWeight:600,color:'rgba(255,255,255,.9)'}}>{profileName || 'User'}</p>
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
            <span className="al-bottom-icon">{item.icon}</span>
            <span className="al-bottom-label">{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <ToastContainer />
    </div>
  );
}
