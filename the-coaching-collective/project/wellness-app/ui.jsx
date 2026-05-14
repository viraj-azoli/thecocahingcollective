/* global React */
// ============================================================
// UI Primitives: Icon, Avatar, helpers
// ============================================================

const Icon = ({ name, size = 18, stroke = 1.6, className = "", style = {} }) => {
  const props = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: stroke,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    className,
    style,
  };
  const paths = {
    home: <><path d="M3 11.5L12 4l9 7.5"/><path d="M5 10v10h14V10"/></>,
    compass: <><circle cx="12" cy="12" r="9"/><path d="M16 8l-2.5 5.5L8 16l2.5-5.5L16 8z"/></>,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 9h18M8 3v4M16 3v4"/></>,
    book: <><path d="M4 5a2 2 0 012-2h13v15H6a2 2 0 00-2 2V5z"/><path d="M4 18a2 2 0 002 2h13"/></>,
    library: <><path d="M5 4v16M9 4v16M13 4v16M17 6l2 14"/></>,
    chart: <><path d="M4 19V5"/><path d="M4 19h16"/><path d="M7 15l3-4 3 2 5-7"/></>,
    users: <><circle cx="9" cy="8" r="3.5"/><circle cx="17" cy="9" r="2.5"/><path d="M3 19c.5-3 3-5 6-5s5.5 2 6 5"/><path d="M14 15.5c1-1 2-1.5 3-1.5 2.2 0 4 1.5 4.5 4"/></>,
    user: <><circle cx="12" cy="8" r="3.5"/><path d="M5 20c1-4 4-6 7-6s6 2 7 6"/></>,
    search: <><circle cx="11" cy="11" r="6.5"/><path d="M16 16l4 4"/></>,
    bell: <><path d="M6 9a6 6 0 1112 0c0 5 2 6 2 6H4s2-1 2-6z"/><path d="M10 19a2 2 0 004 0"/></>,
    settings: <><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.6 1.6 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.6 1.6 0 00-1.8-.3 1.6 1.6 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.6 1.6 0 00-1-1.5 1.6 1.6 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.6 1.6 0 00.3-1.8 1.6 1.6 0 00-1.5-1H3a2 2 0 110-4h.1a1.6 1.6 0 001.5-1 1.6 1.6 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.6 1.6 0 001.8.3h.1a1.6 1.6 0 001-1.5V3a2 2 0 114 0v.1a1.6 1.6 0 001 1.5 1.6 1.6 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.6 1.6 0 00-.3 1.8v.1a1.6 1.6 0 001.5 1H21a2 2 0 110 4h-.1a1.6 1.6 0 00-1.5 1z"/></>,
    arrowRight: <><path d="M5 12h14M13 6l6 6-6 6"/></>,
    arrowLeft: <><path d="M19 12H5M11 6l-6 6 6 6"/></>,
    chevronRight: <path d="M9 6l6 6-6 6"/>,
    chevronLeft: <path d="M15 6l-6 6 6 6"/>,
    chevronDown: <path d="M6 9l6 6 6-6"/>,
    play: <path d="M6 4l14 8-14 8V4z" fill="currentColor"/>,
    pause: <><rect x="6" y="4" width="4" height="16" fill="currentColor"/><rect x="14" y="4" width="4" height="16" fill="currentColor"/></>,
    plus: <><path d="M12 5v14M5 12h14"/></>,
    check: <path d="M5 12l5 5L20 7"/>,
    checkCircle: <><circle cx="12" cy="12" r="9"/><path d="M8 12l3 3 5-6"/></>,
    heart: <path d="M12 21s-7-4.5-7-10a4 4 0 017-2.5A4 4 0 0119 11c0 5.5-7 10-7 10z"/>,
    star: <path d="M12 3l2.7 5.6 6 .9-4.4 4.3 1 6L12 17l-5.4 2.8 1-6L3.3 9.5l6-.9L12 3z"/>,
    filter: <><path d="M3 5h18M6 12h12M10 19h4"/></>,
    sparkle: <><path d="M12 3v5M12 16v5M3 12h5M16 12h5M6 6l3 3M15 15l3 3M6 18l3-3M15 9l3-3"/></>,
    leaf: <><path d="M11 20A7 7 0 014 13c0-2 1-7 7-9 0 5 7 5 7 13a7 7 0 01-7 3"/><path d="M4 21c4-6 9-7 13-9"/></>,
    moon: <path d="M21 13.5A9 9 0 1110.5 3 7 7 0 0021 13.5z"/>,
    sun: <><circle cx="12" cy="12" r="4"/><path d="M12 3v1.5M12 19.5V21M5 5l1 1M18 18l1 1M3 12h1.5M19.5 12H21M5 19l1-1M18 6l1-1"/></>,
    wind: <><path d="M3 8h12a3 3 0 100-6 3 3 0 00-3 3"/><path d="M3 14h17a3 3 0 110 6 3 3 0 01-3-3"/><path d="M3 11h8"/></>,
    bookmark: <path d="M6 4h12v17l-6-4-6 4V4z"/>,
    edit: <><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 113 3L7 19l-4 1 1-4L16.5 3.5z"/></>,
    clock: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
    video: <><rect x="3" y="6" width="13" height="12" rx="2"/><path d="M16 10l5-3v10l-5-3"/></>,
    mic: <><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0014 0"/><path d="M12 18v3"/></>,
    headphones: <><path d="M4 14v-2a8 8 0 0116 0v2"/><rect x="3" y="14" width="5" height="6" rx="1"/><rect x="16" y="14" width="5" height="6" rx="1"/></>,
    flame: <path d="M12 22c4 0 7-2.5 7-7 0-3-1.5-4-3-7-1-2-1-4-1-5 0 0-3 2-5 5s-3 5-3 7c0 4.5 1.5 7 5 7z"/>,
    target: <><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/></>,
    trophy: <><path d="M8 5h8v5a4 4 0 11-8 0V5z"/><path d="M5 7H3v2a3 3 0 003 3M19 7h2v2a3 3 0 01-3 3"/><path d="M9 16h6v3H9z"/><path d="M7 21h10"/></>,
    map: <><path d="M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2V6z"/><path d="M9 4v16M15 6v16"/></>,
    eye: <><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></>,
    download: <><path d="M12 4v12M7 11l5 5 5-5M5 20h14"/></>,
    grid: <><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></>,
    list: <><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/></>,
    sliders: <><path d="M4 6h6M14 6h6M4 12h2M10 12h10M4 18h12M20 18h0"/><circle cx="12" cy="6" r="2"/><circle cx="8" cy="12" r="2"/><circle cx="18" cy="18" r="2"/></>,
    pencil: <><path d="M16 3l5 5L8 21H3v-5L16 3z"/></>,
    flag: <><path d="M5 4v17"/><path d="M5 4h12l-2 4 2 4H5"/></>,
    coffee: <><path d="M4 8h14v6a5 5 0 01-5 5h-4a5 5 0 01-5-5V8z"/><path d="M18 9h2a3 3 0 010 6h-2"/><path d="M7 3v2M11 3v2M15 3v2"/></>,
    smile: <><circle cx="12" cy="12" r="9"/><path d="M9 14s1 2 3 2 3-2 3-2"/><path d="M9 9.5h.01M15 9.5h.01"/></>,
    activity: <path d="M3 12h4l3-8 4 16 3-8h4"/>,
  };
  return <svg {...props}>{paths[name] || null}</svg>;
};

