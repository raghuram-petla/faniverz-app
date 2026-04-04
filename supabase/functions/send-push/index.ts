import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { BROADCAST_USER_ID } from '../../../shared/constants.ts';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
const EXPO_BATCH_LIMIT = 100;

interface PushMessage {
  to: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  sound?: string;
}

Deno.serve(async (req) => {
  try {
    // Verify caller is authorized (service role or admin JWT)
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }
    const token = authHeader.replace('Bearer ', '');
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // If not using service role key, verify the JWT belongs to an admin
    // Use constant-time comparison to prevent timing attacks
    const isServiceRole = (() => {
      const a = new TextEncoder().encode(token);
      const b = new TextEncoder().encode(serviceKey);
      if (a.length !== b.length) return false;
      let result = 0;
      for (let i = 0; i < a.length; i++) result |= a[i] ^ b[i];
      return result === 0;
    })();
    if (!isServiceRole) {
      const supabaseAuth = createClient(Deno.env.get('SUPABASE_URL')!, serviceKey);
      const {
        data: { user },
        error: authErr,
      } = await supabaseAuth.auth.getUser(token);
      if (authErr || !user) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
      }
      // @boundary: Check both role existence AND active status — blocked admins must not send push
      const { data: role } = await supabaseAuth
        .from('admin_user_roles')
        .select('role_id')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .maybeSingle();
      if (!role) {
        return new Response(JSON.stringify({ error: 'Forbidden: admin role required' }), {
          status: 403,
        });
      }
    }

    const { notification_id } = await req.json();
    if (!notification_id) {
      return new Response(JSON.stringify({ error: 'notification_id required' }), { status: 400 });
    }

    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, serviceKey);

    const { data: notification, error: nErr } = await supabase
      .from('notifications')
      .select('*')
      .eq('id', notification_id)
      .single();

    if (nErr || !notification) {
      return new Response(JSON.stringify({ error: 'Notification not found' }), { status: 404 });
    }

    const isBroadcast = notification.user_id === BROADCAST_USER_ID;

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
      data: {
        notification_id: notification.id,
        movie_id: notification.movie_id,
        feed_item_id: notification.feed_item_id,
        comment_id: notification.comment_id,
      },
      sound: 'default',
    }));

    // Send in batches of 100 (Expo API limit)
    let allSuccess = true;
    const failedTokens: string[] = [];

    for (let i = 0; i < messages.length; i += EXPO_BATCH_LIMIT) {
      const batch = messages.slice(i, i + EXPO_BATCH_LIMIT);
      const response = await fetch(EXPO_PUSH_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(batch),
      });

      if (!response.ok) {
        allSuccess = false;
        continue;
      }

      const result = await response.json();
      // Check individual ticket statuses for DeviceNotRegistered
      if (result.data && Array.isArray(result.data)) {
        result.data.forEach(
          (ticket: { status: string; details?: { error?: string } }, idx: number) => {
            if (ticket.status === 'error' && ticket.details?.error === 'DeviceNotRegistered') {
              failedTokens.push(batch[idx].to);
            }
          },
        );
      }
    }

    // Deactivate tokens for unregistered devices
    if (failedTokens.length > 0) {
      await supabase.from('push_tokens').update({ is_active: false }).in('token', failedTokens);
    }

    await supabase
      .from('notifications')
      .update({ status: allSuccess ? 'sent' : 'failed' })
      .eq('id', notification_id);

    return new Response(
      JSON.stringify({
        success: allSuccess,
        sent: messages.length,
        deactivated: failedTokens.length,
      }),
      { status: 200 },
    );
  } catch (error) {
    // @boundary: Never expose raw error messages — may contain infrastructure details
    console.error('send-push failed:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500 });
  }
});
