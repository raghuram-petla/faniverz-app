import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { SectionHeader } from '../SectionHeader';

describe('SectionHeader', () => {
  it('renders title text', () => {
    const { getByText } = render(<SectionHeader title="Now Showing" />);
    expect(getByText('Now Showing')).toBeTruthy();
  });

  it('renders action button when actionLabel and onAction are provided', () => {
    const onAction = jest.fn();
    const { getByText } = render(
      <SectionHeader title="Popular" actionLabel="See All" onAction={onAction} />,
    );
    expect(getByText('See All')).toBeTruthy();
  });

  it('does not render action button when onAction is not provided', () => {
    const { queryByText } = render(<SectionHeader title="Popular" actionLabel="See All" />);
    expect(queryByText('See All')).toBeNull();
  });

  it('does not render action button when actionLabel is not provided', () => {
    const onAction = jest.fn();
    const { queryByRole } = render(<SectionHeader title="Popular" onAction={onAction} />);
    // No button should render since actionLabel is missing
    expect(queryByRole('button')).toBeNull();
  });

  it('calls onAction when action button is pressed', () => {
    const onAction = jest.fn();
    const { getByText } = render(
      <SectionHeader title="Upcoming" actionLabel="See All" onAction={onAction} />,
    );
    fireEvent.press(getByText('See All'));
    expect(onAction).toHaveBeenCalledTimes(1);
  });

  it('renders with only title (minimal props)', () => {
    const { getByText, queryByRole } = render(<SectionHeader title="Trending" />);
    expect(getByText('Trending')).toBeTruthy();
    expect(queryByRole('button')).toBeNull();
  });

  it('renders custom action label text', () => {
    const onAction = jest.fn();
    const { getByText } = render(
      <SectionHeader title="Reviews" actionLabel="View More" onAction={onAction} />,
    );
    expect(getByText('View More')).toBeTruthy();
  });

  it('action button has correct accessibility role', () => {
    const onAction = jest.fn();
    const { getByRole } = render(
      <SectionHeader title="OTT" actionLabel="See All" onAction={onAction} />,
    );
    expect(getByRole('button')).toBeTruthy();
  });
});
