# The Coaching Collective Online - Member Platform

Complete two-sided coaching marketplace web application built with React, Supabase, and Stripe.

## 🎯 Project Overview

TCCO Member Platform is a fully functional coaching marketplace where:
- **Seekers** find coaches, book sessions, access content library, and track their wellness journey
- **Coaches** manage profiles, availability, sessions, create content, and earn money
- **Admins** moderate content, verify coaches, and view platform analytics

## 🏗️ Architecture

```
Frontend: React 18 + Vite (SPA)
├── Authentication: Supabase Auth
├── Database: Supabase PostgreSQL
├── Storage: Supabase Storage (file uploads)
├── Payments: Stripe (subscriptions + Connect)
└── Real-time: Supabase Subscriptions

Styling: CSS3 with CSS Variables
Routing: React Router v6
Data Fetching: TanStack Query (React Query)
```

## 📁 Project Structure

```
tcco-app/
├── src/
│   ├── auth/                 # Authentication context & hooks
│   ├── components/
│   │   ├── Auth/            # Login, SignUp
│   │   ├── Seeker/          # Seeker-specific components
│   │   ├── Coach/           # Coach-specific components
│   │   ├── Admin/           # Admin-specific components
│   │   └── Payment/         # Stripe checkout
│   ├── hooks/               # Custom React hooks
│   ├── lib/                 # Utilities (Supabase, Stripe)
│   ├── App.jsx              # Main app & routing
│   └── index.css            # Global styles
├── supabase/
│   └── migrations/
│       └── 001_initial_schema.sql  # Database schema
├── docs/
│   ├── SUPABASE_SETUP.md    # Supabase configuration
│   ├── STRIPE_SETUP.md      # Stripe configuration
│   └── DEPLOYMENT.md        # Deployment guide
├── package.json
└── vite.config.js
```

## ✨ Features Implemented

### Phase 1: Foundation ✅
- [x] Node.js project setup with React + Vite
- [x] Supabase integration & database schema
- [x] Stripe configuration and product setup
- [x] Environment variable management

### Phase 2: Authentication & Onboarding ✅
- [x] Supabase authentication (email/password)
- [x] AuthContext for user state management
- [x] Role-based route protection
- [x] Seeker onboarding (3-step quiz + tier selection)
- [x] Coach onboarding (4-step profile setup)
- [x] Admin setup & verification queue

### Phase 3: Seeker Features ✅
- [x] Seeker dashboard with stats
- [x] Coach directory & browsing
- [x] Upcoming sessions view
- [x] Session booking interface
- [x] Journal entry component
- [x] Day streak tracking

### Phase 4: Coach Features ✅
- [x] Coach dashboard with earnings
- [x] Session management
- [x] Content creation interface
- [x] Availability calendar setup
- [x] Seeker management
- [x] Profile management

### Phase 5: Admin Features ✅
- [x] Admin dashboard with metrics
- [x] Coach verification queue
- [x] Content moderation
- [x] Platform analytics
- [x] User management interface

### Phase 6: Payments & Deployment 🚀
- [x] Stripe subscription checkout
- [x] Payment integration structure
- [x] Deployment configuration
- [ ] Production Stripe setup (requires live keys)
- [ ] Email notifications
- [ ] Real-time updates

## 🚀 Getting Started

### Prerequisites
- Node.js 16+
- npm or yarn
- Supabase account
- Stripe account

### Local Development

1. **Clone and install:**
   ```bash
   cd /Users/viraj/Desktop/public_html/tcco-app
   npm install
   ```

2. **Set up environment variables:**
   Copy `.env.example` to `.env` and fill in:
   ```bash
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_anon_key
   VITE_STRIPE_PUBLIC_KEY=your_stripe_key
   VITE_APP_URL=http://localhost:5173
   ```

3. **Run the development server:**
   ```bash
   npm run dev
   ```
   Open `http://localhost:5173`

4. **Set up Supabase schema:**
   - Go to Supabase dashboard
   - SQL Editor → New Query
   - Copy contents of `supabase/migrations/001_initial_schema.sql`
   - Execute the query

5. **Create storage buckets:**
   In Supabase Storage, create:
   - `coach-avatars` (public)
   - `coach-content` (private)
   - `seeker-avatars` (public)

## 🔐 Authentication Flow

```
User Signs Up
    ↓
Select User Type (Seeker/Coach)
    ↓
Supabase Auth creates auth.users record
    ↓
users table record created with user_type
    ↓
Redirect to Onboarding
    ↓
Complete onboarding quiz/form
    ↓
Create seeker_profiles or coach_profiles record
    ↓
Redirect to Dashboard
```

## 💳 Payment Flow

