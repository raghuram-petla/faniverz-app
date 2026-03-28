jest.mock('@/theme', () => ({
  useTheme: () => ({
    theme: new Proxy({}, { get: () => '#000' }),
    colors: { white: '#fff', red600: '#dc2626' },
  }),
}));

jest.mock('@/components/common/FilterPillBar.styles', () => ({
  createFilterPillBarStyles: () => new Proxy({}, { get: () => ({}) }),
}));

import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react-native';
import { MediaFilterPills } from '../MediaFilterPills';

const categories = ['All', 'Trailer', 'Song', 'Posters'];

function renderPills(active = 'All', onSelect = jest.fn()) {
  return render(<MediaFilterPills categories={categories} active={active} onSelect={onSelect} />);
}

describe('MediaFilterPills', () => {
  it('renders all category labels', () => {
    renderPills();
    categories.forEach((cat) => {
      expect(screen.getByText(cat)).toBeTruthy();
    });
  });

  it('renders correct number of pill buttons', () => {
    renderPills();
    expect(screen.getAllByRole('button')).toHaveLength(categories.length);
  });

  it('calls onSelect when a pill is pressed', () => {
    const onSelect = jest.fn();
    renderPills('All', onSelect);
    fireEvent.press(screen.getByText('Song'));
    expect(onSelect).toHaveBeenCalledWith('Song');
  });

  it('marks active pill as selected', () => {
    renderPills('Trailer');
    const pill = screen.getByLabelText('Filter by Trailer');
    expect(pill.props.accessibilityState).toEqual({ selected: true });
  });

  it('marks inactive pills as not selected', () => {
    renderPills('All');
    const pill = screen.getByLabelText('Filter by Trailer');
    expect(pill.props.accessibilityState).toEqual({ selected: false });
  });

  it('calls onSelect with All when All pill is pressed', () => {
    const onSelect = jest.fn();
    renderPills('Song', onSelect);
    fireEvent.press(screen.getByText('All'));
    expect(onSelect).toHaveBeenCalledWith('All');
  });
});
