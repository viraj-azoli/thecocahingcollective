# The Coaching Collective Online — Member Platform Design

**Date:** May 14, 2026  
**Project:** Full two-sided web application platform  
**Status:** Design approved, ready for implementation

---

## Executive Summary

TCCO Platform is a sophisticated two-sided marketplace connecting seekers (clients) with independent coaching professionals. The static website at thecoachingcollectiveonline.com is marketing only; this application IS the product.

**Three user types:**
- **Seekers** — Pay for tier access (Discovery $50/yr, Connection $197/mo), book sessions, consume content, track progress
- **Coaches** — Manage profiles, schedule availability, teach sessions, create content, earn revenue (80% of session fees + subscription split)
- **Admins** — Marketplace management, content moderation, analytics, user support (multiple admins with permission levels)

---

## Technology Stack

- **Frontend:** React + Hostinger static hosting
- **Backend:** Supabase (PostgreSQL, auth, real-time, file storage)
- **Payment:** Stripe (seekers) + Stripe Connect (coach payouts)
- **Video:** Zoom/Cal.com API (or similar for session hosting)
- **Email:** SendGrid or similar for transactional emails
- **Hosting:** Hostinger for React app + Supabase cloud for backend

---

## Database Schema

### Core Tables

#### `users`
- `id` (UUID, primary key)
- `email` (unique)
- `password_hash`
- `user_type` (enum: seeker | coach | admin)
- `created_at`, `updated_at`

#### `seeker_profiles`
- `id` (UUID)
- `user_id` (FK to users)
- `name`, `avatar_url`
- `tier` (enum: Discovery | Connection)
- `stripe_subscription_id` (for recurring Connection tier)
- `mood_average` (14-day rolling average)
- `day_streak` (consecutive days with journal/mood entries)
- `sessions_completed` (count)
- `onboarding_quiz_answers` (JSON: brings_you_here, preferred_format, coaching_experience)
- `preferences` (JSON: favorite_specialties[], notification_settings)

#### `coach_profiles`
- `id` (UUID)
- `user_id` (FK to users)
- `name`, `title`, `bio` (rich text)
- `avatar_url`, `background_photo_url`
- `specialties` (array: e.g., ['Burnout', 'Relationships'])
- `credentials` (array of objects: {title, issuer, year})
- `approach` (text: philosophy/methodology)
- `session_types` (JSON array: {format, duration, price})
- `price_per_session` (base price, can vary by type)
- `rating` (calculated: avg of session ratings)
- `review_count` (count of ratings)
- `verified` (boolean: admin approved)
- `stripe_account_id` (Stripe Connect account)
- `cancellation_policy` (text)
- `max_clients` (number or null for unlimited)
- `languages` (array)

#### `availability`
- `id` (UUID)
- `coach_id` (FK)
- `day_of_week` (0-6: Sunday-Saturday for recurring availability)
- `time_slots` (array of objects: {start_time, end_time})
- `recurring` (boolean: true for weekly, false for one-off)
- `unavailable_dates` (array: specific dates blocked out)
- `timezone` (string: auto-detected at signup, editable)

