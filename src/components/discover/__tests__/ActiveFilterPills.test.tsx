const mockAnimationsEnabled = jest.fn(() => true);
jest.mock('@/hooks/useAnimationsEnabled', () => ({
  useAnimationsEnabled: () => mockAnimationsEnabled(),
}));

jest.mock('@/theme', () => ({
  useTheme: () => ({
    colors: { red400: '#f87171' },
  }),
}));

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { ActiveFilterPills, ActiveFilterPillsProps } from '../ActiveFilterPills';

const mockStyles = new Proxy({}, { get: () => ({}) });

const defaultProps: ActiveFilterPillsProps = {
  selectedGenres: [],
  selectedPlatforms: [],
  selectedProductionHouses: [],
  platforms: [
    { id: 'aha', name: 'Aha' },
    { id: 'netflix', name: 'Netflix' },
  ],
  productionHouses: [
    { id: 'ph1', name: 'Mythri Movie Makers' },
    { id: 'ph2', name: 'Haarika & Hassine' },
  ],
  onToggleGenre: jest.fn(),
  onTogglePlatform: jest.fn(),
  onToggleProductionHouse: jest.fn(),
  onClearAll: jest.fn(),
  styles: mockStyles,
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('ActiveFilterPills', () => {
  it('renders nothing when no filters are selected', () => {
    const { toJSON } = render(<ActiveFilterPills {...defaultProps} />);
    expect(toJSON()).toBeNull();
  });

  it('renders genre pills', () => {
    render(<ActiveFilterPills {...defaultProps} selectedGenres={['Action', 'Drama']} />);
    expect(screen.getByText('Action')).toBeTruthy();
    expect(screen.getByText('Drama')).toBeTruthy();
  });

  it('renders platform pills with resolved names', () => {
    render(<ActiveFilterPills {...defaultProps} selectedPlatforms={['aha']} />);
    expect(screen.getByText('Aha')).toBeTruthy();
  });

  it('renders platform ID when platform not found', () => {
    render(<ActiveFilterPills {...defaultProps} selectedPlatforms={['unknown-id']} />);
    expect(screen.getByText('unknown-id')).toBeTruthy();
  });

  it('renders production house pills with resolved names', () => {
    render(<ActiveFilterPills {...defaultProps} selectedProductionHouses={['ph1']} />);
    expect(screen.getByText('Mythri Movie Makers')).toBeTruthy();
  });

  it('renders production house ID when PH not found', () => {
    render(<ActiveFilterPills {...defaultProps} selectedProductionHouses={['unknown-ph']} />);
    expect(screen.getByText('unknown-ph')).toBeTruthy();
  });

  it('calls onToggleGenre when genre pill is pressed', () => {
    render(<ActiveFilterPills {...defaultProps} selectedGenres={['Action']} />);
    fireEvent.press(screen.getByText('Action'));
    expect(defaultProps.onToggleGenre).toHaveBeenCalledWith('Action');
  });

  it('calls onTogglePlatform when platform pill is pressed', () => {
    render(<ActiveFilterPills {...defaultProps} selectedPlatforms={['netflix']} />);
    fireEvent.press(screen.getByText('Netflix'));
    expect(defaultProps.onTogglePlatform).toHaveBeenCalledWith('netflix');
  });

  it('calls onToggleProductionHouse when PH pill is pressed', () => {
    render(<ActiveFilterPills {...defaultProps} selectedProductionHouses={['ph2']} />);
    fireEvent.press(screen.getByText('Haarika & Hassine'));
    expect(defaultProps.onToggleProductionHouse).toHaveBeenCalledWith('ph2');
  });

  it('calls onClearAll when Clear All is pressed', () => {
    render(<ActiveFilterPills {...defaultProps} selectedGenres={['Action']} />);
    fireEvent.press(screen.getByText('Clear All'));
    expect(defaultProps.onClearAll).toHaveBeenCalled();
  });

  it('shows Clear All link alongside all pill types', () => {
    render(
      <ActiveFilterPills
        {...defaultProps}
        selectedGenres={['Comedy']}
        selectedPlatforms={['aha']}
        selectedProductionHouses={['ph1']}
      />,
    );
    expect(screen.getByText('Comedy')).toBeTruthy();
    expect(screen.getByText('Aha')).toBeTruthy();
    expect(screen.getByText('Mythri Movie Makers')).toBeTruthy();
    expect(screen.getByText('Clear All')).toBeTruthy();
  });

  it('renders pills without animations when animations are disabled', () => {
    mockAnimationsEnabled.mockReturnValue(false);
    render(<ActiveFilterPills {...defaultProps} selectedGenres={['Action']} />);
    expect(screen.getByText('Action')).toBeTruthy();
    expect(screen.getByText('Clear All')).toBeTruthy();
    mockAnimationsEnabled.mockReturnValue(true);
  });
});
