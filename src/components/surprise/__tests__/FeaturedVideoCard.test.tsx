import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { FeaturedVideoCard } from '../FeaturedVideoCard';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'en', changeLanguage: jest.fn() },
  }),
}));

jest.mock('react-native-webview', () => {
  const { View } = require('react-native');
  return { WebView: View };
});
jest.mock('@/constants/surpriseHelpers', () => ({
  getCategoryColor: () => '#FF0000',
  getCategoryLabel: () => 'Behind the Scenes',
  getCategoryIconName: () => 'videocam',
  formatViews: (n: number) => `${n}`,
}));

const mockStyles = new Proxy({}, { get: () => ({}) });

const mockItem = {
  id: 's1',
  title: 'Making of Pushpa 2',
  category: 'behind_the_scenes',
  views: 50000,
  duration: '12:30',
  description: 'Behind the scenes footage',
} as any;

describe('FeaturedVideoCard', () => {
  it('renders item title', () => {
    render(<FeaturedVideoCard item={mockItem} styles={mockStyles} />);
    expect(screen.getByText('Making of Pushpa 2')).toBeTruthy();
  });

  it('renders category badge text', () => {
    render(<FeaturedVideoCard item={mockItem} styles={mockStyles} />);
    expect(screen.getByText('BEHIND THE SCENES')).toBeTruthy();
  });

  it('renders duration', () => {
    render(<FeaturedVideoCard item={mockItem} styles={mockStyles} />);
    expect(screen.getByText('12:30')).toBeTruthy();
  });

  it('renders views text', () => {
    render(<FeaturedVideoCard item={mockItem} styles={mockStyles} />);
    expect(screen.getByText(/50000.*common\.views/)).toBeTruthy();
  });

  it('renders description', () => {
    render(<FeaturedVideoCard item={mockItem} styles={mockStyles} />);
    expect(screen.getByText('Behind the scenes footage')).toBeTruthy();
  });

  it('renders "Play video" accessibility label', () => {
    render(<FeaturedVideoCard item={mockItem} styles={mockStyles} />);
    expect(screen.getByLabelText('common.playVideo')).toBeTruthy();
  });

  it('activates video player after pressing play', () => {
    render(<FeaturedVideoCard item={mockItem} styles={mockStyles} />);
    const playButton = screen.getByLabelText('common.playVideo');
    fireEvent.press(playButton);
    // After pressing play, the WebView component should be rendered
    expect(screen.queryByLabelText('common.playVideo')).toBeNull();
  });
});
