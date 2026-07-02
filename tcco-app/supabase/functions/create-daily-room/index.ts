import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { sessionId } = await req.json();

    if (!sessionId) {
      return new Response(JSON.stringify({ error: 'Missing sessionId' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const res = await fetch('https://api.daily.co/v1/rooms', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('DAILY_API_KEY')}`,
      },
      body: JSON.stringify({
        name: `tcco-session-${sessionId}`,
        properties: {
          enable_screenshare: true,
          enable_chat: true,
          exp: Math.floor(Date.now() / 1000) + 7200, // 2 hours
          max_participants: 2,
          enable_knocking: false,
          start_video_off: false,
          start_audio_off: false,
        },
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      // If room already exists (409), fetch it instead
      if (res.status === 409) {
        const getRoomRes = await fetch(`https://api.daily.co/v1/rooms/tcco-session-${sessionId}`, {
          headers: { 'Authorization': `Bearer ${Deno.env.get('DAILY_API_KEY')}` },
        });
        const room = await getRoomRes.json();
        return new Response(JSON.stringify({ url: room.url }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      console.error('Daily.co API error:', err);
      return new Response(JSON.stringify({ error: 'Failed to create room' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const room = await res.json();
    return new Response(JSON.stringify({ url: room.url }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('create-daily-room error:', err);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
