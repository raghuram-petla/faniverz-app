import { render, screen, act, waitFor } from '@testing-library/react';
import { renderHook } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import type { AdminRoleId } from '@/lib/types';

// ─── Mocks before imports ───
const mockUseAuth = vi.fn();
vi.mock('@/components/providers/AuthProvider', () => ({
  useAuth: () => mockUseAuth(),
}));

const mockFrom = vi.fn();
vi.mock('@/lib/supabase-browser', () => ({
  supabase: { from: (...args: unknown[]) => mockFrom(...args) },
}));

import {
  ImpersonationProvider,
  useImpersonation,
  useEffectiveUser,
} from '@/hooks/useImpersonation';

// ─── Chain builder helpers ───
function makeSelectChain(value: unknown, single = false) {
  const method = vi.fn().mockResolvedValue(value);
  const eq2 = vi.fn().mockReturnValue({ [single ? 'maybeSingle' : 'eq']: method });
  const eq = vi.fn().mockReturnValue(single ? { maybeSingle: method } : { eq: eq2 });
  const select = vi.fn().mockReturnValue({ eq });
  return { select, eq, eq2, method };
}

function makeUpdateChain(value: unknown) {
  const eqActive = vi.fn().mockResolvedValue(value);
  const eqUser = vi.fn().mockReturnValue({ eq: eqActive });
  const update = vi.fn().mockReturnValue({ eq: eqUser });
  return { update, eqUser, eqActive };
}

function makeInsertChain(value: unknown) {
  const insert = vi.fn().mockResolvedValue(value);
  return { insert };
}

const rootUser = {
  id: 'root-user',
  role: 'root' as const,
  display_name: 'Root User',
  productionHouseIds: [],
  languageIds: [],
  languageCodes: [],
};

const superAdminUser = {
  id: 'sa-user',
  role: 'super_admin' as const,
  display_name: 'Super Admin',
  productionHouseIds: [],
  languageIds: [],
  languageCodes: [],
};

function Wrapper({ children }: { children: React.ReactNode }) {
  return <ImpersonationProvider>{children}</ImpersonationProvider>;
}

function Consumer() {
  const { isImpersonating, effectiveUser, realUser } = useImpersonation();
  return (
    <div>
      <span data-testid="impersonating">{String(isImpersonating)}</span>
      <span data-testid="effective-role">{effectiveUser?.role ?? 'null'}</span>
      <span data-testid="real-role">{realUser?.role ?? 'null'}</span>
    </div>
  );
}

describe('useImpersonation — default context (no Provider)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({ user: null });
  });

  it('returns default values and no-op functions when used outside Provider', async () => {
    const { result } = renderHook(() => useImpersonation());
    expect(result.current.isImpersonating).toBe(false);
    expect(result.current.effectiveUser).toBeNull();
    expect(result.current.realUser).toBeNull();

    // Call all three default no-op functions
    await act(async () => {
      await result.current.startImpersonation('some-id');
      await result.current.startRoleImpersonation('admin');
      await result.current.stopImpersonation();
    });

    // Still default values
    expect(result.current.isImpersonating).toBe(false);
  });
});

describe('useEffectiveUser', () => {
  it('returns auth user when not impersonating', () => {
    mockUseAuth.mockReturnValue({ user: rootUser });
    // Mock no active session
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ data: null }),
          }),
        }),
      }),
    });
    const { result } = renderHook(() => useEffectiveUser(), { wrapper: Wrapper });
    expect(result.current?.id).toBe('root-user');
  });
});

describe('ImpersonationProvider — initial state', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.alert = vi.fn();
    mockUseAuth.mockReturnValue({ user: rootUser });
  });

  it('starts with isImpersonating=false', async () => {
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ data: null }),
          }),
        }),
      }),
    });

    render(
      <Wrapper>
        <Consumer />
      </Wrapper>,
    );
    await waitFor(() => {
      expect(screen.getByTestId('impersonating').textContent).toBe('false');
    });
  });

  it('does not restore session when user is null', async () => {
    mockUseAuth.mockReturnValue({ user: null });
    render(
      <Wrapper>
        <Consumer />
      </Wrapper>,
    );
    expect(screen.getByTestId('impersonating').textContent).toBe('false');
  });

  it('does not restore session for non-super admin', async () => {
    mockUseAuth.mockReturnValue({
      user: { ...rootUser, role: 'admin' as const },
    });
    render(
      <Wrapper>
        <Consumer />
      </Wrapper>,
    );
    expect(screen.getByTestId('impersonating').textContent).toBe('false');
  });
});

