/**
 * Tests for supabase-admin.ts — service-role singleton client.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockCreateClient = vi.fn().mockReturnValue({ from: vi.fn() });

vi.mock('@supabase/supabase-js', () => ({
  createClient: (...args: unknown[]) => mockCreateClient(...args),
}));

// Must re-import each test to reset the singleton
describe('getSupabaseAdmin', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset module to clear singleton
    vi.resetModules();
  });

  it('creates a client with service role key', async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key-123';

    const { getSupabaseAdmin } = await import('../../lib/supabase-admin');
    getSupabaseAdmin();

    expect(mockCreateClient).toHaveBeenCalledWith(
      'https://test.supabase.co',
      'service-role-key-123',
    );
  });

  it('returns the same singleton on subsequent calls', async () => {
    const { getSupabaseAdmin } = await import('../../lib/supabase-admin');
    const client1 = getSupabaseAdmin();
    const client2 = getSupabaseAdmin();

    expect(client1).toBe(client2);
    expect(mockCreateClient).toHaveBeenCalledTimes(1);
  });
});
