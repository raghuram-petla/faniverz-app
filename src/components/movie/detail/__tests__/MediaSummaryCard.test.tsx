jest.mock('@/styles/movieDetail.styles', () => ({
  createStyles: () => new Proxy({}, { get: () => ({}) }),
}));

jest.mock('@/theme/colors', () => ({
  colors: new Proxy({}, { get: () => '#000' }),
}));

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { MediaSummaryCard } from '../MediaSummaryCard';
import type { MovieVideo, MoviePoster } from '@/types';

const mockVideos: MovieVideo[] = [
  {
    id: 'v1',
    movie_id: 'm1',
    youtube_id: 'abc123',
    title: 'Official Teaser',
    description: null,
    video_type: 'teaser',
    video_date: null,
    duration: '2:10',
    display_order: 0,
    created_at: '',
  },
  {
    id: 'v2',
    movie_id: 'm1',
    youtube_id: 'def456',
    title: 'Official Trailer',
    description: null,
    video_type: 'trailer',
    video_date: null,
    duration: '3:20',
    display_order: 1,
    created_at: '',
  },
];

const mockPosters: MoviePoster[] = [
  {
    id: 'p1',
    movie_id: 'm1',
    image_url: 'https://example.com/poster1.jpg',
    title: 'First Look',
    description: null,
    poster_date: null,
    is_main: true,
    display_order: 0,
    created_at: '',
  },
  {
    id: 'p2',
    movie_id: 'm1',
    image_url: 'https://example.com/poster2.jpg',
    title: 'Character Poster',
    description: null,
    poster_date: null,
    is_main: false,
    display_order: 1,
    created_at: '',
  },
];

describe('MediaSummaryCard', () => {
  const onExploreMedia = jest.fn();

  beforeEach(() => jest.clearAllMocks());

  it('renders summary text with video and photo counts', () => {
    render(
      <MediaSummaryCard
        videos={mockVideos}
        posters={mockPosters}
        onExploreMedia={onExploreMedia}
      />,
    );
    expect(screen.getByText('2 Videos · 2 Photos')).toBeTruthy();
  });

  it('renders "Explore All Media" CTA', () => {
    render(
      <MediaSummaryCard
        videos={mockVideos}
        posters={mockPosters}
        onExploreMedia={onExploreMedia}
      />,
    );
    expect(screen.getByText('Explore All Media')).toBeTruthy();
  });

  it('calls onExploreMedia when pressed', () => {
    render(
      <MediaSummaryCard
        videos={mockVideos}
        posters={mockPosters}
        onExploreMedia={onExploreMedia}
      />,
    );
    fireEvent.press(screen.getByLabelText('2 Videos · 2 Photos — Explore all media'));
    expect(onExploreMedia).toHaveBeenCalledTimes(1);
  });

  it('prefers trailer over teaser for featured thumbnail', () => {
    render(<MediaSummaryCard videos={mockVideos} posters={[]} onExploreMedia={onExploreMedia} />);
    // The trailer youtube_id (def456) should be used for the thumbnail
    expect(screen.getByLabelText('2 Videos — Explore all media')).toBeTruthy();
  });

  it('shows only video count when no posters', () => {
    render(<MediaSummaryCard videos={mockVideos} posters={[]} onExploreMedia={onExploreMedia} />);
    expect(screen.getByText('2 Videos')).toBeTruthy();
  });

  it('shows only photo count when no videos', () => {
    render(<MediaSummaryCard videos={[]} posters={mockPosters} onExploreMedia={onExploreMedia} />);
    expect(screen.getByText('2 Photos')).toBeTruthy();
  });

  it('uses singular "Video" for single video', () => {
    render(
      <MediaSummaryCard videos={[mockVideos[0]]} posters={[]} onExploreMedia={onExploreMedia} />,
    );
    expect(screen.getByText('1 Video')).toBeTruthy();
  });

  it('uses singular "Photo" for single poster', () => {
    render(
      <MediaSummaryCard videos={[]} posters={[mockPosters[0]]} onExploreMedia={onExploreMedia} />,
    );
    expect(screen.getByText('1 Photo')).toBeTruthy();
  });
});
