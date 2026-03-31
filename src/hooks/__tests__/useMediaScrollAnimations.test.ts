jest.mock('react-native-reanimated', () => {
  const actual = jest.requireActual('react-native-reanimated/mock');
  return {
    ...actual,
    useAnimatedStyle: (fn: () => Record<string, unknown>) => fn(),
  };
});

jest.mock('@/styles/movieMedia.styles', () => ({
  createStyles: () => ({}),
  HERO_HEIGHT: 200,
  POSTER_EXPANDED_W: 100,
  POSTER_EXPANDED_H: 150,
  POSTER_COLLAPSED_W: 32,
  TITLE_SCALE: 0.7,
}));

import { renderHook } from '@testing-library/react-native';
import { useMediaScrollAnimations } from '../useMediaScrollAnimations';
import type { MediaScrollAnimationsProps } from '../useMediaScrollAnimations';

function makeProps(
  overrides: Partial<MediaScrollAnimationsProps> = {},
): MediaScrollAnimationsProps {
  return {
    scrollOffset: { value: 0 },
    titleWidth: { value: 200 },
    titleHeight: { value: 24 },
    screenWidth: 375,
    heroPosterCX: 66,
    heroPosterCY: 230,
    navCenterY: 70,
    ...overrides,
  };
}

describe('useMediaScrollAnimations', () => {
  it('returns animatedPosterStyle, animatedTitleStyle, and subtitleFadeStyle', () => {
    const { result } = renderHook(() => useMediaScrollAnimations(makeProps()));
    expect(result.current.animatedPosterStyle).toBeDefined();
    expect(result.current.animatedTitleStyle).toBeDefined();
    expect(result.current.subtitleFadeStyle).toBeDefined();
  });

  it('poster style has transform array with translateX, translateY, scale', () => {
    const { result } = renderHook(() => useMediaScrollAnimations(makeProps()));
    const { transform } = result.current.animatedPosterStyle as { transform: unknown[] };
    expect(transform).toHaveLength(3);
    expect(transform[0]).toHaveProperty('translateX');
    expect(transform[1]).toHaveProperty('translateY');
    expect(transform[2]).toHaveProperty('scale');
  });

  it('title style has transform array with translateX, translateY, scale', () => {
    const { result } = renderHook(() => useMediaScrollAnimations(makeProps()));
    const { transform } = result.current.animatedTitleStyle as { transform: unknown[] };
    expect(transform).toHaveLength(3);
    expect(transform[0]).toHaveProperty('translateX');
    expect(transform[1]).toHaveProperty('translateY');
    expect(transform[2]).toHaveProperty('scale');
  });

  it('subtitle fade style has opacity property', () => {
    const { result } = renderHook(() => useMediaScrollAnimations(makeProps()));
    expect(result.current.subtitleFadeStyle).toHaveProperty('opacity');
  });

  it('works with non-zero scroll offset', () => {
    const props = makeProps({ scrollOffset: { value: 200 } });
    const { result } = renderHook(() => useMediaScrollAnimations(props));
    const { transform } = result.current.animatedPosterStyle as { transform: unknown[] };
    expect(transform).toHaveLength(3);
  });
});
