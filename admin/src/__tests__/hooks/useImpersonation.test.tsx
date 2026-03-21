import { renderHook, act } from '@testing-library/react';
import type { AdminUser } from '@/lib/types';
import React from 'react';

const { mockFrom, mockAuthUser } = vi.hoisted(() => {
  const mockAuthUser: AdminUser = {
    id: 'real-user-1',
    display_name: 'Real Admin',
    email: 'admin@test.com',
    is_admin: true,
    avatar_url: null,
    created_at: '2024-01-01',
    role: 'super_admin',
    productionHouseIds: [],
    languageIds: [],
    languageCodes: [],
  };
  return { mockFrom: vi.fn(), mockAuthUser };
});

vi.mock('@/lib/supabase-browser', () => ({
  supabase: { from: mockFrom },
}));

vi.mock('@/components/providers/AuthProvider', () => ({
  useAuth: () => ({
    user: mockAuthUser,
    isLoading: false,
    isAccessDenied: false,
    signInWithGoogle: vi.fn(),
    signOut: vi.fn(),
  }),
}));

import {
  ImpersonationProvider,
  useImpersonation,
  useEffectiveUser,
} from '@/hooks/useImpersonation';

function wrapper({ children }: { children: React.ReactNode }) {
  return <ImpersonationProvider>{children}</ImpersonationProvider>;
}

/** Creates a chainable supabase mock where every method returns self */
function mockChain(resolveData: unknown = null) {
  const self: Record<string, unknown> = {};
  const methods = ['select', 'eq', 'update', 'insert', 'order', 'in'];
  for (const m of methods) {
    self[m] = vi.fn().mockReturnValue(self);
  }
  self.single = vi.fn().mockResolvedValue({ data: resolveData, error: null });
  self.maybeSingle = vi.fn().mockResolvedValue({ data: resolveData, error: null });
  return self;
}

function setupNoActiveSession() {
  mockFrom.mockReturnValue(mockChain(null));
}

describe('useImpersonation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupNoActiveSession();
  });

  it('returns isImpersonating=false by default', () => {
    const { result } = renderHook(() => useImpersonation(), { wrapper });
    expect(result.current.isImpersonating).toBe(false);
    expect(result.current.effectiveUser).toBeNull();
    expect(result.current.realUser).toEqual(mockAuthUser);
  });

  it('memoizes context value to prevent unnecessary re-renders', () => {
    const { result, rerender } = renderHook(() => useImpersonation(), { wrapper });
    const first = result.current;
    rerender();
    expect(result.current).toBe(first);
  });

  it('provides startImpersonation function', () => {
    const { result } = renderHook(() => useImpersonation(), { wrapper });
    expect(typeof result.current.startImpersonation).toBe('function');
  });

  it('provides startRoleImpersonation function', () => {
    const { result } = renderHook(() => useImpersonation(), { wrapper });
    expect(typeof result.current.startRoleImpersonation).toBe('function');
  });

  it('provides stopImpersonation function', () => {
    const { result } = renderHook(() => useImpersonation(), { wrapper });
    expect(typeof result.current.stopImpersonation).toBe('function');
  });

  it('startRoleImpersonation sets effectiveUser with target role', async () => {
    mockFrom.mockReturnValue(mockChain(null));

    const { result } = renderHook(() => useImpersonation(), { wrapper });

    await act(async () => {
      await result.current.startRoleImpersonation('admin', []);
    });

    expect(result.current.isImpersonating).toBe(true);
    expect(result.current.effectiveUser?.role).toBe('admin');
    expect(result.current.effectiveUser?.id).toBe('real-user-1');
  });

  it('stopImpersonation clears effectiveUser', async () => {
    mockFrom.mockReturnValue(mockChain(null));

    const { result } = renderHook(() => useImpersonation(), { wrapper });

    await act(async () => {
      await result.current.startRoleImpersonation('production_house_admin', ['ph-1']);
    });
    expect(result.current.isImpersonating).toBe(true);
    expect(result.current.effectiveUser?.productionHouseIds).toEqual(['ph-1']);

    await act(async () => {
      await result.current.stopImpersonation();
    });
    expect(result.current.isImpersonating).toBe(false);
    expect(result.current.effectiveUser).toBeNull();
  });

  it('creates DB session on startRoleImpersonation', async () => {
    mockFrom.mockReturnValue(mockChain(null));

    const { result } = renderHook(() => useImpersonation(), { wrapper });

    await act(async () => {
      await result.current.startRoleImpersonation('admin');
    });

    // Should have called supabase.from('admin_impersonation_sessions') for session operations
    expect(mockFrom).toHaveBeenCalledWith('admin_impersonation_sessions');
  });
});

describe('useEffectiveUser', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupNoActiveSession();
  });

  it('returns real user when not impersonating', () => {
    const { result } = renderHook(() => useEffectiveUser(), { wrapper });
    expect(result.current).toEqual(mockAuthUser);
  });

  it('returns effective user when impersonating', async () => {
    mockFrom.mockReturnValue(mockChain(null));

    const { result } = renderHook(
      () => ({
        impersonation: useImpersonation(),
        effectiveUser: useEffectiveUser(),
      }),
      { wrapper },
    );

    await act(async () => {
      await result.current.impersonation.startRoleImpersonation('admin');
    });

    expect(result.current.effectiveUser?.role).toBe('admin');
  });
});