const Avatar = ({ name, src, size = 36, ring }) => {
  const initials = name ? name.split(/\s+/).map(p => p[0]).slice(0, 2).join("").toUpperCase() : "?";
  const styles = {
    width: size,
    height: size,
    fontSize: Math.max(10, size * 0.36),
    boxShadow: ring ? `0 0 0 2px ${ring}, 0 0 0 4px var(--white)` : undefined,
  };
  return (
    <div className="avatar" style={styles}>
      {src ? <img src={src} alt={name} onError={(e)=>{e.currentTarget.style.display='none';}}/> : initials}
    </div>
  );
};

const Rating = ({ value = 4.8, count, size = 12 }) => (
  <span style={{ display:'inline-flex', alignItems:'center', gap:4, fontSize:size }}>
    <Icon name="star" size={size+2} stroke={0} style={{ fill: '#D4A45A', color: '#D4A45A' }}/>
    <span style={{ fontWeight:600 }}>{value}</span>
    {count != null && <span style={{ color:'var(--gray)' }}>({count})</span>}
  </span>
);

const ProgressBar = ({ value = 0, color = "var(--green)", track = "var(--cream-dark)" }) => (
  <div style={{ height:4, background:track, borderRadius:2, overflow:'hidden' }}>
    <div style={{ height:'100%', width:`${Math.min(100, value)}%`, background:color, transition:'width .35s ease' }}/>
  </div>
);

Object.assign(window, { Icon, Avatar, Rating, ProgressBar });
