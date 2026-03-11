import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

interface PushMessage {
  to: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  sound?: string;
}

Deno.serve(async (req) => {
  try {
    const { notification_id } = await req.json();
    if (!notification_id) {
      return new Response(JSON.stringify({ error: 'notification_id required' }), { status: 400 });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data: notification, error: nErr } = await supabase
      .from('notifications')
      .select('*')
      .eq('id', notification_id)
      .single();

    if (nErr || !notification) {
      return new Response(JSON.stringify({ error: 'Notification not found' }), { status: 404 });
    }

    const isBroadcast = notification.user_id === '00000000-0000-0000-0000-000000000000';

    let tokenQuery = supabase.from('push_tokens').select('token').eq('is_active', true);
    if (!isBroadcast) {
      tokenQuery = tokenQuery.eq('user_id', notification.user_id);
    }

    const { data: tokens, error: tErr } = await tokenQuery;
    if (tErr || !tokens?.length) {
      await supabase.from('notifications').update({ status: 'failed' }).eq('id', notification_id);
      return new Response(JSON.stringify({ error: 'No active tokens' }), { status: 200 });
    }

    const messages: PushMessage[] = tokens.map((t: { token: string }) => ({
      to: t.token,
      title: notification.title,
      body: notification.message,
      data: { notification_id: notification.id, movie_id: notification.movie_id },
      sound: 'default',
    }));

    const response = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(messages),
    });

    const result = await response.json();

    await supabase
      .from('notifications')
      .update({ status: response.ok ? 'sent' : 'failed' })
      .eq('id', notification_id);

    return new Response(JSON.stringify({ success: response.ok, result }), { status: 200 });
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), { status: 500 });
  }
});
