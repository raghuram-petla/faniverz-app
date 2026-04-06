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
  colors: { yellow400: '#FACC15', red600: '#DC2626' },
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (_k: string, d: string) => d }),
}));

const defaultProps = {
  label: 'Story',
  editorRating: 3,
  userRating: null as number | null,
  avgUserRating: null as number | null,
  onRate: jest.fn(),
};

describe('CraftRatingRow', () => {
  beforeEach(() => jest.clearAllMocks());

  it('renders the craft label', () => {
    render(<CraftRatingRow {...defaultProps} />);
    expect(screen.getByText('Story')).toBeTruthy();
  });

  it('renders editor stars with correct filled/outline state', () => {
    const { toJSON } = render(<CraftRatingRow {...defaultProps} editorRating={3} />);
    const allIonicons = findAllByType(toJSON(), 'Ionicons');
    const editorStars = allIonicons.slice(0, 5);
    expect(editorStars[0].props.name).toBe('star');
    expect(editorStars[2].props.name).toBe('star');
    expect(editorStars[3].props.name).toBe('star-outline');
  });

  it('shows editor rating number in parentheses', () => {
    render(<CraftRatingRow {...defaultProps} editorRating={4} />);
    expect(screen.getByText('(4)')).toBeTruthy();
  });

  it('shows "Tap to rate" when user has not rated', () => {
    render(<CraftRatingRow {...defaultProps} userRating={null} />);
    expect(screen.getByText('Tap to rate')).toBeTruthy();
  });

  it('shows "Your rating" when user has rated', () => {
    render(<CraftRatingRow {...defaultProps} userRating={4} />);
    expect(screen.getByText('Your rating')).toBeTruthy();
  });

  it('calls onRate with correct star value', () => {
    const onRate = jest.fn();
    render(<CraftRatingRow {...defaultProps} onRate={onRate} />);
    fireEvent.press(screen.getByLabelText('Rate Story 3 stars'));
    expect(onRate).toHaveBeenCalledWith(3);
  });

  it('renders all 5 user star pressables with accessibility labels', () => {
    render(<CraftRatingRow {...defaultProps} label="Direction" />);
    for (let i = 1; i <= 5; i++) {
      expect(screen.getByLabelText(`Rate Direction ${i} stars`)).toBeTruthy();
    }
  });
});

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
