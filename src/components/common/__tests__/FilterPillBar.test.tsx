jest.mock('@/theme', () => ({
  useTheme: () => ({
    theme: new Proxy({}, { get: () => '#000' }),
    colors: { white: '#fff', red600: '#dc2626' },
  }),
}));

jest.mock('../FilterPillBar.styles', () => ({
  createFilterPillBarStyles: () => new Proxy({}, { get: () => ({}) }),
}));

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { FilterPillBar, FilterPillConfig } from '../FilterPillBar';

const PILLS: FilterPillConfig[] = [
  { label: 'All', value: 'all', activeColor: '#dc2626' },
  { label: 'Trailers', value: 'trailers', activeColor: '#2563eb' },
  { label: 'Songs', value: 'songs', activeColor: '#9333ea' },
];

function renderBar(activeValue = 'all', onSelect: jest.Mock = jest.fn()) {
  return render(<FilterPillBar pills={PILLS} activeValue={activeValue} onSelect={onSelect} />);
}

describe('FilterPillBar', () => {
  it('renders all pill labels', () => {
    const { getByText } = renderBar();
    expect(getByText('All')).toBeTruthy();
    expect(getByText('Trailers')).toBeTruthy();
    expect(getByText('Songs')).toBeTruthy();
  });

  it('renders correct number of pills', () => {
    const { getAllByRole } = renderBar();
    expect(getAllByRole('button')).toHaveLength(3);
  });

  it('calls onSelect with pill value when pressed', () => {
    const onSelect = jest.fn();
    const { getByText } = renderBar('all', onSelect);
    fireEvent.press(getByText('Trailers'));
    expect(onSelect).toHaveBeenCalledWith('trailers');
  });

  it('calls onSelect with "all" when All pressed', () => {
    const onSelect = jest.fn();
    const { getByText } = renderBar('trailers', onSelect);
    fireEvent.press(getByText('All'));
    expect(onSelect).toHaveBeenCalledWith('all');
  });

  it('active pill has selected accessibility state', () => {
    const { getByLabelText } = renderBar('all');
    expect(getByLabelText('Filter by All').props.accessibilityState).toEqual({
      selected: true,
    });
  });

  it('inactive pills have unselected accessibility state', () => {
    const { getByLabelText } = renderBar('all');
    expect(getByLabelText('Filter by Trailers').props.accessibilityState).toEqual({
      selected: false,
    });
  });

  it('changes selected state when activeValue changes', () => {
    const { getByLabelText } = renderBar('songs');
    expect(getByLabelText('Filter by Songs').props.accessibilityState).toEqual({
      selected: true,
    });
    expect(getByLabelText('Filter by All').props.accessibilityState).toEqual({
      selected: false,
    });
  });

  it('calls onSelect for each pill', () => {
    const onSelect = jest.fn();
    const { getByText } = renderBar('all', onSelect);
    fireEvent.press(getByText('Songs'));
    expect(onSelect).toHaveBeenCalledWith('songs');
  });
});
