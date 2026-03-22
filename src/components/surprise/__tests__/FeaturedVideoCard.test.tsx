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

  it('renders thumbnail image before activation', () => {
    const { UNSAFE_getAllByType } = render(
      <FeaturedVideoCard item={mockItem} styles={mockStyles} />,
    );
    const { Image } = require('expo-image');
    const images = UNSAFE_getAllByType(Image);
    expect(images.length).toBeGreaterThanOrEqual(1);
  });

  it('does not render description when item.description is falsy', () => {
    const noDescItem = { ...mockItem, description: null };
    render(<FeaturedVideoCard item={noDescItem} styles={mockStyles} />);
    expect(screen.queryByText('Behind the scenes footage')).toBeNull();
  });

  it('uses fallback video ID when youtube_id is null', () => {
    const noYoutubeItem = { ...mockItem, youtube_id: null };
    render(<FeaturedVideoCard item={noYoutubeItem} styles={mockStyles} />);
    // Should still render the play button with the fallback video
    expect(screen.getByLabelText('common.playVideo')).toBeTruthy();
  });

  it('renders share button after video activation', () => {
    render(<FeaturedVideoCard item={mockItem} styles={mockStyles} />);
    fireEvent.press(screen.getByLabelText('common.playVideo'));
    // Share button should be visible
    expect(screen.getByLabelText('common.shareVideo')).toBeTruthy();
  });
});
