import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { PlatformSquare } from '../PlatformSquare';
import { OTTPlatform } from '@/types';

jest.mock('@/constants/platformLogos', () => ({
  getPlatformLogo: jest.fn(),
}));

import { getPlatformLogo } from '@/constants/platformLogos';

const mockGetLogo = getPlatformLogo as jest.Mock;

function flattenStyle(style: unknown): Record<string, unknown> {
  if (Array.isArray(style)) {
    return Object.assign({}, ...style.map(flattenStyle));
  }
  return (style as Record<string, unknown>) ?? {};
}

const lightPlatform: OTTPlatform = {
  id: 'netflix',
  name: 'Netflix',
  logo: 'N',
  color: '#E50914',
  display_order: 1,
};

// Hotstar: near-black background → isDark() returns true
const darkPlatform: OTTPlatform = {
  id: 'hotstar',
  name: 'Hotstar',
  logo: 'H',
  color: '#0F1014',
  display_order: 2,
};

const unknownPlatform: OTTPlatform = {
  id: 'custom',
  name: 'Custom',
  logo: 'C',
  color: '#333333',
  display_order: 99,
};

const mockOnPress = jest.fn();

describe('PlatformSquare', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetLogo.mockReturnValue(null);
  });

  it('renders Image (not text fallback) when logo asset exists', () => {
    // Return any truthy value (a number, as Jest image stubs often are)
    mockGetLogo.mockReturnValue(1);
    const { queryByText } = render(
      <PlatformSquare platform={lightPlatform} size={80} onPress={mockOnPress} />,
    );
    expect(queryByText('N')).toBeNull();
  });

  it('renders text fallback when no logo asset', () => {
    const { getByText } = render(
      <PlatformSquare platform={unknownPlatform} size={80} onPress={mockOnPress} />,
    );
    expect(getByText('C')).toBeTruthy();
  });

  it('applies platform color as backgroundColor', () => {
    const { toJSON } = render(
      <PlatformSquare platform={lightPlatform} size={80} onPress={mockOnPress} />,
    );
    const style = flattenStyle(toJSON()?.props.style);
    expect(style.backgroundColor).toBe('#E50914');
  });

  it('applies size as width and height', () => {
    const { toJSON } = render(
      <PlatformSquare platform={lightPlatform} size={72} onPress={mockOnPress} />,
    );
    const style = flattenStyle(toJSON()?.props.style);
    expect(style.width).toBe(72);
    expect(style.height).toBe(72);
  });

  it('adds borderWidth 1.5 for dark-background platforms', () => {
    const { toJSON } = render(
      <PlatformSquare platform={darkPlatform} size={80} onPress={mockOnPress} />,
    );
    const style = flattenStyle(toJSON()?.props.style);
    expect(style.borderWidth).toBe(1.5);
  });

  it('has no border for light-background platforms', () => {
    const { toJSON } = render(
      <PlatformSquare platform={lightPlatform} size={80} onPress={mockOnPress} />,
    );
    const style = flattenStyle(toJSON()?.props.style);
    expect(style.borderWidth).toBe(0);
  });

  it('calls onPress when pressed', () => {
    const { getByLabelText } = render(
      <PlatformSquare platform={lightPlatform} size={80} onPress={mockOnPress} />,
    );
    fireEvent.press(getByLabelText('Netflix'));
    expect(mockOnPress).toHaveBeenCalledTimes(1);
  });

  it('sets correct accessibilityLabel from platform name', () => {
    const { toJSON } = render(
      <PlatformSquare platform={lightPlatform} size={80} onPress={mockOnPress} />,
    );
    expect(toJSON()?.props.accessibilityLabel).toBe('Netflix');
  });
});
