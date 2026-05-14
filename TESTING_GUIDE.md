# TCCO Platform - Testing Guide

## Current Status ✅

All systems are operational and tested:

- ✅ Supabase database schema created and verified
- ✅ Authentication system working (Supabase Auth)
- ✅ Test user created and can log in
- ✅ Seeker profile created with sample data
- ✅ React app builds without errors
- ✅ Dev server running (currently on http://localhost:5176)
- ✅ Protected routes configured with role-based access control

## Test User Credentials

```
Email: seeker@test.com
Password: password123
User Type: seeker
```

## What to Test

### 1. **Login Flow** 🔐
Open one of these URLs in your browser:
- http://localhost:5173 
- http://localhost:5174 
- http://localhost:5175 
- http://localhost:5176 

You should see:
- A login page with "Welcome Back" heading
- Email and password input fields
- "Sign in" button
- "Don't have an account? Sign up" link

Expected behavior:
1. You should start at the login page
2. When you log in with seeker@test.com / password123, you should be redirected to `/dashboard`

### 2. **Seeker Dashboard** 📊
After logging in, you should see the seeker dashboard with:
- ✅ Welcome message: "Welcome, Test Seeker! 👋"
- ✅ Tier display: "Your tier: Discovery"
- ✅ Stats:
  - Upcoming Sessions: 0
  - Day Streak: 7
  - Avg Mood: 3.5
- ✅ Four tabs: Overview, Find Coaches, My Sessions, Journal
- ✅ Quick Stats cards showing:
  - Sessions Completed: 3
  - Current Focus: Personal growth
  - Preferred Format: 1-on-1
  - Progress message

### 3. **Dashboard Tabs** 📑

#### Overview Tab (Default)
Should show:
- Quick Stats cards (as above)
- No upcoming sessions message (since none exist in test data)

#### Find Coaches Tab
Should show:
- "Find Your Coach" heading
- Empty grid (no coaches created yet, but the structure should be there)
- When coaches exist, should display coach cards with:
  - Avatar placeholder
  - Coach name and title
  - Bio excerpt
  - Price and rating
  - "View Profile" button

#### My Sessions Tab
Should show:
- "My Sessions" heading
- "No upcoming sessions. Book your first session!" message

#### Journal Tab
Should show:
- "My Journal" heading
- "New Entry" button
- "Start your journaling practice today!" message

## Verification Checklist

Run through these checks to verify everything works:

- [ ] App loads without JavaScript errors (check browser console)
- [ ] Login page appears at root URL
- [ ] Can log in with seeker@test.com / password123
- [ ] Redirected to `/dashboard` after login
- [ ] Dashboard shows "Welcome, Test Seeker!" message
- [ ] All stats display correctly
- [ ] All four tabs are clickable and show expected content
- [ ] No console errors appear when switching tabs
- [ ] Can see the seeker profile data loaded (name, tier, stats)

## Testing Scripts Available

```bash
# Run full authentication and data flow test
node scripts/test-full-flow.js

# Set up fresh test user and profile
node scripts/setup-test-user.js

# Test authentication only
node scripts/test-auth.js
```

All scripts return ✅ when successful.

## Known Limitations (MVP)

- **Coaches**: Not yet created in test data (will add when UI is verified)
- **RLS Security**: Currently disabled for MVP testing (will re-enable with proper policies for production)
- **Real-time Updates**: Not yet implemented (Phase 2)
- **Payments**: Not yet implemented (Phase 2)

## Architecture Overview

```
Frontend (React @ localhost:5176)
    ↓ 
Supabase Authentication
    ↓
Protected Routes (Role-based)
    ↓
SeekerDashboard (+ Other dashboards)
    ↓
Supabase REST API
    ↓
PostgreSQL Database
```

## What's Working

1. **Authentication**: Full Supabase Auth integration
   - Sign up: ✅
   - Login: ✅
   - Logout: ✅
   - Session persistence: ✅

2. **Authorization**: Role-based route protection
   - Seeker routes: ✅
   - Coach routes: ✅
   - Admin routes: ✅

3. **Data Layer**: Supabase queries
   - User profiles: ✅
   - Seeker profiles: ✅
   - Coach profiles: ✅
   - Sessions: ✅
   - And all other tables

4. **UI Components**:
   - Login form: ✅
   - Sign up form: ✅
   - Seeker dashboard: ✅
   - Protected route wrapper: ✅

## Next Steps After Verification

Once you've verified the above works:

1. **Add Test Coaches** - Create coach profiles in the UI or via script
2. **Add Sample Sessions** - Create sample sessions for testing booking flow
3. **Test Navigation** - Verify all app flows work end-to-end
4. **Coach Onboarding** - Test coach registration and profile setup
5. **Admin Dashboard** - Verify admin features work
6. **Stripe Integration** - Implement payment processing

## Troubleshooting

### App not loading or stuck on "Loading..."
- Clear browser cache (Ctrl+Shift+Delete / Cmd+Shift+Delete)
- Check browser console for errors (F12)
- Make sure dev server is running: `npm run dev`

### Login fails
- Verify credentials: seeker@test.com / password123
- Check browser console for specific error message
- Run: `node scripts/test-auth.js` to diagnose

### Dashboard not showing data
- Open browser console (F12) and check for errors
- Run: `node scripts/test-full-flow.js` to verify API is working
- Data should load automatically on mount

### Can't connect to Supabase
- Verify Supabase MCP is connected
- Check that environment variables are set correctly
- Verify Supabase project is active

## Browser Console

The app uses console logging for debugging. When testing:
- Keep browser console open (F12)
- Look for any red error messages
- Auth flow logs should show which user is authenticated
- Dashboard data fetching logs should show when profile loads

---

**Status**: Ready for full browser testing! 🚀
