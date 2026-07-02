import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import Stripe from 'https://esm.sh/stripe@14?target=deno';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, { apiVersion: '2024-04-10' });
const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { coachUserId, email } = await req.json();

    if (!coachUserId || !email) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if coach already has a Stripe account
    const { data: coachProfile } = await supabase
      .from('coach_profiles')
      .select('stripe_account_id')
      .eq('user_id', coachUserId)
      .single();

    let accountId = coachProfile?.stripe_account_id;

    if (!accountId) {
      // Create new Express account
      const account = await stripe.accounts.create({
        type: 'express',
        email,
        capabilities: { transfers: { requested: true } },
      });

      accountId = account.id;

      await supabase.from('coach_profiles')
        .update({ stripe_account_id: accountId })
        .eq('user_id', coachUserId);
    }

    // Generate onboarding link (works for both new and existing accounts)
    const link = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${Deno.env.get('APP_URL')}/coach/earnings`,
      return_url:  `${Deno.env.get('APP_URL')}/coach/earnings?connected=true`,
      type: 'account_onboarding',
    });

    return new Response(JSON.stringify({ url: link.url }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('create-connect-account error:', err);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
