import React from 'react';
import { render } from '@testing-library/react-native';
import { StatusBadge } from '../StatusBadge';
import { colors } from '@/theme/colors';

function flattenStyle(style: unknown): Record<string, unknown> {
  if (Array.isArray(style)) {
    return Object.assign({}, ...style.map(flattenStyle));
  }
  return (style as Record<string, unknown>) ?? {};
}

describe('StatusBadge', () => {
  it('renders "In Theaters" label for theatrical type', () => {
    const { getByText } = render(<StatusBadge type="theatrical" />);
    expect(getByText('In Theaters')).toBeTruthy();
  });

  it('renders "Streaming" label for ott type', () => {
    const { getByText } = render(<StatusBadge type="ott" />);
    expect(getByText('Streaming')).toBeTruthy();
  });

  it('renders "Coming Soon" label for upcoming type', () => {
    const { getByText } = render(<StatusBadge type="upcoming" />);
    expect(getByText('Coming Soon')).toBeTruthy();
  });

  it('applies red background for theatrical type', () => {
    const { toJSON } = render(<StatusBadge type="theatrical" />);
    const tree = toJSON();
    const style = flattenStyle(tree?.props.style);
    expect(style.backgroundColor).toBe(colors.red600);
  });

  it('applies purple background for ott type', () => {
    const { toJSON } = render(<StatusBadge type="ott" />);
    const tree = toJSON();
    const style = flattenStyle(tree?.props.style);
    expect(style.backgroundColor).toBe(colors.purple600);
  });

  it('applies blue background for upcoming type', () => {
    const { toJSON } = render(<StatusBadge type="upcoming" />);
    const tree = toJSON();
    const style = flattenStyle(tree?.props.style);
    expect(style.backgroundColor).toBe(colors.blue600);
  });

  it('renders text with uppercase styling', () => {
    const { getByText } = render(<StatusBadge type="theatrical" />);
    const label = getByText('In Theaters');
    const style = flattenStyle(label.props.style);
    expect(style.textTransform).toBe('uppercase');
  });

  it('renders text in white color', () => {
    const { getByText } = render(<StatusBadge type="ott" />);
    const label = getByText('Streaming');
    const style = flattenStyle(label.props.style);
    expect(style.color).toBe(colors.white);
  });
});
