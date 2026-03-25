import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { HeroSlide } from '../HeroSlide';
import { Movie, OTTPlatform } from '@/types';

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), back: jest.fn() }),
}));

jest.mock('@/theme/colors', () => ({
  colors: new Proxy({}, { get: () => '#000' }),
}));

jest.mock('@/hooks/useMovieAction', () => ({
  getMovieActionType: jest.fn((status: string) =>
    status === 'streaming' ? 'watchlist' : 'follow',
  ),
}));

const baseMock: Movie = {
  id: '1',
  tmdb_id: null,
  title: 'Pushpa 2',
  in_theaters: true,
  premiere_date: null,
  release_date: '2025-03-01',
  poster_url: null,
  backdrop_url: null,
  rating: 4.5,
  review_count: 10,
  is_featured: false,
  genres: ['Action'],
  certification: 'UA',
  runtime: 180,
  synopsis: '',
  director: 'Sukumar',
  original_language: null,
  backdrop_focus_x: null,
  backdrop_focus_y: null,
  poster_focus_x: null,
  poster_focus_y: null,
  poster_image_type: 'poster',
  backdrop_image_type: 'backdrop',
  spotlight_focus_x: null,
  spotlight_focus_y: null,
  detail_focus_x: null,
  detail_focus_y: null,
  tmdb_last_synced_at: null,
  imdb_id: null,
  title_te: null,
  synopsis_te: null,
  tagline: null,
  tmdb_status: null,
  tmdb_vote_average: null,
  tmdb_vote_count: null,
  budget: null,
  revenue: null,
  tmdb_popularity: null,
  spoken_languages: null,
  collection_id: null,
  collection_name: null,
  language_id: null,
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-01-01T00:00:00Z',
};

const mockPlatforms: OTTPlatform[] = [
  { id: 'netflix', name: 'Netflix', logo: '', logo_url: null, color: '#E50914', display_order: 0 },
];

