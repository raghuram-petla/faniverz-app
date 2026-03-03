import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Wrap fetch with a 10s timeout to prevent the Supabase auth client from
// deadlocking when _recoverAndRefresh() hangs during initialization.
// Without this, a stuck token refresh holds the internal Web Lock forever,
// blocking getSession(), signOut(), and all data queries.
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

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Disable auto-refresh to prevent _recoverAndRefresh() from deadlocking
    // the Web Lock during initialization. Without this, a hung token refresh
    // blocks getSession(), signOut(), onAuthStateChange, and ALL data queries.
    // Trade-off: admin must re-login after the JWT expires (1 hour).
    autoRefreshToken: false,
  },
  global: { fetch: fetchWithTimeout },
});
