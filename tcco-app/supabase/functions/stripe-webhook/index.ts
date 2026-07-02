import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import Stripe from 'https://esm.sh/stripe@14?target=deno';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, { apiVersion: '2024-04-10' });
const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

serve(async (req) => {
  const signature = req.headers.get('stripe-signature');
  if (!signature) {
    return new Response('Missing stripe-signature header', { status: 400 });
  }

  const body = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      Deno.env.get('STRIPE_WEBHOOK_SECRET')!,
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return new Response('Bad signature', { status: 400 });
  }

  try {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.CheckoutSession;
      const { userId, tier } = session.metadata ?? {};

      if (!userId || !tier) {
        console.error('Missing metadata on checkout session:', session.id);
        return new Response('ok');
      }

      const { data: profile } = await supabase
        .from('seeker_profiles')
        .select('id')
        .eq('user_id', userId)
        .single();

      if (profile?.id) {
        await supabase.from('subscriptions').upsert({
          seeker_id: profile.id,
          tier,
          stripe_subscription_id: session.subscription as string,
          status: 'active',
          started_at: new Date().toISOString(),
        }, { onConflict: 'seeker_id' });

        await supabase.from('seeker_profiles')
          .update({
            tier,
            stripe_subscription_id: session.subscription as string,
          })
          .eq('user_id', userId);
      }
    }

    if (event.type === 'customer.subscription.deleted') {
      const sub = event.data.object as Stripe.Subscription;
      await supabase.from('subscriptions')
        .update({ status: 'cancelled', ended_at: new Date().toISOString() })
        .eq('stripe_subscription_id', sub.id);

      // Downgrade seeker to Discovery tier
      const { data: subscription } = await supabase
        .from('subscriptions')
        .select('seeker_id')
        .eq('stripe_subscription_id', sub.id)
        .single();

      if (subscription?.seeker_id) {
        await supabase.from('seeker_profiles')
          .update({ tier: 'Discovery' })
          .eq('id', subscription.seeker_id);
      }
    }

    if (event.type === 'customer.subscription.updated') {
      const sub = event.data.object as Stripe.Subscription;
      const status = sub.status === 'active' ? 'active' : 'past_due';
      await supabase.from('subscriptions')
        .update({ status })
        .eq('stripe_subscription_id', sub.id);
    }
  } catch (err) {
    console.error('Webhook handler error:', err);
    return new Response('Handler error', { status: 500 });
  }

  return new Response('ok');
});
