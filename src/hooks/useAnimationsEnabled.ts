import { useAnimationStore } from '@/stores/useAnimationStore';

export function useAnimationsEnabled(): boolean {
  return useAnimationStore((s) => s.animationsEnabled);
}
