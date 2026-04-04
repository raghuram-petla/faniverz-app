import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY env vars');
}

// @contract: CHUNK_SIZE must stay at or below 2048 to avoid SecureStore size warnings on iOS/Android.
const CHUNK_SIZE = 2048;

// @boundary: Chunking SecureStore adapter — encrypts auth tokens at rest via iOS Keychain /
// Android Keystore while splitting values that exceed 2048 bytes into multiple keys.
// Plain SecureStore warns (and may fail) for values > 2048 bytes; JWTs routinely exceed this.
// @sideeffect: Writes N+1 SecureStore entries per key (chunks + a length marker at `key_chunks`).
const secureStoreAdapter = {
  /** @contract Reassembles chunked value; returns null when key does not exist. */
  getItem: async (key: string): Promise<string | null> => {
    const countStr = await SecureStore.getItemAsync(`${key}_chunks`);
    if (countStr === null) {
      // Fallback: try reading the key directly (non-chunked legacy value)
      return SecureStore.getItemAsync(key);
    }
    const count = parseInt(countStr, 10);
    const parts: string[] = [];
    for (let i = 0; i < count; i++) {
      const chunk = await SecureStore.getItemAsync(`${key}_chunk_${i}`);
      if (chunk === null) return null;
      parts.push(chunk);
    }
    return parts.join('');
  },

  /** @sideeffect Splits value into CHUNK_SIZE pieces and stores each with a numbered suffix. */
  setItem: async (key: string, value: string): Promise<void> => {
    const chunks: string[] = [];
    for (let i = 0; i < value.length; i += CHUNK_SIZE) {
      chunks.push(value.slice(i, i + CHUNK_SIZE));
    }
    await SecureStore.setItemAsync(`${key}_chunks`, String(chunks.length));
    await Promise.all(
      chunks.map((chunk, i) => SecureStore.setItemAsync(`${key}_chunk_${i}`, chunk)),
    );
  },

  /** @sideeffect Deletes all chunk keys and the length marker. Also deletes the bare key for legacy cleanup. */
  removeItem: async (key: string): Promise<void> => {
    const countStr = await SecureStore.getItemAsync(`${key}_chunks`);
    if (countStr !== null) {
      const count = parseInt(countStr, 10);
      await Promise.all(
        Array.from({ length: count }, (_, i) =>
          SecureStore.deleteItemAsync(`${key}_chunk_${i}`),
        ),
      );
      await SecureStore.deleteItemAsync(`${key}_chunks`);
    }
    // Also delete bare key in case of legacy non-chunked data
    await SecureStore.deleteItemAsync(key);
  },
};

// @invariant: singleton instance — every import across the app shares the same client and auth session. Creating a second client would isolate caches and auth state.
// @coupling: detectSessionInUrl: false is required for React Native (no URL bar). Setting to true breaks OAuth redirect handling in Expo's AuthSession flow.
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: secureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
