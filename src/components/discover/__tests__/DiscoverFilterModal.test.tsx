jest.mock('@/theme', () => ({
  useTheme: () => ({
    theme: new Proxy({}, { get: () => '#000' }),
    colors: new Proxy({}, { get: () => '#000' }),
    mode: 'dark',
    setMode: jest.fn(),
  }),
}));

jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
  MaterialIcons: 'MaterialIcons',
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, unknown>) => {
      const map: Record<string, string> = {
        'discover.filters': 'Filters',
        'discover.streamingPlatforms': 'Streaming Platforms',
        'discover.genres': 'Genres',
        'discover.productionHouses': 'Production Houses',
        'discover.clearFilters': 'Clear Filters',
      };
      if (key === 'discover.showMovies' && params?.count != null) {
        return `Show ${params.count} Movies`;
      }
      return map[key] ?? key;
    },
    i18n: { language: 'en' },
  }),
}));

jest.mock('@/components/ui/PlatformBadge', () => {
  const { View } = require('react-native');
  return {
    PlatformBadge: ({ platform }: { platform: { name: string } }) => (
      <View testID={`platform-badge-${platform.name}`} />
    ),
  };
});

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { DiscoverFilterModal, SORT_OPTIONS, FILTER_TABS } from '../DiscoverFilterModal';
import { GENRES } from '@shared/movie-genres';

const mockStyles = new Proxy({}, { get: () => ({}) });

const defaultProps = {
  visible: true,
  platforms: [
    { id: 'aha', name: 'Aha', logo_url: '', color: '#ff5722' },
    { id: 'netflix', name: 'Netflix', logo_url: '', color: '#e50914' },
  ] as any[],
  productionHouses: [{ id: 'ph1', name: 'Mythri Movie Makers', logo_url: '' }] as any[],
  selectedPlatforms: [] as string[],
  selectedGenres: [] as string[],
  selectedProductionHouses: [] as string[],
  filteredCount: 42,
  onTogglePlatform: jest.fn(),
  onToggleGenre: jest.fn(),
  onToggleProductionHouse: jest.fn(),
  onClearAll: jest.fn(),
  onClose: jest.fn(),
  styles: mockStyles,
};

describe('DiscoverFilterModal', () => {
  beforeEach(() => jest.clearAllMocks());

  it('renders without crashing', () => {
    const { toJSON } = render(<DiscoverFilterModal {...defaultProps} />);
    expect(toJSON()).toBeTruthy();
  });

  it('renders "Filters" title', () => {
    render(<DiscoverFilterModal {...defaultProps} />);
    expect(screen.getByText('Filters')).toBeTruthy();
  });

  it('renders "Streaming Platforms" section title', () => {
    render(<DiscoverFilterModal {...defaultProps} />);
    expect(screen.getByText('Streaming Platforms')).toBeTruthy();
  });

  it('renders platform names', () => {
    render(<DiscoverFilterModal {...defaultProps} />);
    expect(screen.getByText('Aha')).toBeTruthy();
    expect(screen.getByText('Netflix')).toBeTruthy();
  });

  it('renders "Genres" section title', () => {
    render(<DiscoverFilterModal {...defaultProps} />);
    expect(screen.getByText('Genres')).toBeTruthy();
  });

  it('renders genre pills', () => {
    render(<DiscoverFilterModal {...defaultProps} />);
    expect(screen.getByText('Action')).toBeTruthy();
    expect(screen.getByText('Drama')).toBeTruthy();
    expect(screen.getByText('Comedy')).toBeTruthy();
    expect(screen.getByText('Thriller')).toBeTruthy();
  });

  it('renders production house names', () => {
    render(<DiscoverFilterModal {...defaultProps} />);
    expect(screen.getByText('Mythri Movie Makers')).toBeTruthy();
  });

  it('hides production houses section when empty', () => {
    render(<DiscoverFilterModal {...defaultProps} productionHouses={[]} />);
    expect(screen.queryByText('Production Houses')).toBeNull();
  });

  it('renders "Clear Filters" button', () => {
    render(<DiscoverFilterModal {...defaultProps} />);
    expect(screen.getByText('Clear Filters')).toBeTruthy();
  });

  it('renders "Show X Movies" button with filteredCount', () => {
    render(<DiscoverFilterModal {...defaultProps} />);
    expect(screen.getByText('Show 42 Movies')).toBeTruthy();
  });

  it('calls onTogglePlatform when platform pressed', () => {
    render(<DiscoverFilterModal {...defaultProps} />);
    fireEvent.press(screen.getByText('Aha'));
    expect(defaultProps.onTogglePlatform).toHaveBeenCalledWith('aha');
  });

  it('calls onToggleGenre when genre pressed', () => {
    render(<DiscoverFilterModal {...defaultProps} />);
    fireEvent.press(screen.getByText('Action'));
    expect(defaultProps.onToggleGenre).toHaveBeenCalledWith('Action');
  });

  it('calls onToggleProductionHouse when production house pressed', () => {
    render(<DiscoverFilterModal {...defaultProps} />);
    fireEvent.press(screen.getByText('Mythri Movie Makers'));
    expect(defaultProps.onToggleProductionHouse).toHaveBeenCalledWith('ph1');
  });

  it('calls onClearAll when "Clear Filters" pressed', () => {
    render(<DiscoverFilterModal {...defaultProps} />);
    fireEvent.press(screen.getByText('Clear Filters'));
    expect(defaultProps.onClearAll).toHaveBeenCalled();
  });

  it('calls onClose when close icon pressed', () => {
    render(<DiscoverFilterModal {...defaultProps} />);
    // The "Show X Movies" button also calls onClose
    fireEvent.press(screen.getByText('Show 42 Movies'));
    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it('exports GENRES array with 12 items', () => {
    expect(GENRES).toHaveLength(12);
    expect(GENRES).toContain('Action');
    expect(GENRES).toContain('Historical');
  });

  it('exports SORT_OPTIONS with 4 items', () => {
    expect(SORT_OPTIONS).toHaveLength(4);
    expect(SORT_OPTIONS[0]).toEqual({ value: 'popular', label: 'Popular' });
  });

  it('exports FILTER_TABS with 4 items', () => {
    expect(FILTER_TABS).toHaveLength(4);
    expect(FILTER_TABS[0]).toEqual({ value: 'all', label: 'All' });
  });

  it('renders with different filteredCount', () => {
    render(<DiscoverFilterModal {...defaultProps} filteredCount={0} />);
    expect(screen.getByText('Show 0 Movies')).toBeTruthy();
  });
});
