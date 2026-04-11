import { renderHook } from '@testing-library/react-native';
import {
  useDetailScrollAnimations,
  DETAIL_POSTER_EXPANDED_W,
  DETAIL_POSTER_EXPANDED_H,
  DETAIL_POSTER_COLLAPSED_W,
  DETAIL_POSTER_COLLAPSED_H,
  DETAIL_TITLE_SCALE,
  DETAIL_SCROLL_THRESHOLD,
} from '../useDetailScrollAnimations';

jest.mock('react-native-reanimated', () => ({
  useAnimatedStyle: (fn: () => object) => fn(),
  interpolate: (v: number, input: number[], output: number[]) => {
    const t = Math.max(0, Math.min(1, (v - input[0]) / (input[1] - input[0])));
    return output[0] + t * (output[1] - output[0]);
  },
  interpolateColor: (_v: number, _inp: number[], colors: string[]) => colors[0],
  Extrapolation: { CLAMP: 'clamp' },
}));

const makeProps = (scrollValue = 0) => ({
  scrollOffset: { value: scrollValue } as any,
  titleWidth: { value: 100 } as any,
  titleHeight: { value: 28 } as any,
  navLeftWidth: { value: 80 } as any,
  navRightWidth: { value: 80 } as any,
  screenWidth: 390,
  heroPosterCX: 72,
  heroPosterCY: 300,
  navCenterY: 50,
  textPrimaryColor: '#000',
});

describe('useDetailScrollAnimations', () => {
  it('exports correct poster constants', () => {
    expect(DETAIL_POSTER_EXPANDED_W).toBe(112);
    expect(DETAIL_POSTER_EXPANDED_H).toBe(168);
    expect(DETAIL_POSTER_COLLAPSED_W).toBe(28);
    expect(DETAIL_POSTER_COLLAPSED_H).toBe(42);
  });

  it('exports correct title scale', () => {
    expect(DETAIL_TITLE_SCALE).toBe(14 / 28);
  });

  it('exports correct scroll threshold', () => {
    expect(DETAIL_SCROLL_THRESHOLD).toBe(280);
  });

  it('returns all expected animated styles', () => {
    const { result } = renderHook(() => useDetailScrollAnimations(makeProps()));
    expect(result.current.animatedPosterStyle).toBeDefined();
    expect(result.current.animatedTitleStyle).toBeDefined();
    expect(result.current.titleColorStyle).toBeDefined();
    expect(result.current.heroInfoFadeStyle).toBeDefined();
    expect(result.current.navBarBgStyle).toBeDefined();
    expect(result.current.titleMaxWidthStyle).toBeDefined();
  });

  it('poster transform is defined at scroll=0', () => {
    const { result } = renderHook(() => useDetailScrollAnimations(makeProps(0)));
    expect(result.current.animatedPosterStyle.transform).toBeDefined();
  });

  it('heroInfoFadeStyle has full opacity at scroll=0', () => {
    const { result } = renderHook(() => useDetailScrollAnimations(makeProps(0)));
    expect(result.current.heroInfoFadeStyle.opacity).toBe(1);
  });

  it('heroInfoFadeStyle has zero opacity after 40% scroll', () => {
    const { result } = renderHook(() =>
      useDetailScrollAnimations(makeProps(DETAIL_SCROLL_THRESHOLD * 0.4)),
    );
    expect(result.current.heroInfoFadeStyle.opacity).toBe(0);
  });

  it('navBarBgStyle has zero opacity before 60% scroll', () => {
    const { result } = renderHook(() => useDetailScrollAnimations(makeProps(0)));
    expect(result.current.navBarBgStyle.opacity).toBe(0);
  });

  it('navBarBgStyle has full opacity at end of scroll', () => {
    const { result } = renderHook(() =>
      useDetailScrollAnimations(makeProps(DETAIL_SCROLL_THRESHOLD)),
    );
    expect(result.current.navBarBgStyle.opacity).toBe(1);
  });
});
