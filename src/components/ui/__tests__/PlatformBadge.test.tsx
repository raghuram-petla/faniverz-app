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
  logo_url: null,
  color: '#E50914',
  display_order: 1,
};

// Platform with no logo asset (unknown id → falls back to text)
const unknownPlatform: OTTPlatform = {
  id: 'custom',
  name: 'Custom',
  logo: 'C',
  logo_url: null,
  color: '#333333',
  display_order: 99,
};

describe('PlatformBadge', () => {
  it('renders platform logo image for known platforms', () => {
    // netflix has a real logo asset, so Image is rendered (no text)
    const { queryByText } = render(<PlatformBadge platform={mockPlatform} />);
    expect(queryByText('N')).toBeNull();
  });

  it('renders remote logo_url when no local asset but logo_url exists', () => {
    const platformWithUrl: OTTPlatform = {
      ...unknownPlatform,
      logo_url: 'https://image.tmdb.org/t/p/w92/logo.png',
    };
    const { queryByText } = render(<PlatformBadge platform={platformWithUrl} />);
    expect(queryByText('C')).toBeNull();
  });

  it('renders text fallback for unknown platforms without logo_url', () => {
    const { getByText } = render(<PlatformBadge platform={unknownPlatform} />);
    expect(getByText('C')).toBeTruthy();
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

  it('scales font size to half of badge size for text fallback', () => {
    const { getByText } = render(<PlatformBadge platform={unknownPlatform} size={40} />);
    const logo = getByText('C');
    const style = flattenStyle(logo.props.style);
    expect(style.fontSize).toBe(20);
  });

  it('applies borderRadius of 4', () => {
    const { toJSON } = render(<PlatformBadge platform={mockPlatform} />);
    const tree = toJSON();
    const style = flattenStyle(tree?.props.style);
    expect(style.borderRadius).toBe(4);
  });

  it('renders image for aha platform', () => {
    const ahaPlatform: OTTPlatform = {
      id: 'aha',
      name: 'Aha',
      logo: 'A',
      logo_url: null,
      color: '#FF6B00',
      display_order: 2,
    };
    // aha has a real logo asset, so Image is rendered (no text)
    const { queryByText } = render(<PlatformBadge platform={ahaPlatform} />);
    expect(queryByText('A')).toBeNull();
  });

  it('handles platform with emoji logo via text fallback', () => {
    const emojiPlatform: OTTPlatform = {
      id: 'custom',
      name: 'Custom',
      logo: '🎬',
      logo_url: null,
      color: '#333333',
      display_order: 3,
    };
    const { getByText } = render(<PlatformBadge platform={emojiPlatform} />);
    expect(getByText('🎬')).toBeTruthy();
  });
});
