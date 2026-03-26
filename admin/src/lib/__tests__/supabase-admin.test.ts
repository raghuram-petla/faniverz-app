import { describe, it, expect, vi, beforeEach } from 'vitest';

let callCount = 0;
const mockCreateClient = vi.hoisted(() => vi.fn());

vi.mock('@supabase/supabase-js', () => ({
  createClient: mockCreateClient,
}));

import { getSupabaseAdmin, getAuditableSupabaseAdmin } from '../supabase-admin';
import { createClient } from '@supabase/supabase-js';

describe('supabase-admin', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    callCount = 0;
    mockCreateClient.mockImplementation(() => `mock-client-${++callCount}`);
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key';
  });

  describe('getSupabaseAdmin', () => {
    it('returns a singleton client', () => {
      const a = getSupabaseAdmin();
      const b = getSupabaseAdmin();
      expect(a).toBe(b);
    });
  });

  describe('getAuditableSupabaseAdmin', () => {
    it('creates a client with x-admin-user-id header', () => {
      getAuditableSupabaseAdmin('user-123');
      expect(createClient).toHaveBeenCalledWith('https://test.supabase.co', 'service-role-key', {
        global: { headers: { 'x-admin-user-id': 'user-123' } },
      });
    });

    it('creates a new client per call (not singleton)', () => {
      const a = getAuditableSupabaseAdmin('user-1');
      const b = getAuditableSupabaseAdmin('user-2');
      expect(createClient).toHaveBeenCalledTimes(2);
      // Each call gets a distinct client instance
      expect(a).not.toBe(b);
    });
  });
});