#### `sessions`
- `id` (UUID)
- `coach_id`, `seeker_id` (FK)
- `scheduled_date`, `scheduled_time`
- `duration_minutes` (default 55)
- `session_type` (1-on-1 | group | workshop)
- `status` (enum: scheduled | in_progress | completed | cancelled | no_show)
- `zoom_link` (or video platform URL, populated when scheduled)
- `notes_coach` (coach's prep/post notes)
- `notes_seeker` (seeker's prep/post notes)
- `recording_url` (if recorded)
- `rating_by_seeker` (1-5, optional)
- `feedback_by_seeker` (text, optional)
- `amount_paid` (decimal)
- `created_at`, `updated_at`

#### `content`
- `id` (UUID)
- `coach_id` (FK, nullable if platform-curated)
- `title`
- `description` (rich text)
- `type` (enum: audio | article | live_event | program)
- `content_url` (S3/Supabase storage URL)
- `duration_minutes` (for audio/video)
- `tags` (array: ['Burnout', 'Sleep', 'Somatic'])
- `specialties` (array: what content addresses)
- `published` (boolean)
- `featured` (boolean: admin curated)
- `created_at`, `updated_at`

#### `content_engagement`
- `id` (UUID)
- `seeker_id`, `content_id` (FK)
- `status` (enum: bookmarked | in_progress | completed | archived)
- `rating` (1-5, optional)
- `review_text` (optional)
- `time_spent_seconds` (for audio/video tracking)
- `completion_percentage` (0-100)

#### `journal_entries`
- `id` (UUID)
- `seeker_id` (FK)
- `date` (date)
- `mood` (1-5 integer)
- `mood_note` (optional text: why this mood)
- `content` (rich text: journal entry)
- `prompt` (string: today's prompt from library)
- `themes` (array: auto-tagged by AI or manually)
- `created_at`

#### `messages`
- `id` (UUID)
- `sender_id`, `recipient_id` (FK to users)
- `thread_id` (groups messages by coach-seeker pair)
- `content` (text)
- `is_read` (boolean)
- `created_at`

#### `subscriptions`
- `id` (UUID)
- `seeker_id` (FK)
- `tier` (enum: Discovery | Connection)
- `stripe_subscription_id` (for recurring)
- `status` (enum: active | paused | cancelled)
- `started_at`, `ends_at` (for current billing period)
- `auto_renew` (boolean)
- `cancel_reason` (optional text)

#### `admin_users`
- `id` (UUID)
- `user_id` (FK)
- `role` (enum: super_admin | moderator | analytics_only)
- `permissions` (JSON array: specific capabilities)
- `created_at`, `updated_at`

#### `transactions`
- `id` (UUID)
- `stripe_charge_id` (reference)
- `user_id` (FK)
- `type` (enum: subscription | session_purchase | refund)
- `amount` (decimal)
- `status` (enum: pending | completed | failed | refunded)
- `created_at`

---

## Authentication & Onboarding

### Seeker Onboarding
1. **Sign-up page:** Email/password or OAuth (Google, Apple)
2. **Onboarding quiz** (3 questions):
   - "What brings you here?" (select from: Burnout, Relationships, Performance, Sleep, Anxiety, Other)
   - "Preferred format?" (1-on-1, Group, Self-guided)
   - "Experience with coaching?" (First-timer, Experienced)
3. **Tier selection:** Show recommendation based on quiz, option to choose Discovery or Connection
4. **Payment:** Stripe hosted checkout
   - Discovery: one-time $50/year charge
   - Connection: $197/month recurring subscription
5. **Redirect:** After successful payment → /thank-you.html
6. **First dashboard:** Personalized greeting, guided tour, prompt to set intention

### Coach Onboarding
1. **Sign-up page:** Email/password (no OAuth for coaches yet)
2. **Email verification**
3. **Profile builder** (6 steps, can save as draft):
   - Step 1: Basic info (name, professional photo, title)
   - Step 2: Bio (rich text editor with template suggestions, 200-500 chars)
   - Step 3: Specialties (select 3-5 from curated list with descriptions)
   - Step 4: Credentials (education, certifications: year + issuer)
   - Step 5: Approach (philosophy/methodology, AI-suggested keywords for SEO)
   - Step 6: Session types & pricing (can offer 1-on-1 at $X, group at $Y, etc.)
4. **Availability setup:** Visual calendar, recurring slots, timezone auto-detect
5. **Stripe Connect:** Connect payout account
6. **Verification:** Email confirmation + optional video intro
7. **Dashboard:** Profile completeness scoring, onboarding checklist, first client target

### Admin Onboarding
- Invite-only (existing admin creates invite link)
- Email + temporary password
- Set role (super_admin, moderator, analytics_only) with granular permissions
- 2FA recommended

---

## Seeker Experience

### Dashboard
**Components:**
- Personalized greeting (e.g., "Good morning, Amara · Thursday, May 14")
- "Today's intention" card: set morning intention, edit/update throughout day
- Stats grid (4 cards):
  - Day streak (consecutive days active) + trend indicator + spark chart
  - Practice time this week (hours:minutes) + % vs last week
  - Sessions completed (total count) + milestone (e.g., "Next: 10")
  - Mood average (14-day rolling) + trend (up/down) + day-by-day breakdown
- Next upcoming session (card): coach photo, name, date/time, duration, "Prep notes" & "Join" buttons
- Daily mood check-in (card): 5-point scale (Low, Off, Okay, Good, Bright) + optional note field + skip button
- Quick action tiles (3): Browse library, Find a coach, Open journal
- Curated recommendations (3 cards): featured content from coaches, showing type (Audio · 12min, Article · 6min read, Live · Tue 18:00)

### Find Coaches
**Features:**
- Browse all coaches (62+ profiles)
- Filters (persistent in URL):
  - Specialty (checkbox multi-select: Anxiety, Burnout, Relationships, Performance, Sleep, Somatic, Men's work)
  - Format (1-on-1, group, both)
  - Price range ($50-$250/session)
  - Availability (this week, next week, anytime)
  - Rating (4+ stars, 4.5+, 5 stars)
- View toggles: Grid (3-column) or List
- Sort: Best fit (default, algorithm-based), Rating, Price (low-high, high-low), Newest
- Coach cards display: photo, name, title, specialties (tags), price, rating/count, availability status (green pulse + "Available Tue-Thu")
- Bookmark coaches (heart icon, saves to "Saved coaches" list)

**Coach Profile Modal:**
- Hero section: large photo, name, title, specialties, price, rating (e.g., 4.8 · 142 reviews)
- Three tabs:
  - **About:** Full bio, credentials list (PhD + year, certifications), approach/philosophy, past testimonials/reviews
  - **Sessions:** Available session types (1-on-1 55min · $150, Group · $50), description of each, cancellation policy
  - **Calendar:** 30-day availability view, selectable dates
- Action button: "Book a session" (opens booking flow)

### Booking Flow
1. **Select date:** Calendar showing coach's available dates (green), unavailable grayed out
2. **Select time:** Available time slots for selected date (e.g., 09:00, 10:15, 14:00)
3. **Session type:** Choose from coach's offerings (if multiple: 1-on-1 vs group, etc.)
4. **Prep notes:** Optional text field (e.g., "Been struggling with setting boundaries")
5. **Confirm & pay:**
   - If Discovery tier: Show one-time charge ($50 if first session this month, or free if already paid)
   - If Connection tier: "Included with your subscription" message
   - Stripe checkout inline
6. **Confirmation:** "Session booked!" + calendar invite (to email) + Zoom/Cal.com link sent

### Sessions View
**Upcoming tab:**
- List of scheduled sessions (date-sorted, soonest first)
- Each session: coach photo/name, date/time/duration, "Prep notes" & "Join video" buttons
- 1-hour reminder notification (in-app + email)
- Cancellation allowed (with 24-hour notice for refund, if applicable)

**Past tab:**
- List of completed sessions (date-sorted, most recent first)
- Each session: coach photo/name, date, duration, "View notes" & "Rate session" buttons
- Session rating prompt (1-5 stars + optional feedback text)
- Recording link (if coach recorded)
- Coach feedback/notes visible

### Journal
**Interface:**
- Daily entry view: date selector (calendar), today highlighted
- Daily prompt displayed (e.g., "What did you let go of today?")
- Rich text editor: write entry (bullet points, formatting supported)
- Mood selector (1-5 scale) attached to entry
- Optional: attach/link a resource (content piece)
- Auto-save as you type
- Submit button

**Browse past entries:**
- Timeline view or list view
- Search by date range or keywords
- Filter by mood range (e.g., "low mood entries")
- Tag cloud of themes (auto-generated from entries)

**Journal insights:**
- Mood trend graph (14-day, 30-day, all-time options)
- Most common themes extracted (AI-powered tagging)
- Streaks: days with entries
- Export as PDF (personal archive)

### Library
**Discovery:**
- Featured section (admin-curated, rotating weekly)
- Browse by type: Audio, Articles, Live events, Programs
- Browse by specialty: Burnout, Relationships, Sleep, etc.
- Search bar (full-text search: title, coach name, description)
- Filters:
  - Duration (< 5min, 5-15min, 15-30min, 30min+)
  - Coach (select specific coach)
  - Level (Beginner, Intermediate, Advanced)
- Sort: Trending, Newest, Most completed, Highest rated

**Content detail page:**
- Hero: title, coach name/photo, type, duration, rating
- Description (rich text)
- "Bookmark" button (save for later)
- Play/download button (audio/video) or read button (article)
- Comments/reviews section (see others' ratings + feedback)
- Related content section (similar topic)

**Status tracking:**
- Progress bar (% listened/read)
- Completion percentage
- Resume from last point (for audio/video)
- Mark complete / Archive

### Progress & Milestones
**Achievements:**
- Milestones unlocked: "5 sessions completed", "21-day streak", "First coach connection", etc.
- Badge/trophy system (visual rewards)
- Progress timeline: visual journey from signup to current (key events marked)

**Stats summary:**
- Total sessions completed
- Total practice hours
- Coaches worked with
- Content consumed (count)
- Current mood trend
- Current streak

---

## Coach Experience

### Dashboard
**Metrics at a glance:**
- This week: upcoming sessions (count), new clients, earnings
- This month: total earnings, session completion rate, avg rating
- Stats cards: clients (active count), sessions booked (this week), avg rating, earnings (this month)

**Client overview:**
- List of active clients: name, avatar, tier, last session date, next booked session
- Quick message button on each card
- Add notes section (per client): personal details, preferences, progress notes

### Profile & Settings
**Edit profile:**
- Name, professional photo (avatar), title
- Bio (rich text editor with templates)
- Specialties (multi-select dropdown, max 5)
- Credentials (add/edit/remove: degree, certification, year, issuer)
- Approach/methodology (rich text)
- Languages (multi-select)
- Preferred pronouns
- Timezone (auto-detect, can override)

**Session types & pricing:**
- Add multiple formats (1-on-1 Standard, 1-on-1 Extended, Group Circle, Intensive, etc.)
- Each has: name, duration, price
- Description for each type (optional)

**Cancellation & scheduling policies:**
- Cancellation notice required (24 hours, 48 hours, etc.)
- Rescheduling policy
- Max clients (cap or unlimited)

**Stripe payout account:**
- Connected account ID
- Payout schedule (weekly, monthly)
- View previous payouts

### Availability & Scheduling
**Calendar interface:**
- Monthly view with weekly recurrence setup
- Add recurring slots: "Every Monday, Wednesday, Friday 9am-12pm CST" (select hour duration)
- Add one-off unavailable dates (vacation, sick leave)
- Timezone auto-detected, but editable
- "Working hours" preset templates (9-5, 7am-9pm, etc.)
- Sync to Google Calendar (optional, two-way)

**Waitlist management:**
- If coach fully booked: option to open waitlist
- Automatic email notification when slot opens
- First-come booking from waitlist

### Clients
**Active clients list:**
- Name, avatar, tier (Discovery or Connection), joined date
- Session history: total sessions, last session, next booked
- Contact button (message)
- Notes section (coach adds private notes about client: goals, progress, preferences)

**Messaging:**
- Direct 1-on-1 chat with each client
- Persistent thread (history visible)
- File sharing (coach can share resources)
- Read receipts

### Content Creation Studio

**Audio uploads:**
- Drag-and-drop upload (supports .mp3, .wav, .m4a)
- Trim/edit basic metadata (title, description, cover image)
- Tags (specialties: Burnout, Sleep, etc.)
- Publish immediately or schedule for future date
- Privacy: private (coach only), members-only (tier level), or public

**Write articles:**
- Rich text editor (formatting, lists, links, images)
- Preview mode
- Tags and specialties
- Estimated reading time (auto-calculated)
- Publish options

**Schedule live events:**
- Event title, description, date/time (timezone support)
- Max participants (capped or unlimited)
- Duration estimate
- Add notes/agenda
- Zoom/Cal.com integration: auto-generate meeting link
- Email invites to clients (auto-send 24hrs before, 1hr before)
- Recording consent checkbox

**Analytics per content:**
- Views (unique viewers, repeat views)
- Downloads (for audio)
- Time listened/read (avg %, total)
- Ratings breakdown (1-5 star distribution)
- Reviews/feedback text

### Earnings & Payouts
**Earnings breakdown:**
- This month earnings (sessions + content royalty, if applicable)
- All-time earnings
- Per-session breakdown: date, client name, duration, amount earned (80% of fee)
- Subscription tier split (if applicable): Connection tier seekers' monthly fee split proportionally among coaches

**Payout schedule:**
- Automatic monthly payout to Stripe Connect account
- Manual withdrawal option
- Payout history: dates, amounts, status (pending, completed)

**Invoices:**
- Auto-generated after each session
- Downloadable for tax records
- Monthly summary invoice

---

## Admin Experience

### Dashboard
**At-a-glance metrics:**
- Total users (seekers, coaches)
- Active sessions (this week, this month)
- Monthly revenue (total, by tier)
- Growth trends (new signups, churn rate)
- Platform health (failed payments, support tickets, etc.)

**Key queues:**
- Coach verification (pending profiles needing approval)
- Content moderation (flagged items)
- Payment issues (failed charges, refunds requested)
- Support messages (user requests)

### Marketplace Management
**Coach verification:**
- Queue of pending coaches: profile preview, credentials, photo
- Approve / Reject (with feedback email to coach)
- Re-request missing info

**Featured coaches:**
- Homepage carousel: drag-to-reorder featured coaches
- Set feature duration (this week, this month, ongoing)
- View performance (clicks, bookings, conversion)

**Content curation:**
- Admin library section: all published content by all coaches
- Mark as "Featured" (appears in recommendation section on seeker dashboard)
- Create collections/playlists (e.g., "Beginner-friendly", "Sleep solutions")
- Schedule content promotions

**Promotions:**
- Create seasonal campaigns (e.g., "Summer wellness special")
- Discount codes (% off tier purchases)
- Email campaigns: segment seekers/coaches, send announcements

### User Management
**Search & view:**
- Find users by email, name, user_id
- View full profile + history
- Actions: send message, suspend account (temporarily), deactivate (permanent)

**Bulk operations:**
- Export user list (CSV) for analysis
- Send mass emails (filtered by segment: all seekers, coaches, inactive 30+ days, etc.)

### Content Moderation
**Flagged content:**
- Review queue: user-flagged or admin-flagged content (reasons: inappropriate, off-topic, harmful)
- Preview content
- Actions: approve, hide, request coach remove, remove content, warn coach

### Analytics
**Dashboard:**
- Daily/weekly active users (seekers, coaches)
- Session completion rate (booked vs. completed)
- Churn metrics: % of seekers who cancel subscription
- Revenue trends: monthly recurring, one-time purchases
- Coach performance: avg rating, session completion %, earnings
- Search trends: most-searched specialties, coaches, content

**Detailed reports:**
- Retention funnel (sign-up → first session → ongoing)
- LTV (lifetime value per seeker)
- CAC (customer acquisition cost, if running ads)
- Satisfaction: avg session rating, NPS (net promoter score)

**Export:**
- Reports as PDF/CSV for external analysis or investor updates

---

## Payment & Monetization

### Seeker Tiers
1. **Discovery** ($50/year):
   - Browse coaches
   - Book 1 session/month
   - Journal + daily prompts
   - Library access (read-only, no downloads)
   - Community forum (coming later)

2. **Connection** ($197/month):
   - Unlimited session bookings
   - Full library access (download audio)
   - Priority coach availability (earlier slots visible)
   - Group events + live circles
   - 1-on-1 coach matching consultation (monthly)
   - Private messaging with all coaches

### Coach Revenue
**Per-session earnings:**
- Coach sets price ($X per session)
- Seeker booked = coach receives 80% of fee, TCCO keeps 20%
- One-time charge if seeker is on Discovery tier (pay-per-session)
- No charge if seeker is on Connection tier (included in subscription)

**Subscription split (for Connection tier):**
- Monthly: ($197/month × # active seekers) − (TCCO 20% platform fee) = pool for coaches
- Coaches receive proportional share of pool based on sessions booked during month
- Example: 1000 seekers × $197 = $197k. TCCO takes 20% ($39.4k). Pool = $157.6k. 100 sessions booked. Coach with 15 sessions gets 15% of $157.6k = $23.64k.

**Payout:**
- Automatic monthly payout to coach's Stripe Connect account
- Minimum payout threshold: $50 (below threshold, rolls to next month)
- Payout day: 5th of following month

### Stripe Integration

**Seekers:**
- Stripe Checkout hosted page (Discovery: one-time, Connection: recurring)
- Webhook: payment.success → grant tier access, create subscription record
- Webhook: payment.failed → retry logic, notify seeker after 3 failed attempts
- Webhook: charge.refunded → refund handling for cancelled sessions

**Coaches:**
- Stripe Connect account (onboarding during signup)
- Auto-payouts (monthly, to bank account)
- Webhook: payout.paid → update payout status

**Refunds:**
- Session cancellation (48+ hours before): full refund to seeker
- Session cancellation (< 48 hours): no refund (per policy)
- Subscription cancellation: pro-rata refund for partial month (optional feature)

---

## Real-Time Features

**WebSocket/Supabase Real-Time subscriptions:**

1. **Availability updates:**
   - When coach updates availability, all seekers browsing coaches see live (green availability pulse updates)

2. **Booking notifications:**
   - Coach receives instant notification when seeker books session (in-app toast + email)
   - Seeker sees "Booking confirmed!" immediately

3. **Message delivery:**
   - Messages between coach-seeker appear instantly (no page refresh needed)
   - Typing indicators ("Coach is typing...")
   - Read receipts

4. **Session reminders:**
   - 1 hour before session: in-app notification + email
   - 15 minutes before: final in-app reminder
   - Live join status: "Coach is online" indicator

5. **Admin notifications:**
   - New coach verification request appears in admin queue instantly
   - Flagged content alerts

6. **Engagement updates:**
   - Seeker's stats update in real-time when completing actions (session booked, entry written, etc.)

---

## Security & Data Privacy

- **Auth:** Supabase Auth with email verification, password hashing (bcrypt)
- **RLS:** Row-Level Security (Postgres) ensures users see only their own data
- **Payment:** PCI-DSS compliance via Stripe (no card data stored)
- **Encryption:** TLS for all data in transit
- **Data retention:** Users can request data export/deletion (GDPR compliance)
- **2FA:** Available for coaches & admins (optional)

---

## Success Metrics

- **Adoption:** 500+ seekers, 50+ verified coaches (Year 1)
- **Engagement:** 70%+ of seekers book session within 30 days
- **Retention:** 80%+ Connection tier retention (monthly)
- **Marketplace health:** Avg coach rating 4.5+, 90%+ session completion rate
- **Revenue:** $X MRR (monthly recurring revenue)

---

## MVP vs. Phase 2+

**MVP (launch):**
- Core: seeker dashboard, coach browse + booking, sessions, journal, library
- Coach: profile, availability, earnings dashboard
- Admin: coach verification, analytics, content curation
- Payment: Stripe integration for tiers, payouts

**Phase 2 (3-6 months post-launch):**
- Live group events/circles (real-time video)
- Coach matching quiz (algorithmic)
- Programs (multi-part series with progression)
- Mobile app (React Native)
- Advanced analytics & reporting
- Integration with Zoom API (automatic meeting generation)

**Phase 3:**
- Community features (forums, peer connections)
- Referral program
- Marketplace for coaches to sell individual programs/courses
- Corporate team accounts (group coaching)

---

## Next Steps

1. User approval on this spec
2. Implementation plan (tech setup, component breakdown, timeline)
3. Development sprint (prioritized by MVP requirements)
4. Testing & QA
5. Soft launch (TCCO team + beta coaches)
6. Public launch + marketing
