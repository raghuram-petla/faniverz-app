import React from 'react';
import { render } from '@testing-library/react-native';
import { ActivityIndicator, StyleSheet, type ViewStyle } from 'react-native';
import { LoadingCenter } from '../LoadingCenter';

function flattenStyle(style: ViewStyle | ViewStyle[]): ViewStyle {
  return StyleSheet.flatten(style);
}

describe('LoadingCenter', () => {
  it('renders ActivityIndicator with default red600 color', () => {
    const { UNSAFE_getByType } = render(<LoadingCenter />);
    const indicator = UNSAFE_getByType(ActivityIndicator);
    expect(indicator.props.color).toBe('#DC2626');
    expect(indicator.props.size).toBe('large');
  });

  it('renders with custom color', () => {
    const { UNSAFE_getByType } = render(<LoadingCenter color="#00FF00" />);
    expect(UNSAFE_getByType(ActivityIndicator).props.color).toBe('#00FF00');
  });

  it('applies custom style prop', () => {
    const customStyle = { paddingVertical: 64, flex: undefined as unknown as number };
    const { getByTestId } = render(<LoadingCenter style={customStyle} />);
    const flat = flattenStyle(getByTestId('loading-center').props.style);
    expect(flat.paddingVertical).toBe(64);
  });

  it('uses custom testID', () => {
    const { getByTestId } = render(<LoadingCenter testID="custom-loader" />);
    expect(getByTestId('custom-loader')).toBeTruthy();
  });

  it('defaults testID to loading-center', () => {
    const { getByTestId } = render(<LoadingCenter />);
    expect(getByTestId('loading-center')).toBeTruthy();
  });

  it('has flex:1 centered container by default', () => {
    const { getByTestId } = render(<LoadingCenter />);
    const flat = flattenStyle(getByTestId('loading-center').props.style);
    expect(flat.flex).toBe(1);
    expect(flat.alignItems).toBe('center');
    expect(flat.justifyContent).toBe('center');
  });
});
