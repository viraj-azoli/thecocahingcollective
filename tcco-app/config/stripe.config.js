// Stripe Configuration
// Define all Stripe products, prices, and settings for TCCO

export const stripeConfig = {
  // Products
  products: {
    discoveryTier: {
      name: 'Discovery Tier',
      description: 'Monthly access to coaching library and journal',
      type: 'service',
    },
    connectionTier: {
      name: 'Connection Tier',
      description: 'Monthly access to 1-on-1 coaching sessions',
      type: 'service',
    },
    sessionPurchase: {
      name: 'Session Purchase',
      description: 'Individual coaching session',
      type: 'service',
    },
  },

  // Prices
  prices: {
    discoveryTier: {
      amount: 999, // $9.99 in cents
      currency: 'usd',
      recurring: {
        interval: 'month',
        interval_count: 1,
      },
    },
    connectionTier: {
      amount: 19700, // $197.00 in cents
      currency: 'usd',
      recurring: {
        interval: 'month',
        interval_count: 1,
      },
    },
    sessionPurchase: {
      amount: 5000, // $50.00 in cents (default, coaches can set their own)
      currency: 'usd',
      recurring: null, // One-time payment
    },
  },

  // Stripe Connect settings for coaches
  connect: {
    type: 'standard', // standard or express
    requiresVerification: true,
  },

  // Frontend public key (from .env)
  publicKeyEnvVar: 'VITE_STRIPE_PUBLIC_KEY',

  // Backend secret key (for Phase 2)
  secretKeyEnvVar: 'STRIPE_SECRET_KEY',

  // Connect client ID (for onboarding)
  connectClientIdEnvVar: 'STRIPE_CONNECT_CLIENT_ID',
};

// Helper to get current pricing
export const getPricing = () => ({
  discoveryTier: {
    id: 'discovery',
    name: 'Discovery Tier',
    price: 9.99,
    priceId: process.env.STRIPE_DISCOVERY_TIER_PRICE_ID,
    features: [
      'Access to coaching library',
      'Daily journal prompts',
      'Mood tracking',
      'Email support',
    ],
    interval: 'month',
  },
  connectionTier: {
    id: 'connection',
    name: 'Connection Tier',
    price: 197.0,
    priceId: process.env.STRIPE_CONNECTION_TIER_PRICE_ID,
    features: [
      'Everything in Discovery',
      'Monthly 1-on-1 coaching sessions',
      'Priority support',
      'Personalized coaching plan',
    ],
    interval: 'month',
  },
});

export default stripeConfig;
