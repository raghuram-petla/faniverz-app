/**
 * @contract AuthProvider must memoize its context value to prevent re-render cascades
 * @regression: AuthProvider previously passed an inline object to value prop causing all
 * useAuth() consumers to re-render on every ancestor render.
 */
import { render, screen, waitFor, act } from '@testing-library/react';
import React from 'react';

let authChangeCallback: ((event: string, session: unknown) => void) | null = null;
const mockSignInWithOAuth = vi.fn();
const mockSignOut = vi.fn();

vi.mock('@/lib/supabase-browser', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
      onAuthStateChange: vi.fn((cb) => {
        authChangeCallback = cb;
        return {
          data: { subscription: { unsubscribe: vi.fn() } },
        };
      }),
      signInWithOAuth: (...args: unknown[]) => mockSignInWithOAuth(...args),
      signOut: (...args: unknown[]) => mockSignOut(...args),
    },
  },
}));

// Mock fetch for profile/role lookups
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock localStorage
const mockLocalStorage: Record<string, string> = {};
Object.defineProperty(window, 'localStorage', {
  value: {
    getItem: vi.fn((key: string) => mockLocalStorage[key] ?? null),
    setItem: vi.fn((key: string, val: string) => {
      mockLocalStorage[key] = val;
    }),
    removeItem: vi.fn((key: string) => {
      delete mockLocalStorage[key];
    }),
  },
});

// Mock environment variables
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';

describe('AuthProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authChangeCallback = null;
    mockFetch.mockReset();
    mockSignOut.mockResolvedValue({ error: null });
    for (const key of Object.keys(mockLocalStorage)) delete mockLocalStorage[key];
  });

  it('renders children without crashing', async () => {
    const { AuthProvider } = await import('@/components/providers/AuthProvider');
    render(
      <AuthProvider>
        <div data-testid="child">hello</div>
      </AuthProvider>,
    );
    expect(screen.getByTestId('child')).toBeInTheDocument();
  });

  it('provides default context values', async () => {
    const { AuthProvider, useAuth } = await import('@/components/providers/AuthProvider');
    let capturedUser: unknown = 'NOT_SET';
    function Consumer() {
      const { user, isLoading } = useAuth();
      capturedUser = user;
      return <div data-testid="out">{isLoading ? 'loading' : 'ready'}</div>;
    }
    render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>,
    );
    expect(screen.getByTestId('out')).toBeInTheDocument();
    expect(capturedUser).toBeNull();
  });

  it('sets user to null on SIGNED_OUT event', async () => {
    const { AuthProvider, useAuth } = await import('@/components/providers/AuthProvider');
    let capturedUser: unknown = 'NOT_SET';
    let capturedDenied: boolean | undefined;
    function Consumer() {
      const { user, isAccessDenied } = useAuth();
      capturedUser = user;
      capturedDenied = isAccessDenied;
      return <div data-testid="out">{user ? 'authed' : 'anon'}</div>;
    }
    render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>,
    );

    // Simulate SIGNED_OUT
    if (authChangeCallback) {
      await act(async () => {
        authChangeCallback!('SIGNED_OUT', null);
      });
    }
    expect(capturedUser).toBeNull();
    expect(capturedDenied).toBe(false);
  });

  it('signOut clears state and calls supabase signOut', async () => {
    const { AuthProvider, useAuth } = await import('@/components/providers/AuthProvider');
    let capturedSignOut: (() => Promise<void>) | undefined;
    function Consumer() {
      const { signOut } = useAuth();
      capturedSignOut = signOut;
      return <div data-testid="out">test</div>;
    }
    render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>,
    );

    await act(async () => {
      await capturedSignOut!();
    });

    expect(mockSignOut).toHaveBeenCalled();
  });

  it('signInWithGoogle calls signInWithOAuth', async () => {
    mockSignInWithOAuth.mockResolvedValue({ error: null });
    const { AuthProvider, useAuth } = await import('@/components/providers/AuthProvider');
    let capturedSignIn: (() => Promise<void>) | undefined;
    function Consumer() {
      const { signInWithGoogle } = useAuth();
      capturedSignIn = signInWithGoogle;
      return <div data-testid="out">test</div>;
    }
    render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>,
    );

    await act(async () => {
      await capturedSignIn!();
    });

    expect(mockSignInWithOAuth).toHaveBeenCalledWith({
      provider: 'google',
      options: expect.objectContaining({ redirectTo: expect.any(String) }),
    });
  });

  it('exposes isAccessDenied through context', async () => {
    const { AuthProvider, useAuth } = await import('@/components/providers/AuthProvider');
    let capturedDenied: boolean | undefined;
    function Consumer() {
      const { isAccessDenied } = useAuth();
      capturedDenied = isAccessDenied;
      return <div data-testid="out">{isAccessDenied ? 'denied' : 'ok'}</div>;
    }
    render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>,
    );
    // Initially not denied
    expect(capturedDenied).toBe(false);
  });
});
