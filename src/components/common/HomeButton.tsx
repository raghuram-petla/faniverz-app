import React, { useCallback } from 'react';
import { TouchableOpacity, StyleSheet, type ViewStyle } from 'react-native';
import { useNavigation } from 'expo-router';
import { StackActions } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme';

export interface HomeButtonProps {
  /** Override auto-detection and always show the button */
  forceShow?: boolean;
  /** Icon color override (e.g., white for overlay headers) */
  iconColor?: string;
  /** Icon size override (default 22) */
  iconSize?: number;
  /** Container style override */
  style?: ViewStyle;
}

/**
 * @contract Renders a circular home icon when navigation depth >= 2 (or forceShow).
 * @sideeffect Pops entire root stack back to (tabs) with slide-right animation.
 * @coupling Relies on expo-router navigation state; getParent() may be undefined in tests.
 */
export function HomeButton({ forceShow, iconColor, iconSize = 22, style }: HomeButtonProps) {
  const { theme } = useTheme();
  const navigation = useNavigation();

  // For screens in nested stacks (e.g. movie/[id]/_layout), the nearest
  // navigator's index is 0. Check the parent navigator too and use the max.
  const state = navigation.getState();
  // @edge stackDepth falls back to 0 when navigation state is unavailable
  /* istanbul ignore next -- navigation state is always defined in test environment */
  let stackDepth = state?.index ?? 0;
  try {
    const parentIndex = navigation.getParent?.()?.getState?.()?.index;
    if (parentIndex != null && parentIndex > stackDepth) {
      stackDepth = parentIndex;
    }
  } catch {
    // getParent may not exist in all environments
  }
  // @invariant Button hidden at depth 0-1 unless forceShow overrides
  const shouldShow = forceShow ?? stackDepth >= 2;

  // @sideeffect Traverse to the root Stack navigator (stop before NavigationContainer)
  // and pop all pushed screens. StackActions.pop(n) animates the topmost screen's
  // exit (slide-right), then lands directly on (tabs).
  // - dismissAll(): scoped to nearest navigator — fails in nested stacks
  // - router.navigate(): works cross-navigator but skips animation
  // - StackActions.pop(n) on root: animates + works from any depth
  const handleGoHome = useCallback(() => {
    let root = navigation;
    try {
      // getParent() chain: nested stack → root Stack → NavigationContainer → undefined
      // Stop at root Stack (one before NavigationContainer) so pop() is handled.
      while (root.getParent()?.getParent()) {
        root = root.getParent()!;
      }
    } catch {
      // getParent may throw in some environments
    }
    const index = root.getState()?.index ?? 0;
    if (index > 0) {
      root.dispatch(StackActions.pop(index));
    }
  }, [navigation]);

  if (!shouldShow) return null;

  return (
    <TouchableOpacity
      style={[styles.button, { backgroundColor: theme.input }, style]}
      onPress={handleGoHome}
      activeOpacity={0.7}
      accessibilityLabel="Go to home"
      testID="home-button"
    >
      <Ionicons name="home-outline" size={iconSize} color={iconColor ?? theme.textPrimary} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
