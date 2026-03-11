import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { WatchOnSection } from '../WatchOnSection';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'en', changeLanguage: jest.fn() },
  }),
}));

jest.mock('@/styles/movieDetail.styles', () => ({
  createStyles: () => new Proxy({}, { get: () => ({}) }),
}));

jest.mock('@/constants/platformLogos', () => ({
  getPlatformLogo: jest.fn(() => null),
}));

jest.mock('@/utils/formatDate', () => ({
  formatDate: jest.fn(() => 'Dec 5, 2024'),
}));

jest.mock('@/theme/colors', () => ({
  colors: new Proxy({}, { get: () => '#000' }),
}));

const mockPlatform = {
  platform: { id: 'aha', name: 'Aha', color: '#FF5722', logo: 'A' },
};

describe('WatchOnSection', () => {
  it('renders "Watch On" title when platforms exist', () => {
    render(
      <WatchOnSection
        platforms={[mockPlatform] as any}
        movieStatus="streaming"
        releaseDate="2024-12-05"
      />,
    );
    expect(screen.getByText('movie.watchOn')).toBeTruthy();
  });

  it('renders platform names', () => {
    render(
      <WatchOnSection
        platforms={[mockPlatform] as any}
        movieStatus="streaming"
        releaseDate="2024-12-05"
      />,
    );
    expect(screen.getByText('Aha')).toBeTruthy();
  });

  it('does not render "Watch On" when no platforms', () => {
    render(<WatchOnSection platforms={[]} movieStatus="streaming" releaseDate="2024-12-05" />);
    expect(screen.queryByText('movie.watchOn')).toBeNull();
  });

  it('shows "Upcoming Release" alert when status is upcoming', () => {
    render(<WatchOnSection platforms={[]} movieStatus="upcoming" releaseDate="2024-12-05" />);
    expect(screen.getByText('movie.upcomingRelease')).toBeTruthy();
  });

  it('does not show upcoming alert for other statuses', () => {
    render(<WatchOnSection platforms={[]} movieStatus="in_theaters" releaseDate="2024-12-05" />);
    expect(screen.queryByText('movie.upcomingRelease')).toBeNull();
  });
});
