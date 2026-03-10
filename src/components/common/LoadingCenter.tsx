import React from 'react';
import { View, ActivityIndicator, StyleSheet, type ViewStyle } from 'react-native';
import { colors } from '@/theme/colors';

export interface LoadingCenterProps {
  color?: string;
  style?: ViewStyle;
  testID?: string;
}

export function LoadingCenter({ color, style, testID = 'loading-center' }: LoadingCenterProps) {
  return (
    <View style={[defaultStyles.container, style]} testID={testID}>
      <ActivityIndicator size="large" color={color ?? colors.red600} />
    </View>
  );
}

const defaultStyles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
