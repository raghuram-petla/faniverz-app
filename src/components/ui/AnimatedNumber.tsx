import { useEffect, useState, useRef } from 'react';
import { Text, type TextProps } from 'react-native';
import { useAnimationsEnabled } from '@/hooks/useAnimationsEnabled';

export interface AnimatedNumberProps extends Omit<TextProps, 'children'> {
  /** The target number to animate to */
  value: number;
  /** Animation duration in ms (default 800) */
  duration?: number;
  /** Number of decimal places (default 0) */
  decimals?: number;
  /** Prefix string (e.g. "$") */
  prefix?: string;
  /** Suffix string (e.g. "%") */
  suffix?: string;
}

/** @contract Cubic ease-out for smooth deceleration toward target number */
function easeOut(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

/**
 * @contract Animates a number counting up/down using requestAnimationFrame on the JS thread.
 * @sync Uses rAF (not reanimated) because Text content cannot be driven from the UI thread.
 * @edge When animations are disabled, value snaps immediately without counting.
 */
export function AnimatedNumber({
  value,
  duration = 800,
  decimals = 0,
  prefix = '',
  suffix = '',
  ...textProps
}: AnimatedNumberProps) {
  const animationsEnabled = useAnimationsEnabled();
  const [displayValue, setDisplayValue] = useState(animationsEnabled ? 0 : value);
  const rafRef = useRef<number | null>(null);
  const startRef = useRef<number | null>(null);
  // @invariant fromRef captures the display value at animation start to interpolate from
  const fromRef = useRef(0);

  // @edge closure captures stale displayValue — fromRef.current bridges the gap correctly
  useEffect(() => {
    if (!animationsEnabled) {
      setDisplayValue(value);
      return;
    }
    fromRef.current = displayValue;
    startRef.current = null;

    const animate = (timestamp: number) => {
      if (startRef.current === null) startRef.current = timestamp;
      const elapsed = timestamp - startRef.current;
      const progress = Math.min(elapsed / duration, 1);
      const easedProgress = easeOut(progress);
      const current = fromRef.current + (value - fromRef.current) * easedProgress;

      setDisplayValue(current);

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      }
    };

    rafRef.current = requestAnimationFrame(animate);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [value, duration, animationsEnabled]);

  const formatted =
    decimals > 0 ? displayValue.toFixed(decimals) : Math.round(displayValue).toString();

  return <Text {...textProps}>{`${prefix}${formatted}${suffix}`}</Text>;
}
