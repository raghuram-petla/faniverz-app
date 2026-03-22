jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 47, bottom: 34, left: 0, right: 0 }),
}));

jest.mock('@/styles/collapsibleProfile.styles', () => ({
  createStyles: () => new Proxy({}, { get: () => ({}) }),
  NAV_BAR_HEIGHT: 48,
  IMAGE_EXPANDED: 120,
  IMAGE_COLLAPSED: 32,
  COLLAPSE_SCROLL_DISTANCE: 140,
  HERO_NAME_PLACEHOLDER_HEIGHT: 50,
}));

jest.mock('@/components/common/HomeButton', () => {
  const { Text } = require('react-native');
  return { HomeButton: () => <Text>HomeBtn</Text> };
});

import React from 'react';
import { Text, View } from 'react-native';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { CollapsibleProfileLayout } from '../CollapsibleProfileLayout';

const defaultProps = {
  name: 'Test Person',
  renderImage: (size: number) => <View testID={`image-${size}`} />,
  onBack: jest.fn(),
};

describe('CollapsibleProfileLayout', () => {
  beforeEach(() => jest.clearAllMocks());

  it('renders the name in the hero section', () => {
    render(<CollapsibleProfileLayout {...defaultProps} />);
    expect(screen.getAllByText('Test Person').length).toBeGreaterThanOrEqual(1);
  });

  it('renders the back button', () => {
    render(<CollapsibleProfileLayout {...defaultProps} />);
    expect(screen.getByLabelText('Go back')).toBeTruthy();
  });

  it('calls onBack when back button is pressed', () => {
    const onBack = jest.fn();
    render(<CollapsibleProfileLayout {...defaultProps} onBack={onBack} />);
    fireEvent.press(screen.getByLabelText('Go back'));
    expect(onBack).toHaveBeenCalled();
  });

  it('renders hero image at expanded size', () => {
    render(<CollapsibleProfileLayout {...defaultProps} />);
    expect(screen.getByTestId('image-120')).toBeTruthy();
  });

  it('renders floating avatar element', () => {
    render(<CollapsibleProfileLayout {...defaultProps} />);
    expect(screen.getByTestId('floating-avatar')).toBeTruthy();
  });

  it('renders floating name element', () => {
    render(<CollapsibleProfileLayout {...defaultProps} />);
    expect(screen.getByTestId('floating-name')).toBeTruthy();
  });

  it('wraps hero image in pressable when onImagePress provided', () => {
    const onImagePress = jest.fn();
    render(<CollapsibleProfileLayout {...defaultProps} onImagePress={onImagePress} />);
    expect(screen.getByTestId('hero-image-tap')).toBeTruthy();
    fireEvent.press(screen.getByTestId('hero-image-tap'));
    expect(onImagePress).toHaveBeenCalled();
  });

  it('does not show hero-image-tap when no onImagePress', () => {
    render(<CollapsibleProfileLayout {...defaultProps} />);
    expect(screen.queryByTestId('hero-image-tap')).toBeNull();
  });

  it('renders rightContent in the nav bar', () => {
    render(<CollapsibleProfileLayout {...defaultProps} rightContent={<Text>Follow</Text>} />);
    expect(screen.getByText('Follow')).toBeTruthy();
  });

  it('renders heroContent below the name', () => {
    render(<CollapsibleProfileLayout {...defaultProps} heroContent={<Text>Hero Content</Text>} />);
    expect(screen.getByText('Hero Content')).toBeTruthy();
  });

  it('renders children as scrollable content', () => {
    render(
      <CollapsibleProfileLayout {...defaultProps}>
        <Text>Child Content</Text>
      </CollapsibleProfileLayout>,
    );
    expect(screen.getByText('Child Content')).toBeTruthy();
  });

  it('renders scrollHeader at top of scroll area', () => {
    render(<CollapsibleProfileLayout {...defaultProps} scrollHeader={<Text>Pull Header</Text>} />);
    expect(screen.getByText('Pull Header')).toBeTruthy();
  });

  it('renders HomeButton in nav bar', () => {
    render(<CollapsibleProfileLayout {...defaultProps} />);
    expect(screen.getByText('HomeBtn')).toBeTruthy();
  });

  it('renders children passed as content', () => {
    render(
      <CollapsibleProfileLayout {...defaultProps}>
        <Text>Some content</Text>
        <Text>More content</Text>
      </CollapsibleProfileLayout>,
    );
    expect(screen.getByText('Some content')).toBeTruthy();
    expect(screen.getByText('More content')).toBeTruthy();
  });

  it('renders without optional props', () => {
    render(<CollapsibleProfileLayout {...defaultProps} />);
    // Should not crash without rightContent, heroContent, children, scrollHeader
    expect(screen.getByTestId('floating-avatar')).toBeTruthy();
  });
});
