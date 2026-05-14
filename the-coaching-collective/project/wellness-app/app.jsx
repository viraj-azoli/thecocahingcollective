/* global React, ReactDOM, Icon, Avatar, Dashboard, Coaches, CoachProfile, SessionsScreen, JournalScreen, LibraryScreen, ProgressScreen, CommunityScreen, COACHES */
const { useState: useStateApp } = React;

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Home',       icon: 'home',     title: 'Good morning, Amara',     crumb: 'Today · Thursday, May 14' },
  { id: 'coaches',   label: 'Coaches',    icon: 'users',    title: 'Wellness professionals',  crumb: 'Browse' },
  { id: 'sessions',  label: 'Sessions',   icon: 'calendar', title: 'Your sessions',           crumb: 'My calendar', badge: '1' },
  { id: 'journal',   label: 'Journal',    icon: 'edit',     title: 'Journal',                 crumb: 'Daily practice' },
  { id: 'library',   label: 'Library',    icon: 'library',  title: 'Practice library',        crumb: 'Audio, programs & essays' },
  { id: 'progress',  label: 'Progress',   icon: 'chart',    title: 'Your progress',           crumb: 'Insights' },
  { id: 'community', label: 'Community',  icon: 'compass',  title: 'Circles & community',     crumb: 'Members only' },
];

const App = () => {
  const [route, setRoute] = useStateApp('dashboard');
  const [coach, setCoach] = useStateApp(null);

  const openCoach = (c) => { setCoach(c); setRoute('coach'); };
  const go = (r) => { setRoute(r); setCoach(null); };

  let current = NAV_ITEMS.find(n => n.id === route) || NAV_ITEMS[0];
  if (route === 'coach') current = { id:'coach', icon:'user', title: coach?.name || 'Coach profile', crumb: 'Wellness professional' };

  const renderScreen = () => {
    switch (route) {
      case 'dashboard': return <Dashboard go={go}/>;
      case 'coaches':   return <Coaches go={go} openCoach={openCoach}/>;
      case 'coach':     return <CoachProfile coach={coach} back={() => go('coaches')}/>;
      case 'sessions':  return <SessionsScreen/>;
      case 'journal':   return <JournalScreen/>;
      case 'library':   return <LibraryScreen/>;
      case 'progress':  return <ProgressScreen/>;
      case 'community': return <CommunityScreen/>;
      default:          return <Dashboard go={go}/>;
    }
  };

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">tcc</div>
          <div className="brand-text">
            The Coaching<br/>
            <strong>Collective</strong>
          </div>
        </div>

        <div className="nav-section">
          <div className="nav-label">Practice</div>
          {NAV_ITEMS.slice(0,5).map(item => (
            <div key={item.id}
              className={`nav-item ${route===item.id ? 'active' : ''}`}
              onClick={() => go(item.id)}>
              <Icon name={item.icon}/> <span>{item.label}</span>
              {item.badge && <span className="badge">{item.badge}</span>}
            </div>
          ))}
        </div>

        <div className="nav-section">
          <div className="nav-label">Growth</div>
          {NAV_ITEMS.slice(5).map(item => (
            <div key={item.id}
              className={`nav-item ${route===item.id ? 'active' : ''}`}
              onClick={() => go(item.id)}>
              <Icon name={item.icon}/> <span>{item.label}</span>
              {item.badge && <span className="badge">{item.badge}</span>}
            </div>
          ))}
        </div>

        <div className="sidebar-footer">
          <div className="tier-card">
            <div className="tier-label">Membership</div>
            <div className="tier-name">Practitioner</div>
            <div className="tier-meta">5 of 8 sessions used · this month</div>
            <div className="tier-bar"><div/></div>
            <button className="btn btn-sm" style={{background:'var(--cream)',color:'var(--green)',marginTop:14,width:'100%',padding:'7px 14px'}}>
              <Icon name="sparkle" size={11}/> Upgrade plan
            </button>
          </div>
          <div className="nav-item" style={{marginTop:10}}>
            <Icon name="settings"/> <span>Settings</span>
          </div>
        </div>
      </aside>

      <div className="main-col">
        <header className="topbar">
          <div className="topbar-title">
            <span className="crumb">{current.crumb}</span>
            <h1>{current.title}</h1>
          </div>

          <div className="search">
            <Icon name="search" size={14}/>
            <input placeholder="Search coaches, practices, journal entries..."/>
            <span style={{fontSize:10,letterSpacing:'0.08em',color:'var(--gray-light)',padding:'2px 6px',border:'1px solid var(--cream-dark)',borderRadius:4,fontWeight:600}}>⌘K</span>
          </div>

          <div className="topbar-actions">
            <button className="icon-btn"><Icon name="bell" size={16}/><span className="dot"/></button>
            <button className="icon-btn"><Icon name="bookmark" size={16}/></button>
            <div className="user-chip">
              <Avatar name="Amara Hale" size={30}/>
              <span className="name">Amara</span>
              <Icon name="chevronDown" size={11} style={{color:'var(--gray)'}}/>
            </div>
          </div>
        </header>

        <div className="screen-wrap">
          <div className="screen">
            {renderScreen()}
          </div>
        </div>
      </div>
    </div>
  );
};

ReactDOM.createRoot(document.getElementById('root')).render(<App/>);
