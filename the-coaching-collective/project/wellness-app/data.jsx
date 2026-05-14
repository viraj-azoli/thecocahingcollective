/* global React */
// ============================================================
// Mock data for the wellness app
// ============================================================

const COACHES = [
  {
    id: 'c1',
    name: 'Dr. Maya Thornton',
    title: 'Somatic & Trauma-Informed Coach',
    img: 'pages/assets/img/team/1.png',
    tags: ['Anxiety', 'Burnout', 'Somatic'],
    rating: 4.9,
    reviews: 128,
    price: 145,
    available: 'Available today',
    bio: "Maya blends somatic experiencing, polyvagal theory, and traditional coaching to help you reconnect with your body's wisdom. After 12 years in clinical psychology, she now works exclusively with high-performing women navigating burnout, identity shifts, and reclaiming their voice.",
    credentials: ['PhD, Clinical Psychology', 'SEP — Somatic Experiencing', '12 yrs practice'],
    specialty: ['Anxiety', 'Burnout', 'Somatic'],
    format: 'Video + Voice',
  },
  {
    id: 'c2',
    name: 'Ezra Ọlátúndé',
    title: 'Mindset & Performance Coach',
    img: 'pages/assets/img/team/2.png',
    tags: ['Career', 'Confidence', 'Performance'],
    rating: 4.8,
    reviews: 94,
    price: 165,
    available: 'Next: Thu',
    specialty: ['Career'],
    format: 'Video',
  },
  {
    id: 'c3',
    name: 'Lin Marchetti',
    title: 'Embodiment & Movement Practitioner',
    img: 'pages/assets/img/team/3.png',
    tags: ['Embodiment', 'Movement', 'Grief'],
    rating: 5.0,
    reviews: 47,
    price: 130,
    available: 'Available today',
    specialty: ['Embodiment'],
    format: 'Video + In person',
  },
  {
    id: 'c4',
    name: 'Sade Aremu',
    title: 'Relationship & Attachment Coach',
    img: 'pages/assets/img/team/4.png',
    tags: ['Relationships', 'Attachment', 'Boundaries'],
    rating: 4.9,
    reviews: 211,
    price: 155,
    available: 'Next: Wed',
    specialty: ['Relationships'],
    format: 'Video',
  },
  {
    id: 'c5',
    name: 'Tomás Whelan',
    title: 'Men’s Work & Identity Coach',
    img: 'pages/assets/img/team/5.png',
    tags: ['Men’s work', 'Identity', 'Fatherhood'],
    rating: 4.7,
    reviews: 68,
    price: 140,
    available: 'Available today',
    specialty: ['Identity'],
    format: 'Video + Group',
  },
  {
    id: 'c6',
    name: 'Priya Devarakonda',
    title: 'Sleep, Nervous System & Restoration',
    img: 'pages/assets/img/team/6.png',
    tags: ['Sleep', 'Nervous system', 'Restoration'],
    rating: 4.9,
    reviews: 156,
    price: 135,
    available: 'Next: Mon',
    specialty: ['Sleep'],
    format: 'Voice',
  },
];

const SESSIONS_UPCOMING = [
  { id:'s1', coach:'Maya Thornton', img:'pages/assets/img/team/1.png', title:'Working through stuck points', mode:'Video session', date:{m:'May', d:14, w:'Thu'}, time:'09:30', dur:'55 min' },
  { id:'s2', coach:'Ezra Ọlátúndé', img:'pages/assets/img/team/2.png', title:'Performance review prep', mode:'Voice session', date:{m:'May', d:17, w:'Sun'}, time:'18:00', dur:'45 min' },
  { id:'s3', coach:'Sade Aremu', img:'pages/assets/img/team/4.png', title:'Attachment patterns deep-dive', mode:'Video session', date:{m:'May', d:21, w:'Thu'}, time:'07:30', dur:'55 min' },
];

const SESSIONS_PAST = [
  { id:'p1', coach:'Maya Thornton', img:'pages/assets/img/team/1.png', title:'Reframing inner critic', date:{m:'May', d:7, w:'Wed'}, dur:'55 min', notes:3 },
  { id:'p2', coach:'Lin Marchetti', img:'pages/assets/img/team/3.png', title:'Body scan & grounding practice', date:{m:'Apr', d:30, w:'Wed'}, dur:'45 min', notes:1 },
  { id:'p3', coach:'Maya Thornton', img:'pages/assets/img/team/1.png', title:'Boundaries with family', date:{m:'Apr', d:23, w:'Wed'}, dur:'55 min', notes:4 },
];

const JOURNAL_ENTRIES = [
  { id:'j1', dateLabel:'TUE · MAY 12', mood:'#6FA898', text:'Felt lighter today after yesterday’s walk. Noticed I didn’t check email before noon and it made a real difference.' },
  { id:'j2', dateLabel:'MON · MAY 11', mood:'#D4A45A', text:'Brain felt sticky. Got through the morning by promising myself the afternoon would be unscheduled. It mostly was.' },
  { id:'j3', dateLabel:'SUN · MAY 10', mood:'#1F5F4A', text:'Long breakfast with M. We talked about the move and I didn’t spiral. Big.' },
  { id:'j4', dateLabel:'SAT · MAY 9', mood:'#3D7560', text:'Long run, then nothing. Wrote three pages in the morning that I might come back to.' },
  { id:'j5', dateLabel:'FRI · MAY 8', mood:'#B85C5C', text:'Hard day. Got triggered in the 11am meeting. Talked it through with Maya and it untangled some.' },
];

const PROGRAMS = [
  { id:'pg1', cat:'Meditation', title:'The Morning Quiet', dur:'10 days · 8 min/day', icon:'sun', alt:'', progress:60 },
  { id:'pg2', cat:'Breathwork', title:'Box Breathing for Anxiety', dur:'7 days · 12 min/day', icon:'wind', alt:'alt1', progress:28 },
  { id:'pg3', cat:'Sleep', title:'Wind-Down for Restless Nights', dur:'14 days · 22 min/night', icon:'moon', alt:'alt2', progress:0 },
  { id:'pg4', cat:'Movement', title:'Slow Mornings Yoga', dur:'21 days · 18 min/day', icon:'leaf', alt:'alt3', progress:14 },
  { id:'pg5', cat:'Mindset', title:'Resetting Inner Dialogue', dur:'5 weeks · self-paced', icon:'sparkle', alt:'alt4', progress:0 },
  { id:'pg6', cat:'Focus', title:'Deep Work Soundscapes', dur:'Audio library', icon:'headphones', alt:'alt5', progress:0 },
];

const PROMPTS = [
  "What did you let go of today?",
  "Where did you feel most yourself this week?",
  "What is one thing you noticed but didn’t say?",
  "What does your body want you to know?",
  "Who saw the real you today?",
];

const MILESTONES = [
  { title:'First 7-day journal streak', meta:'Reached May 5', icon:'flame', done:true },
  { title:'10 sessions completed', meta:'9 of 10 done', icon:'trophy', done:false, prog:'90%' },
  { title:'Finish your first program', meta:'The Morning Quiet · 60%', icon:'target', done:false, prog:'60%' },
  { title:'Try every modality', meta:'4 of 6 modalities', icon:'compass', done:false, prog:'67%' },
];

Object.assign(window, { COACHES, SESSIONS_UPCOMING, SESSIONS_PAST, JOURNAL_ENTRIES, PROGRAMS, PROMPTS, MILESTONES });
