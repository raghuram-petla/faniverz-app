import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { Share } from 'react-native';

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

import ShareButton from '../ShareButton';

describe('ShareButton', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders share button', () => {
    render(<ShareButton title="Test Movie" releaseDate="2026-03-15" />);
    expect(screen.getByTestId('share-button')).toBeTruthy();
  });

  it('calls Share.share with correct message on press', async () => {
    const spy = jest.spyOn(Share, 'share').mockResolvedValue({ action: 'sharedAction' });
    render(<ShareButton title="Test Movie" releaseDate="2026-03-15" />);

    fireEvent.press(screen.getByTestId('share-button'));

    expect(spy).toHaveBeenCalledWith({
      message: 'Test Movie releases on 2026-03-15! Track it on Faniverz',
    });
  });

  it('has correct accessibility label', () => {
    render(<ShareButton title="Test Movie" releaseDate="2026-03-15" />);
    expect(screen.getByLabelText('Share Test Movie')).toBeTruthy();
  });

  it('handles share cancellation gracefully', async () => {
    jest.spyOn(Share, 'share').mockRejectedValue(new Error('User cancelled'));
    render(<ShareButton title="Test Movie" releaseDate="2026-03-15" />);

    // Should not throw
    fireEvent.press(screen.getByTestId('share-button'));
  });
});
