const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
}));

import React from 'react';
import { Linking } from 'react-native';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { OverviewTab } from '../OverviewTab';

jest.mock('@/styles/movieDetail.styles', () => ({
  createStyles: () => new Proxy({}, { get: () => ({}) }),
}));

jest.mock('@/theme/colors', () => ({
  colors: new Proxy({}, { get: () => '#000' }),
}));

const mockMovie = {
  id: 'movie-1',
  title: 'Pushpa 2',
  poster_url: 'https://example.com/poster.jpg',
  backdrop_url: 'https://example.com/backdrop.jpg',
  detail_focus_x: null,
  detail_focus_y: null,
  backdrop_focus_x: null,
  backdrop_focus_y: null,
  poster_focus_x: null,
  poster_focus_y: null,
  rating: 4.5,
  review_count: 120,
  runtime: 148,
  certification: 'UA',
  release_date: '2024-12-05',
  synopsis: 'The continuation of Pushpa Raj story.',
  director: 'Sukumar',
  genres: ['Action', 'Drama'],
  trailer_url: 'https://youtube.com/watch?v=123',
  videos: [
    {
      id: 'v1',
      movie_id: 'movie-1',
      youtube_id: 'abc123',
      title: 'Official Trailer',
      video_type: 'trailer',
      description: null,
      video_date: null,
      duration: '3:20',
      display_order: 0,
      created_at: '',
    },
  ],
  posters: [
    {
      id: 'p1',
      movie_id: 'movie-1',
      image_url: 'https://example.com/poster1.jpg',
      title: 'First Look',
      description: null,
      poster_date: null,
      is_main_poster: true,
      is_main_backdrop: false,
      image_type: 'poster',
      display_order: 0,
      created_at: '',
    },
  ],
  cast: [],
  crew: [],
  productionHouses: [],
  platforms: [],
  in_theaters: true,
  premiere_date: null,
} as any;

const onExploreMedia = jest.fn();

describe('OverviewTab', () => {
  beforeEach(() => jest.clearAllMocks());

  it('renders synopsis text with numberOfLines truncation', () => {
    render(<OverviewTab movie={mockMovie} onExploreMedia={onExploreMedia} />);
    const synopsisEl = screen.getByText(/continuation of Pushpa Raj/);
    expect(synopsisEl).toBeTruthy();
    expect(synopsisEl.props.numberOfLines).toBe(6);
  });

  it('renders genre pills', () => {
    render(<OverviewTab movie={mockMovie} onExploreMedia={onExploreMedia} />);
    expect(screen.getByText('Action')).toBeTruthy();
    expect(screen.getByText('Drama')).toBeTruthy();
  });

  it('renders director in info card', () => {
    render(<OverviewTab movie={mockMovie} onExploreMedia={onExploreMedia} />);
    expect(screen.getByText('Sukumar')).toBeTruthy();
  });

  it('renders certification in info card', () => {
    render(<OverviewTab movie={mockMovie} onExploreMedia={onExploreMedia} />);
    expect(screen.getByText('UA')).toBeTruthy();
  });

  it('renders MediaSummaryCard when movie has videos', () => {
    render(<OverviewTab movie={mockMovie} onExploreMedia={onExploreMedia} />);
    expect(screen.getByText('Explore All Media')).toBeTruthy();
    expect(screen.getByText('1 Video · 1 Poster')).toBeTruthy();
  });

  it('calls onExploreMedia when MediaSummaryCard is tapped', () => {
    render(<OverviewTab movie={mockMovie} onExploreMedia={onExploreMedia} />);
    fireEvent.press(screen.getByText('Explore All Media'));
    expect(onExploreMedia).toHaveBeenCalledTimes(1);
  });

  it('renders "Watch Trailer" button when no media but trailer_url exists', () => {
    const noMediaMovie = { ...mockMovie, videos: [], posters: [] };
    render(<OverviewTab movie={noMediaMovie} onExploreMedia={onExploreMedia} />);
    expect(screen.getByText(/Watch Trailer/)).toBeTruthy();
  });

  it('opens trailer URL when Watch Trailer is pressed', () => {
    const linkingSpy = jest.spyOn(Linking, 'openURL').mockResolvedValue(true as never);
    const noMediaMovie = { ...mockMovie, videos: [], posters: [] };
    render(<OverviewTab movie={noMediaMovie} onExploreMedia={onExploreMedia} />);
    fireEvent.press(screen.getByText('Watch Trailer'));
    expect(linkingSpy).toHaveBeenCalledWith('https://youtube.com/watch?v=123');
    linkingSpy.mockRestore();
  });

  it('renders nothing for media when no media and no trailer_url', () => {
    const noMediaMovie = { ...mockMovie, videos: [], posters: [], trailer_url: null };
    render(<OverviewTab movie={noMediaMovie} onExploreMedia={onExploreMedia} />);
    expect(screen.queryByText('Explore All Media')).toBeNull();
    expect(screen.queryByText('Watch Trailer')).toBeNull();
  });

  it('renders production house chips', () => {
    const movieWithPH = {
      ...mockMovie,
      productionHouses: [
        { id: 'ph1', name: 'Mythri', logo_url: 'logo.jpg', description: null, created_at: '' },
      ],
    };
    render(<OverviewTab movie={movieWithPH} onExploreMedia={onExploreMedia} />);
    expect(screen.getByText('Mythri')).toBeTruthy();
  });

  it('navigates to production house on chip press', () => {
    const movieWithPH = {
      ...mockMovie,
      productionHouses: [
        { id: 'ph1', name: 'Mythri', logo_url: null, description: null, created_at: '' },
      ],
    };
    render(<OverviewTab movie={movieWithPH} onExploreMedia={onExploreMedia} />);
    fireEvent.press(screen.getByLabelText('Go to Mythri'));
    expect(mockPush).toHaveBeenCalledWith('/production-house/ph1');
  });
});
