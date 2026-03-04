import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { DiscoverFilterModal, GENRES, SORT_OPTIONS, FILTER_TABS } from '../DiscoverFilterModal';

const mockStyles = new Proxy({}, { get: () => ({}) });

const defaultProps = {
  visible: true,
  platforms: [
    { id: 'aha', name: 'Aha', logo_url: '' },
    { id: 'netflix', name: 'Netflix', logo_url: '' },
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

beforeEach(() => {
  jest.clearAllMocks();
});

describe('DiscoverFilterModal', () => {
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

  it('renders genre pills', () => {
    render(<DiscoverFilterModal {...defaultProps} />);
    expect(screen.getByText('Action')).toBeTruthy();
    expect(screen.getByText('Drama')).toBeTruthy();
    expect(screen.getByText('Comedy')).toBeTruthy();
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

  it('calls onClearAll when "Clear Filters" pressed', () => {
    render(<DiscoverFilterModal {...defaultProps} />);
    fireEvent.press(screen.getByText('Clear Filters'));
    expect(defaultProps.onClearAll).toHaveBeenCalled();
  });

  it('exports GENRES array with 12 items', () => {
    expect(GENRES).toHaveLength(12);
  });

  it('exports SORT_OPTIONS with 4 items', () => {
    expect(SORT_OPTIONS).toHaveLength(4);
  });

  it('exports FILTER_TABS with 4 items', () => {
    expect(FILTER_TABS).toHaveLength(4);
  });
});