describe('HeroSlide', () => {
  const defaultProps = {
    movie: baseMock,
    platforms: [] as OTTPlatform[],
    isFollowed: false,
    isInWatchlist: false,
    onWatchNow: jest.fn(),
    onActionToggle: jest.fn(),
  };

  beforeEach(() => jest.clearAllMocks());

  it('renders movie title', () => {
    const { getByText } = render(<HeroSlide {...defaultProps} />);
    expect(getByText('Pushpa 2')).toBeTruthy();
  });

  it('renders rating when > 0', () => {
    const { getByText } = render(<HeroSlide {...defaultProps} />);
    expect(getByText('4.5')).toBeTruthy();
  });

  it('does not render rating when 0', () => {
    const { queryByText } = render(
      <HeroSlide {...defaultProps} movie={{ ...baseMock, rating: 0 }} />,
    );
    expect(queryByText('0')).toBeNull();
  });

  it('renders "In Theaters" badge for theatrical movies', () => {
    const { getByText } = render(<HeroSlide {...defaultProps} />);
    expect(getByText('In Theaters')).toBeTruthy();
  });

  it('renders certification badge', () => {
    const { getByText } = render(<HeroSlide {...defaultProps} />);
    expect(getByText('UA')).toBeTruthy();
  });

  it('does not render certification when null', () => {
    const { queryByText } = render(
      <HeroSlide {...defaultProps} movie={{ ...baseMock, certification: null }} />,
    );
    expect(queryByText('UA')).toBeNull();
  });

  it('renders runtime', () => {
    const { getByText } = render(<HeroSlide {...defaultProps} />);
    expect(getByText('180m')).toBeTruthy();
  });

  it('does not render runtime when null', () => {
    const { queryByText } = render(
      <HeroSlide {...defaultProps} movie={{ ...baseMock, runtime: null }} />,
    );
    expect(queryByText('180m')).toBeNull();
  });

  it('renders platform badges when platforms provided', () => {
    const { getByText } = render(<HeroSlide {...defaultProps} platforms={mockPlatforms} />);
    expect(getByText('Watch on:')).toBeTruthy();
  });

  it('does not render platform section when empty', () => {
    const { queryByText } = render(<HeroSlide {...defaultProps} />);
    expect(queryByText('Watch on:')).toBeNull();
  });

  it('renders "Get Tickets" for in_theaters movie', () => {
    const { getByLabelText } = render(<HeroSlide {...defaultProps} />);
    expect(getByLabelText('Get Tickets')).toBeTruthy();
  });

  it('calls onWatchNow when Get Tickets pressed', () => {
    const onWatchNow = jest.fn();
    const { getByLabelText } = render(<HeroSlide {...defaultProps} onWatchNow={onWatchNow} />);
    fireEvent.press(getByLabelText('Get Tickets'));
    expect(onWatchNow).toHaveBeenCalled();
  });

  it('calls onWatchNow when More Info pressed', () => {
    const onWatchNow = jest.fn();
    const { getByLabelText } = render(<HeroSlide {...defaultProps} onWatchNow={onWatchNow} />);
    fireEvent.press(getByLabelText('More Info'));
    expect(onWatchNow).toHaveBeenCalled();
  });

  it('renders Follow button for pre-OTT movie', () => {
    const { getByLabelText } = render(<HeroSlide {...defaultProps} />);
    expect(getByLabelText('Follow Pushpa 2')).toBeTruthy();
  });

  it('shows Following state when isFollowed is true', () => {
    const { getByLabelText } = render(<HeroSlide {...defaultProps} isFollowed />);
    expect(getByLabelText(/Following Pushpa 2/)).toBeTruthy();
  });

  it('calls onActionToggle with actionType when action button pressed', () => {
    const onActionToggle = jest.fn();
    const { getByLabelText } = render(
      <HeroSlide {...defaultProps} onActionToggle={onActionToggle} />,
    );
    fireEvent.press(getByLabelText('Follow Pushpa 2'));
    expect(onActionToggle).toHaveBeenCalledWith('follow');
  });

  it('renders Save button for streaming movie', () => {
    const streamingMovie: Movie = {
      ...baseMock,
      id: '2',
      title: 'Kalki',
      in_theaters: false,
      premiere_date: null,
    };
    const { getByLabelText } = render(
      <HeroSlide {...defaultProps} movie={streamingMovie} platforms={mockPlatforms} />,
    );
    expect(getByLabelText('Save Kalki')).toBeTruthy();
  });

  it('shows Saved state when isInWatchlist is true', () => {
    const streamingMovie: Movie = {
      ...baseMock,
      id: '2',
      title: 'Kalki',
      in_theaters: false,
      premiere_date: null,
    };
    const { getByLabelText } = render(
      <HeroSlide
        {...defaultProps}
        movie={streamingMovie}
        platforms={mockPlatforms}
        isInWatchlist
      />,
    );
    expect(getByLabelText(/Kalki saved/)).toBeTruthy();
  });

  it('uses spotlight_focus_x/y when available', () => {
    const movie: Movie = {
      ...baseMock,
      backdrop_url: 'https://example.com/backdrop.jpg',
      backdrop_focus_x: 0.1,
      backdrop_focus_y: 0.2,
      poster_focus_x: null,
      poster_focus_y: null,
      poster_image_type: 'poster',
      backdrop_image_type: 'backdrop',
      spotlight_focus_x: 0.8,
      spotlight_focus_y: 0.9,
    };
    const { UNSAFE_getAllByType } = render(<HeroSlide {...defaultProps} movie={movie} />);
    const { Image } = require('expo-image');
    const images = UNSAFE_getAllByType(Image);
    const img = images.find(
      (i: { props: { contentPosition?: unknown } }) => i.props.contentPosition,
    );
    expect(img?.props.contentPosition).toEqual({ left: '80%', top: '90%' });
  });

  it('falls back to backdrop_focus when spotlight is null', () => {
    const movie: Movie = {
      ...baseMock,
      backdrop_url: 'https://example.com/backdrop.jpg',
      backdrop_focus_x: 0.3,
      backdrop_focus_y: 0.7,
      poster_focus_x: null,
      poster_focus_y: null,
      poster_image_type: 'poster',
      backdrop_image_type: 'backdrop',
    };
    const { UNSAFE_getAllByType } = render(<HeroSlide {...defaultProps} movie={movie} />);
    const { Image } = require('expo-image');
    const images = UNSAFE_getAllByType(Image);
    const img = images.find(
      (i: { props: { contentPosition?: unknown } }) => i.props.contentPosition,
    );
    expect(img?.props.contentPosition).toEqual({ left: '30%', top: '70%' });
  });

  it('renders release year from release_date', () => {
    const { getByText } = render(<HeroSlide {...defaultProps} />);
    expect(getByText('2025')).toBeTruthy();
  });

  it('renders runtime without dot separator when releaseYear is null', () => {
    const movie: Movie = {
      ...baseMock,
      release_date: null,
      runtime: 120,
    };
    const { getByText, queryByText } = render(<HeroSlide {...defaultProps} movie={movie} />);
    expect(getByText('120m')).toBeTruthy();
    // No dot separator since releaseYear is null
    expect(queryByText('2025')).toBeNull();
  });

  it('renders certification with dot separator even when no releaseYear but runtime present', () => {
    const movie: Movie = {
      ...baseMock,
      release_date: null,
      runtime: 120,
      certification: 'A',
    };
    const { getByText } = render(<HeroSlide {...defaultProps} movie={movie} />);
    expect(getByText('120m')).toBeTruthy();
    expect(getByText('A')).toBeTruthy();
  });

  it('renders certification with dot separator when no runtime but releaseYear present', () => {
    const movie: Movie = {
      ...baseMock,
      runtime: null,
      certification: 'UA',
    };
    const { getByText } = render(<HeroSlide {...defaultProps} movie={movie} />);
    expect(getByText('UA')).toBeTruthy();
    expect(getByText('2025')).toBeTruthy();
  });

  it('does not render contentPosition when both focus values are null', () => {
    const movie: Movie = {
      ...baseMock,
      spotlight_focus_x: null,
      spotlight_focus_y: null,
      backdrop_focus_x: null,
      backdrop_focus_y: null,
    };
    const { UNSAFE_getAllByType } = render(<HeroSlide {...defaultProps} movie={movie} />);
    const { Image } = require('expo-image');
    const images = UNSAFE_getAllByType(Image);
    const heroImg = images.find(
      (i: { props: { contentPosition?: unknown } }) => i.props.contentPosition !== undefined,
    );
    expect(heroImg).toBeUndefined();
  });
});
