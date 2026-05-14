/* global React, Icon, Avatar, Rating, ProgressBar, SESSIONS_UPCOMING, SESSIONS_PAST, JOURNAL_ENTRIES, PROGRAMS, PROMPTS, MILESTONES, Dashboard, Coaches, CoachProfile, COACHES */
const { useState: useState2 } = React;

// ============================================================
// SESSIONS
// ============================================================
const SessionsScreen = () => {
  const [tab, setTab] = useState2('upcoming');
  return (
    <div>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-end',marginBottom:18}}>
        <div>
          <div className="eyebrow">Your sessions</div>
          <h2 style={{fontFamily:'var(--serif)',fontStyle:'italic',fontSize:32,fontWeight:500,margin:'6px 0 0',color:'var(--ink)',letterSpacing:'-0.01em'}}>What’s next, and what came before.</h2>
        </div>
        <button className="btn btn-primary"><Icon name="plus" size={13}/> Book a session</button>
      </div>

      <div className="tabs">
        <button className={tab==='upcoming'?'on':''} onClick={()=>setTab('upcoming')}>Upcoming · {SESSIONS_UPCOMING.length}</button>
        <button className={tab==='past'?'on':''} onClick={()=>setTab('past')}>Past · {SESSIONS_PAST.length}</button>
        <button>Group circles · 2</button>
        <button>Cancelled</button>
      </div>

      {tab === 'upcoming' && (
        <div className="session-list">
          {SESSIONS_UPCOMING.map((s,i) => (
            <div key={s.id} className="session-row" style={i===0?{borderColor:'var(--green-3)',background:'var(--green-soft)'}:{}}>
              <div className="date-stack">
                <div className="month">{s.date.m}</div>
                <div className="day">{s.date.d}</div>
                <div className="wday">{s.date.w}</div>
              </div>
              <div className="mid">
                <Avatar name={s.coach} src={s.img} size={48}/>
                <div className="info">
                  <div className="stitle">{s.title}</div>
                  <div className="smeta">{s.coach} · {s.mode} · {s.time} · {s.dur}</div>
                  {i===0 && (
                    <div style={{marginTop:8,display:'flex',gap:6,flexWrap:'wrap'}}>
                      <span className="chip green"><Icon name="check" size={11}/> Prep notes ready</span>
                      <span className="chip"><Icon name="clock" size={11}/> Reminder set</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="actions">
                <button className="btn btn-ghost btn-sm">Reschedule</button>
                {i===0
                  ? <button className="btn btn-primary"><Icon name="video" size={13}/> Join</button>
                  : <button className="btn btn-soft btn-sm">Prep notes</button>}
              </div>
            </div>
          ))}

          <div style={{textAlign:'center',padding:'24px 0',color:'var(--gray)',fontSize:12,marginTop:8}}>
            <div style={{fontWeight:600,marginBottom:4,color:'var(--ink-2)'}}>That’s the next three weeks.</div>
            Book ahead to keep your cadence going.
          </div>
        </div>
      )}

      {tab === 'past' && (
        <div className="session-list">
          {SESSIONS_PAST.map((s) => (
            <div key={s.id} className="session-row">
              <div className="date-stack">
                <div className="month">{s.date.m}</div>
                <div className="day">{s.date.d}</div>
                <div className="wday">{s.date.w}</div>
              </div>
              <div className="mid">
                <Avatar name={s.coach} src={s.img} size={48}/>
                <div className="info">
                  <div className="stitle">{s.title}</div>
                  <div className="smeta">{s.coach} · {s.dur} · {s.notes} notes saved</div>
                </div>
              </div>
              <div className="actions">
                <button className="btn btn-ghost btn-sm">View notes</button>
                <button className="btn btn-soft btn-sm">Book again</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ============================================================
// JOURNAL
// ============================================================
const JournalScreen = () => {
  const [mood, setMood] = useState2(null);
  const [text, setText] = useState2("");
  const prompt = PROMPTS[0];
  return (
    <div>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-end',marginBottom:18}}>
        <div>
          <div className="eyebrow">Journal · Day 21 of a streak</div>
          <h2 style={{fontFamily:'var(--serif)',fontStyle:'italic',fontSize:32,fontWeight:500,margin:'6px 0 0',color:'var(--ink)',letterSpacing:'-0.01em'}}>A few honest minutes.</h2>
        </div>
        <div style={{display:'flex',gap:8}}>
          <button className="btn btn-ghost btn-sm"><Icon name="calendar" size={12}/> Calendar view</button>
          <button className="btn btn-ghost btn-sm"><Icon name="download" size={12}/> Export</button>
        </div>
      </div>

      <div className="journal-grid">
        <div className="compose-card">
          <div className="eyebrow" style={{marginBottom:8}}>Today’s prompt</div>
          <div className="cc-prompt">"{prompt}"</div>

          <textarea placeholder="Start here. Nothing has to be said well."
            value={text} onChange={e=>setText(e.target.value)}/>

          <div className="cc-foot">
            <div style={{display:'flex',gap:8,alignItems:'center'}}>
              <span style={{fontSize:11,color:'var(--gray)',marginRight:4}}>How does this land?</span>
              {[
                { c:'#B85C5C', l:'Heavy' },
                { c:'#D49C5C', l:'Tender' },
                { c:'#D4A45A', l:'Neutral' },
                { c:'#6FA898', l:'Soft' },
                { c:'#1F5F4A', l:'Open' },
              ].map((m,i) => (
                <button key={i} onClick={()=>setMood(i)}
                  title={m.l}
                  style={{
                    width:24,height:24,borderRadius:'50%',background:m.c,
                    border:mood===i?'2px solid var(--ink)':'2px solid var(--white)',
                    boxShadow:mood===i?'0 0 0 2px var(--cream-dark)':'none',
                    padding:0,
                  }}/>
              ))}
            </div>
            <div style={{display:'flex',gap:8}}>
              <button className="btn btn-ghost btn-sm"><Icon name="sparkle" size={12}/> Different prompt</button>
              <button className="btn btn-primary btn-sm" disabled={!text}>Save entry</button>
            </div>
          </div>
        </div>

        <div>
          <div className="card">
            <div className="eyebrow" style={{marginBottom:10}}>Mood, last 14 days</div>
            <div className="bar-chart">
              {[5,4,3,4,5,4,3,4,3,2,3,4,4,5].map((v,i) => {
                const heights = ['25%','40%','55%','70%','90%'];
                const classes = ['','','med','','hi'];
                return <div key={i} className={`bar ${classes[v-1]}`} style={{height:heights[v-1]}}/>;
              })}
            </div>
            <div style={{display:'flex',justifyContent:'space-between',fontSize:10,color:'var(--gray)',marginTop:4,letterSpacing:'0.06em',textTransform:'uppercase',fontWeight:600}}>
              <span>Apr 30</span><span>May 14</span>
            </div>
            <div style={{marginTop:18,paddingTop:14,borderTop:'1px solid var(--cream-dark)',display:'flex',justifyContent:'space-between',fontSize:12}}>
              <div><strong style={{fontFamily:'var(--serif)',fontSize:22,fontWeight:500,color:'var(--green)'}}>6.8</strong> <span style={{color:'var(--gray)'}}>avg</span></div>
              <div style={{color:'var(--green-2)',fontWeight:600,alignSelf:'center'}}>+1.4 vs prior 14</div>
            </div>
          </div>

          <div style={{marginTop:16}}>
            <div className="eyebrow" style={{marginBottom:10}}>Recent entries</div>
            {JOURNAL_ENTRIES.map(e => (
              <div key={e.id} className="entry-row">
                <span className="mood-dot" style={{background:e.mood}}/>
                <div className="er-body">
                  <div className="er-meta">{e.dateLabel}</div>
                  <div className="er-text">{e.text}</div>
                </div>
                <Icon name="chevronRight" size={14} style={{color:'var(--gray-light)',marginTop:6}}/>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================
// LIBRARY
// ============================================================
const LibraryScreen = () => {
  const cats = ['All','Meditation','Breathwork','Sleep','Movement','Mindset','Focus','Audio essays'];
  const [active, setActive] = useState2('All');

  return (
    <div>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-end',marginBottom:18}}>
        <div>
          <div className="eyebrow">Library · 248 practices</div>
          <h2 style={{fontFamily:'var(--serif)',fontStyle:'italic',fontSize:32,fontWeight:500,margin:'6px 0 0',color:'var(--ink)',letterSpacing:'-0.01em'}}>Something to land into.</h2>
        </div>
        <button className="btn btn-ghost btn-sm"><Icon name="sliders" size={12}/> Filter</button>
      </div>

      <div className="continue-card">
        <div style={{position:'relative',zIndex:1}}>
          <div className="eye">Continue · Day 6 of 10</div>
          <h3>The Morning Quiet</h3>
          <div className="meta">8 minutes today · with Lin Marchetti</div>
          <div className="progress"><div/></div>
          <div style={{display:'flex',gap:10,marginTop:18}}>
            <button className="btn" style={{background:'var(--cream)',color:'var(--green)'}}><Icon name="play" size={11}/> Resume</button>
            <button className="btn btn-ghost" style={{color:'var(--cream)',borderColor:'rgba(245,239,220,0.4)'}}>View program</button>
          </div>
        </div>
        <div className="play-btn">
          <Icon name="play" size={28}/>
        </div>
      </div>

      <div className="filter-bar">
        {cats.map(c => (
          <button key={c} className={`filter-chip ${active===c?'active':''}`} onClick={()=>setActive(c)}>{c}</button>
        ))}
      </div>

      <div className="section-head">
        <h3 className="section-title">Programs</h3>
      </div>
      <div className="program-grid">
        {PROGRAMS.map(p => (
          <div key={p.id} className={`program-card ${p.progress>0?'in-progress':''}`}>
            <div className={`pc-img ${p.alt}`}>
              <div className="pc-icon"><Icon name={p.icon} size={28}/></div>
              <div className="pc-dur">{p.dur.split('·')[1]?.trim().split(' ')[0] || ''} {p.dur.split('·')[1]?.trim().split(' ').slice(1).join(' ') || ''}</div>
            </div>
            <div className="pc-body">
              <div className="pc-cat">{p.cat}</div>
              <div className="pc-title">{p.title}</div>
              <div className="pc-meta">{p.dur}</div>
            </div>
            {p.progress > 0 && <div className="pc-progress"><div style={{width:`${p.progress}%`}}/></div>}
          </div>
        ))}
      </div>
    </div>
  );
};

// ============================================================
// PROGRESS / INSIGHTS
// ============================================================
const ProgressScreen = () => {
  const days = ['M','T','W','T','F','S','S'];
  return (
    <div>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-end',marginBottom:18}}>
        <div>
          <div className="eyebrow">Your progress · This quarter</div>
          <h2 style={{fontFamily:'var(--serif)',fontStyle:'italic',fontSize:32,fontWeight:500,margin:'6px 0 0',color:'var(--ink)',letterSpacing:'-0.01em'}}>You’re building something.</h2>
        </div>
        <div style={{display:'flex',gap:6}}>
          <button className="filter-chip">Week</button>
          <button className="filter-chip active">Month</button>
          <button className="filter-chip">Quarter</button>
          <button className="filter-chip">Year</button>
        </div>
      </div>

      <div className="streak-hero">
        <div>
          <div className="eyebrow">Current streak</div>
          <div style={{display:'flex',alignItems:'baseline',gap:14,marginTop:6}}>
            <div className="sh-num">21</div>
            <div>
              <div style={{fontSize:14,fontWeight:600,color:'var(--ink)'}}>days in a row</div>
              <div style={{fontSize:12,color:'var(--gray)'}}>Best ever: 28 days · Feb 2026</div>
            </div>
          </div>
          <div className="sh-sub">A small ritual, sustained, becomes who you are. You’ve checked in every morning since April 24.</div>
          <div className="sh-cal">
            {Array.from({length: 21}).map((_,i) => (
              <div key={i} className={i===20?'today':'on'}>{i===20?'•':''}</div>
            ))}
          </div>
        </div>

        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
          <div style={{padding:18,background:'var(--cream-mid)',borderRadius:'var(--r-lg)'}}>
            <div className="eyebrow">This month</div>
            <div style={{fontFamily:'var(--serif)',fontSize:36,fontWeight:300,color:'var(--ink)',letterSpacing:'-0.01em',lineHeight:1,marginTop:4}}>18h 04m</div>
            <div style={{fontSize:11,color:'var(--gray)',marginTop:4,fontWeight:500}}>Total practice time</div>
            <div style={{marginTop:12,fontSize:11,color:'var(--green-2)',fontWeight:600}}>+42% vs last month</div>
          </div>
          <div style={{padding:18,background:'var(--green)',color:'var(--cream)',borderRadius:'var(--r-lg)'}}>
            <div style={{fontSize:10,letterSpacing:'0.16em',textTransform:'uppercase',opacity:0.8,fontWeight:600}}>Mood lift</div>
            <div style={{fontFamily:'var(--serif)',fontSize:36,fontWeight:300,letterSpacing:'-0.01em',lineHeight:1,marginTop:4}}>+26%</div>
            <div style={{fontSize:11,opacity:0.85,marginTop:4,fontWeight:500}}>From 5.4 to 6.8 avg</div>
            <div style={{marginTop:12,fontSize:11,opacity:0.75}}>Mornings after journaling are 1.3pt higher.</div>
          </div>
        </div>
      </div>

      <div className="split-2">
        <div className="chart-card">
          <div className="section-head" style={{marginBottom:6}}>
            <h3 className="section-title">Sessions over time</h3>
            <span style={{fontSize:11,color:'var(--gray)'}}>9 sessions · 8h 15m</span>
          </div>
          <div className="bar-chart" style={{height:180}}>
            {[2,3,1,4,2,3,2,4,3,5,4,3].map((v,i) => (
              <div key={i} className={`bar ${v>=4?'hi':v>=3?'med':''}`} style={{height:`${v*18}%`}}/>
            ))}
          </div>
          <div style={{display:'flex',justifyContent:'space-between',fontSize:10,color:'var(--gray)',marginTop:4,fontWeight:600,letterSpacing:'0.06em',textTransform:'uppercase'}}>
            <span>Feb</span><span>Mar</span><span>Apr</span><span>May</span>
          </div>
        </div>

        <div className="chart-card">
          <div className="section-head" style={{marginBottom:6}}>
            <h3 className="section-title">Practice rhythm · This week</h3>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:8,marginTop:14}}>
            {days.map((d,i) => {
              const mins = [22,15,38,8,42,0,32][i];
              return (
                <div key={i} style={{textAlign:'center'}}>
                  <div style={{height:80,position:'relative',background:'var(--cream-mid)',borderRadius:6,overflow:'hidden',marginBottom:8}}>
                    <div style={{position:'absolute',bottom:0,left:0,right:0,height:`${Math.min(100,mins*2)}%`,background:i===4?'var(--green)':'var(--green-3)'}}/>
                  </div>
                  <div style={{fontSize:11,fontWeight:600,color:'var(--ink-2)'}}>{d}</div>
                  <div style={{fontSize:10,color:'var(--gray)'}}>{mins ? `${mins}m` : '—'}</div>
                </div>
              );
            })}
          </div>
          <div style={{marginTop:16,padding:'12px 14px',background:'var(--cream-mid)',borderRadius:'var(--r)',fontSize:12,color:'var(--ink-2)',lineHeight:1.6}}>
            <strong style={{color:'var(--green)'}}>Pattern noticed:</strong> You’ve been most consistent on weekday mornings, but Saturday remains your hardest day to begin.
          </div>
        </div>
      </div>

      <div className="section-head" style={{marginTop:28}}>
        <h3 className="section-title">Milestones in progress</h3>
        <span style={{fontSize:11,color:'var(--gray)'}}>3 of 12 reached</span>
      </div>
      <div className="milestone-list">
        {MILESTONES.map((m,i) => (
          <div key={i} className={`milestone-row ${m.done?'done':''}`}>
            <div className="ms-badge"><Icon name={m.icon} size={18}/></div>
            <div className="ms-info">
              <div className="ms-title">{m.title}</div>
              <div className="ms-meta">{m.meta}</div>
            </div>
            {m.done
              ? <span className="chip green"><Icon name="check" size={11}/> Reached</span>
              : <div style={{textAlign:'right',minWidth:90}}>
                  <div className="ms-prog">{m.prog}</div>
                  <div style={{width:90,marginTop:4}}><ProgressBar value={parseInt(m.prog)}/></div>
                </div>}
          </div>
        ))}
      </div>
    </div>
  );
};

// ============================================================
// COMMUNITY (compact)
// ============================================================
const CommunityScreen = () => {
  const circles = [
    { name:'Working women · navigating change', members:42, next:'Tue 18:00', mod:'Sade A.', img:'pages/assets/img/team/4.png' },
    { name:'Quiet performers · burnout recovery', members:28, next:'Wed 12:00', mod:'Maya T.', img:'pages/assets/img/team/1.png' },
    { name:'Slow-down circle', members:36, next:'Sat 09:00', mod:'Lin M.', img:'pages/assets/img/team/3.png' },
    { name:'Men’s work · honest mornings', members:21, next:'Mon 07:00', mod:'Tomás W.', img:'pages/assets/img/team/5.png' },
  ];
  return (
    <div>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-end',marginBottom:18}}>
        <div>
          <div className="eyebrow">Circles · Members-only</div>
          <h2 style={{fontFamily:'var(--serif)',fontStyle:'italic',fontSize:32,fontWeight:500,margin:'6px 0 0',color:'var(--ink)',letterSpacing:'-0.01em'}}>You don’t have to do this alone.</h2>
        </div>
        <button className="btn btn-primary btn-sm"><Icon name="plus" size={12}/> Start a circle</button>
      </div>

      <div className="split-2">
        <div className="card" style={{background:'linear-gradient(135deg, var(--green) 0%, var(--green-dark) 100%)',color:'var(--cream)',position:'relative',overflow:'hidden'}}>
          <div style={{position:'relative',zIndex:1}}>
            <div style={{fontSize:10,letterSpacing:'0.16em',textTransform:'uppercase',opacity:0.8,fontWeight:600}}>This week’s live circle</div>
            <h3 style={{fontFamily:'var(--serif)',fontStyle:'italic',fontSize:26,fontWeight:500,margin:'8px 0 12px',letterSpacing:'-0.01em'}}>Working women · navigating change</h3>
            <div style={{fontSize:13,opacity:0.85,marginBottom:14,maxWidth:380,lineHeight:1.6}}>
              An hour together with Sade. We’re sitting with the question: <em>what do I need to stop performing?</em>
            </div>
            <div style={{display:'flex',gap:14,fontSize:12,marginBottom:16}}>
              <span><Icon name="calendar" size={12}/> Tue, May 19 · 18:00</span>
              <span><Icon name="users" size={12}/> 4 of 8 spots</span>
            </div>
            <div style={{display:'flex',gap:8}}>
              <button className="btn" style={{background:'var(--cream)',color:'var(--green)'}}>Reserve seat</button>
              <button className="btn btn-ghost" style={{color:'var(--cream)',borderColor:'rgba(245,239,220,0.4)'}}>Read more</button>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="eyebrow" style={{marginBottom:14}}>Your circles · 2 active</div>
          {circles.slice(0,2).map((c,i) => (
            <div key={i} style={{display:'flex',alignItems:'center',gap:12,padding:'12px 0',borderBottom:i<1?'1px solid var(--cream-dark)':'none'}}>
              <Avatar name={c.mod} src={c.img} size={42}/>
              <div style={{flex:1}}>
                <div style={{fontSize:13,fontWeight:600,marginBottom:2}}>{c.name}</div>
                <div style={{fontSize:11,color:'var(--gray)'}}>Next: {c.next} · {c.members} members · led by {c.mod}</div>
              </div>
              <button className="btn btn-soft btn-sm">Open</button>
            </div>
          ))}
        </div>
      </div>

      <div className="section-head" style={{marginTop:28}}>
        <h3 className="section-title">Browse circles</h3>
      </div>
      <div className="split-3">
        {circles.map((c,i) => (
          <div key={i} className="card" style={{cursor:'pointer'}}>
            <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:12}}>
              <Avatar name={c.mod} src={c.img} size={38}/>
              <div style={{fontSize:11,color:'var(--gray)'}}>Led by {c.mod}</div>
            </div>
            <div style={{fontSize:15,fontWeight:600,marginBottom:6,color:'var(--ink)'}}>{c.name}</div>
            <div style={{display:'flex',gap:14,fontSize:11,color:'var(--gray)',marginBottom:14}}>
              <span><Icon name="users" size={11}/> {c.members} members</span>
              <span><Icon name="calendar" size={11}/> Next: {c.next}</span>
            </div>
            <button className="btn btn-ghost btn-sm" style={{width:'100%'}}>{i<2?'Open circle':'Request to join'}</button>
          </div>
        ))}
      </div>
    </div>
  );
};

Object.assign(window, { SessionsScreen, JournalScreen, LibraryScreen, ProgressScreen, CommunityScreen });
