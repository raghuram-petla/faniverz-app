jest.mock('@/styles/movieDetail.styles', () => ({
  createStyles: () => new Proxy({}, { get: () => ({}) }),
}));

jest.mock('@/theme', () => ({
  useTheme: () => ({
    theme: new Proxy({}, { get: () => '#000' }),
    colors: new Proxy({}, { get: () => '#000' }),
    mode: 'dark',
    setMode: jest.fn(),
  }),
}));

jest.mock('@/theme/colors', () => ({
  colors: new Proxy({}, { get: () => '#000' }),
}));

jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
  MaterialIcons: 'MaterialIcons',
}));

jest.mock('expo-image', () => ({
  Image: 'Image',
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, string>) => {
      const map: Record<string, string> = {
        'movie.watchOn': 'Watch On',
        'movie.streamNow': 'Stream Now',
        'movie.available': 'Available',
        'movie.upcomingRelease': 'Upcoming Release',
        'movie.releaseDateTba': 'Release date TBA',
        'common.error': 'Error',
        'common.openLinkFailed': 'Could not open link',
      };
      if (key === 'movie.releasingOn' && params?.date) return `Releasing on ${params.date}`;
      return map[key] ?? key;
    },
    i18n: { language: 'en' },
  }),
}));

jest.mock('@/constants/platformLogos', () => ({
  getPlatformLogo: jest.fn(() => null),
}));

jest.mock('@/utils/formatDate', () => ({
  formatDate: jest.fn(() => 'Dec 5, 2024'),
}));

jest.mock('@/constants/placeholders', () => ({
  PLACEHOLDER_POSTER: 'https://placeholder.com/poster.png',
}));

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { Linking, Alert } from 'react-native';
import { WatchOnSection } from '../WatchOnSection';

const makePlatform = (overrides = {}) => ({
  platform: { id: 'aha', name: 'Aha', color: '#FF5722', logo: 'A', logo_url: null },
  streaming_url: null as string | null,
  ...overrides,
});

describe('WatchOnSection', () => {
  beforeEach(() => jest.clearAllMocks());

  it('renders without crashing with empty platforms', () => {
    // When platforms=[] and status is not 'upcoming', both conditional blocks
    // render null, so toJSON returns null -- that's correct behavior
    const { toJSON } = render(
      <WatchOnSection platforms={[]} movieStatus="streaming" releaseDate="2024-12-05" />,
    );
    expect(toJSON()).toBeNull();
  });

  it('renders "Watch On" title when platforms exist', () => {
    render(
      <WatchOnSection
        platforms={[makePlatform()] as any}
        movieStatus="streaming"
        releaseDate="2024-12-05"
      />,
    );
    expect(screen.getByText('Watch On')).toBeTruthy();
  });

  it('renders platform names', () => {
    render(
      <WatchOnSection
        platforms={[makePlatform()] as any}
        movieStatus="streaming"
        releaseDate="2024-12-05"
      />,
    );
    expect(screen.getByText('Aha')).toBeTruthy();
  });

  it('renders "Stream Now" when streaming_url exists', () => {
    const platform = makePlatform({ streaming_url: 'https://aha.video/movie/123' });
    render(
      <WatchOnSection
        platforms={[platform] as any}
        movieStatus="streaming"
        releaseDate="2024-12-05"
      />,
    );
    expect(screen.getByText('Stream Now')).toBeTruthy();
  });

  it('renders "Available" when no streaming_url', () => {
    render(
      <WatchOnSection
        platforms={[makePlatform()] as any}
        movieStatus="streaming"
        releaseDate="2024-12-05"
      />,
    );
    expect(screen.getByText('Available')).toBeTruthy();
  });

  it('does not render "Watch On" when no platforms', () => {
    render(<WatchOnSection platforms={[]} movieStatus="streaming" releaseDate="2024-12-05" />);
    expect(screen.queryByText('Watch On')).toBeNull();
  });

  it('shows upcoming release alert when status is upcoming', () => {
    render(<WatchOnSection platforms={[]} movieStatus="upcoming" releaseDate="2024-12-05" />);
    expect(screen.getByText('Upcoming Release')).toBeTruthy();
  });

  it('shows formatted release date for upcoming movies', () => {
    render(<WatchOnSection platforms={[]} movieStatus="upcoming" releaseDate="2024-12-05" />);
    expect(screen.getByText('Releasing on Dec 5, 2024')).toBeTruthy();
  });

  it('shows TBA when upcoming movie has no release date', () => {
    render(<WatchOnSection platforms={[]} movieStatus="upcoming" releaseDate={null} />);
    expect(screen.getByText('Release date TBA')).toBeTruthy();
  });

  it('does not show upcoming alert for non-upcoming statuses', () => {
    render(<WatchOnSection platforms={[]} movieStatus="in_theaters" releaseDate="2024-12-05" />);
    expect(screen.queryByText('Upcoming Release')).toBeNull();
  });

  it('has correct accessibility label for platform button', () => {
    render(
      <WatchOnSection
        platforms={[makePlatform()] as any}
        movieStatus="streaming"
        releaseDate="2024-12-05"
      />,
    );
    expect(screen.getByLabelText('Watch on Aha')).toBeTruthy();
  });

  it('skips platforms with null platform reference', () => {
    const nullPlatform = { platform: null, streaming_url: null };
    render(
      <WatchOnSection
        platforms={[nullPlatform] as any}
        movieStatus="streaming"
        releaseDate="2024-12-05"
      />,
    );
    expect(screen.queryByText('Aha')).toBeNull();
  });

  it('shows alert when Linking.openURL fails', async () => {
    jest.spyOn(Linking, 'openURL').mockRejectedValueOnce(new Error('Cannot open'));
    jest.spyOn(Alert, 'alert').mockImplementation(jest.fn());
    const platform = makePlatform({ streaming_url: 'https://aha.video/movie/123' });
    render(
      <WatchOnSection
        platforms={[platform] as any}
        movieStatus="streaming"
        releaseDate="2024-12-05"
      />,
    );
    fireEvent.press(screen.getByLabelText('Watch on Aha'));
    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith('Error', 'Could not open link');
    });
  });

  it('renders logo text fallback when no logo asset or URL', () => {
    render(
      <WatchOnSection
        platforms={[makePlatform()] as any}
        movieStatus="streaming"
        releaseDate="2024-12-05"
      />,
    );
    expect(screen.getByText('A')).toBeTruthy();
  });

  it('renders local logo Image when getPlatformLogo returns an asset', () => {
    const { getPlatformLogo } = require('@/constants/platformLogos');
    (getPlatformLogo as jest.Mock).mockReturnValueOnce(123);
    render(
      <WatchOnSection
        platforms={[makePlatform()] as any}
        movieStatus="streaming"
        releaseDate="2024-12-05"
      />,
    );
    // When a local logo asset is returned, no logo text is rendered
    expect(screen.queryByText('A')).toBeNull();
  });

  it('renders remote logo Image when platform has logo_url but no local asset', () => {
    const { getPlatformLogo } = require('@/constants/platformLogos');
    (getPlatformLogo as jest.Mock).mockReturnValueOnce(null);
    const platform = makePlatform({
      platform: {
        id: 'aha',
        name: 'Aha',
        color: '#FF5722',
        logo: 'A',
        logo_url: 'https://example.com/logo.png',
      },
    });
    render(
      <WatchOnSection
        platforms={[platform] as any}
        movieStatus="streaming"
        releaseDate="2024-12-05"
      />,
    );
    // Remote logo image renders, no text logo fallback
    expect(screen.queryByText('A')).toBeNull();
  });
});