describe('ImpersonationProvider — session restore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.alert = vi.fn();
    mockUseAuth.mockReturnValue({ user: rootUser });
  });

  it('restores role impersonation from DB session', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'admin_impersonation_sessions') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: {
                    real_user_id: 'root-user',
                    target_user_id: null,
                    target_role: 'admin',
                    target_ph_ids: [],
                    is_active: true,
                  },
                }),
              }),
            }),
          }),
        };
      }
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({ maybeSingle: vi.fn().mockResolvedValue({ data: null }) }),
        }),
      };
    });

    render(
      <Wrapper>
        <Consumer />
      </Wrapper>,
    );
    await waitFor(() => {
      expect(screen.getByTestId('impersonating').textContent).toBe('true');
      expect(screen.getByTestId('effective-role').textContent).toBe('admin');
    });
  });
});

describe('ImpersonationProvider — startImpersonation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.alert = vi.fn();
    mockUseAuth.mockReturnValue({ user: rootUser });
  });

  it('does nothing when user is not super/root', async () => {
    mockUseAuth.mockReturnValue({
      user: { ...rootUser, role: 'admin' as const },
    });
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({ data: null }),
        }),
      }),
    });

    let startImpersonation!: (id: string) => Promise<void>;
    function CaptureHook() {
      const ctx = useImpersonation();
      startImpersonation = ctx.startImpersonation;
      return null;
    }
    render(
      <Wrapper>
        <CaptureHook />
      </Wrapper>,
    );

    await act(async () => {
      await startImpersonation('other-user');
    });
    expect(mockFrom).not.toHaveBeenCalledWith('admin_impersonation_sessions');
  });

  it('prevents super_admin from impersonating root user', async () => {
    mockUseAuth.mockReturnValue({ user: superAdminUser });
    // Mock session restore → no session
    mockFrom.mockImplementation((table: string) => {
      if (table === 'profiles') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi
                .fn()
                .mockResolvedValue({ data: { id: 'target', display_name: 'Root Target' } }),
            }),
          }),
        };
      }
      if (table === 'admin_user_roles') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({ data: { role_id: 'root' } }),
            }),
          }),
        };
      }
      if (table === 'admin_ph_assignments') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ data: [] }),
          }),
        };
      }
      if (table === 'user_languages') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ data: [] }),
          }),
        };
      }
      if (table === 'admin_impersonation_sessions') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({ data: null }),
              }),
            }),
          }),
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ error: null }),
            }),
          }),
        };
      }
      return {};
    });

    let startImpersonation!: (id: string) => Promise<void>;
    function CaptureHook() {
      const ctx = useImpersonation();
      startImpersonation = ctx.startImpersonation;
      return null;
    }
    render(
      <Wrapper>
        <CaptureHook />
      </Wrapper>,
    );

    await act(async () => {
      await startImpersonation('target-root-user');
    });
    expect(window.alert).toHaveBeenCalledWith('super_admin cannot impersonate a root user');
  });
});

