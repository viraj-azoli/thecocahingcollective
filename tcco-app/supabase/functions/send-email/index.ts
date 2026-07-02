import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!;
const FROM = 'TCCO <hello@tcco.app>';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type TemplateData = Record<string, string | number>;

const templates: Record<string, (data: TemplateData) => { subject: string; html: string }> = {
  booking_confirmation: (d) => ({
    subject: `Your session with ${d.coachName} is confirmed`,
    html: `
      <div style="font-family:Georgia,serif;max-width:560px;margin:0 auto;padding:40px 20px;background:#fff;">
        <div style="background:#12372A;padding:24px;border-radius:12px 12px 0 0;text-align:center;">
          <h1 style="color:#fff;font-size:24px;margin:0;">Session Confirmed ✓</h1>
        </div>
        <div style="border:1px solid #EDE8E0;border-top:none;border-radius:0 0 12px 12px;padding:32px;">
          <p style="color:#374151;font-size:16px;">Hi ${d.seekerName},</p>
          <p style="color:#374151;">Your coaching session with <strong>${d.coachName}</strong> is confirmed.</p>
          <div style="background:#F4EFE6;border-radius:12px;padding:20px;margin:20px 0;">
            <p style="margin:6px 0;color:#374151;"><strong>📅 Date:</strong> ${d.date}</p>
            <p style="margin:6px 0;color:#374151;"><strong>⏰ Time:</strong> ${d.time}</p>
            <p style="margin:6px 0;color:#374151;"><strong>⏱ Duration:</strong> ${d.duration} minutes</p>
          </div>
          <a href="${d.sessionUrl}" style="display:inline-block;background:#2D9E6B;color:#fff;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:600;margin-top:8px;">View Session →</a>
          <p style="color:#9CA3AF;font-size:13px;margin-top:32px;border-top:1px solid #EDE8E0;padding-top:16px;">The Coaching Collective Online · Unsubscribe</p>
        </div>
      </div>
    `,
  }),

  session_reminder: (d) => ({
    subject: `Reminder: Your session starts in 1 hour`,
    html: `
      <div style="font-family:Georgia,serif;max-width:560px;margin:0 auto;padding:40px 20px;background:#fff;">
        <h1 style="color:#12372A;font-size:24px;">Your session starts soon ⏰</h1>
        <p style="color:#374151;">Hi ${d.name}, your session with <strong>${d.otherParty}</strong> starts in 1 hour.</p>
        <a href="${d.joinUrl}" style="display:inline-block;background:#2D9E6B;color:#fff;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:600;">🔗 Join Session</a>
        <p style="color:#9CA3AF;font-size:13px;margin-top:32px;">The Coaching Collective Online</p>
      </div>
    `,
  }),

  welcome_seeker: (d) => ({
    subject: `Welcome to TCCO, ${d.name} 🌿`,
    html: `
      <div style="font-family:Georgia,serif;max-width:560px;margin:0 auto;padding:40px 20px;background:#fff;">
        <div style="background:#12372A;padding:24px;border-radius:12px 12px 0 0;text-align:center;">
          <h1 style="color:#fff;font-size:24px;margin:0;">Welcome to TCCO 🌿</h1>
        </div>
        <div style="border:1px solid #EDE8E0;border-top:none;border-radius:0 0 12px 12px;padding:32px;">
          <p style="color:#374151;font-size:16px;">Hi ${d.name},</p>
          <p style="color:#374151;">You're in. This is the beginning of something meaningful.</p>
          <p style="color:#374151;">Start by exploring our coaches and finding the right match for you.</p>
          <a href="${d.appUrl}/coaches" style="display:inline-block;background:#2D9E6B;color:#fff;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:600;margin-top:16px;">Find Your Coach →</a>
          <p style="color:#9CA3AF;font-size:13px;margin-top:32px;border-top:1px solid #EDE8E0;padding-top:16px;">The Coaching Collective Online</p>
        </div>
      </div>
    `,
  }),

  coach_verification_approved: (d) => ({
    subject: `You're now a verified TCCO coach 🎉`,
    html: `
      <div style="font-family:Georgia,serif;max-width:560px;margin:0 auto;padding:40px 20px;background:#fff;">
        <div style="background:#12372A;padding:24px;border-radius:12px 12px 0 0;text-align:center;">
          <h1 style="color:#fff;font-size:24px;margin:0;">You're Verified! 🎉</h1>
        </div>
        <div style="border:1px solid #EDE8E0;border-top:none;border-radius:0 0 12px 12px;padding:32px;">
          <p style="color:#374151;font-size:16px;">Congratulations, ${d.name}!</p>
          <p style="color:#374151;">Your coaching profile has been verified. You can now receive bookings from seekers on TCCO.</p>
          <a href="${d.appUrl}/coach/dashboard" style="display:inline-block;background:#2D9E6B;color:#fff;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:600;margin-top:16px;">Go to Dashboard →</a>
          <p style="color:#9CA3AF;font-size:13px;margin-top:32px;border-top:1px solid #EDE8E0;padding-top:16px;">The Coaching Collective Online</p>
        </div>
      </div>
    `,
  }),
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { to, template, data } = await req.json();

    if (!to || !template || !data) {
      return new Response(JSON.stringify({ error: 'Missing required fields: to, template, data' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const builder = templates[template];
    if (!builder) {
      return new Response(JSON.stringify({ error: `Unknown template: ${template}` }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { subject, html } = builder(data);

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from: FROM, to, subject, html }),
    });

    const result = await res.json();

    if (!res.ok) {
      console.error('Resend error:', result);
      return new Response(JSON.stringify({ error: result }), {
        status: res.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('send-email error:', err);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
