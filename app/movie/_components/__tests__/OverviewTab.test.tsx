import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { OverviewTab } from '../OverviewTab';

jest.mock('../../_styles/[id].styles', () => ({
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
  rating: 4.5,
  review_count: 120,
  runtime: 148,
  certification: 'UA',
  release_date: '2024-12-05',
  synopsis: 'The continuation of Pushpa Raj story.',
  director: 'Sukumar',
  genres: ['Action', 'Drama'],
  trailer_url: 'https://youtube.com/watch?v=123',
  videos: [{ id: 'v1', video_type: 'trailer', title: 'Official Trailer', youtube_id: 'abc123' }],
  posters: [],
  cast: [],
  crew: [],
  productionHouses: [],
  platforms: [],
  in_theaters: true,
} as any;

const baseProps = { movie: mockMovie, hasMedia: true, onSwitchToMedia: jest.fn() };

describe('OverviewTab', () => {
  it('renders synopsis text', () => {
    render(<OverviewTab {...baseProps} />);
    expect(screen.getByText(/continuation of Pushpa Raj/)).toBeTruthy();
  });

  it('renders genre pills', () => {
    render(<OverviewTab {...baseProps} />);
    expect(screen.getByText('Action')).toBeTruthy();
    expect(screen.getByText('Drama')).toBeTruthy();
  });

  it('renders director in info card', () => {
    render(<OverviewTab {...baseProps} />);
    expect(screen.getByText('Sukumar')).toBeTruthy();
  });

  it('renders certification in info card', () => {
    render(<OverviewTab {...baseProps} />);
    expect(screen.getByText('UA')).toBeTruthy();
  });

  it('renders video preview when hasMedia and videos exist', () => {
    render(<OverviewTab {...baseProps} />);
    expect(screen.getByText('Official Trailer')).toBeTruthy();
  });

  it('renders "Watch Trailer" button when trailer_url but no media', () => {
    render(<OverviewTab {...baseProps} hasMedia={false} movie={{ ...mockMovie, videos: [] }} />);
    expect(screen.getByText(/Watch Trailer/)).toBeTruthy();
  });

  it('calls onSwitchToMedia when video preview is tapped', () => {
    const onSwitchToMedia = jest.fn();
    render(<OverviewTab {...baseProps} onSwitchToMedia={onSwitchToMedia} />);
    const trailer = screen.getByText('Official Trailer');
    fireEvent.press(trailer);
    expect(onSwitchToMedia).toHaveBeenCalled();
  });
});
