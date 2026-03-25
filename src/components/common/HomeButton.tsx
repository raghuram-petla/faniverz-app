import React from 'react';
import { TouchableOpacity, StyleSheet, type ViewStyle } from 'react-native';
import { useRouter, useNavigation } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme';

export interface HomeButtonProps {
  /** Override auto-detection and always show the button */
  forceShow?: boolean;
  /** Icon color override (e.g., white for overlay headers) */
  iconColor?: string;
  /** Container style override */
  style?: ViewStyle;
}

/**
 * @contract Renders a circular home icon when navigation depth >= 2 (or forceShow).
 * @sideeffect router.dismissAll() pops entire stack back to root on press.
 * @coupling Relies on expo-router navigation state; getParent() may be undefined in tests.
 */
export function HomeButton({ forceShow, iconColor, style }: HomeButtonProps) {
  const { theme } = useTheme();
  const router = useRouter();
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

  if (!shouldShow) return null;

  return (
    <TouchableOpacity
      style={[styles.button, { backgroundColor: theme.input }, style]}
      onPress={() => router.dismissAll()}
      activeOpacity={0.7}
      accessibilityLabel="Go to home"
      testID="home-button"
    >
      <Ionicons name="home-outline" size={22} color={iconColor ?? theme.textPrimary} />
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
