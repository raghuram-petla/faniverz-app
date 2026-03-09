import type { View } from 'react-native';

/**
 * Measures a View's position and size on screen using the native measureInWindow API.
 * Calls onMeasured with screen-absolute coordinates, or onFailed if measurement fails.
 */
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
  node.measureInWindow((x, y, width, height) => {
    if (width > 0 && height > 0) {
      onMeasured({ x, y, width, height });
    } else {
      onFailed?.();
    }
  });
}
