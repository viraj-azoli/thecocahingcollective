import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const BREVO_API_KEY = Deno.env.get('BREVO_API_KEY')!;
const FOUNDER_EMAIL = Deno.env.get('NEWSLETTER_FOUNDER_EMAIL') || 'pamrupprecht1@gmail.com';
// List 3 ("new signups") has a pre-existing Brevo automation attached that
// fires its own (locked, un-brandable, un-disableable via API) "You are now
// subscribed!" email whenever a contact is added to it — confirmed by
// testing, this would duplicate the branded welcome email below. List 4
// ("identified_contacts") is an existing, empty, automation-free list —
// confirmed via testing that adding to it triggers nothing extra. Using it
// here keeps this function in full control of what gets sent.
const BREVO_LIST_ID = 4;
const WELCOME_TEMPLATE_ID = 12; // "TCCO — Newsletter Welcome Email"
const FOUNDER_TEMPLATE_ID = 13; // "TCCO — Founder New Subscriber Notification"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

async function brevoRequest(path: string, body: unknown) {
  const res = await fetch(`https://api.brevo.com/v3${path}`, {
    method: 'POST',
    headers: {
      'api-key': BREVO_API_KEY,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : {};
  return { ok: res.ok, status: res.status, data };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { name, email } = await req.json();

    if (!name || typeof name !== 'string' || !name.trim()) {
      return new Response(JSON.stringify({ error: 'Name is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (!email || typeof email !== 'string' || !isValidEmail(email)) {
      return new Response(JSON.stringify({ error: 'A valid email is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const firstName = name.trim().slice(0, 100);
    const cleanEmail = email.trim().toLowerCase();

    // 1. Add (or update) the contact in Brevo — plain contact-create is
    // silent, it does not itself trigger any confirmation email.
    const contactResult = await brevoRequest('/contacts', {
      email: cleanEmail,
      attributes: { FIRSTNAME: firstName },
      listIds: [BREVO_LIST_ID],
      updateEnabled: true,
    });

    // 400 "duplicate_parameter" just means they're already a contact —
    // not an error worth failing the request over.
    if (!contactResult.ok && contactResult.data?.code !== 'duplicate_parameter') {
      console.error('Brevo contact create failed:', contactResult.data);
      return new Response(JSON.stringify({ error: 'Could not save subscription' }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 2. Send the branded welcome email to the subscriber.
    const welcomeResult = await brevoRequest('/smtp/email', {
      to: [{ email: cleanEmail, name: firstName }],
      templateId: WELCOME_TEMPLATE_ID,
      params: { FIRSTNAME: firstName, EMAIL: cleanEmail },
    });
    if (!welcomeResult.ok) {
      console.error('Welcome email failed:', welcomeResult.data);
    }

    // 3. Notify the founder — fire-and-forget, never blocks the
    // subscriber's own success response.
    const founderResult = await brevoRequest('/smtp/email', {
      to: [{ email: FOUNDER_EMAIL }],
      templateId: FOUNDER_TEMPLATE_ID,
      params: { FIRSTNAME: firstName, EMAIL: cleanEmail },
    });
    if (!founderResult.ok) {
      console.error('Founder notification failed:', founderResult.data);
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('newsletter-signup error:', err);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
