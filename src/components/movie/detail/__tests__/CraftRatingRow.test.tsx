import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react-native';
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
  colors: { yellow500: '#FACC15', red600: '#DC2626' },
}));

const defaultProps = {
  label: 'Story',
  editorRating: 3,
  userRating: null as number | null,
  avgUserRating: null as number | null,
  onRate: jest.fn(),
};

describe('CraftRatingRow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the craft label', () => {
    render(<CraftRatingRow {...defaultProps} />);
    expect(screen.getByText('Story')).toBeTruthy();
  });

  it('renders 5 editor stars with correct filled/outline state', () => {
    const { toJSON } = render(<CraftRatingRow {...defaultProps} editorRating={3} />);
    const tree = toJSON();
    // Flatten all Ionicons from the tree
    const allIonicons = findAllByType(tree, 'Ionicons');
    // First 5 are editor stars (key starts with editor-)
    const editorStars = allIonicons.slice(0, 5);
    expect(editorStars[0].props.name).toBe('star');
    expect(editorStars[1].props.name).toBe('star');
    expect(editorStars[2].props.name).toBe('star');
    expect(editorStars[3].props.name).toBe('star-outline');
    expect(editorStars[4].props.name).toBe('star-outline');
  });

  it('renders 5 user stars all as outlines when userRating is null', () => {
    const { toJSON } = render(<CraftRatingRow {...defaultProps} userRating={null} />);
    const allIonicons = findAllByType(toJSON(), 'Ionicons');
    // Last 5 are user stars
    const userStars = allIonicons.slice(5, 10);
    userStars.forEach((star) => {
      expect(star.props.name).toBe('star-outline');
    });
  });

  it('renders correct user stars when userRating is set', () => {
    const { toJSON } = render(<CraftRatingRow {...defaultProps} userRating={4} />);
    const allIonicons = findAllByType(toJSON(), 'Ionicons');
    const userStars = allIonicons.slice(5, 10);
    expect(userStars[0].props.name).toBe('star');
    expect(userStars[1].props.name).toBe('star');
    expect(userStars[2].props.name).toBe('star');
    expect(userStars[3].props.name).toBe('star');
    expect(userStars[4].props.name).toBe('star-outline');
  });

  it('calls onRate with correct star value when user taps a star', () => {
    const onRate = jest.fn();
    render(<CraftRatingRow {...defaultProps} onRate={onRate} />);
    fireEvent.press(screen.getByLabelText('Rate Story 3 stars'));
    expect(onRate).toHaveBeenCalledWith(3);
  });

  it('calls onRate with 1 when first star is pressed', () => {
    const onRate = jest.fn();
    render(<CraftRatingRow {...defaultProps} onRate={onRate} />);
    fireEvent.press(screen.getByLabelText('Rate Story 1 stars'));
    expect(onRate).toHaveBeenCalledWith(1);
  });

  it('shows avgUserRating when provided', () => {
    render(<CraftRatingRow {...defaultProps} avgUserRating={3.7} />);
    expect(screen.getByText('3.7')).toBeTruthy();
  });

  it('does not show avgUserRating text when null', () => {
    render(<CraftRatingRow {...defaultProps} avgUserRating={null} />);
    expect(screen.queryByText(/\d\.\d/)).toBeNull();
  });

  it('renders all 5 user star pressables with accessibility labels', () => {
    render(<CraftRatingRow {...defaultProps} label="Direction" />);
    for (let i = 1; i <= 5; i++) {
      expect(screen.getByLabelText(`Rate Direction ${i} stars`)).toBeTruthy();
    }
  });
});

// Helper to recursively find all elements with a given type
function findAllByType(node: any, type: string): any[] {
  const results: any[] = [];
  if (!node) return results;
  if (node.type === type) results.push(node);
  if (node.children) {
    for (const child of node.children) {
      if (typeof child === 'object') {
        results.push(...findAllByType(child, type));
      }
    }
  }
  return results;
}
