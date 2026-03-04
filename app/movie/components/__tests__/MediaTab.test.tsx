import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { MediaTab } from '../MediaTab';

jest.mock('../../[id].styles', () => ({
  styles: new Proxy({}, { get: () => ({}) }),
}));

jest.mock('@/theme/colors', () => ({
  colors: new Proxy({}, { get: () => '#000' }),
}));

const mockVideoGroups = [
  {
    label: 'Trailer',
    videos: [
      { id: 'v1', video_type: 'trailer', title: 'Official Trailer', youtube_id: 'abc123' },
      { id: 'v2', video_type: 'trailer', title: 'Teaser Trailer', youtube_id: 'def456' },
    ],
  },
];

const mockPosters = [
  {
    id: 'p1',
    image_url: 'https://example.com/poster1.jpg',
    title: 'Official Poster',
    description: 'First look',
    is_main: true,
  },
];

const baseProps = {
  videosByType: mockVideoGroups as any,
  posters: mockPosters as any,
  onSelectPoster: jest.fn(),
};

describe('MediaTab', () => {
  it('renders video group labels with s suffix', () => {
    render(<MediaTab {...baseProps} />);
    expect(screen.getByText('Trailers')).toBeTruthy();
  });

  it('renders video titles', () => {
    render(<MediaTab {...baseProps} />);
    expect(screen.getByText('Official Trailer')).toBeTruthy();
    expect(screen.getByText('Teaser Trailer')).toBeTruthy();
  });

  it('renders "Posters" section when posters exist', () => {
    render(<MediaTab {...baseProps} />);
    expect(screen.getByText('Posters')).toBeTruthy();
  });

  it('calls onSelectPoster when poster is tapped', () => {
    const onSelectPoster = jest.fn();
    render(<MediaTab {...baseProps} onSelectPoster={onSelectPoster} />);
    const posterElements = screen.getAllByLabelText(/poster/i);
    fireEvent.press(posterElements[0]);
    expect(onSelectPoster).toHaveBeenCalledWith(mockPosters[0]);
  });
});
