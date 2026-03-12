import React from 'react';
import { render } from '@testing-library/react-native';
import { MovieRating } from '../MovieRating';

jest.mock('@expo/vector-icons', () => ({ Ionicons: 'Ionicons' }));
jest.mock('@/theme/colors', () => ({ colors: { yellow400: '#facc15' } }));

describe('MovieRating', () => {
  it('returns null when rating is 0', () => {
    const { toJSON } = render(<MovieRating rating={0} />);
    expect(toJSON()).toBeNull();
  });

  it('returns null when rating is negative', () => {
    const { toJSON } = render(<MovieRating rating={-1} />);
    expect(toJSON()).toBeNull();
  });

  it('renders star icon and rating text for positive rating', () => {
    const { toJSON, getByText } = render(<MovieRating rating={4.5} />);
    expect(toJSON()).not.toBeNull();
    expect(getByText('4.5')).toBeTruthy();
    // Verify Ionicons star is rendered
    const tree = toJSON();
    const ionicon = tree?.children?.find((child: any) => child.type === 'Ionicons');
    expect(ionicon).toBeTruthy();
    expect(ionicon?.props.name).toBe('star');
  });

  it('shows "/ 5" text when showMax is true', () => {
    const { getByText } = render(<MovieRating rating={3.8} showMax />);
    expect(getByText('/ 5')).toBeTruthy();
  });

  it('shows review count when reviewCount is provided', () => {
    const { getByText } = render(<MovieRating rating={4} reviewCount={120} />);
    expect(getByText('(120 reviews)')).toBeTruthy();
  });

  it('does not show review count when reviewCount is 0', () => {
    const { queryByText } = render(<MovieRating rating={4} reviewCount={0} />);
    expect(queryByText(/reviews/)).toBeNull();
  });

  it('applies custom containerStyle', () => {
    const customStyle = { marginTop: 10 };
    const { toJSON } = render(<MovieRating rating={3} containerStyle={customStyle} />);
    const tree = toJSON();
    const flatStyle = Array.isArray(tree?.props.style)
      ? Object.assign({}, ...tree.props.style)
      : tree?.props.style;
    expect(flatStyle.marginTop).toBe(10);
  });

  it('applies default size of 12', () => {
    const { toJSON, getByText } = render(<MovieRating rating={4.2} />);
    const tree = toJSON();
    // Check that Ionicons receives size=12
    const ionicon = tree?.children?.find((child: any) => child.type === 'Ionicons');
    expect(ionicon?.props.size).toBe(12);
    // Check that text has fontSize 12
    const ratingText = getByText('4.2');
    const flatStyle = Array.isArray(ratingText.props.style)
      ? Object.assign({}, ...ratingText.props.style)
      : ratingText.props.style;
    expect(flatStyle.fontSize).toBe(12);
  });
});
