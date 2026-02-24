import React from 'react';
import { render } from '@testing-library/react-native';
import { PlatformBadge } from '../PlatformBadge';
import { OTTPlatform } from '@/types';

function flattenStyle(style: unknown): Record<string, unknown> {
  if (Array.isArray(style)) {
    return Object.assign({}, ...style.map(flattenStyle));
  }
  return (style as Record<string, unknown>) ?? {};
}

const mockPlatform: OTTPlatform = {
  id: 'netflix',
  name: 'Netflix',
  logo: 'N',
  color: '#E50914',
  display_order: 1,
};

describe('PlatformBadge', () => {
  it('renders platform logo text', () => {
    const { getByText } = render(<PlatformBadge platform={mockPlatform} />);
    expect(getByText('N')).toBeTruthy();
  });

  it('applies platform background color', () => {
    const { toJSON } = render(<PlatformBadge platform={mockPlatform} />);
    const tree = toJSON();
    const style = flattenStyle(tree?.props.style);
    expect(style.backgroundColor).toBe('#E50914');
  });

  it('renders with default size of 24', () => {
    const { toJSON } = render(<PlatformBadge platform={mockPlatform} />);
    const tree = toJSON();
    const style = flattenStyle(tree?.props.style);
    expect(style.width).toBe(24);
    expect(style.height).toBe(24);
  });

  it('renders with custom size', () => {
    const { toJSON } = render(<PlatformBadge platform={mockPlatform} size={48} />);
    const tree = toJSON();
    const style = flattenStyle(tree?.props.style);
    expect(style.width).toBe(48);
    expect(style.height).toBe(48);
  });

  it('scales font size to half of badge size', () => {
    const { getByText } = render(<PlatformBadge platform={mockPlatform} size={40} />);
    const logo = getByText('N');
    const style = flattenStyle(logo.props.style);
    expect(style.fontSize).toBe(20);
  });

  it('applies borderRadius of 4', () => {
    const { toJSON } = render(<PlatformBadge platform={mockPlatform} />);
    const tree = toJSON();
    const style = flattenStyle(tree?.props.style);
    expect(style.borderRadius).toBe(4);
  });

  it('renders different platform logos', () => {
    const ahaPlatform: OTTPlatform = {
      id: 'aha',
      name: 'Aha',
      logo: 'A',
      color: '#FF6B00',
      display_order: 2,
    };
    const { getByText } = render(<PlatformBadge platform={ahaPlatform} />);
    expect(getByText('A')).toBeTruthy();
  });

  it('handles platform with emoji logo', () => {
    const emojiPlatform: OTTPlatform = {
      id: 'custom',
      name: 'Custom',
      logo: '🎬',
      color: '#333333',
      display_order: 3,
    };
    const { getByText } = render(<PlatformBadge platform={emojiPlatform} />);
    expect(getByText('🎬')).toBeTruthy();
  });
});
