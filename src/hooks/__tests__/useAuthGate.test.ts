const mockPush = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
}));

jest.mock('@/features/auth/providers/AuthProvider', () => ({
  useAuth: jest.fn(),
}));

import { renderHook } from '@testing-library/react-native';
import { useAuthGate } from '../useAuthGate';
import { useAuth } from '@/features/auth/providers/AuthProvider';

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

describe('useAuthGate', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns isAuthenticated true when user exists', () => {
    mockUseAuth.mockReturnValue({ user: { id: 'u1' }, isLoading: false } as unknown as ReturnType<
      typeof useAuth
    >);
    const { result } = renderHook(() => useAuthGate());
    expect(result.current.isAuthenticated).toBe(true);
  });

  it('returns isAuthenticated false when user is null', () => {
    mockUseAuth.mockReturnValue({ user: null, isLoading: false } as unknown as ReturnType<
      typeof useAuth
    >);
    const { result } = renderHook(() => useAuthGate());
    expect(result.current.isAuthenticated).toBe(false);
  });

  it('gate executes callback when user is authenticated', () => {
    mockUseAuth.mockReturnValue({ user: { id: 'u1' }, isLoading: false } as unknown as ReturnType<
      typeof useAuth
    >);
    const { result } = renderHook(() => useAuthGate());
    const callback = jest.fn();
    const gated = result.current.gate(callback);
    gated('arg1', 'arg2');
    expect(callback).toHaveBeenCalledWith('arg1', 'arg2');
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('gate redirects to login when user is not authenticated', () => {
    mockUseAuth.mockReturnValue({ user: null, isLoading: false } as unknown as ReturnType<
      typeof useAuth
    >);
    const { result } = renderHook(() => useAuthGate());
    const callback = jest.fn();
    const gated = result.current.gate(callback);
    gated();
    expect(callback).not.toHaveBeenCalled();
    expect(mockPush).toHaveBeenCalledWith('/(auth)/login');
  });

  it('gate passes all arguments to the callback', () => {
    mockUseAuth.mockReturnValue({ user: { id: 'u1' }, isLoading: false } as unknown as ReturnType<
      typeof useAuth
    >);
    const { result } = renderHook(() => useAuthGate());
    const callback = jest.fn();
    const gated = result.current.gate(callback);
    gated('a', 'b', 'c');
    expect(callback).toHaveBeenCalledWith('a', 'b', 'c');
  });
});
