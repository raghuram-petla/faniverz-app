import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme';

export interface SafeAreaCoverProps {
  backgroundColor?: string;
}

export function SafeAreaCover({ backgroundColor }: SafeAreaCoverProps) {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();

  return (
    <View
      style={[
        styles.cover,
        { height: insets.top, backgroundColor: backgroundColor ?? theme.background },
      ]}
      testID="safe-area-cover"
    />
  );
}

const styles = StyleSheet.create({
  cover: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
  },
});
