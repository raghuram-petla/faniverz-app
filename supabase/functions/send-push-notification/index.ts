import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const EXPO_PUSH_API = 'https://exp.host/--/api/v2/push/send';
const BATCH_SIZE = 100;
const PROCESS_LIMIT = 500;

interface NotificationRow {
  id: number;
  user_id: string;
  title: string;
  body: string;
  data: Record<string, unknown> | null;
}

interface PushTokenRow {
  expo_push_token: string;
  user_id: string;
}

interface ExpoPushMessage {
  to: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  sound: 'default';
}

interface ExpoPushTicket {
  id?: string;
  status: 'ok' | 'error';
  message?: string;
  details?: { error?: string };
}

Deno.serve(async () => {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // 1. Query due pending notifications
    const { data: notifications, error: fetchErr } = await supabase
      .from('notification_queue')
      .select('id, user_id, title, body, data')
      .eq('status', 'pending')
      .lte('scheduled_for', new Date().toISOString())
      .limit(PROCESS_LIMIT);

    if (fetchErr) throw fetchErr;
    if (!notifications || notifications.length === 0) {
      return new Response(JSON.stringify({ processed: 0 }), { status: 200 });
    }

    // 2. Get unique user IDs and their active push tokens
    const userIds = [...new Set(notifications.map((n: NotificationRow) => n.user_id))];
    const { data: tokens, error: tokenErr } = await supabase
      .from('push_tokens')
      .select('expo_push_token, user_id')
      .in('user_id', userIds)
      .eq('is_active', true);

    if (tokenErr) throw tokenErr;

    const tokenMap = new Map<string, string[]>();
    (tokens ?? []).forEach((t: PushTokenRow) => {
      const existing = tokenMap.get(t.user_id) ?? [];
      existing.push(t.expo_push_token);
      tokenMap.set(t.user_id, existing);
    });

    // 3. Build Expo push messages
    const messages: { notificationId: number; message: ExpoPushMessage }[] = [];

    for (const notif of notifications as NotificationRow[]) {
      const userTokens = tokenMap.get(notif.user_id) ?? [];
      for (const token of userTokens) {
        messages.push({
          notificationId: notif.id,
          message: {
            to: token,
            title: notif.title,
            body: notif.body,
            data: notif.data ?? undefined,
            sound: 'default',
          },
        });
      }
    }

    // 4. Send in batches
    let sentCount = 0;
    let failedCount = 0;
    const tokensToDeactivate: string[] = [];

    for (let i = 0; i < messages.length; i += BATCH_SIZE) {
      const batch = messages.slice(i, i + BATCH_SIZE);
      const pushMessages = batch.map((b) => b.message);

      const response = await fetch(EXPO_PUSH_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(pushMessages),
      });

      const result = await response.json();
      const tickets: ExpoPushTicket[] = result.data ?? [];

      tickets.forEach((ticket, idx) => {
        if (ticket.status === 'ok') {
          sentCount++;
        } else {
          failedCount++;
          if (ticket.details?.error === 'DeviceNotRegistered') {
            tokensToDeactivate.push(batch[idx].message.to);
          }
        }
      });
    }

    // 5. Mark notifications as sent
    const sentIds = notifications.map((n: NotificationRow) => n.id);
    await supabase
      .from('notification_queue')
      .update({ status: 'sent', sent_at: new Date().toISOString() })
      .in('id', sentIds);

    // 6. Deactivate bad tokens
    if (tokensToDeactivate.length > 0) {
      await supabase
        .from('push_tokens')
        .update({ is_active: false })
        .in('expo_push_token', tokensToDeactivate);
    }

    return new Response(
      JSON.stringify({ processed: notifications.length, sent: sentCount, failed: failedCount }),
      { status: 200 }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), { status: 500 });
  }
});
