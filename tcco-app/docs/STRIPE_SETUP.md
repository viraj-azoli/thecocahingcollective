# Stripe Setup Guide

## Overview
Stripe handles payments for two flows:
1. **Seekers** - Pay for tier subscriptions (Discovery: $9.99/month, Connection: $197/month)
2. **Coaches** - Receive payments through Stripe Connect

## Step 1: Create Stripe Account & Get API Keys

1. Go to https://stripe.com and sign up (or log in)
2. Go to **Dashboard** → **Developers** (bottom left)
3. Click **API keys** 
4. Copy:
   - **Publishable key** (starts with `pk_test_` for testing, `pk_live_` for production)
   - **Secret key** (starts with `sk_test_` or `sk_live_`) - KEEP SECRET ⚠️

**Add to your `.env` file:**
```
VITE_STRIPE_PUBLIC_KEY=pk_test_...your_key_here...
```

Secret key will be added to backend environment in Phase 2.

## Step 2: Create Products & Prices

In Stripe Dashboard:

### Discovery Tier (Monthly)
1. Go to **Catalog** → **Products**
2. Click **+ Add product**
   - Name: `Discovery Tier`
   - Description: `Monthly access to coaching library and journal`
   - Type: `Service`
3. Click **Add pricing**
   - Currency: `USD`
   - Price: `$9.99`
   - Billing period: `Monthly`
   - Recurring: ✓ (check)
4. Save the **Price ID** (e.g., `price_...`):
   ```
   STRIPE_DISCOVERY_TIER_PRICE_ID=price_...
   ```

### Connection Tier (Monthly)
1. Create another product:
   - Name: `Connection Tier`
   - Description: `Monthly access to 1-on-1 coaching sessions`
   - Type: `Service`
2. Add pricing:
   - Currency: `USD`
   - Price: `$197.00`
   - Billing period: `Monthly`
   - Recurring: ✓
3. Save the **Price ID**:
   ```
   STRIPE_CONNECTION_TIER_PRICE_ID=price_...
   ```

### Session Purchase (One-time)
1. Create product:
   - Name: `Session Purchase`
   - Description: `Individual coaching session`
   - Type: `Service`
2. Add pricing:
   - Currency: `USD`
   - Price: Variable (coach sets their own rate) - for now use `$50.00` as default
   - Billing period: `One-time`
3. Save the **Price ID**:
   ```
   STRIPE_SESSION_PRICE_ID=price_...
   ```

## Step 3: Enable Stripe Connect (for Coaches)

1. Go to **Settings** (gear icon, top right)
2. Click **Stripe Connect**
3. Click **Connect with Stripe**
4. Follow prompts to enable:
   - Standard accounts (recommended for TCCO)
   - Enable **onboarding link generation**
5. Copy your **Stripe Connect Client ID**:
   ```
   STRIPE_CONNECT_CLIENT_ID=ca_...
   ```

## Step 4: Set Up Webhook (Phase 2)

Webhooks allow Stripe to notify our backend when:
- Subscription created/updated/cancelled
- Payment succeeded/failed
- Coach payout completed

For now, note the endpoint URL pattern:
```
https://yourdomain.com/webhooks/stripe
```

In Stripe Dashboard → **Developers** → **Webhooks**:
- Add endpoint (in Phase 2 when backend is ready)
- Events to listen for:
  - `customer.subscription.created`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `charge.succeeded`
  - `charge.failed`
  - `account.updated` (Stripe Connect)

## Step 5: Update Environment

Add all keys to `.env`:
```
VITE_STRIPE_PUBLIC_KEY=pk_test_...
STRIPE_DISCOVERY_TIER_PRICE_ID=price_...
STRIPE_CONNECTION_TIER_PRICE_ID=price_...
STRIPE_SESSION_PRICE_ID=price_...
STRIPE_CONNECT_CLIENT_ID=ca_...
```

## Testing Mode

All Stripe API keys starting with `pk_test_` and `sk_test_` are in **test mode**. This means:
- No real charges
- Use test card: `4242 4242 4242 4242` (any future date, any CVC)
- Test mode and live mode have separate products/prices

## Next Steps

1. ✅ Supabase schema & buckets created
2. ✅ Stripe products & prices created
3. ⏳ Webhook configuration (Phase 2 backend)
4. ⏳ Stripe Connect onboarding integration (Phase 2)
5. ⏳ Payment form integration (Phase 3 frontend)

## Security Notes

- Never commit secret keys to git
- Keep `sk_test_` and `sk_live_` keys secure
- Backend handles all secret key operations
- Frontend only uses publishable key (`pk_test_`)
- Enable webhooks for payment confirmation
