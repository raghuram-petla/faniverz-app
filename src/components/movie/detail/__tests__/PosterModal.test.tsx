import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { PosterModal } from '../PosterModal';

jest.mock('@/styles/movieDetail.styles', () => ({
  createStyles: () => new Proxy({}, { get: () => ({}) }),
}));

jest.mock('@/theme/colors', () => ({
  colors: new Proxy({}, { get: () => '#000' }),
}));

const mockPoster = {
  id: 'p1',
  image_url: 'https://example.com/poster1.jpg',
  title: 'Official Poster',
  description: 'First look poster',
  is_main: true,
};

describe('PosterModal', () => {
  it('renders poster title when poster provided', () => {
    render(<PosterModal poster={mockPoster as any} onClose={jest.fn()} />);
    expect(screen.getByText('Official Poster')).toBeTruthy();
  });

  it('renders poster description when available', () => {
    render(<PosterModal poster={mockPoster as any} onClose={jest.fn()} />);
    expect(screen.getByText('First look poster')).toBeTruthy();
  });

  it('calls onClose when close button pressed', () => {
    const onClose = jest.fn();
    render(<PosterModal poster={mockPoster as any} onClose={onClose} />);
    const closeBtn = screen.getByLabelText(/close/i);
    fireEvent.press(closeBtn);
    expect(onClose).toHaveBeenCalled();
  });
});
