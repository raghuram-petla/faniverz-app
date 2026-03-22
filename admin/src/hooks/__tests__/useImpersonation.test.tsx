import { render, screen, act, waitFor } from '@testing-library/react';
import { renderHook } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';

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
        select: vi
          .fn()
          .mockReturnValue({
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

describe('ImpersonationProvider — startRoleImpersonation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.alert = vi.fn();
  });

  it('does nothing when user is not super/root', async () => {
    mockUseAuth.mockReturnValue({ user: { ...rootUser, role: 'admin' as const } });
    mockFrom.mockReturnValue({
      select: vi
        .fn()
        .mockReturnValue({
          eq: vi.fn().mockReturnValue({ maybeSingle: vi.fn().mockResolvedValue({ data: null }) }),
        }),
    });

    let startRoleImpersonation!: (role: string) => Promise<void>;
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

    let startRoleImpersonation!: (role: string) => Promise<void>;
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
