import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { MediaTab } from '../MediaTab';

jest.mock('@/styles/movieDetail.styles', () => ({
  createStyles: () => new Proxy({}, { get: () => ({}) }),
}));

jest.mock('@/theme/colors', () => ({
  colors: new Proxy({}, { get: () => '#000' }),
}));

jest.mock('react-native-webview', () => {
  const { View } = require('react-native');
  return { WebView: (props: any) => <View testID="webview" {...props} /> };
});

const mockVideoGroups = [
  {
    label: 'Trailer',
    videos: [
      {
        id: 'v1',
        video_type: 'trailer',
        title: 'Official Trailer',
        youtube_id: 'abc123',
        duration: '2:30',
      },
      {
        id: 'v2',
        video_type: 'trailer',
        title: 'Teaser Trailer',
        youtube_id: 'def456',
        duration: null,
      },
    ],
  },
  {
    label: 'Song',
    videos: [
      { id: 'v3', video_type: 'song', title: 'Title Song', youtube_id: 'ghi789', duration: '4:15' },
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
  it('renders filter pills with All + category labels + Posters', () => {
    render(<MediaTab {...baseProps} />);
    expect(screen.getByText('All')).toBeTruthy();
    expect(screen.getByText('Trailer')).toBeTruthy();
    expect(screen.getByText('Song')).toBeTruthy();
    expect(screen.getByLabelText('Filter by Posters')).toBeTruthy();
  });

  it('shows all video groups with section headers by default (All)', () => {
    render(<MediaTab {...baseProps} />);
    expect(screen.getByText('Trailers')).toBeTruthy();
    expect(screen.getByText('Songs')).toBeTruthy();
    expect(screen.getByText('Official Trailer')).toBeTruthy();
    expect(screen.getByText('Title Song')).toBeTruthy();
  });

  it('filters to single category when pill is tapped', () => {
    render(<MediaTab {...baseProps} />);
    fireEvent.press(screen.getByLabelText('Filter by Song'));
    expect(screen.getByText('Title Song')).toBeTruthy();
    expect(screen.queryByText('Official Trailer')).toBeNull();
  });

  it('hides section header when single category is selected', () => {
    render(<MediaTab {...baseProps} />);
    fireEvent.press(screen.getByLabelText('Filter by Trailer'));
    expect(screen.queryByText('Trailers')).toBeNull();
    expect(screen.getByText('Official Trailer')).toBeTruthy();
  });

  it('shows posters in All view', () => {
    render(<MediaTab {...baseProps} />);
    expect(screen.getByLabelText('View Official Poster')).toBeTruthy();
  });

  it('shows only posters when Posters pill is tapped', () => {
    render(<MediaTab {...baseProps} />);
    fireEvent.press(screen.getByLabelText('Filter by Posters'));
    expect(screen.getByLabelText('View Official Poster')).toBeTruthy();
    expect(screen.queryByText('Official Trailer')).toBeNull();
  });

  it('calls onSelectPoster when poster is tapped', () => {
    const onSelectPoster = jest.fn();
    render(<MediaTab {...baseProps} onSelectPoster={onSelectPoster} />);
    fireEvent.press(screen.getByLabelText('View Official Poster'));
    expect(onSelectPoster).toHaveBeenCalledWith(mockPosters[0]);
  });

  it('does not show Posters pill when no posters', () => {
    render(<MediaTab {...baseProps} posters={[]} />);
    expect(screen.queryByLabelText('Filter by Posters')).toBeNull();
  });

  it('plays video inline when tapped', () => {
    render(<MediaTab {...baseProps} />);
    fireEvent.press(screen.getByLabelText('Play Official Trailer'));
    expect(screen.getByTestId('webview')).toBeTruthy();
  });

  it('stops video when switching category', () => {
    render(<MediaTab {...baseProps} />);
    fireEvent.press(screen.getByLabelText('Play Official Trailer'));
    expect(screen.getByTestId('webview')).toBeTruthy();
    fireEvent.press(screen.getByLabelText('Filter by Song'));
    expect(screen.queryByTestId('webview')).toBeNull();
  });
});
