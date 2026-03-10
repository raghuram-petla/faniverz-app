jest.mock('@/styles/movieMedia.styles', () => ({
  createStyles: () => new Proxy({}, { get: () => ({}) }),
}));

jest.mock('@/theme/colors', () => ({
  colors: new Proxy({}, { get: () => '#000' }),
}));

const mockOpenImage = jest.fn();
jest.mock('@/providers/ImageViewerProvider', () => ({
  useImageViewer: () => ({ openImage: mockOpenImage, closeImage: jest.fn() }),
}));

import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { MediaPhotosTab } from '../MediaPhotosTab';
import type { MoviePoster } from '@/types';

const makePoster = (overrides: Partial<MoviePoster> = {}): MoviePoster => ({
  id: 'p1',
  movie_id: 'm1',
  image_url: 'https://example.com/poster.jpg',
  title: 'First Look',
  description: null,
  poster_date: null,
  is_main: false,
  display_order: 0,
  created_at: '',
  ...overrides,
});

const mockPosters = [
  makePoster({ id: 'p1', title: 'First Look', is_main: true }),
  makePoster({ id: 'p2', title: 'Character Poster', is_main: false }),
  makePoster({ id: 'p3', title: 'Festival Special', is_main: false }),
];

describe('MediaPhotosTab', () => {
  beforeEach(() => jest.clearAllMocks());

  it('renders all poster items', () => {
    render(<MediaPhotosTab posters={mockPosters} />);
    expect(screen.getByLabelText('View First Look')).toBeTruthy();
    expect(screen.getByLabelText('View Character Poster')).toBeTruthy();
    expect(screen.getByLabelText('View Festival Special')).toBeTruthy();
  });

  it('shows main badge on is_main poster', () => {
    render(<MediaPhotosTab posters={mockPosters} />);
    expect(screen.getByText('Main')).toBeTruthy();
  });

  it('does not show main badge on non-main posters', () => {
    render(<MediaPhotosTab posters={[makePoster({ id: 'p2', is_main: false })]} />);
    expect(screen.queryByText('Main')).toBeNull();
  });

  it('renders nothing when posters array is empty', () => {
    const { toJSON } = render(<MediaPhotosTab posters={[]} />);
    expect(toJSON()).toBeNull();
  });

  it('renders correct number of poster cards', () => {
    render(<MediaPhotosTab posters={mockPosters} />);
    const labels = ['View First Look', 'View Character Poster', 'View Festival Special'];
    labels.forEach((label) => {
      expect(screen.getByLabelText(label)).toBeTruthy();
    });
  });

  it('shows poster title overlay on each card', () => {
    render(<MediaPhotosTab posters={mockPosters} />);
    expect(screen.getByText('First Look')).toBeTruthy();
    expect(screen.getByText('Character Poster')).toBeTruthy();
    expect(screen.getByText('Festival Special')).toBeTruthy();
  });
});