describe('ImpersonationProvider — startImpersonation success', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.alert = vi.fn();
    mockUseAuth.mockReturnValue({ user: rootUser });
  });

  it('sets effectiveUser when target is found and allowed', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'profiles') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { id: 'target-user', display_name: 'Target User' },
              }),
            }),
          }),
        };
      }
      if (table === 'admin_user_roles') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({ data: { role_id: 'admin' } }),
            }),
          }),
        };
      }
      if (table === 'admin_ph_assignments') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ data: [] }),
          }),
        };
      }
      if (table === 'user_languages') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ data: [] }),
          }),
        };
      }
      if (table === 'admin_impersonation_sessions') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({ data: null }),
              }),
            }),
          }),
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ error: null }),
            }),
          }),
          insert: vi.fn().mockResolvedValue({ error: null }),
        };
      }
      return {};
    });

    let startImpersonation!: (id: string) => Promise<void>;
    function CaptureHook() {
      const ctx = useImpersonation();
      startImpersonation = ctx.startImpersonation;
      return <span data-testid="effective-role">{ctx.effectiveUser?.role ?? 'null'}</span>;
    }
    render(
      <Wrapper>
        <CaptureHook />
      </Wrapper>,
    );

    await act(async () => {
      await startImpersonation('target-user');
    });

    await waitFor(() => {
      expect(screen.getByTestId('effective-role').textContent).toBe('admin');
    });
  });

  it('alerts on insert error', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'profiles') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { id: 'target', display_name: 'Target' },
              }),
            }),
          }),
        };
      }
      if (table === 'admin_user_roles') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({ data: { role_id: 'admin' } }),
            }),
          }),
        };
      }
      if (table === 'admin_ph_assignments') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ data: [] }),
          }),
        };
      }
      if (table === 'user_languages') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ data: [] }),
          }),
        };
      }
      if (table === 'admin_impersonation_sessions') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({ data: null }),
              }),
            }),
          }),
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ error: null }),
            }),
          }),
          insert: vi.fn().mockResolvedValue({ error: { message: 'Insert failed' } }),
        };
      }
      return {};
    });

    let startImpersonation!: (id: string) => Promise<void>;
    function CaptureHook() {
      const ctx = useImpersonation();
      startImpersonation = ctx.startImpersonation;
      return null;
    }
    render(
      <Wrapper>
        <CaptureHook />
      </Wrapper>,
    );

    await act(async () => {
      await startImpersonation('target');
    });

    expect(window.alert).toHaveBeenCalled();
  });
});

describe('ImpersonationProvider — startRoleImpersonation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.alert = vi.fn();
  });

  it('does nothing when user is not super/root', async () => {
    mockUseAuth.mockReturnValue({ user: { ...rootUser, role: 'admin' as const } });
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({ maybeSingle: vi.fn().mockResolvedValue({ data: null }) }),
      }),
    });

    let startRoleImpersonation!: (role: AdminRoleId, phIds?: string[]) => Promise<void>;
    function CaptureHook() {
      const ctx = useImpersonation();
      startRoleImpersonation = ctx.startRoleImpersonation;
      return null;
    }
    render(
      <Wrapper>
        <CaptureHook />
      </Wrapper>,
    );
    await act(async () => {
      await startRoleImpersonation('admin');
    });
    // Should not touch impersonation_sessions
    expect(window.alert).not.toHaveBeenCalled();
  });

  it('sets effectiveUser when role impersonation succeeds for root user', async () => {
    mockUseAuth.mockReturnValue({ user: rootUser });
    mockFrom.mockImplementation((table: string) => {
      if (table === 'admin_impersonation_sessions') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({ data: null }),
              }),
            }),
          }),
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ error: null }),
            }),
          }),
          insert: vi.fn().mockResolvedValue({ error: null }),
        };
      }
      return {};
    });

    let startRoleImpersonation!: (role: AdminRoleId, phIds?: string[]) => Promise<void>;
    function CaptureHook() {
      const ctx = useImpersonation();
      startRoleImpersonation = ctx.startRoleImpersonation;
      return <span data-testid="effective-role">{ctx.effectiveUser?.role ?? 'null'}</span>;
    }
    render(
      <Wrapper>
        <CaptureHook />
      </Wrapper>,
    );

    await act(async () => {
      await startRoleImpersonation('admin');
    });

    await waitFor(() => {
      expect(screen.getByTestId('effective-role').textContent).toBe('admin');
    });
  });

  it('alerts when super_admin tries to assume root role', async () => {
    mockUseAuth.mockReturnValue({ user: superAdminUser });
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ data: null }),
          }),
        }),
      }),
    });

    let startRoleImpersonation!: (role: AdminRoleId, phIds?: string[]) => Promise<void>;
    function CaptureHook() {
      const ctx = useImpersonation();
      startRoleImpersonation = ctx.startRoleImpersonation;
      return null;
    }
    render(
      <Wrapper>
        <CaptureHook />
      </Wrapper>,
    );

    await act(async () => {
      await startRoleImpersonation('root');
    });
    expect(window.alert).toHaveBeenCalledWith('super_admin cannot impersonate root role');
  });
});

