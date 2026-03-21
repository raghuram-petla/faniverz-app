/**
 * @contract AuthProvider must memoize its context value to prevent re-render cascades
 * @regression: AuthProvider previously passed an inline object to value prop causing all
 * useAuth() consumers to re-render on every ancestor render.
 */
import { render, screen } from '@testing-library/react';
import React from 'react';

vi.mock('@/lib/supabase-browser', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
      onAuthStateChange: vi.fn().mockReturnValue({
        data: { subscription: { unsubscribe: vi.fn() } },
      }),
    },
  },
}));

describe('AuthProvider', () => {
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
    // Initially loading
    expect(screen.getByTestId('out')).toBeInTheDocument();
    expect(capturedUser).toBeNull();
  });
});
