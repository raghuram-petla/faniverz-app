jest.mock('@/constants/feedHelpers', () => ({
  FEED_PILLS: [
    { label: 'All', value: 'all', activeColor: '#dc2626' },
    { label: 'Trailers', value: 'trailers', activeColor: '#2563eb' },
    { label: 'Songs', value: 'songs', activeColor: '#9333ea' },
    { label: 'Posters', value: 'posters', activeColor: '#22c55e' },
    { label: 'BTS', value: 'bts', activeColor: '#f97316' },
    { label: 'Surprise', value: 'surprise', activeColor: '#db2777' },
    { label: 'Updates', value: 'updates', activeColor: '#facc15' },
  ],
}));

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { FeedFilterPills } from '../FeedFilterPills';
import type { FeedFilterOption } from '@/types';

const proxyStyles = new Proxy({}, { get: () => ({}) }) as ReturnType<
  typeof import('@/styles/tabs/feed.styles').createFeedStyles
>;

function renderPills(filter: FeedFilterOption = 'all', setFilter: jest.Mock = jest.fn()) {
  return render(<FeedFilterPills filter={filter} setFilter={setFilter} styles={proxyStyles} />);
}

describe('FeedFilterPills', () => {
  it('renders all pill labels', () => {
    const { getByText } = renderPills();
    expect(getByText('All')).toBeTruthy();
    expect(getByText('Trailers')).toBeTruthy();
    expect(getByText('Songs')).toBeTruthy();
    expect(getByText('Posters')).toBeTruthy();
    expect(getByText('BTS')).toBeTruthy();
    expect(getByText('Surprise')).toBeTruthy();
    expect(getByText('Updates')).toBeTruthy();
  });

  it('renders exactly 7 pills', () => {
    const { getAllByRole } = renderPills();
    expect(getAllByRole('button')).toHaveLength(7);
  });

  it('calls setFilter with "trailers" when Trailers pill is pressed', () => {
    const setFilter = jest.fn();
    const { getByText } = renderPills('all', setFilter);
    fireEvent.press(getByText('Trailers'));
    expect(setFilter).toHaveBeenCalledWith('trailers');
  });

  it('calls setFilter with "songs" when Songs pill is pressed', () => {
    const setFilter = jest.fn();
    const { getByText } = renderPills('all', setFilter);
    fireEvent.press(getByText('Songs'));
    expect(setFilter).toHaveBeenCalledWith('songs');
  });

  it('calls setFilter with "all" when All pill is pressed', () => {
    const setFilter = jest.fn();
    const { getByText } = renderPills('trailers', setFilter);
    fireEvent.press(getByText('All'));
    expect(setFilter).toHaveBeenCalledWith('all');
  });

  it('calls setFilter with "posters" when Posters pill is pressed', () => {
    const setFilter = jest.fn();
    const { getByText } = renderPills('all', setFilter);
    fireEvent.press(getByText('Posters'));
    expect(setFilter).toHaveBeenCalledWith('posters');
  });

  it('calls setFilter with "bts" when BTS pill is pressed', () => {
    const setFilter = jest.fn();
    const { getByText } = renderPills('all', setFilter);
    fireEvent.press(getByText('BTS'));
    expect(setFilter).toHaveBeenCalledWith('bts');
  });

  it('calls setFilter with "surprise" when Surprise pill is pressed', () => {
    const setFilter = jest.fn();
    const { getByText } = renderPills('all', setFilter);
    fireEvent.press(getByText('Surprise'));
    expect(setFilter).toHaveBeenCalledWith('surprise');
  });

  it('calls setFilter with "updates" when Updates pill is pressed', () => {
    const setFilter = jest.fn();
    const { getByText } = renderPills('all', setFilter);
    fireEvent.press(getByText('Updates'));
    expect(setFilter).toHaveBeenCalledWith('updates');
  });

  it('active pill has selected accessibility state', () => {
    const { getByLabelText } = renderPills('all');
    const allPill = getByLabelText('Filter by All');
    expect(allPill.props.accessibilityState).toEqual({ selected: true });
  });

  it('inactive pills have unselected accessibility state', () => {
    const { getByLabelText } = renderPills('all');
    const trailersPill = getByLabelText('Filter by Trailers');
    expect(trailersPill.props.accessibilityState).toEqual({ selected: false });
  });

  it('changes selected state when filter changes', () => {
    const { getByLabelText } = renderPills('trailers');
    const trailersPill = getByLabelText('Filter by Trailers');
    const allPill = getByLabelText('Filter by All');
    expect(trailersPill.props.accessibilityState).toEqual({ selected: true });
    expect(allPill.props.accessibilityState).toEqual({ selected: false });
  });
});
