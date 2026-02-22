import React from 'react';
import { Text, useColorScheme } from 'react-native';
import { render, screen } from '@testing-library/react-native';
import { ThemeProvider, useTheme } from '../ThemeProvider';
import { useThemeStore } from '../../stores/useThemeStore';
import { lightColors, darkColors } from '../colors';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// Mock useColorScheme via the module
const mockUseColorScheme = useColorScheme as jest.Mock;
jest.mock('react-native/Libraries/Utilities/useColorScheme', () => ({
  __esModule: true,
  default: jest.fn(() => 'light'),
}));

function TestConsumer() {
  const { colors, isDark } = useTheme();
  return (
    <Text testID="theme-info">
      {isDark ? 'dark' : 'light'}|{colors.background}
    </Text>
  );
}

describe('ThemeProvider', () => {
  beforeEach(() => {
    useThemeStore.setState({ mode: 'system' });
    mockUseColorScheme.mockReturnValue('light');
  });

  it('renders children', () => {
    render(
      <ThemeProvider>
        <Text testID="child">Hello</Text>
      </ThemeProvider>
    );
    expect(screen.getByTestId('child')).toBeTruthy();
  });

  it('provides light colors when system is light', () => {
    useThemeStore.setState({ mode: 'system' });
    render(
      <ThemeProvider>
        <TestConsumer />
      </ThemeProvider>
    );
    const info = screen.getByTestId('theme-info');
    expect(info.props.children.join('')).toContain('light');
    expect(info.props.children.join('')).toContain(lightColors.background);
  });

  it('provides dark colors when mode is dark', () => {
    useThemeStore.setState({ mode: 'dark' });
    render(
      <ThemeProvider>
        <TestConsumer />
      </ThemeProvider>
    );
    const info = screen.getByTestId('theme-info');
    expect(info.props.children.join('')).toContain('dark');
    expect(info.props.children.join('')).toContain(darkColors.background);
  });

  it('provides light colors when mode is light', () => {
    useThemeStore.setState({ mode: 'light' });
    render(
      <ThemeProvider>
        <TestConsumer />
      </ThemeProvider>
    );
    const info = screen.getByTestId('theme-info');
    expect(info.props.children.join('')).toContain('light');
  });
});

describe('useTheme', () => {
  it('throws if used outside provider', () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    expect(() => {
      render(<TestConsumer />);
    }).toThrow('useTheme must be used within a ThemeProvider');
    consoleSpy.mockRestore();
  });
});
