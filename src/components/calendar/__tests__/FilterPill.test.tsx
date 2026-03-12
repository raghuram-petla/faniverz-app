import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { FilterPill } from '../FilterPill';

jest.mock('@/styles/tabs/calendar.styles', () => ({
  createStyles: () => new Proxy({}, { get: () => ({}) }),
}));

describe('FilterPill', () => {
  it('renders the label', () => {
    render(<FilterPill label="2026" onRemove={jest.fn()} />);
    expect(screen.getByText('2026')).toBeTruthy();
  });

  it('calls onRemove when close icon is pressed', () => {
    const onRemove = jest.fn();
    render(<FilterPill label="Jan" onRemove={onRemove} />);
    fireEvent.press(screen.getByText('Jan').parent!.parent!.children[1] as any);
    expect(onRemove).toHaveBeenCalledTimes(1);
  });

  it('renders with different labels', () => {
    const { rerender } = render(<FilterPill label="Day 15" onRemove={jest.fn()} />);
    expect(screen.getByText('Day 15')).toBeTruthy();

    rerender(<FilterPill label="Mar" onRemove={jest.fn()} />);
    expect(screen.getByText('Mar')).toBeTruthy();
  });
});
