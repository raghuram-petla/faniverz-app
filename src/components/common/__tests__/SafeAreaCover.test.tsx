import React from 'react';
import { render } from '@testing-library/react-native';
import { StyleSheet, type ViewStyle } from 'react-native';
import { SafeAreaCover } from '../SafeAreaCover';

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 44, bottom: 34, left: 0, right: 0 }),
}));

jest.mock('@/theme', () => ({
  useTheme: () => ({
    theme: { background: '#000000' },
  }),
}));

function flattenStyle(style: ViewStyle | ViewStyle[]): ViewStyle {
  return StyleSheet.flatten(style);
}

describe('SafeAreaCover', () => {
  it('renders with insets.top height', () => {
    const { getByTestId } = render(<SafeAreaCover />);
    const flat = flattenStyle(getByTestId('safe-area-cover').props.style);
    expect(flat.height).toBe(44);
  });

  it('uses theme background by default', () => {
    const { getByTestId } = render(<SafeAreaCover />);
    const flat = flattenStyle(getByTestId('safe-area-cover').props.style);
    expect(flat.backgroundColor).toBe('#000000');
  });

  it('accepts custom backgroundColor', () => {
    const { getByTestId } = render(<SafeAreaCover backgroundColor="#FF0000" />);
    const flat = flattenStyle(getByTestId('safe-area-cover').props.style);
    expect(flat.backgroundColor).toBe('#FF0000');
  });

  it('has absolute positioning with zIndex 100', () => {
    const { getByTestId } = render(<SafeAreaCover />);
    const flat = flattenStyle(getByTestId('safe-area-cover').props.style);
    expect(flat.position).toBe('absolute');
    expect(flat.top).toBe(0);
    expect(flat.left).toBe(0);
    expect(flat.right).toBe(0);
    expect(flat.zIndex).toBe(100);
  });
});
