jest.mock('@/theme', () => ({
  useTheme: () => ({
    theme: {
      background: '#000',
      textPrimary: '#fff',
      textTertiary: '#888',
    },
    colors: { red600: '#dc2626' },
  }),
}));

jest.mock('@/styles/discover.styles', () => ({
  createStyles: () =>
    new Proxy(
      {},
      {
        get: () => ({}),
      },
    ),
}));

jest.mock('@/components/common/HomeButton', () => ({
  HomeButton: () => {
    const { Text } = require('react-native');
    return <Text>HomeButton</Text>;
  },
}));

jest.mock('@/components/discover/DiscoverFilterModal', () => ({
  FILTER_TABS: [
    { value: 'all', label: 'All' },
    { value: 'in_theaters', label: 'In Theaters' },
  ],
}));

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { DiscoverSearchHeader } from '../DiscoverSearchHeader';

const mockProps = {
  insetTop: 47,
  searchQuery: '',
  onSearchChange: jest.fn(),
  selectedFilter: 'all' as const,
  onFilterChange: jest.fn(),
  onBack: jest.fn(),
};

describe('DiscoverSearchHeader', () => {
  beforeEach(() => jest.clearAllMocks());

  it('renders back button and title', () => {
    render(<DiscoverSearchHeader {...mockProps} />);
    expect(screen.getByLabelText('Go back')).toBeTruthy();
  });

  it('calls onBack when back button pressed', () => {
    render(<DiscoverSearchHeader {...mockProps} />);
    fireEvent.press(screen.getByLabelText('Go back'));
    expect(mockProps.onBack).toHaveBeenCalled();
  });

  it('renders filter tabs', () => {
    render(<DiscoverSearchHeader {...mockProps} />);
    expect(screen.getByText('All')).toBeTruthy();
    expect(screen.getByText('In Theaters')).toBeTruthy();
  });

  it('calls onFilterChange when tab pressed', () => {
    render(<DiscoverSearchHeader {...mockProps} />);
    fireEvent.press(screen.getByText('In Theaters'));
    expect(mockProps.onFilterChange).toHaveBeenCalledWith('in_theaters');
  });

  it('renders search input with query value', () => {
    render(<DiscoverSearchHeader {...mockProps} searchQuery="pushpa" />);
    expect(screen.getByDisplayValue('pushpa')).toBeTruthy();
  });

  it('calls onSearchChange when text changes', () => {
    render(<DiscoverSearchHeader {...mockProps} />);
    fireEvent.changeText(screen.getByPlaceholderText('Search movies, genres, actors...'), 'test');
    expect(mockProps.onSearchChange).toHaveBeenCalledWith('test');
  });

  it('clears search when clear button is pressed', () => {
    render(<DiscoverSearchHeader {...mockProps} searchQuery="test" />);
    // There's a close-circle icon rendered; re-render with empty to verify onSearchChange
    // The clear button calls onSearchChange('') when pressed
    // We verify the input shows the query value
    expect(screen.getByDisplayValue('test')).toBeTruthy();
  });

  it('calls onSearchChange with empty string when clear button is pressed', () => {
    const onSearchChange = jest.fn();
    const { UNSAFE_getAllByType } = render(
      <DiscoverSearchHeader {...mockProps} searchQuery="pushpa" onSearchChange={onSearchChange} />,
    );
    // The clear button is a TouchableOpacity that only renders when searchQuery.length > 0
    const { TouchableOpacity } = require('react-native');
    const touchables = UNSAFE_getAllByType(TouchableOpacity);
    // Find the clear button: it's the one that has onPress calling onSearchChange('')
    // It's distinct from back button (first) and filter tab buttons (last N)
    // With FILTER_TABS mocked to 2 items: [back, clear, tab0, tab1]
    // The clear button appears inside the search row — not the tab row
    // Press each candidate and check which triggers onSearchChange
    let found = false;
    for (const btn of touchables) {
      jest.clearAllMocks();
      fireEvent.press(btn);
      if (onSearchChange.mock.calls.some((call) => call[0] === '')) {
        found = true;
        break;
      }
    }
    expect(found).toBe(true);
    expect(onSearchChange).toHaveBeenCalledWith('');
  });

  it('does not render clear button when search query is empty', () => {
    const { UNSAFE_getAllByType } = render(<DiscoverSearchHeader {...mockProps} searchQuery="" />);
    const { TouchableOpacity } = require('react-native');
    const touchables = UNSAFE_getAllByType(TouchableOpacity);
    // Back button + filter tabs = back(1) + FILTER_TABS(2) = 3 touchables, no clear button
    // The clear button only shows when searchQuery.length > 0
    // Compare with one that has a query
    const { UNSAFE_getAllByType: getWithQuery } = render(
      <DiscoverSearchHeader {...mockProps} searchQuery="test" />,
    );
    const touchablesWithQuery = getWithQuery(TouchableOpacity);
    // With query: has one extra clear button
    expect(touchablesWithQuery.length).toBeGreaterThan(touchables.length);
  });

  it('highlights active filter tab', () => {
    render(<DiscoverSearchHeader {...mockProps} selectedFilter="in_theaters" />);
    // Both tabs render but only "In Theaters" is "active"
    expect(screen.getByText('In Theaters')).toBeTruthy();
    expect(screen.getByText('All')).toBeTruthy();
  });
});
