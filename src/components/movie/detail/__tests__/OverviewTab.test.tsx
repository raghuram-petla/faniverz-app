/* eslint-disable @typescript-eslint/no-explicit-any */
const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
}));

import React from 'react';
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

  it('renders tagline when present', () => {
    const movieWithTagline = { ...mockMovie, tagline: 'The rule of the jungle' };
    render(<OverviewTab movie={movieWithTagline} onExploreMedia={onExploreMedia} />);
    expect(screen.getByText('The rule of the jungle')).toBeTruthy();
  });

  it('does not render tagline when null', () => {
    const movieNoTagline = { ...mockMovie, tagline: null };
    render(<OverviewTab movie={movieNoTagline} onExploreMedia={onExploreMedia} />);
    expect(screen.queryByText('The rule of the jungle')).toBeNull();
  });

  it('shows TMDB rating as fallback when app rating is 0', () => {
    const movieTmdb = {
      ...mockMovie,
      rating: 0,
      review_count: 0,
      tmdb_vote_average: 7.2,
    };
    render(<OverviewTab movie={movieTmdb} onExploreMedia={onExploreMedia} />);
    expect(screen.getByText('TMDB 7.2/10')).toBeTruthy();
  });

  it('does not show TMDB rating when app has its own ratings', () => {
    const movieWithRating = { ...mockMovie, tmdb_vote_average: 7.5 };
    render(<OverviewTab movie={movieWithRating} onExploreMedia={onExploreMedia} />);
    expect(screen.queryByText(/TMDB/)).toBeNull();
  });

  it('does not show TMDB rating when tmdb_vote_average is null', () => {
    const movieNoTmdb = {
      ...mockMovie,
      rating: 0,
      review_count: 0,
      tmdb_vote_average: null,
    };
    render(<OverviewTab movie={movieNoTmdb} onExploreMedia={onExploreMedia} />);
    expect(screen.queryByText(/TMDB/)).toBeNull();
  });

  it('renders collection badge when collection_name is present', () => {
    const movieCollection = { ...mockMovie, collection_name: 'Pushpa Collection' };
    render(<OverviewTab movie={movieCollection} onExploreMedia={onExploreMedia} />);
    expect(screen.getByText('Pushpa Collection')).toBeTruthy();
  });

  it('does not render collection badge when collection_name is null', () => {
    const movieNoCollection = { ...mockMovie, collection_name: null };
    render(<OverviewTab movie={movieNoCollection} onExploreMedia={onExploreMedia} />);
    expect(screen.queryByText('Pushpa Collection')).toBeNull();
  });

  it('renders budget when available', () => {
    const movieBudget = { ...mockMovie, budget: 25000000, revenue: null };
    render(<OverviewTab movie={movieBudget} onExploreMedia={onExploreMedia} />);
    expect(screen.getByText('$25M')).toBeTruthy();
    expect(screen.getByText('Budget')).toBeTruthy();
  });

  it('renders revenue when available', () => {
    const movieRevenue = { ...mockMovie, budget: null, revenue: 150000000 };
    render(<OverviewTab movie={movieRevenue} onExploreMedia={onExploreMedia} />);
    expect(screen.getByText('$150M')).toBeTruthy();
    expect(screen.getByText('Revenue')).toBeTruthy();
  });

  it('does not render budget/revenue when values are 0 or null', () => {
    const movieNoBudget = { ...mockMovie, budget: 0, revenue: null };
    render(<OverviewTab movie={movieNoBudget} onExploreMedia={onExploreMedia} />);
    expect(screen.queryByText('Budget')).toBeNull();
    expect(screen.queryByText('Revenue')).toBeNull();
  });

  it('does not render synopsis when null', () => {
    const movieNoSynopsis = { ...mockMovie, synopsis: null };
    render(<OverviewTab movie={movieNoSynopsis} onExploreMedia={onExploreMedia} />);
    expect(screen.queryByText(/continuation of Pushpa Raj/)).toBeNull();
  });

  it('does not render genres when null', () => {
    const movieNoGenres = { ...mockMovie, genres: null };
    render(<OverviewTab movie={movieNoGenres} onExploreMedia={onExploreMedia} />);
    expect(screen.queryByText('Action')).toBeNull();
    expect(screen.queryByText('Drama')).toBeNull();
  });

  it('does not render genres when empty array', () => {
    const movieEmptyGenres = { ...mockMovie, genres: [] };
    render(<OverviewTab movie={movieEmptyGenres} onExploreMedia={onExploreMedia} />);
    expect(screen.queryByText('Action')).toBeNull();
  });

  it('renders production house without logo when logo_url is null', () => {
    const movieWithPH = {
      ...mockMovie,
      productionHouses: [
        { id: 'ph1', name: 'Mythri', logo_url: null, description: null, created_at: '' },
      ],
    };
    render(<OverviewTab movie={movieWithPH} onExploreMedia={onExploreMedia} />);
    expect(screen.getByText('Mythri')).toBeTruthy();
  });

  it('does not render director when null', () => {
    const movieNoDir = { ...mockMovie, director: null };
    render(<OverviewTab movie={movieNoDir} onExploreMedia={onExploreMedia} />);
    expect(screen.queryByText('Sukumar')).toBeNull();
  });

  it('does not render certification when null', () => {
    const movieNoCert = { ...mockMovie, certification: null };
    render(<OverviewTab movie={movieNoCert} onExploreMedia={onExploreMedia} />);
    expect(screen.queryByText('UA')).toBeNull();
  });

  it('does not render MediaSummaryCard when no videos and no posters', () => {
    const movieNoMedia = { ...mockMovie, videos: [], posters: [] };
    render(<OverviewTab movie={movieNoMedia} onExploreMedia={onExploreMedia} />);
    expect(screen.queryByText('Explore All Media')).toBeNull();
  });

  it('renders both budget and revenue when both > 0', () => {
    const movieBoth = { ...mockMovie, budget: 50000000, revenue: 200000000 };
    render(<OverviewTab movie={movieBoth} onExploreMedia={onExploreMedia} />);
    expect(screen.getByText('Budget')).toBeTruthy();
    expect(screen.getByText('Revenue')).toBeTruthy();
  });
});