describe('ImpersonationProvider — session restore with target_user_id', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.alert = vi.fn();
    mockUseAuth.mockReturnValue({ user: rootUser });
  });

  it('restores user impersonation from DB session (target_user_id set)', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'admin_impersonation_sessions') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: {
                    real_user_id: 'root-user',
                    target_user_id: 'target-user-id',
                    target_role: 'admin',
                    target_ph_ids: [],
                    is_active: true,
                  },
                }),
              }),
            }),
          }),
        };
      }
      if (table === 'profiles') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi
                .fn()
                .mockResolvedValue({ data: { id: 'target-user-id', display_name: 'Target' } }),
            }),
          }),
        };
      }
      if (table === 'admin_user_roles') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({ data: { role_id: 'admin' } }),
            }),
          }),
        };
      }
      if (table === 'admin_ph_assignments') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ data: [{ production_house_id: 'ph-1' }] }),
          }),
        };
      }
      if (table === 'user_languages') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ data: [{ language_id: 'lang-1' }] }),
          }),
        };
      }
      if (table === 'languages') {
        return {
          select: vi.fn().mockReturnValue({
            in: vi.fn().mockResolvedValue({ data: [{ code: 'te' }] }),
          }),
        };
      }
      return {};
    });

    render(
      <Wrapper>
        <Consumer />
      </Wrapper>,
    );
    await waitFor(() => {
      expect(screen.getByTestId('impersonating').textContent).toBe('true');
      expect(screen.getByTestId('effective-role').textContent).toBe('admin');
    });
  });

  it('does not set effective user when buildTargetUser returns null', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'admin_impersonation_sessions') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: {
                    real_user_id: 'root-user',
                    target_user_id: 'nonexistent-user',
                    target_role: 'admin',
                    target_ph_ids: [],
                    is_active: true,
                  },
                }),
              }),
            }),
          }),
        };
      }
      if (table === 'profiles') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: null }),
            }),
          }),
        };
      }
      if (table === 'admin_user_roles') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({ data: null }),
            }),
          }),
        };
      }
      if (table === 'admin_ph_assignments') {
        return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ data: [] }) }) };
      }
      if (table === 'user_languages') {
        return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ data: [] }) }) };
      }
      return {};
    });

    render(
      <Wrapper>
        <Consumer />
      </Wrapper>,
    );
    // Wait a tick for the async effect to complete
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });
    expect(screen.getByTestId('impersonating').textContent).toBe('false');
  });

  it('restores role impersonation with null target_ph_ids fallback', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'admin_impersonation_sessions') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: {
                    real_user_id: 'root-user',
                    target_user_id: null,
                    target_role: 'production_house_admin',
                    target_ph_ids: null, // null should fallback to []
                    is_active: true,
                  },
                }),
              }),
            }),
          }),
        };
      }
      return {};
    });

    render(
      <Wrapper>
        <Consumer />
      </Wrapper>,
    );
    await waitFor(() => {
      expect(screen.getByTestId('impersonating').textContent).toBe('true');
      expect(screen.getByTestId('effective-role').textContent).toBe('production_house_admin');
    });
  });
});

