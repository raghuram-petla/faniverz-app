import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { DiscoverFilterBar, DiscoverFilterBarProps } from '../DiscoverFilterBar';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}));

jest.mock('@expo/vector-icons', () => {
  const { View } = require('react-native');
  return { Ionicons: (props: any) => <View testID={`icon-${props.name}`} /> };
});

jest.mock('@/components/discover/DiscoverFilterModal', () => ({
  SORT_OPTIONS: [
    { value: 'popular', label: 'Popular' },
    { value: 'top_rated', label: 'Rating' },
    { value: 'latest', label: 'Latest' },
  ],
}));

jest.mock('react-native-reanimated', () => {
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: { View, createAnimatedComponent: (c: any) => c },
  };
});

const mockStyles = new Proxy({}, { get: () => ({}) });

const defaultProps: DiscoverFilterBarProps = {
  theme: { textPrimary: '#fff', textSecondary: '#888' },
  styles: mockStyles,
  activeFilterCount: 0,
  sortBy: 'popular',
  chevronStyle: {},
  onOpenFilterModal: jest.fn(),
  onToggleSortDropdown: jest.fn(),
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('DiscoverFilterBar', () => {
  it('renders filter button and sort label', () => {
    render(<DiscoverFilterBar {...defaultProps} />);
    expect(screen.getByText('discover.filters')).toBeTruthy();
    expect(screen.getByText('Popular')).toBeTruthy();
  });

  it('does not render badge when activeFilterCount is 0', () => {
    const { queryByText } = render(<DiscoverFilterBar {...defaultProps} />);
    expect(queryByText('0')).toBeNull();
  });

  it('renders badge when activeFilterCount > 0', () => {
    render(<DiscoverFilterBar {...defaultProps} activeFilterCount={3} />);
    expect(screen.getByText('3')).toBeTruthy();
  });

  it('calls onOpenFilterModal when filter button pressed', () => {
    render(<DiscoverFilterBar {...defaultProps} />);
    fireEvent.press(screen.getByText('discover.filters'));
    expect(defaultProps.onOpenFilterModal).toHaveBeenCalledTimes(1);
  });

  it('calls onToggleSortDropdown when sort button pressed', () => {
    render(<DiscoverFilterBar {...defaultProps} />);
    fireEvent.press(screen.getByText('Popular'));
    expect(defaultProps.onToggleSortDropdown).toHaveBeenCalledTimes(1);
  });

  it('shows correct sort label for different sortBy values', () => {
    render(<DiscoverFilterBar {...defaultProps} sortBy="top_rated" />);
    expect(screen.getByText('Rating')).toBeTruthy();
  });
});
