import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import Stripe from 'https://esm.sh/stripe@14?target=deno';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Creates a Stripe Checkout Session for a single coaching session.
//
// The charge is created ON the coach's connected account (a direct charge),
// passed via the { stripeAccount } request option. That makes the coach the
// merchant of record: their name appears on the seeker's statement, the funds
// land in their balance without touching TCCO's, and they own any refund or
// dispute. No application_fee_amount is set — TCCO takes no cut.

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, { apiVersion: '2024-04-10' });
const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

const APP_URL = Deno.env.get('APP_URL') || '';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { sessionId } = await req.json();
    if (!sessionId) return json({ error: 'sessionId is required' }, 400);

    // Read the pending session and its coach. Amount comes from the database,
    // never from the client — otherwise a seeker could set their own price.
    const { data: session, error: sessionErr } = await supabase
      .from('sessions')
      .select('id, status, scheduled_date, scheduled_time, duration_minutes, coach_id, seeker_id')
      .eq('id', sessionId)
      .single();

    if (sessionErr || !session) return json({ error: 'Session not found' }, 404);
    if (session.status !== 'pending_payment') {
      return json({ error: 'This session is not awaiting payment' }, 409);
    }

    const { data: coach } = await supabase
      .from('coach_profiles')
      .select('id, name, price_per_session, stripe_account_id, stripe_charges_enabled')
      .eq('id', session.coach_id)
      .single();

    if (!coach?.stripe_account_id || !coach.stripe_charges_enabled) {
      return json({ error: 'This coach is not set up to accept payments yet' }, 409);
    }

    const amount = Number(coach.price_per_session);
    if (!Number.isFinite(amount) || amount <= 0) {
      return json({ error: 'This coach has not set a session price' }, 409);
    }

    const checkout = await stripe.checkout.sessions.create(
      {
        mode: 'payment',
        line_items: [{
          quantity: 1,
          price_data: {
            currency: 'usd',
            unit_amount: Math.round(amount * 100),
            product_data: {
              name: `Coaching session with ${coach.name}`,
              description: `${session.scheduled_date} at ${String(session.scheduled_time).slice(0, 5)} · ${session.duration_minutes} minutes`,
            },
          },
        }],
        // Slots are only held while payment is pending, so don't let an
        // abandoned checkout sit on one for the Stripe default of 24 hours.
        expires_at: Math.floor(Date.now() / 1000) + 30 * 60,
        success_url: `${APP_URL}/sessions?payment=success`,
        cancel_url: `${APP_URL}/coaches/${coach.id}?payment=cancelled`,
        metadata: {
          tcco_session_id: session.id,
          coach_id: String(coach.id),
          seeker_id: String(session.seeker_id),
        },
      },
      { stripeAccount: coach.stripe_account_id },
    );

    await supabase.from('sessions')
      .update({ stripe_checkout_session_id: checkout.id })
      .eq('id', session.id);

    return json({ url: checkout.url });
  } catch (err) {
    console.error('create-session-checkout error:', err);
    return json({ error: 'Internal server error' }, 500);
  }
});
