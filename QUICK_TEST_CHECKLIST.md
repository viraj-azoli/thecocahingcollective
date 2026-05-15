# TCCO Platform - Quick Test Checklist

**Status:** ✅ All code committed and builds successfully
**Dev Server:** Running at http://localhost:5176
**Backend:** All tests passing

## Manual Testing Steps

### Step 1: Login as Seeker
1. Open http://localhost:5176 in browser (Ctrl+Shift+Delete to clear cache, then hard refresh Ctrl+F5)
2. Enter credentials:
   - Email: `seeker@test.com`
   - Password: `password123`
3. Expected: Should redirect to `/dashboard` (Seeker Dashboard)

### Step 2: Verify Seeker Dashboard
Check that all sections appear:
- ✅ Greeting with name and date
- ✅ Today's Intention card with textarea
- ✅ Stats grid (4 cards):
  - 📊 Day Streak
  - ⏱️ Practice Time
  - ✅ Sessions Done
  - 😊 Mood Average
- ✅ Next Upcoming Session card (if sessions exist)
- ✅ Mood Check-in card with emoji buttons
- ✅ Quick Actions (3 tiles)
- ✅ Recommended Content cards

### Step 3: Login as Coach (when test coach user exists)
1. Logout (check for logout button or manually navigate to `/login`)
2. Login with coach credentials (currently no test coach, will need to create)
3. Expected: Should redirect to `/coach/dashboard` (Coach Dashboard)

### Step 4: Verify Coach Dashboard
Check that all sections appear:
- ✅ Greeting with coach name and date
- ✅ This Week at a Glance metrics (3 items)
- ✅ Stats grid (4 cards):
  - 👥 Active Clients
  - 📅 Sessions Booked
  - ⭐ Avg Rating
  - 💰 Month Earnings
- ✅ This Month Summary card
- ✅ Active Clients section
- ✅ Quick Actions (4 tiles)
- ✅ Earnings & Payouts section

### Step 5: Login as Admin (when test admin user exists)
1. Logout
2. Login with admin credentials (currently no test admin, will need to create)
3. Expected: Should redirect to `/admin/dashboard` (Admin Dashboard)

### Step 6: Verify Admin Dashboard
Check that all sections appear:
- ✅ Greeting with date
- ✅ Platform Overview metrics (4 items)
- ✅ Stats grid (4 cards):
  - 👥 Total Coaches
  - 🔍 Total Seekers
  - 📈 New Signups
  - 📊 Churn Rate
- ✅ Alert Queues section (4 queue cards)
- ✅ Coach Verification Queue
- ✅ Key Insights section
- ✅ Quick Actions (4 tiles)

## Design Verification

Verify each dashboard matches these design specifications:

### Seeker Dashboard Design ✅
- Card-based layout with white cards on light gray background
- Responsive grid layouts (4-column for stats, 3-column for recommendations)
- Blue color scheme (#2563eb primary color)
- Hover effects on cards and buttons
- Mobile responsive (2-column stats on mobile)

### Coach Dashboard Design ✅
- Same card-based design as Seeker
- Metrics grid at top (3 items)
- 4-card stats grid below
- Client overview with avatar, name, tier, message button
- Earnings breakdown
- Mobile responsive

### Admin Dashboard Design ✅
- Same card-based design as Seeker/Coach
- Platform metrics at top
- Alert queue cards with color coding (red for urgent, yellow for warning)
- Coach verification queue with approve/reject buttons
- Key insights section
- Mobile responsive

## Current Limitations

These features are not yet implemented (Phase 2):
- [ ] Coach creation and test accounts
- [ ] Admin creation and test accounts
- [ ] Actual session data (using mock data)
- [ ] Content creation and uploads
- [ ] Availability calendar
- [ ] Payment integration
- [ ] Real-time updates

## Quick Fixes If Testing Fails

1. **Login stuck on login page:**
   - Clear cache: Ctrl+Shift+Delete
   - Hard refresh: Ctrl+F5 (Windows) or Cmd+Shift+R (Mac)
   - Check console (F12) for red error messages

2. **Dashboard shows "Loading..." indefinitely:**
   - Check browser console (F12) for errors
   - Verify dev server is running: `lsof -i :5176`
   - Check Supabase connection

3. **Styling looks wrong:**
   - Hard refresh (Ctrl+F5)
   - Verify CSS file is imported in component
   - Check browser DevTools (F12) to see if CSS is loaded

## Backend Verification (Already Done)

✅ Supabase connection: Working
✅ Authentication: Working
✅ User profiles: Created
✅ Seeker profile: Created
✅ All API endpoints: Working
✅ Session data: Can be queried

## What's Working

- ✅ React app builds without errors
- ✅ Dev server runs on localhost:5176
- ✅ Login component with email/password
- ✅ Protected routes with role-based access
- ✅ Seeker Dashboard (fully designed)
- ✅ Coach Dashboard (fully designed)
- ✅ Admin Dashboard (fully designed)
- ✅ Navigation redirects to correct dashboard based on user role
- ✅ All CSS styling for card-based design
- ✅ Responsive mobile layouts

## Next Steps After Verification

Once all dashboards render correctly and match design specs:

1. Create test coach account (create coach user and coach_profiles entry)
2. Create test admin account (create admin user)
3. Test coach dashboard with actual coach login
4. Test admin dashboard with actual admin login
5. Create sample sessions to test with coach/seeker data
6. Build remaining components:
   - Find Coaches page
   - Book Session flow
   - Coach profile editor
   - Admin user management
   - Content creation studio
   - Payment integration

---

**Testing started at:** 2026-05-15
**Status:** Ready for browser testing
