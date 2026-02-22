import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { Linking } from 'react-native';

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

import WatchOnPlatform from '../WatchOnPlatform';
import type { OttReleaseWithPlatform } from '@/types/ott';

const makeRelease = (overrides?: Partial<OttReleaseWithPlatform>): OttReleaseWithPlatform => ({
  id: 1,
  movie_id: 42,
  platform_id: 1,
  ott_release_date: '2025-06-15',
  deep_link_url: 'https://aha.video/movie/42',
  is_exclusive: false,
  source: 'manual',
  platform: {
    id: 1,
    name: 'Aha',
    slug: 'aha',
    logo_url: null,
    base_deep_link: 'https://aha.video',
    color: '#FF0000',
    display_order: 1,
  },
  ...overrides,
});

describe('WatchOnPlatform', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders platform name', () => {
    render(<WatchOnPlatform release={makeRelease()} />);
    expect(screen.getByTestId('platform-name')).toHaveTextContent('Aha');
  });

  it('renders release date', () => {
    render(<WatchOnPlatform release={makeRelease()} />);
    expect(screen.getByText('2025-06-15')).toBeTruthy();
  });

  it('shows exclusive badge when is_exclusive', () => {
    render(<WatchOnPlatform release={makeRelease({ is_exclusive: true })} />);
    expect(screen.getByTestId('exclusive-badge')).toBeTruthy();
  });

  it('hides exclusive badge when not exclusive', () => {
    render(<WatchOnPlatform release={makeRelease({ is_exclusive: false })} />);
    expect(screen.queryByTestId('exclusive-badge')).toBeNull();
  });

  it('opens deep_link_url on Watch Now press', () => {
    const spy = jest.spyOn(Linking, 'openURL').mockImplementation(() => Promise.resolve());
    render(<WatchOnPlatform release={makeRelease()} />);
    fireEvent.press(screen.getByTestId('watch-now-button'));
    expect(spy).toHaveBeenCalledWith('https://aha.video/movie/42');
  });

  it('falls back to platform base_deep_link when no deep_link_url', () => {
    const spy = jest.spyOn(Linking, 'openURL').mockImplementation(() => Promise.resolve());
    render(<WatchOnPlatform release={makeRelease({ deep_link_url: null })} />);
    fireEvent.press(screen.getByTestId('watch-now-button'));
    expect(spy).toHaveBeenCalledWith('https://aha.video');
  });

  it('does not call Linking when no URLs available', () => {
    const spy = jest.spyOn(Linking, 'openURL').mockImplementation(() => Promise.resolve());
    render(
      <WatchOnPlatform
        release={makeRelease({
          deep_link_url: null,
          platform: {
            id: 1,
            name: 'Test',
            slug: 'test',
            logo_url: null,
            base_deep_link: null,
            color: '#000',
            display_order: 1,
          },
        })}
      />
    );
    fireEvent.press(screen.getByTestId('watch-now-button'));
    expect(spy).not.toHaveBeenCalled();
  });
});
