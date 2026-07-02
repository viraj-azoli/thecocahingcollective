# Supabase Setup Guide

## Project Creation
✅ Project created: `tcco-coaching`
- Project URL: https://gzagyzvcekvpsdpkkqno.supabase.co
- Anon Key: Already added to `.env`

## Database Schema

### Running the SQL Schema

1. Go to your Supabase dashboard: https://app.supabase.com
2. Select the `tcco-coaching` project
3. Go to **SQL Editor** (left sidebar)
4. Click **New Query**
5. Copy the entire contents of `supabase/migrations/001_initial_schema.sql`
6. Paste into the SQL editor
7. Click **Run**

Expected output: "Success. No rows returned"

### Tables Created
- `users` - User records linked to auth.users
- `seeker_profiles` - Seeker-specific data
- `coach_profiles` - Coach-specific data
- `availability` - Coach availability calendar
- `sessions` - Booked coaching sessions
- `content` - Library content (audio, articles, etc.)
- `content_engagement` - Seeker engagement with content
- `journal_entries` - Daily journal check-ins
- `messages` - Coach-seeker messaging
- `subscriptions` - Stripe subscription tracking
- `admin_users` - Admin user roles & permissions
- `transactions` - Payment transaction history

### RLS (Row-Level Security)
- Enabled on all sensitive tables
- Basic policies in place (can be enhanced in Phase 2)

### Indexes
- Performance indexes created for common queries

## Storage Buckets

After running the SQL schema, create these storage buckets:

1. Go to **Storage** (left sidebar)
2. Click **Create Bucket** for each:
   - `coach-avatars` (public)
   - `coach-content` (private)
   - `seeker-avatars` (public)

## Auth Configuration

Email/password auth is enabled by default. OAuth (Google, Apple) can be configured in Settings → Authentication when needed (Phase 2).

## Next Steps

Once schema is created and buckets are set up:
1. Stripe configuration (Task 3)
2. Backend API setup (Phase 2)
3. React component development (Phase 3+)
