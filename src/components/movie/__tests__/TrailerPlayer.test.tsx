import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

jest.mock('react-native/Libraries/Utilities/useColorScheme', () => ({
  __esModule: true,
  default: jest.fn(() => 'light'),
}));

jest.mock('@/theme/ThemeProvider', () => {
  const { lightColors } = require('@/theme/colors');
  return {
    useTheme: () => ({ colors: lightColors, isDark: false }),
  };
});

jest.mock('expo-image', () => {
  const { View } = require('react-native');
  return {
    Image: (props: Record<string, unknown>) => <View {...props} />,
  };
});

import TrailerPlayer from '../TrailerPlayer';

describe('TrailerPlayer', () => {
  it('returns null when no youtube key', () => {
    const { toJSON } = render(<TrailerPlayer youtubeKey={null} />);
    expect(toJSON()).toBeNull();
  });

  it('renders trailer section with thumbnail', () => {
    render(<TrailerPlayer youtubeKey="abc123" />);
    expect(screen.getByTestId('trailer-section')).toBeTruthy();
    expect(screen.getByTestId('trailer-thumbnail')).toBeTruthy();
  });

  it('shows play button', () => {
    render(<TrailerPlayer youtubeKey="abc123" />);
    expect(screen.getByText('▶')).toBeTruthy();
  });

  it('shows player on tap', () => {
    render(<TrailerPlayer youtubeKey="abc123" />);
    fireEvent.press(screen.getByTestId('trailer-thumbnail'));
    expect(screen.getByTestId('youtube-player')).toBeTruthy();
  });
});
