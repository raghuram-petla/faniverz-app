/* eslint-disable @typescript-eslint/no-explicit-any */
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'en', changeLanguage: jest.fn() },
  }),
}));

jest.mock('@/constants/surpriseHelpers', () => ({
  getCategoryColor: () => '#FF0000',
  getCategoryLabel: () => 'Behind the Scenes',
  getCategoryIconName: () => 'videocam',
  formatViews: (n: number) => `${n}`,
}));

jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
}));

jest.mock('@/theme/colors', () => ({
  colors: new Proxy({}, { get: () => '#000' }),
}));

let capturedOnPlay: (() => void) | undefined;

jest.mock('@/components/youtube/CustomYouTubePlayer', () => {
  const { View } = require('react-native');
  return {
    CustomYouTubePlayer: (props: Record<string, unknown>) => {
      // Capture onPlay so tests can simulate the thumbnail tap
      capturedOnPlay = props.onPlay as (() => void) | undefined;
      return <View testID="youtube-player" {...props} />;
    },
  };
});

import React from 'react';
import { render, screen, act } from '@testing-library/react-native';
import { FeaturedVideoCard } from '../FeaturedVideoCard';

const mockStyles = new Proxy({}, { get: () => ({}) });

const mockItem = {
  id: 's1',
  title: 'Making of Pushpa 2',
  category: 'behind_the_scenes',
  views: 50000,
  description: 'Behind the scenes footage',
} as any;

describe('FeaturedVideoCard', () => {
  beforeEach(() => {
    capturedOnPlay = undefined;
  });

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

  it('starts in idle mode (isActive=false on CustomYouTubePlayer)', () => {
    render(<FeaturedVideoCard item={mockItem} styles={mockStyles} />);
    const player = screen.getByTestId('youtube-player');
    expect(player.props.isActive).toBe(false);
    expect(player.props.mountShellWhenIdle).toBe(true);
  });

  it('activates player when onPlay is called', () => {
    render(<FeaturedVideoCard item={mockItem} styles={mockStyles} />);
    expect(screen.getByTestId('youtube-player').props.isActive).toBe(false);

    // Simulate thumbnail tap via captured onPlay callback
    act(() => {
      capturedOnPlay?.();
    });

    expect(screen.getByTestId('youtube-player').props.isActive).toBe(true);
    expect(screen.getByTestId('youtube-player').props.autoPlay).toBe(true);
    expect(screen.getByTestId('youtube-player').props.mountShellWhenIdle).toBe(true);
  });

  it('uses fallback video ID when youtube_id is null', () => {
    const noYoutubeItem = { ...mockItem, youtube_id: null };
    render(<FeaturedVideoCard item={noYoutubeItem} styles={mockStyles} />);
    const player = screen.getByTestId('youtube-player');
    // FALLBACK_VIDEO_ID = 'roYRXbhxhlM'
    expect(player.props.youtubeId).toBe('roYRXbhxhlM');
  });

  it('passes youtube_id directly when present', () => {
    const withIdItem = { ...mockItem, youtube_id: 'realId123' };
    render(<FeaturedVideoCard item={withIdItem} styles={mockStyles} />);
    expect(screen.getByTestId('youtube-player').props.youtubeId).toBe('realId123');
  });

  it('does not render description when item.description is falsy', () => {
    const noDescItem = { ...mockItem, description: null };
    render(<FeaturedVideoCard item={noDescItem} styles={mockStyles} />);
    expect(screen.queryByText('Behind the scenes footage')).toBeNull();
  });

  it('does not render description when it is an empty string', () => {
    const emptyDescItem = { ...mockItem, description: '' };
    render(<FeaturedVideoCard item={emptyDescItem} styles={mockStyles} />);
    expect(screen.queryByText('Behind the scenes footage')).toBeNull();
  });

  it('renders description when it is a non-empty string', () => {
    const descItem = { ...mockItem, description: 'Full description text here' };
    render(<FeaturedVideoCard item={descItem} styles={mockStyles} />);
    expect(screen.getByText('Full description text here')).toBeTruthy();
  });

  it('passes maxresdefault thumbnail to CustomYouTubePlayer', () => {
    const withIdItem = { ...mockItem, youtube_id: 'abc123' };
    render(<FeaturedVideoCard item={withIdItem} styles={mockStyles} />);
    const player = screen.getByTestId('youtube-player');
    expect(player.props.thumbnailUrl).toContain('maxresdefault');
    expect(player.props.thumbnailUrl).toContain('abc123');
  });
});
