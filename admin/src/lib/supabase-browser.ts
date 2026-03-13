import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// @sideeffect: wraps global fetch with a 10s AbortController timeout. If the Supabase
// auth server takes >10s (outage, high latency), the request aborts and getUser()
// returns an error — the admin is treated as unauthenticated and redirected to /login.
// This is a deliberate trade-off: a 10s hang is preferable to the previous behavior
// where _recoverAndRefresh() held a Web Lock indefinitely, freezing ALL Supabase
// queries (including data reads) until the browser tab was force-closed.
// @edge: if the caller passes its own AbortSignal AND the timeout fires first, the
// caller's abort handler is never called — the timeout's abort wins.
const fetchWithTimeout: typeof fetch = (input, init) => {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), 10000);
  const signal = init?.signal;

  // If caller already provided a signal, listen for its abort too
  if (signal) {
    signal.addEventListener('abort', () => controller.abort());
  }

  return fetch(input, { ...init, signal: controller.signal }).finally(() => clearTimeout(id));
};

// @invariant: autoRefreshToken MUST be false — enabling it re-introduces the Web Lock
// deadlock described above. The trade-off is that admin sessions expire after the JWT
// lifetime (default 1 hour in Supabase). After expiry, all API calls fail with 401
// and AuthProvider redirects to /login. There is no "session expiring soon" warning.
// @coupling: this is the BROWSER-SIDE client used by hooks, components, and
// useImpersonation.tsx. Server-side API routes use supabase-admin.ts (service role key)
// or create throwaway clients in sync-helpers.ts verifyBearer(). Mixing them up would
// either bypass RLS (service key in browser) or fail auth checks (anon key in API routes).
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: false,
  },
  global: { fetch: fetchWithTimeout },
});
