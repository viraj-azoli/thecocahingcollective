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

// Masthead card used by welcome_seeker / welcome_coach — matches the
// standalone marketing emails (coach-invitation.html, coach-app-guide.html):
// dark green banner with an eyebrow, serif headline, hairline-border body,
// table layout throughout since Outlook supports neither flexbox nor grid.
// Kept separate from shell() above so booking_confirmation, session_reminder
// and coach_verification_approved are untouched.
const cardShell = (eyebrow: string, headline: string, body: string) => `
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<meta name="x-apple-disable-message-reformatting"/>
<style>
  body { margin:0; padding:0; }
  table { border-collapse:collapse; mso-table-lspace:0pt; mso-table-rspace:0pt; }
  img { border:0; outline:none; text-decoration:none; }
  a { text-decoration:none; }
  @media only screen and (max-width:620px) {
    .ecw { width:100% !important; }
    .epad { padding-left:24px !important; padding-right:24px !important; }
  }
</style>
</head>
<body style="margin:0;padding:0;background-color:#F4F2ED;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#F4F2ED;">
<tr><td align="center" style="padding:32px 12px;">
<table role="presentation" class="ecw" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:600px;background-color:#FFFFFF;border:1px solid #E4E9E7;border-radius:10px;overflow:hidden;">
  <tr>
    <td align="center" style="background-color:#16352C;padding:36px 32px 32px;">
      <div style="font-family:Georgia,'Times New Roman',serif;font-size:13px;letter-spacing:0.18em;text-transform:uppercase;color:#8FB3A4;padding-bottom:14px;">${eyebrow}</div>
      <div style="font-family:Georgia,'Times New Roman',serif;font-size:28px;line-height:36px;color:#F7F5F0;">${headline}</div>
    </td>
  </tr>
  <tr>
    <td class="epad" style="padding:36px 40px 40px;">
      ${body}
      <p style="margin:32px 0 0;padding-top:20px;border-top:1px solid #E4E9E7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-size:12px;line-height:19px;color:#8A9A93;">
        The Coaching Collective &middot; Chicago, USA<br/>
        <a href="mailto:info@thecoachingcollectiveonline.com" style="color:#8A9A93;">info@thecoachingcollectiveonline.com</a>
      </p>
    </td>
  </tr>
</table>
</td></tr>
</table>
</body>
</html>
`;

const cardButton = (href: string, label: string) => `
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-top:20px;">
    <tr><td align="center" bgcolor="#1A5843" style="border-radius:6px;">
      <a href="${href}" style="display:inline-block;padding:14px 32px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-size:15px;font-weight:600;color:#FFFFFF;border-radius:6px;">${label}</a>
    </td></tr>
  </table>
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

  // Fires the instant signup() resolves, before onboarding — so `name` is
  // whatever AuthContext derived from the email address, not a real display
  // name yet. Kept short and warm on purpose: this is the "you're in"
  // confirmation, not the full tour — that's a separate, later email.
  welcome_seeker: (d) => ({
    subject: `You're in, ${d.name}`,
    html: cardShell('You’re in', 'Thank you for joining us', `
      <p style="margin:0 0 16px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:26px;color:#16352C;">
        Hi ${d.name},
      </p>
      <p style="margin:0 0 16px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:26px;color:#5A6B64;">
        Thank you for joining The Coaching Collective. We built this as a small,
        curated group of coaches rather than an open marketplace — every coach
        here is someone we'd point a friend toward.
      </p>
      <p style="margin:0 0 8px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:26px;color:#5A6B64;">
        Your journal and session notes are private by default — nobody sees them
        but you, not even your coach unless you choose to share.
      </p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#E9EFEC;border-radius:8px;margin-top:20px;">
        <tr><td style="padding:20px 24px;">
          <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-size:11px;font-weight:600;letter-spacing:0.11em;text-transform:uppercase;color:#4A7B68;padding-bottom:10px;">
            Getting started
          </div>
          <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-size:15px;line-height:25px;color:#3F5B50;">
            Browse coaches by specialty, then book a first session whenever you're ready — there's no rush and no obligation.
          </div>
        </td></tr>
      </table>
      ${cardButton(`${d.appUrl}/coaches`, 'Browse coaches')}
    `),
  }),

  // This template was requested by the signup flow but never existed, so every
  // coach signup got back a 400 "Unknown template: welcome_coach" and no email.
  welcome_coach: (d) => ({
    subject: `You're in, ${d.name}`,
    html: cardShell('You’re in', 'Thank you for joining as a coach', `
      <p style="margin:0 0 16px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:26px;color:#16352C;">
        Hi ${d.name},
      </p>
      <p style="margin:0 0 16px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-size:16px;line-height:26px;color:#5A6B64;">
        Thank you for joining The Coaching Collective. Clients pay you directly
        through your own Stripe account — you keep 100%, we take no commission
        and never touch the money.
      </p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#E9EFEC;border-radius:8px;margin-top:8px;">
        <tr><td style="padding:20px 24px;">
          <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-size:11px;font-weight:600;letter-spacing:0.11em;text-transform:uppercase;color:#4A7B68;padding-bottom:10px;">
            Before you're visible to clients
          </div>
          <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-size:15px;line-height:25px;color:#3F5B50;">
            <strong style="color:#16352C;">1. Settings</strong> — photo, bio, specialties, rate<br/>
            <strong style="color:#16352C;">2. Earnings</strong> — connect Stripe so you can be paid<br/>
            <strong style="color:#16352C;">3. Availability</strong> — publish the hours you work
          </div>
        </td></tr>
      </table>
      <p style="margin:20px 0 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-size:15px;line-height:24px;color:#5A6B64;">
        Once those three are done and we've verified your profile, you'll appear
        in the directory and can start receiving bookings — we'll email you the
        moment that happens. A fuller walkthrough of the dashboard is on its way
        separately.
      </p>
      ${cardButton(`${d.appUrl}/coach/settings`, 'Complete your profile')}
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
