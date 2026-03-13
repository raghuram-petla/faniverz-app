import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme';

export interface SafeAreaCoverProps {
  backgroundColor?: string;
}

/**
 * @contract Absolutely-positioned bar covering the status bar notch area.
 * @assumes Parent uses position:relative or the root View so zIndex:100 stacks correctly.
 * @coupling useSafeAreaInsets — height is 0 on devices without a notch.
 */
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
