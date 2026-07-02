import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function sendEmail(to: string, template: string, data: Record<string, unknown>) {
  return fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/send-email`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ to, template, data }),
  });
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const now = new Date();

    // Find sessions starting in ~1 hour (within a 5-minute window to avoid double-sending)
    const in1h    = new Date(now.getTime() + 60 * 60 * 1000);
    const target  = in1h.toISOString().split('T')[0];
    const tHour   = in1h.getHours().toString().padStart(2, '0');
    const tMinute = in1h.getMinutes().toString().padStart(2, '0');
    const targetTime = `${tHour}:${tMinute}:00`;

    const { data: sessions, error } = await supabase
      .from('sessions')
      .select('*, seeker:seeker_profiles(name, user_id), coach:coach_profiles(name, user_id)')
      .eq('scheduled_date', target)
      .gte('scheduled_time', `${tHour}:00:00`)
      .lt('scheduled_time', `${tHour}:59:59`)
      .eq('status', 'scheduled');

    if (error) {
      console.error('Failed to fetch sessions:', error);
      return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });
    }

    const sent: string[] = [];

    for (const s of sessions || []) {
      const joinUrl = s.zoom_link || `${Deno.env.get('APP_URL')}/sessions`;

      // Get seeker's email
      const { data: seekerAuth } = await supabase.auth.admin.getUserById(s.seeker.user_id);
      const seekerEmail = seekerAuth?.user?.email;

      // Get coach's email
      const { data: coachAuth } = await supabase.auth.admin.getUserById(s.coach.user_id);
      const coachEmail = coachAuth?.user?.email;

      if (seekerEmail) {
        await sendEmail(seekerEmail, 'session_reminder', {
          name:       s.seeker.name,
          otherParty: s.coach.name,
          date:       s.scheduled_date,
          time:       s.scheduled_time?.slice(0, 5),
          joinUrl,
        }).catch(e => console.error('Seeker reminder failed:', e));
        sent.push(`seeker:${seekerEmail}`);
      }

      if (coachEmail) {
        await sendEmail(coachEmail, 'session_reminder', {
          name:       s.coach.name,
          otherParty: s.seeker.name,
          date:       s.scheduled_date,
          time:       s.scheduled_time?.slice(0, 5),
          joinUrl,
        }).catch(e => console.error('Coach reminder failed:', e));
        sent.push(`coach:${coachEmail}`);
      }
    }

    return new Response(
      JSON.stringify({ checked: sessions?.length ?? 0, sent }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    console.error('send-reminders error:', err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
