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

export function HomeButton({ forceShow, iconColor, style }: HomeButtonProps) {
  const { theme } = useTheme();
  const router = useRouter();
  const navigation = useNavigation();
  const state = navigation.getState();
  const stackDepth = state?.index ?? 0;
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
