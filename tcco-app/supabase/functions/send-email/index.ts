import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

// Sends through Brevo, the same provider the newsletter-signup function uses.
// This previously pointed at Resend with a from-address on tcco.app — a domain
// that appears nowhere else in this project and was never verified — so every
// transactional email silently failed. Every caller swallows errors with
// .catch(() => {}), which is why nobody noticed.
const BREVO_API_KEY = Deno.env.get('BREVO_API_KEY')!;

const SENDER = {
  email: Deno.env.get('TCCO_SENDER_EMAIL') || 'info@thecoachingcollectiveonline.com',
  name: 'The Coaching Collective',
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type TemplateData = Record<string, string | number>;

// Shared chrome so every email looks like it came from the same place.
const shell = (heading: string, body: string) => `
  <div style="font-family:Georgia,serif;max-width:560px;margin:0 auto;padding:40px 20px;background:#fff;">
    <div style="background:#12372A;padding:24px;border-radius:12px 12px 0 0;text-align:center;">
      <h1 style="color:#fff;font-size:24px;margin:0;">${heading}</h1>
    </div>
    <div style="border:1px solid #EDE8E0;border-top:none;border-radius:0 0 12px 12px;padding:32px;">
      ${body}
      <p style="color:#9CA3AF;font-size:13px;margin-top:32px;border-top:1px solid #EDE8E0;padding-top:16px;">
        The Coaching Collective Online
      </p>
    </div>
  </div>
`;

const button = (href: string, label: string) => `
  <a href="${href}" style="display:inline-block;background:#2D9E6B;color:#fff;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:600;margin-top:16px;">${label}</a>
`;

const templates: Record<string, (data: TemplateData) => { subject: string; html: string }> = {
  booking_confirmation: (d) => ({
    subject: `Your session with ${d.coachName} is confirmed`,
    html: shell('Session Confirmed ✓', `
      <p style="color:#374151;font-size:16px;">Hi ${d.seekerName},</p>
      <p style="color:#374151;">Your coaching session with <strong>${d.coachName}</strong> is confirmed.</p>
      <div style="background:#F4EFE6;border-radius:12px;padding:20px;margin:20px 0;">
        <p style="margin:6px 0;color:#374151;"><strong>📅 Date:</strong> ${d.date}</p>
        <p style="margin:6px 0;color:#374151;"><strong>⏰ Time:</strong> ${d.time}</p>
        <p style="margin:6px 0;color:#374151;"><strong>⏱ Duration:</strong> ${d.duration} minutes</p>
      </div>
      ${button(String(d.sessionUrl), 'View Session →')}
    `),
  }),

  session_reminder: (d) => ({
    subject: 'Reminder: Your session starts in 1 hour',
    html: shell('Your session starts soon ⏰', `
      <p style="color:#374151;font-size:16px;">Hi ${d.name},</p>
      <p style="color:#374151;">Your session with <strong>${d.otherParty}</strong> starts in 1 hour.</p>
      ${button(String(d.joinUrl), '🔗 Join Session')}
    `),
  }),

  welcome_seeker: (d) => ({
    subject: `Welcome to The Coaching Collective, ${d.name} 🌿`,
    html: shell('Welcome 🌿', `
      <p style="color:#374151;font-size:16px;">Hi ${d.name},</p>
      <p style="color:#374151;">You're in. This is the beginning of something meaningful.</p>
      <p style="color:#374151;">Start by exploring our coaches and finding the right match for you.</p>
      ${button(`${d.appUrl}/coaches`, 'Find Your Coach →')}
    `),
  }),

  // This template was requested by the signup flow but never existed, so every
  // coach signup got back a 400 "Unknown template: welcome_coach" and no email.
  welcome_coach: (d) => ({
    subject: `Welcome to The Coaching Collective, ${d.name} 🌿`,
    html: shell('Welcome to the Collective 🌿', `
      <p style="color:#374151;font-size:16px;">Hi ${d.name},</p>
      <p style="color:#374151;">
        We're glad you're here. Your coach account is set up, and the next step is
        building out your profile so seekers can find you.
      </p>
      <div style="background:#F4EFE6;border-radius:12px;padding:20px;margin:20px 0;">
        <p style="margin:0 0 10px;color:#12372A;font-weight:700;">Getting started</p>
        <p style="margin:6px 0;color:#374151;">1. Complete your profile — bio, specialties and approach</p>
        <p style="margin:6px 0;color:#374151;">2. Set your availability and session pricing</p>
        <p style="margin:6px 0;color:#374151;">3. Submit for verification</p>
      </div>
      <p style="color:#374151;">
        Once your profile is verified you'll appear in the directory and can start
        receiving bookings. We'll email you the moment that happens.
      </p>
      ${button(`${d.appUrl}/onboarding-coach`, 'Complete Your Profile →')}
    `),
  }),

  coach_verification_approved: (d) => ({
    subject: "You're now a verified TCCO coach 🎉",
    html: shell("You're Verified! 🎉", `
      <p style="color:#374151;font-size:16px;">Congratulations, ${d.name}!</p>
      <p style="color:#374151;">Your coaching profile has been verified. You can now receive bookings from seekers on The Coaching Collective.</p>
      ${button(`${d.appUrl}/coach/dashboard`, 'Go to Dashboard →')}
    `),
  }),
};

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

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
    const { to, template, data } = await req.json();

    if (!to || !template || !data) {
      return json({ error: 'Missing required fields: to, template, data' }, 400);
    }
    if (typeof to !== 'string' || !isValidEmail(to)) {
      return json({ error: 'A valid recipient email is required' }, 400);
    }

    const builder = templates[template];
    if (!builder) {
      return json({ error: `Unknown template: ${template}` }, 400);
    }

    const { subject, html } = builder(data);

    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key': BREVO_API_KEY,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        sender: SENDER,
        to: [{ email: to, name: String(data.name || '') || undefined }],
        subject,
        htmlContent: html,
      }),
    });

    const text = await res.text();
    const result = text ? JSON.parse(text) : {};

    if (!res.ok) {
      console.error('Brevo error:', result);
      return json({ error: result }, res.status);
    }

    return json(result);
  } catch (err) {
    console.error('send-email error:', err);
    return json({ error: 'Internal server error' }, 500);
  }
});
