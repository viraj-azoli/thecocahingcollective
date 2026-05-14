/* global React, Icon, Avatar, Rating, ProgressBar, COACHES, SESSIONS_UPCOMING, SESSIONS_PAST, JOURNAL_ENTRIES, PROGRAMS, PROMPTS, MILESTONES */
const { useState, useMemo } = React;

// ============================================================
// DASHBOARD
// ============================================================
const Dashboard = ({ go }) => {
  const [mood, setMood] = useState(3);
  const moods = [
    { i:1, l:'Low' }, { i:2, l:'Off' }, { i:3, l:'Okay' }, { i:4, l:'Good' }, { i:5, l:'Bright' }
  ];
  const top = SESSIONS_UPCOMING[0];

  return (
    <div>
      {/* Hero */}
      <section className="greet-hero">
        <div style={{ position:'relative', zIndex:1 }}>
          <div className="greet-eye">Thursday · May 14</div>
          <h2>Good morning, Amara.<br/>One small thing today.</h2>
          <p>You’ve been showing up. Maya noted your last session felt like a hinge — keep the door open today.</p>
          <div className="greet-cta">
            <button className="btn btn-primary" onClick={()=>go('sessions')}>
              <Icon name="video" size={14}/> Join 09:30 session
            </button>
            <button className="btn btn-ghost" onClick={()=>go('journal')}>
              <Icon name="edit" size={14}/> Write a check-in
            </button>
          </div>
        </div>

        <div className="intention-card">
          <div className="ic-label">Today’s intention</div>
          <div className="ic-text">"I don’t have to earn rest. I can just take it."</div>
          <div className="ic-meta">
            <span>Set 06:42 this morning</span>
            <button>Edit</button>
          </div>
        </div>
      </section>

      {/* Stats */}
      <div className="dash-grid">
        <div className="stat-card">
          <div className="stat-top">
            <div className="stat-icon"><Icon name="flame" size={16}/></div>
            <span className="stat-trend"><Icon name="arrowRight" size={10} style={{transform:'rotate(-45deg)'}}/> +3</span>
          </div>
          <div className="stat-value">21</div>
          <div className="stat-label">Day streak</div>
          <div className="spark">
            <span style={{height:'30%'}}/><span style={{height:'55%'}}/><span style={{height:'40%'}} className="hi"/>
            <span style={{height:'70%'}} className="hi"/><span style={{height:'90%'}} className="hi"/>
            <span style={{height:'85%'}} className="hi"/><span style={{height:'100%'}} className="hi"/>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-top">
            <div className="stat-icon"><Icon name="clock" size={16}/></div>
            <span className="stat-trend">+12%</span>
          </div>
          <div className="stat-value">4h 28m</div>
          <div className="stat-label">Practice this week</div>
          <div className="stat-sub">62 min ahead of last week</div>
        </div>

        <div className="stat-card">
          <div className="stat-top">
            <div className="stat-icon"><Icon name="users" size={16}/></div>
          </div>
          <div className="stat-value">9</div>
          <div className="stat-label">Sessions completed</div>
          <div className="stat-sub">Next milestone: 10</div>
        </div>

        <div className="stat-card cream-bg">
          <div className="stat-top">
            <div className="stat-icon warm" style={{background:'#FCE9E2',color:'var(--accent)'}}><Icon name="heart" size={16}/></div>
          </div>
          <div className="stat-value">6.8<span style={{fontSize:14,color:'var(--gray)'}}> / 10</span></div>
          <div className="stat-label">Avg mood · 14 days</div>
          <div className="stat-sub" style={{color:'var(--green-2)'}}>Trending up from 5.4</div>
        </div>
      </div>

      {/* Session + mood check-in */}
      <div className="split-2">
        <div className="session-strip">
          <div className="session-time">
            <div className="day">Thu · today</div>
            <div className="hour">09:30</div>
            <div className="dur">55 min</div>
          </div>
          <div className="session-coach">
            <Avatar name={top.coach} src={top.img} size={48}/>
            <div className="session-info">
              <div className="title">{top.title}</div>
              <div className="meta">with {top.coach} · {top.mode}</div>
            </div>
          </div>
          <div className="session-actions">
            <button className="btn btn-soft btn-sm">Prep notes</button>
            <button className="btn btn-primary btn-sm"><Icon name="video" size={12}/> Join</button>
          </div>
        </div>

        <div className="card mood-card">
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
            <div>
              <div className="eyebrow">Daily check-in</div>
              <div style={{fontWeight:600,fontSize:14,marginTop:4}}>How are you arriving today?</div>
            </div>
            <button className="btn btn-soft btn-sm" style={{padding:'4px 10px'}}>Skip</button>
          </div>
          <div className="mood-options">
            {moods.map(m => (
              <button key={m.i} className={`m${m.i} ${mood===m.i?'on':''}`} onClick={()=>setMood(m.i)}>
                <span className="mood-circle"/>
                {m.l}
              </button>
            ))}
          </div>
          <button className="btn btn-ghost btn-sm" style={{width:'100%'}}>Add a note <Icon name="arrowRight" size={11}/></button>
        </div>
      </div>

      {/* Quick actions */}
      <div className="section-head" style={{marginTop:28}}>
        <h3 className="section-title">Quick paths</h3>
      </div>
      <div className="split-3" style={{marginBottom:28}}>
        <div className="action-tile" onClick={()=>go('library')}>
          <div className="at-icon"><Icon name="wind" size={20}/></div>
          <h4>Five-minute breath</h4>
          <p>Soft landing for the morning. Today’s pick: 4-7-8 with Priya.</p>
        </div>
        <div className="action-tile tan" onClick={()=>go('coaches')}>
          <div className="at-icon"><Icon name="users" size={20}/></div>
          <h4>Find a coach</h4>
          <p>62 wellness professionals available. Filter by specialty, format, fit.</p>
        </div>
        <div className="action-tile dark" onClick={()=>go('journal')}>
          <div className="at-icon"><Icon name="edit" size={20}/></div>
          <h4>Open the journal</h4>
          <p>Today’s prompt: <em>What did you let go of today?</em></p>
        </div>
      </div>

      {/* Recommended */}
      <div className="section-head">
        <h3 className="section-title">Curated for you this week</h3>
        <a className="link" onClick={()=>go('library')}>See library →</a>
      </div>
      <div className="split-3">
        <div className="rec-card" onClick={()=>go('library')}>
          <div className="rc-img" style={{background:'linear-gradient(135deg, var(--green-2), var(--green))'}}>
            <span className="rc-tag">Audio · 12 min</span>
          </div>
          <div className="rc-body">
            <div className="rc-title">A grounded morning, even when it isn’t</div>
            <div className="rc-meta">With Lin Marchetti <span className="dot-sep"/> Somatic</div>
          </div>
        </div>
        <div className="rec-card">
          <div className="rc-img" style={{background:'linear-gradient(135deg, #C7A674, var(--accent))'}}>
            <span className="rc-tag">Article · 6 min read</span>
          </div>
          <div className="rc-body">
            <div className="rc-title">The art of the small no</div>
            <div className="rc-meta">From the Journal <span className="dot-sep"/> Boundaries</div>
          </div>
        </div>
        <div className="rec-card">
          <div className="rc-img" style={{background:'linear-gradient(135deg, var(--ink), var(--green-2))'}}>
            <span className="rc-tag">Live · Tue 18:00</span>
          </div>
          <div className="rc-body">
            <div className="rc-title">Circle: Working women navigating change</div>
            <div className="rc-meta">Group of 8 <span className="dot-sep"/> 4 spots left</div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================
// COACHES BROWSE
// ============================================================
const Coaches = ({ go, openCoach }) => {
  const [active, setActive] = useState('All');
  const filters = ['All','Anxiety','Burnout','Relationships','Performance','Sleep','Somatic','Men’s work'];

  const filtered = useMemo(() => {
    if (active === 'All') return COACHES;
    return COACHES.filter(c => c.tags.some(t => t.toLowerCase().includes(active.toLowerCase())));
  }, [active]);

  return (
    <div>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-end',marginBottom:18}}>
        <div>
          <div className="eyebrow">62 wellness professionals</div>
          <h2 style={{fontFamily:'var(--serif)',fontStyle:'italic',fontSize:32,fontWeight:500,margin:'6px 0 0',color:'var(--ink)',letterSpacing:'-0.01em'}}>Find someone who gets it.</h2>
        </div>
        <div style={{display:'flex',gap:8}}>
          <button className="btn btn-soft btn-sm"><Icon name="grid" size={12}/> Grid</button>
          <button className="btn btn-ghost btn-sm"><Icon name="list" size={12}/> List</button>
          <button className="btn btn-ghost btn-sm"><Icon name="sliders" size={12}/> More filters</button>
        </div>
      </div>

      <div className="filter-bar">
        <span className="fb-label">Specialty</span>
        {filters.map(f => (
          <button key={f} className={`filter-chip ${active===f?'active':''}`} onClick={()=>setActive(f)}>{f}</button>
        ))}
        <div className="right">
          <span className="fb-label" style={{marginLeft:8}}>Sort</span>
          <button className="filter-chip">Best fit <Icon name="chevronDown" size={11}/></button>
        </div>
      </div>

      <div className="coach-grid">
        {filtered.map(c => (
          <div key={c.id} className="coach-card" onClick={()=>openCoach(c)}>
            <div className="cc-img">
              <img src={c.img} alt={c.name} onError={(e)=>e.currentTarget.style.display='none'}/>
              <div className="cc-fav"><Icon name="bookmark" size={14}/></div>
              <div className="cc-avail">
                <span className="pulse"/>
                {c.available}
              </div>
            </div>
            <div className="cc-body">
              <div className="cc-name">
                <span>{c.name}</span>
                <span className="price">${c.price}<small>/session</small></span>
              </div>
              <div className="cc-title">{c.title}</div>
              <div className="cc-tags">
                {c.tags.map(t => <span key={t} className="chip green">{t}</span>)}
              </div>
              <div className="cc-foot">
                <Rating value={c.rating} count={c.reviews}/>
                <span style={{fontSize:11,color:'var(--gray)'}}>{c.format}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ============================================================
// COACH PROFILE + BOOKING
// ============================================================
const CoachProfile = ({ coach, back }) => {
  const [tab, setTab] = useState('about');
  const [step, setStep] = useState(1);
  const [selDate, setSelDate] = useState(14);
  const [selTime, setSelTime] = useState('09:30');

  if (!coach) coach = COACHES[0];

  return (
    <div>
      <button onClick={back} className="btn btn-soft btn-sm" style={{marginBottom:16}}>
        <Icon name="chevronLeft" size={12}/> Back to coaches
      </button>

      <div className="profile-hero">
        <div className="ph-img">
          <img src={coach.img} alt={coach.name} onError={(e)=>e.currentTarget.style.display='none'}/>
        </div>
        <div className="ph-body">
          <div className="ph-row">
            <div>
              <div className="eyebrow">{coach.tags.join(' · ')}</div>
              <h2>{coach.name}</h2>
              <div className="ph-title">{coach.title}</div>
              <div className="ph-cred">
                {(coach.credentials || ['PhD, Clinical Psychology','SEP — Somatic Experiencing','12 yrs practice']).map(cr => (
                  <span key={cr}><Icon name="checkCircle" size={13} style={{color:'var(--green-2)'}}/> {cr}</span>
                ))}
              </div>
            </div>
            <div className="ph-price">
              <div className="num">${coach.price}</div>
              <div className="lbl">per session</div>
              <Rating value={coach.rating} count={coach.reviews}/>
            </div>
          </div>
          <div className="ph-bio">
            {coach.bio || "Maya blends somatic experiencing, polyvagal theory, and traditional coaching to help you reconnect with your body’s wisdom. After 12 years in clinical psychology, she now works exclusively with high-performing women navigating burnout, identity shifts, and reclaiming their voice."}
          </div>
          <div className="ph-actions">
            <button className="btn btn-primary btn-lg">Book a session <Icon name="arrowRight" size={13}/></button>
            <button className="btn btn-ghost"><Icon name="bookmark" size={13}/> Save</button>
            <button className="btn btn-ghost"><Icon name="users" size={13}/> Free 15-min intro</button>
          </div>
        </div>
      </div>

      <div className="tabs">
        <button className={tab==='about'?'on':''} onClick={()=>setTab('about')}>About & approach</button>
        <button className={tab==='book'?'on':''} onClick={()=>setTab('book')}>Book a session</button>
        <button className={tab==='reviews'?'on':''} onClick={()=>setTab('reviews')}>Reviews ({coach.reviews})</button>
      </div>

      {tab === 'about' && <AboutTab coach={coach}/>}
      {tab === 'book' && (
        <BookingPane step={step} setStep={setStep} selDate={selDate} setSelDate={setSelDate} selTime={selTime} setSelTime={setSelTime} coach={coach}/>
      )}
      {tab === 'reviews' && <ReviewsTab coach={coach}/>}
    </div>
  );
};

const AboutTab = ({ coach }) => (
  <div className="split-2">
    <div className="card">
      <h4 className="section-title" style={{marginBottom:12}}>What we work on together</h4>
      {[
        { t:'When the high-functioning surface starts to crack', d:'You’re still delivering. People still rely on you. But there’s a hollowness that’s getting louder.' },
        { t:'The body remembers what you’ve been ignoring', d:'Tight jaw, shallow breath, a chest that won’t soften. We slow down enough to listen.' },
        { t:'Choosing yourself without making yourself the villain', d:'Boundaries, identity, the people-pleaser inside. Practical, not preachy.' },
      ].map(x => (
        <div key={x.t} style={{padding:'14px 0',borderBottom:'1px solid var(--cream-dark)'}}>
          <div style={{display:'flex',gap:12,alignItems:'flex-start'}}>
            <div style={{width:28,height:28,borderRadius:'50%',background:'var(--green-soft)',color:'var(--green)',display:'grid',placeItems:'center',flexShrink:0}}>
              <Icon name="leaf" size={14}/>
            </div>
            <div>
              <div style={{fontWeight:600,fontSize:13,marginBottom:3}}>{x.t}</div>
              <div style={{fontSize:12,color:'var(--gray)',lineHeight:1.6}}>{x.d}</div>
            </div>
          </div>
        </div>
      ))}
    </div>

    <div style={{display:'flex',flexDirection:'column',gap:16}}>
      <div className="card">
        <div className="eyebrow" style={{marginBottom:8}}>Session format</div>
        <div style={{display:'flex',gap:10,flexWrap:'wrap'}}>
          <span className="chip green"><Icon name="video" size={11}/> Video</span>
          <span className="chip green"><Icon name="mic" size={11}/> Voice only</span>
          <span className="chip"><Icon name="map" size={11}/> In-person (London)</span>
        </div>
        <div style={{marginTop:16,fontSize:12,color:'var(--gray)',lineHeight:1.65}}>
          50–55 minute sessions. Weekly or fortnightly. Includes a shared notes space and one async voice note between sessions.
        </div>
      </div>

      <div className="card">
        <div className="eyebrow" style={{marginBottom:8}}>Languages</div>
        <div style={{fontSize:13}}>English · Português · Italiano</div>
      </div>

      <div className="card" style={{background:'var(--cream-mid)'}}>
        <div className="eyebrow" style={{marginBottom:6,color:'var(--green)'}}>From recent clients</div>
        <div style={{fontFamily:'var(--serif)',fontStyle:'italic',fontSize:18,lineHeight:1.4,color:'var(--ink)',marginBottom:8}}>
          "She didn’t fix me. She helped me hear what I’d been telling myself for years."
        </div>
        <div style={{fontSize:11,color:'var(--gray)'}}>R. — 8 months in</div>
      </div>
    </div>
  </div>
);

const BookingPane = ({ step, setStep, selDate, setSelDate, selTime, setSelTime, coach }) => {
  const services = [
    { n:'Single session', dur:'55 min', price:`$${coach.price}`, desc:'One-time, no commitment' },
    { n:'Monthly · 4 sessions', dur:'55 min × 4', price:`$${coach.price*4-60}`, desc:'Weekly cadence', best:true },
    { n:'Intensive · 12 sessions', dur:'3 months program', price:`$${coach.price*12-300}`, desc:'Deeper work, defined arc' },
  ];
  const times = ['07:00','07:30','08:00','08:30','09:00','09:30','10:00','10:30','14:00','14:30','15:00','16:00','16:30','17:00','17:30','18:00'];
  const busy = new Set(['08:00','10:30','15:00','17:30']);

  return (
    <div className="booking-pane">
      <div className="steps">
        <div className={`step ${step>1?'done':''} ${step===1?'active':''}`}>
          <div className="s-num">{step>1?'✓':'1'}</div>
          <div className="s-label">Choose service</div>
          <div className="s-bar"/>
        </div>
        <div className={`step ${step>2?'done':''} ${step===2?'active':''}`}>
          <div className="s-num">{step>2?'✓':'2'}</div>
          <div className="s-label">Pick a time</div>
          <div className="s-bar"/>
        </div>
        <div className={`step ${step===3?'active':''}`}>
          <div className="s-num">3</div>
          <div className="s-label">Confirm</div>
          <div className="s-bar"/>
        </div>
      </div>

      {step === 1 && (
        <div>
          <h4 style={{fontSize:14,fontWeight:600,marginBottom:14}}>How would you like to work with {coach.name.split(' ')[0]}?</h4>
          <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:14}}>
            {services.map((s,i) => (
              <div key={i} style={{
                background: s.best ? 'var(--green-soft)' : 'var(--off-white)',
                border:`1px solid ${s.best?'var(--green-3)':'var(--cream-dark)'}`,
                borderRadius:'var(--r-lg)',
                padding:20,
                cursor:'pointer',
                position:'relative',
              }} onClick={()=>setStep(2)}>
                {s.best && <span style={{position:'absolute',top:-8,right:14,background:'var(--green)',color:'var(--cream)',fontSize:9,fontWeight:700,letterSpacing:'0.1em',padding:'3px 8px',borderRadius:999,textTransform:'uppercase'}}>Most chosen</span>}
                <div style={{fontSize:13,fontWeight:600,marginBottom:4}}>{s.n}</div>
                <div style={{fontSize:11,color:'var(--gray)',marginBottom:14}}>{s.dur} · {s.desc}</div>
                <div style={{fontFamily:'var(--serif)',fontSize:28,fontWeight:500,color:'var(--green)',letterSpacing:'-0.01em'}}>{s.price}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {step === 2 && (
        <div style={{display:'grid',gridTemplateColumns:'1.1fr 1fr',gap:24}}>
          <div>
            <h4 style={{fontSize:14,fontWeight:600,marginBottom:14}}>Available times</h4>
            <Calendar selDate={selDate} setSelDate={setSelDate}/>
          </div>
          <div>
            <h4 style={{fontSize:14,fontWeight:600,marginBottom:14}}>Thursday, May {selDate}</h4>
            <div className="time-grid">
              {times.map(t => (
                <div key={t} className={`time-slot ${busy.has(t)?'busy':''} ${selTime===t && !busy.has(t)?'selected':''}`} onClick={()=>!busy.has(t) && setSelTime(t)}>
                  {t}
                </div>
              ))}
            </div>
            <div style={{marginTop:20,display:'flex',gap:8,justifyContent:'space-between'}}>
              <button className="btn btn-ghost btn-sm" onClick={()=>setStep(1)}><Icon name="chevronLeft" size={11}/> Back</button>
              <button className="btn btn-primary" onClick={()=>setStep(3)}>Continue <Icon name="arrowRight" size={12}/></button>
            </div>
          </div>
        </div>
      )}

      {step === 3 && (
        <div style={{display:'grid',gridTemplateColumns:'1.4fr 1fr',gap:24}}>
          <div className="card" style={{background:'var(--off-white)'}}>
            <div className="eyebrow" style={{marginBottom:14}}>Review your booking</div>
            <div style={{display:'flex',alignItems:'center',gap:14,paddingBottom:16,borderBottom:'1px solid var(--cream-dark)'}}>
              <Avatar name={coach.name} src={coach.img} size={56}/>
              <div>
                <div style={{fontSize:14,fontWeight:600}}>{coach.name}</div>
                <div style={{fontSize:12,color:'var(--gray)'}}>{coach.title}</div>
              </div>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16,marginTop:16}}>
              <div>
                <div className="eyebrow" style={{marginBottom:4}}>Date</div>
                <div style={{fontSize:14,fontWeight:600}}>Thu, May {selDate}, 2026</div>
              </div>
              <div>
                <div className="eyebrow" style={{marginBottom:4}}>Time</div>
                <div style={{fontSize:14,fontWeight:600}}>{selTime} · 55 min</div>
              </div>
              <div>
                <div className="eyebrow" style={{marginBottom:4}}>Format</div>
                <div style={{fontSize:14,fontWeight:600}}>Video session</div>
              </div>
              <div>
                <div className="eyebrow" style={{marginBottom:4}}>Package</div>
                <div style={{fontSize:14,fontWeight:600}}>Single session</div>
              </div>
            </div>
            <div style={{marginTop:16,paddingTop:14,borderTop:'1px solid var(--cream-dark)'}}>
              <label style={{fontSize:12,color:'var(--gray)',fontWeight:500,display:'block',marginBottom:6}}>Optional · A note for {coach.name.split(' ')[0]}</label>
              <textarea placeholder="What’s alive for you right now?" style={{width:'100%',minHeight:80,padding:12,fontSize:13,border:'1px solid var(--cream-dark)',borderRadius:'var(--r)',background:'var(--white)',resize:'vertical',fontFamily:'var(--sans)',outline:'none'}}></textarea>
            </div>
          </div>

          <div>
            <div className="card">
              <div style={{display:'flex',justifyContent:'space-between',padding:'8px 0'}}>
                <span style={{fontSize:13}}>Session</span>
                <span style={{fontSize:13,fontWeight:600}}>${coach.price}.00</span>
              </div>
              <div style={{display:'flex',justifyContent:'space-between',padding:'8px 0',color:'var(--green-2)'}}>
                <span style={{fontSize:13}}>Member discount</span>
                <span style={{fontSize:13,fontWeight:600}}>−$20.00</span>
              </div>
              <div style={{display:'flex',justifyContent:'space-between',padding:'14px 0 0',borderTop:'1px solid var(--cream-dark)',marginTop:8}}>
                <span style={{fontSize:13,fontWeight:600}}>Total</span>
                <span style={{fontFamily:'var(--serif)',fontSize:22,fontWeight:500,color:'var(--green)'}}>${coach.price-20}.00</span>
              </div>
              <button className="btn btn-primary btn-lg" style={{width:'100%',marginTop:14}}>Confirm booking</button>
              <button className="btn btn-ghost btn-sm" style={{width:'100%',marginTop:8}} onClick={()=>setStep(2)}>Back to times</button>
            </div>
            <div style={{fontSize:11,color:'var(--gray)',marginTop:12,textAlign:'center',lineHeight:1.6}}>
              Free cancellation up to 24h before.<br/>You’ll get a calendar invite & a session room link.
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const Calendar = ({ selDate, setSelDate }) => {
  // May 2026 starts on Friday
  const dow = ['S','M','T','W','T','F','S'];
  const days = [];
  // prev month dim (Apr 28-30)
  [28,29,30].forEach(d => days.push({ d, dim:true }));
  for (let d=1; d<=31; d++){
    days.push({ d, has:[5,7,12,14,17,19,21,23,26,28].includes(d) });
  }
  // next month dim (Jun 1-2)
  [1,2].forEach(d => days.push({ d, dim:true }));

  return (
    <div className="calendar">
      <div className="cal-head">
        <button><Icon name="chevronLeft" size={14}/></button>
        <div className="cal-month">May 2026</div>
        <button><Icon name="chevronRight" size={14}/></button>
      </div>
      <div className="cal-grid">
        {dow.map((d,i) => <div key={i} className="cal-dow">{d}</div>)}
        {days.map((day,i) => (
          <div key={i}
            className={`cal-day ${day.dim?'dim':''} ${day.has?'has':''} ${selDate===day.d && !day.dim?'selected':''}`}
            onClick={()=>!day.dim && day.has && setSelDate(day.d)}>
            {day.d}
          </div>
        ))}
      </div>
    </div>
  );
};

const ReviewsTab = ({ coach }) => {
  const reviews = [
    { name:'Rosa, 38', mode:'8 months in', stars:5, text:"Finding Maya was a turning point. She doesn’t collude with the version of me that’s trying to perform — she meets the actual person." },
    { name:'Hana, 31', mode:'4 months in', stars:5, text:"She works at body-pace, not brain-pace. The first few sessions I was impatient. Now I trust the slowness." },
    { name:'D., 45', mode:'2 years in', stars:5, text:"I’ve had three therapists and one coach before. Maya is the first who didn’t flinch at the harder parts." },
    { name:'Joelle, 29', mode:'6 months in', stars:4, text:"Practical and warm. Sometimes I want more structure but the trade is depth." },
  ];
  return (
    <div className="split-2">
      <div>
        {reviews.map((r,i) => (
          <div key={i} className="card" style={{marginBottom:12}}>
            <div style={{display:'flex',gap:14,alignItems:'flex-start'}}>
              <div style={{width:38,height:38,borderRadius:'50%',background:'var(--green-soft)',color:'var(--green)',display:'grid',placeItems:'center',fontWeight:600,flexShrink:0}}>{r.name[0]}</div>
              <div style={{flex:1}}>
                <div style={{display:'flex',justifyContent:'space-between',marginBottom:4}}>
                  <div style={{fontSize:13,fontWeight:600}}>{r.name}</div>
                  <Rating value={r.stars} count={null}/>
                </div>
                <div style={{fontSize:11,color:'var(--gray)',marginBottom:8}}>{r.mode}</div>
                <div style={{fontSize:13,lineHeight:1.6,color:'var(--ink-2)'}}>"{r.text}"</div>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div>
        <div className="card" style={{background:'var(--green)',color:'var(--cream)'}}>
          <div style={{fontFamily:'var(--serif)',fontSize:48,fontWeight:300,letterSpacing:'-0.02em',lineHeight:1}}>{coach.rating}</div>
          <div style={{fontSize:11,letterSpacing:'0.14em',textTransform:'uppercase',opacity:0.8,marginTop:4,fontWeight:600}}>from {coach.reviews} reviews</div>
          <div style={{marginTop:16,display:'flex',flexDirection:'column',gap:6}}>
            {[5,4,3,2,1].map((s,i) => {
              const pct = [86,11,2,1,0][i];
              return (
                <div key={s} style={{display:'flex',alignItems:'center',gap:10,fontSize:11}}>
                  <span style={{width:14}}>{s}★</span>
                  <div style={{flex:1,height:4,background:'rgba(245,239,220,0.15)',borderRadius:2,overflow:'hidden'}}>
                    <div style={{height:'100%',width:`${pct}%`,background:'var(--cream)'}}/>
                  </div>
                  <span style={{width:30,textAlign:'right',opacity:0.8}}>{pct}%</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

Object.assign(window, { Dashboard, Coaches, CoachProfile });
