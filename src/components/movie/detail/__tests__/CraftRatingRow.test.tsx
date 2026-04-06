import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { CraftRatingRow } from '../CraftRatingRow';

jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
}));

jest.mock('@/theme', () => ({
  useTheme: () => ({
    theme: {
      textPrimary: '#fff',
      textSecondary: '#aaa',
      textTertiary: '#666',
      textDisabled: '#444',
    },
    isDark: true,
  }),
}));

jest.mock('@/theme/colors', () => ({
  colors: { yellow400: '#FACC15' },
}));

const defaultProps = { label: 'Story', editorRating: 3 };

// Helper to find all elements by type in rendered tree
function findAllByType(node: any, type: string): any[] {
  const results: any[] = [];
  if (!node) return results;
  if (node.type === type) results.push(node);
  if (node.children) {
    for (const child of node.children) {
      if (typeof child === 'object') results.push(...findAllByType(child, type));
    }
  }
  return results;
}

describe('CraftRatingRow', () => {
  it('renders the craft label', () => {
    render(<CraftRatingRow {...defaultProps} />);
    expect(screen.getByText('Story')).toBeTruthy();
  });

  it('renders editor stars with correct filled/outline state', () => {
    const { toJSON } = render(<CraftRatingRow {...defaultProps} editorRating={3} />);
    const stars = findAllByType(toJSON(), 'Ionicons');
    expect(stars[0].props.name).toBe('star');
    expect(stars[2].props.name).toBe('star');
    expect(stars[3].props.name).toBe('star-outline');
    expect(stars[4].props.name).toBe('star-outline');
  });

  it('shows rating number in parentheses', () => {
    render(<CraftRatingRow {...defaultProps} editorRating={4} />);
    expect(screen.getByText('(4)')).toBeTruthy();
  });

  it('renders 5 star icons', () => {
    const { toJSON } = render(<CraftRatingRow {...defaultProps} />);
    const stars = findAllByType(toJSON(), 'Ionicons');
    expect(stars).toHaveLength(5);
  });
});
