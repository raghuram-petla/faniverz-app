import type { View } from 'react-native';

/**
 * Measures a View's position and size on screen using the native measureInWindow API.
 * Calls onMeasured with screen-absolute coordinates, or onFailed if measurement fails.
 */
// @boundary bridges React ref system with native measurement API (measureInWindow)
// @nullable ref.current may be null if component unmounted before measurement
// @edge measureInWindow can return zero dimensions for unmounted or off-screen views
export function measureView(
  ref: React.RefObject<View | null>,
  onMeasured: (layout: { x: number; y: number; width: number; height: number }) => void,
  onFailed?: () => void,
): void {
  const node = ref.current;
  if (!node || typeof (node as unknown as Record<string, unknown>).measureInWindow !== 'function') {
    onFailed?.();
    return;
  }
  // @contract returns screen-absolute coordinates, not parent-relative
  node.measureInWindow((x, y, width, height) => {
    if (width > 0 && height > 0) {
      onMeasured({ x, y, width, height });
    } else {
      onFailed?.();
    }
  });
}