```
Seeker Selects Tier
    ↓
Click "Subscribe"
    ↓
Stripe Checkout Component
    ↓
Enter Card Details (test: 4242 4242 4242 4242)
    ↓
Create subscription in Supabase
    ↓
Update seeker_profiles tier
    ↓
Redirect to Dashboard
```

## 🧪 Testing

### Test Users
```
Seeker:
  Email: seeker@test.com
  Password: password123
  Type: seeker

Coach:
  Email: coach@test.com
  Password: password123
  Type: coach

Admin:
  Email: admin@test.com
  Password: password123
  Type: admin
```

### Test Stripe Card
```
Card: 4242 4242 4242 4242
Expiry: 12/25
CVC: 123
```

## 📊 Database Schema

### Core Tables:
- `users` - Authentication + user type
- `seeker_profiles` - Seeker-specific data
- `coach_profiles` - Coach-specific data
- `sessions` - Booked coaching sessions
- `availability` - Coach availability calendar
- `content` - Library content (audio, articles, etc.)
- `journal_entries` - Seeker journal entries
- `subscriptions` - Stripe subscription tracking
- `messages` - Coach-seeker messaging
- `admin_users` - Admin roles & permissions
- `transactions` - Payment transaction history

All tables have Row-Level Security (RLS) enabled for data isolation.

## 🚀 Deployment to Hostinger

### Step 1: Build for Production
```bash
npm run build
```
Creates optimized build in `dist/` folder

### Step 2: Upload to Hostinger
1. SSH into your Hostinger account
2. Navigate to your public_html directory
3. Upload the contents of `dist/` to your domain

### Step 3: Configure Supabase
- Update `VITE_SUPABASE_URL` with your Supabase project URL
- Ensure CORS is configured in Supabase to allow your domain

### Step 4: Update Stripe
- Set live API keys in environment variables
- Configure webhook endpoint: `https://yourdomain.com/api/stripe/webhook`
- Update redirect URLs in Stripe Connect settings

### Step 5: DNS & SSL
- Point your domain DNS to Hostinger nameservers
- Enable SSL certificate (Hostinger provides free SSL)

## 📈 Key Features

### For Seekers:
- ✓ Browse and filter coaches by specialty
- ✓ Book 1-on-1 coaching sessions
- ✓ Access content library
- ✓ Track mood with daily journal
- ✓ Monitor session progress
- ✓ Choose between subscription tiers
- ✓ Manage profile & preferences

### For Coaches:
- ✓ Create and manage profile
- ✓ Set specialties and pricing
- ✓ Manage availability calendar
- ✓ Create content (audio, articles, programs)
- ✓ View upcoming sessions
- ✓ Track earnings
- ✓ Manage seeker relationships
- ✓ Receive bookings

### For Admins:
- ✓ Verify coaches before platform access
- ✓ View platform analytics
- ✓ Moderate user-generated content
- ✓ Manage users and permissions
- ✓ Monitor transactions
- ✓ Configure platform settings

## 🔑 Environment Variables

```
# Supabase
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs...

# Stripe (Frontend)
VITE_STRIPE_PUBLIC_KEY=pk_test_xxxxx

# Stripe (Backend - Phase 2)
STRIPE_SECRET_KEY=sk_test_xxxxx
STRIPE_CONNECT_CLIENT_ID=ca_xxxxx

# App Configuration
VITE_APP_URL=http://localhost:5173 (development)
VITE_APP_URL=https://yourdomain.com (production)
```

## 📚 Documentation

- **SUPABASE_SETUP.md** - Complete Supabase configuration
- **STRIPE_SETUP.md** - Stripe products, keys, and Connect setup
- **DEPLOYMENT.md** - Step-by-step Hostinger deployment

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite |
| Styling | CSS3, CSS Variables |
| Routing | React Router v6 |
| State | React Context + Hooks |
| Data Fetching | TanStack Query (ready) |
| Backend | Supabase (PostgreSQL, Auth, Storage) |
| Payments | Stripe |
| Real-time | Supabase Subscriptions (ready) |
| Testing | Vitest |
| Build | Vite |

## 🔄 What's Next?

To fully launch:
1. [ ] Run Supabase schema in your project
2. [ ] Create Stripe products (see STRIPE_SETUP.md)
3. [ ] Add your API keys to .env
4. [ ] Build and deploy to Hostinger
5. [ ] Set up email notifications (Phase 2)
6. [ ] Implement Stripe webhooks (Phase 2)
7. [ ] Add real-time session updates (Phase 2)
8. [ ] Set up analytics (Phase 2)

## 📞 Support

For issues or questions:
- Check docs/ folder for setup guides
- Review Supabase docs: https://supabase.com/docs
- Check Stripe docs: https://stripe.com/docs

## 📄 License

ISC