describe('ImpersonationProvider — startImpersonation with admin role target', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.alert = vi.fn();
    mockUseAuth.mockReturnValue({ user: rootUser });
  });

  it('resolves language codes when target has admin role with languages', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'profiles') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi
                .fn()
                .mockResolvedValue({ data: { id: 'admin-user', display_name: 'Admin' } }),
            }),
          }),
        };
      }
      if (table === 'admin_user_roles') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({ data: { role_id: 'admin' } }),
            }),
          }),
        };
      }
      if (table === 'admin_ph_assignments') {
        return {
          select: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ data: null }) }),
        };
      }
      if (table === 'user_languages') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ data: [{ language_id: 'lang-uuid-1' }] }),
          }),
        };
      }
      if (table === 'languages') {
        return {
          select: vi.fn().mockReturnValue({
            in: vi.fn().mockResolvedValue({ data: [{ code: 'te' }] }),
          }),
        };
      }
      if (table === 'admin_impersonation_sessions') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({ data: null }),
              }),
            }),
          }),
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ error: null }),
            }),
          }),
          insert: vi.fn().mockResolvedValue({ error: null }),
        };
      }
      return {};
    });

    let startImpersonation!: (id: string) => Promise<void>;
    function CaptureHook() {
      const ctx = useImpersonation();
      startImpersonation = ctx.startImpersonation;
      return <span data-testid="effective-role">{ctx.effectiveUser?.role ?? 'null'}</span>;
    }
    render(
      <Wrapper>
        <CaptureHook />
      </Wrapper>,
    );
    await act(async () => {
      await startImpersonation('admin-user');
    });
    await waitFor(() => {
      expect(screen.getByTestId('effective-role').textContent).toBe('admin');
    });
  });

  it('handles null language code rows gracefully', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'profiles') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi
                .fn()
                .mockResolvedValue({ data: { id: 'admin-user', display_name: 'Admin' } }),
            }),
          }),
        };
      }
      if (table === 'admin_user_roles') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({ data: { role_id: 'admin' } }),
            }),
          }),
        };
      }
      if (table === 'admin_ph_assignments') {
        return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ data: [] }) }) };
      }
      if (table === 'user_languages') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ data: [{ language_id: 'lang-1' }] }),
          }),
        };
      }
      if (table === 'languages') {
        return {
          select: vi.fn().mockReturnValue({
            in: vi.fn().mockResolvedValue({ data: null }),
          }),
        };
      }
      if (table === 'admin_impersonation_sessions') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({ data: null }),
              }),
            }),
          }),
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ error: null }),
            }),
          }),
          insert: vi.fn().mockResolvedValue({ error: null }),
        };
      }
      return {};
    });

    let startImpersonation!: (id: string) => Promise<void>;
    function CaptureHook() {
      const ctx = useImpersonation();
      startImpersonation = ctx.startImpersonation;
      return <span data-testid="effective-role">{ctx.effectiveUser?.role ?? 'null'}</span>;
    }
    render(
      <Wrapper>
        <CaptureHook />
      </Wrapper>,
    );
    await act(async () => {
      await startImpersonation('admin-user');
    });
    await waitFor(() => {
      expect(screen.getByTestId('effective-role').textContent).toBe('admin');
    });
  });
});

describe('ImpersonationProvider — startRoleImpersonation error handling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.alert = vi.fn();
    mockUseAuth.mockReturnValue({ user: rootUser });
  });

  it('alerts on insert error for role impersonation', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'admin_impersonation_sessions') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({ data: null }),
              }),
            }),
          }),
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ error: null }),
            }),
          }),
          insert: vi.fn().mockResolvedValue({ error: { message: 'Insert failed' } }),
        };
      }
      return {};
    });

    let startRoleImpersonation!: (role: AdminRoleId, phIds?: string[]) => Promise<void>;
    function CaptureHook() {
      const ctx = useImpersonation();
      startRoleImpersonation = ctx.startRoleImpersonation;
      return null;
    }
    render(
      <Wrapper>
        <CaptureHook />
      </Wrapper>,
    );
    await act(async () => {
      await startRoleImpersonation('admin', ['ph-1']);
    });
    expect(window.alert).toHaveBeenCalled();
  });

  it('shows fallback message when error is not Error instance', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'admin_impersonation_sessions') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({ data: null }),
              }),
            }),
          }),
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockRejectedValue('non-error-string'),
            }),
          }),
        };
      }
      return {};
    });

    let startRoleImpersonation!: (role: AdminRoleId, phIds?: string[]) => Promise<void>;
    function CaptureHook() {
      const ctx = useImpersonation();
      startRoleImpersonation = ctx.startRoleImpersonation;
      return null;
    }
    render(
      <Wrapper>
        <CaptureHook />
      </Wrapper>,
    );
    await act(async () => {
      await startRoleImpersonation('admin');
    });
    expect(window.alert).toHaveBeenCalledWith('Failed to start role impersonation');
  });
});

