import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import Stripe from 'https://esm.sh/stripe@14?target=deno';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Handles Stripe Connect events for per-session direct charges.
//
// Because charges are created on the coach's connected account, these arrive
// on the CONNECT webhook endpoint and carry an `account` field identifying
// the coach. Configure the endpoint in Stripe as "Connect" (not "Account")
// and subscribe to: checkout.session.completed, checkout.session.expired,
// account.updated.
//
// Deploy with --no-verify-jwt: Stripe cannot present a Supabase JWT. The
// request is authenticated by the signature check below instead.

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, { apiVersion: '2024-04-10' });
const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

const APP_URL = Deno.env.get('APP_URL') || '';

// Sent from here rather than the browser: the seeker is on Stripe's domain
// when payment clears, and a client-side send would also fire for people who
// abandoned checkout.
async function sendBookingConfirmation(sessionId: string) {
  try {
    const { data: session } = await supabase
      .from('sessions')
      .select('scheduled_date, scheduled_time, duration_minutes, coach:coach_profiles(name), seeker:seeker_profiles(name, user_id)')
      .eq('id', sessionId)
      .single();

    if (!session?.seeker?.user_id) return;

    const { data: user } = await supabase
      .from('users')
      .select('email')
      .eq('id', session.seeker.user_id)
      .single();

    if (!user?.email) return;

    const time = String(session.scheduled_time).slice(0, 5);
    await supabase.functions.invoke('send-email', {
      body: {
        to: user.email,
        template: 'booking_confirmation',
        data: {
          seekerName: session.seeker.name || user.email.split('@')[0],
          coachName: session.coach?.name || 'your coach',
          date: new Date(`${session.scheduled_date}T00:00`).toLocaleDateString('en-US', {
            weekday: 'long', month: 'long', day: 'numeric',
          }),
          time,
          duration: session.duration_minutes ?? 55,
          sessionUrl: `${APP_URL}/sessions`,
        },
      },
    });
  } catch (err) {
    // Never fail the webhook over an email — Stripe would retry the whole
    // event and the seeker is already booked and charged.
    console.error('Booking confirmation email failed:', err);
  }
}

serve(async (req) => {
  const signature = req.headers.get('stripe-signature');
  if (!signature) {
    return new Response('Missing stripe-signature header', { status: 400 });
  }

  const body = await req.text();

  let event: Stripe.Event;
  try {
    // Async variant: the sync one uses Node crypto and throws under Deno.
    event = await stripe.webhooks.constructEventAsync(
      body,
      signature,
      Deno.env.get('STRIPE_WEBHOOK_SECRET')!,
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return new Response('Bad signature', { status: 400 });
  }

  try {
    switch (event.type) {
      // ── Payment succeeded — confirm the booking ──────────────────────
      case 'checkout.session.completed': {
        const checkout = event.data.object as Stripe.Checkout.Session;
        const sessionId = checkout.metadata?.tcco_session_id;

        if (!sessionId) {
          console.error('checkout.session.completed with no tcco_session_id:', checkout.id);
          break;
        }
        if (checkout.payment_status !== 'paid') {
          console.log('Checkout completed but not paid, ignoring:', checkout.id);
          break;
        }

        // Match on the checkout id as well as the session id so a replayed
        // event can't attach a payment to a row that has since changed, and
        // only promote a row that is still awaiting payment (idempotency).
        const { data: updated, error } = await supabase
          .from('sessions')
          .update({
            status: 'scheduled',
            amount_paid: (checkout.amount_total ?? 0) / 100,
            paid_at: new Date().toISOString(),
            stripe_payment_intent_id: checkout.payment_intent as string,
          })
          .eq('id', sessionId)
          .eq('stripe_checkout_session_id', checkout.id)
          .eq('status', 'pending_payment')
          .select('id');

        if (error) {
          console.error('Failed to confirm session', sessionId, error.message);
          return new Response('Handler error', { status: 500 });
        }
        if (!updated?.length) {
          // Already confirmed by an earlier delivery of this event — don't
          // send the confirmation email twice.
          console.log('Session already confirmed or gone, ignoring:', sessionId);
          break;
        }

        await sendBookingConfirmation(sessionId);
        break;
      }

      // ── Seeker abandoned checkout — release the slot ─────────────────
      case 'checkout.session.expired': {
        const checkout = event.data.object as Stripe.Checkout.Session;
        const sessionId = checkout.metadata?.tcco_session_id;
        if (!sessionId) break;

        await supabase
          .from('sessions')
          .delete()
          .eq('id', sessionId)
          .eq('stripe_checkout_session_id', checkout.id)
          .eq('status', 'pending_payment');
        break;
      }

      // ── Coach's Stripe onboarding progressed ─────────────────────────
      case 'account.updated': {
        const account = event.data.object as Stripe.Account;
        await supabase
          .from('coach_profiles')
          .update({
            stripe_charges_enabled: account.charges_enabled,
            stripe_payouts_enabled: account.payouts_enabled,
          })
          .eq('stripe_account_id', account.id);
        break;
      }

      // ── Coach refunded a seeker on their own account ─────────────────
      case 'charge.refunded': {
        const charge = event.data.object as Stripe.Charge;
        if (!charge.payment_intent) break;

        await supabase
          .from('sessions')
          .update({ status: 'cancelled' })
          .eq('stripe_payment_intent_id', charge.payment_intent as string)
          .in('status', ['scheduled', 'in_progress']);
        break;
      }

      default:
        // Unsubscribed event types are fine to ignore.
        break;
    }
  } catch (err) {
    console.error('Webhook handler error:', err);
    return new Response('Handler error', { status: 500 });
  }

  return new Response('ok');
});
