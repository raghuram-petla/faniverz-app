import { useAnimationStore } from '@/stores/useAnimationStore';

// Override the global mock so we test the real implementation
jest.mock('@/hooks/useAnimationsEnabled', () => {
  const actual = jest.requireActual('@/hooks/useAnimationsEnabled');
  return actual;
});

import { useAnimationsEnabled } from '../useAnimationsEnabled';
import { renderHook } from '@testing-library/react-native';

describe('useAnimationsEnabled', () => {
  beforeEach(() => {
    useAnimationStore.setState({ animationsEnabled: true, loaded: true });
  });

  it('returns true when animations are enabled', () => {
    const { result } = renderHook(() => useAnimationsEnabled());
    expect(result.current).toBe(true);
  });

  it('returns false when animations are disabled', () => {
    useAnimationStore.setState({ animationsEnabled: false });
    const { result } = renderHook(() => useAnimationsEnabled());
    expect(result.current).toBe(false);
  });
});