describe('ImpersonationProvider — stopImpersonation error handling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.alert = vi.fn();
    mockUseAuth.mockReturnValue({ user: rootUser });
  });

  it('shows fallback message when stop error is not Error instance', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'admin_impersonation_sessions') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({ data: null }),
              }),
            }),
          }),
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockRejectedValue('non-error-string'),
            }),
          }),
        };
      }
      return {};
    });

    let stopImpersonation!: () => Promise<void>;
    function CaptureHook() {
      const ctx = useImpersonation();
      stopImpersonation = ctx.stopImpersonation;
      return null;
    }
    render(
      <Wrapper>
        <CaptureHook />
      </Wrapper>,
    );
    await act(async () => {
      await stopImpersonation();
    });
    expect(window.alert).toHaveBeenCalledWith('Failed to stop impersonation');
  });
});

describe('ImpersonationProvider — startImpersonation non-Error catch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.alert = vi.fn();
    mockUseAuth.mockReturnValue({ user: rootUser });
  });

  it('shows fallback message when startImpersonation error is not Error instance', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'profiles') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: { id: 'target', display_name: 'T' } }),
            }),
          }),
        };
      }
      if (table === 'admin_user_roles') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({ data: { role_id: 'admin' } }),
            }),
          }),
        };
      }
      if (table === 'admin_ph_assignments') {
        return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ data: [] }) }) };
      }
      if (table === 'user_languages') {
        return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ data: [] }) }) };
      }
      if (table === 'admin_impersonation_sessions') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({ data: null }),
              }),
            }),
          }),
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockRejectedValue('non-error-string'),
            }),
          }),
        };
      }
      return {};
    });

    let startImpersonation!: (id: string) => Promise<void>;
    function CaptureHook() {
      const ctx = useImpersonation();
      startImpersonation = ctx.startImpersonation;
      return null;
    }
    render(
      <Wrapper>
        <CaptureHook />
      </Wrapper>,
    );
    await act(async () => {
      await startImpersonation('target');
    });
    expect(window.alert).toHaveBeenCalledWith('Failed to start impersonation');
  });

  it('does nothing when buildTargetUser returns null for startImpersonation', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'profiles') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: null }),
            }),
          }),
        };
      }
      if (table === 'admin_user_roles') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({ data: null }),
            }),
          }),
        };
      }
      if (table === 'admin_ph_assignments') {
        return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ data: [] }) }) };
      }
      if (table === 'user_languages') {
        return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ data: [] }) }) };
      }
      if (table === 'admin_impersonation_sessions') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({ data: null }),
              }),
            }),
          }),
        };
      }
      return {};
    });

    let startImpersonation!: (id: string) => Promise<void>;
    function CaptureHook() {
      const ctx = useImpersonation();
      startImpersonation = ctx.startImpersonation;
      return <span data-testid="effective-role">{ctx.effectiveUser?.role ?? 'null'}</span>;
    }
    render(
      <Wrapper>
        <CaptureHook />
      </Wrapper>,
    );
    await act(async () => {
      await startImpersonation('nonexistent');
    });
    expect(screen.getByTestId('effective-role').textContent).toBe('null');
  });
});

describe('endActiveSession warning', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.alert = vi.fn();
    mockUseAuth.mockReturnValue({ user: rootUser });
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  it('logs warning when endActiveSession update fails', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'admin_impersonation_sessions') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({ data: null }),
              }),
            }),
          }),
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ error: { message: 'update failed' } }),
            }),
          }),
        };
      }
      return {};
    });

    let stopImpersonation!: () => Promise<void>;
    function CaptureHook() {
      const ctx = useImpersonation();
      stopImpersonation = ctx.stopImpersonation;
      return null;
    }
    render(
      <Wrapper>
        <CaptureHook />
      </Wrapper>,
    );
    await act(async () => {
      await stopImpersonation();
    });
    expect(console.warn).toHaveBeenCalledWith('endActiveSession: update failed', 'update failed');
  });
});

