jest.mock('@/theme', () => ({
  useTheme: () => ({
    theme: new Proxy({}, { get: () => '#000' }),
    colors: new Proxy({}, { get: () => '#000' }),
    mode: 'dark',
    setMode: jest.fn(),
  }),
}));

jest.mock('@/styles/tabs/calendar.styles', () => ({
  createStyles: () => new Proxy({}, { get: () => ({}) }),
}));

jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
  MaterialIcons: 'MaterialIcons',
}));

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { FilterPill } from '../FilterPill';

describe('FilterPill', () => {
  it('renders without crashing', () => {
    const { toJSON } = render(<FilterPill label="2026" onRemove={jest.fn()} />);
    expect(toJSON()).toBeTruthy();
  });

  it('renders the label', () => {
    render(<FilterPill label="2026" onRemove={jest.fn()} />);
    expect(screen.getByText('2026')).toBeTruthy();
  });

  it('calls onRemove when close icon is pressed', () => {
    const onRemove = jest.fn();
    render(<FilterPill label="Jan" onRemove={onRemove} />);
    // The close icon is in a TouchableOpacity next to the label text
    const pill = screen.getByText('Jan');
    const parent = pill.parent?.parent;
    if (parent?.children[1]) {
      fireEvent.press(parent.children[1] as any);
    }
    expect(onRemove).toHaveBeenCalledTimes(1);
  });

  it('renders with different labels', () => {
    const { rerender } = render(<FilterPill label="Day 15" onRemove={jest.fn()} />);
    expect(screen.getByText('Day 15')).toBeTruthy();

    rerender(<FilterPill label="Mar" onRemove={jest.fn()} />);
    expect(screen.getByText('Mar')).toBeTruthy();
  });

  it('renders with month labels', () => {
    render(<FilterPill label="February" onRemove={jest.fn()} />);
    expect(screen.getByText('February')).toBeTruthy();
  });

  it('renders with year labels', () => {
    render(<FilterPill label="2025" onRemove={jest.fn()} />);
    expect(screen.getByText('2025')).toBeTruthy();
  });
});