describe('ImpersonationProvider — stopImpersonation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.alert = vi.fn();
    mockUseAuth.mockReturnValue({ user: rootUser });
  });

  it('does nothing when user is null', async () => {
    mockUseAuth.mockReturnValue({ user: null });

    let stopImpersonation!: () => Promise<void>;
    function CaptureHook() {
      const ctx = useImpersonation();
      stopImpersonation = ctx.stopImpersonation;
      return null;
    }
    render(
      <Wrapper>
        <CaptureHook />
      </Wrapper>,
    );
    await act(async () => {
      await stopImpersonation();
    });
    // no crash
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('calls endActiveSession and clears effectiveUser', async () => {
    const updateMock = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      }),
    });
    mockFrom.mockImplementation((table: string) => {
      if (table === 'admin_impersonation_sessions') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({ data: null }),
              }),
            }),
          }),
          update: updateMock,
        };
      }
      return {};
    });

    let stopImpersonation!: () => Promise<void>;
    function CaptureHook() {
      const ctx = useImpersonation();
      stopImpersonation = ctx.stopImpersonation;
      return null;
    }
    render(
      <Wrapper>
        <CaptureHook />
      </Wrapper>,
    );
    await act(async () => {
      await stopImpersonation();
    });
    expect(updateMock).toHaveBeenCalled();
  });
});

describe('ImpersonationProvider — stopImpersonation with Error instance', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.alert = vi.fn();
    mockUseAuth.mockReturnValue({ user: rootUser });
  });

  it('shows Error message when stop fails with Error instance', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'admin_impersonation_sessions') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({ data: null }),
              }),
            }),
          }),
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockRejectedValue(new Error('DB connection lost')),
            }),
          }),
        };
      }
      return {};
    });

    let stopImpersonation!: () => Promise<void>;
    function CaptureHook() {
      const ctx = useImpersonation();
      stopImpersonation = ctx.stopImpersonation;
      return null;
    }
    render(
      <Wrapper>
        <CaptureHook />
      </Wrapper>,
    );
    await act(async () => {
      await stopImpersonation();
    });
    expect(window.alert).toHaveBeenCalledWith('DB connection lost');
  });
});

describe('ImpersonationProvider — startImpersonation with Error instance', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.alert = vi.fn();
    mockUseAuth.mockReturnValue({ user: rootUser });
  });

  it('shows Error message when start fails with Error instance', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'profiles') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: { id: 't', display_name: 'T' } }),
            }),
          }),
        };
      }
      if (table === 'admin_user_roles') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({ data: { role_id: 'admin' } }),
            }),
          }),
        };
      }
      if (table === 'admin_ph_assignments') {
        return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ data: [] }) }) };
      }
      if (table === 'user_languages') {
        return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ data: [] }) }) };
      }
      if (table === 'admin_impersonation_sessions') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({ data: null }),
              }),
            }),
          }),
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ error: null }),
            }),
          }),
          insert: vi.fn().mockResolvedValue({ error: { message: 'Constraint violation' } }),
        };
      }
      return {};
    });

    let startImpersonation!: (id: string) => Promise<void>;
    function CaptureHook() {
      const ctx = useImpersonation();
      startImpersonation = ctx.startImpersonation;
      return null;
    }
    render(
      <Wrapper>
        <CaptureHook />
      </Wrapper>,
    );
    await act(async () => {
      await startImpersonation('target');
    });
    expect(window.alert).toHaveBeenCalled();
  });
});

describe('ImpersonationProvider — startRoleImpersonation with Error instance', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.alert = vi.fn();
    mockUseAuth.mockReturnValue({ user: rootUser });
  });

  it('shows Error message when role impersonation fails with Error', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'admin_impersonation_sessions') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({ data: null }),
              }),
            }),
          }),
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockRejectedValue(new Error('Role insert failed')),
            }),
          }),
        };
      }
      return {};
    });

    let startRoleImpersonation!: (role: AdminRoleId, phIds?: string[]) => Promise<void>;
    function CaptureHook() {
      const ctx = useImpersonation();
      startRoleImpersonation = ctx.startRoleImpersonation;
      return null;
    }
    render(
      <Wrapper>
        <CaptureHook />
      </Wrapper>,
    );
    await act(async () => {
      await startRoleImpersonation('admin');
    });
    expect(window.alert).toHaveBeenCalledWith('Role insert failed');
  });
});
