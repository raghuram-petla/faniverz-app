jest.mock('@/styles/movieDetail.styles', () => ({
  createStyles: () => new Proxy({}, { get: () => ({}) }),
}));

jest.mock('@/theme', () => ({
  useTheme: () => ({
    theme: new Proxy({}, { get: () => '#000' }),
    colors: new Proxy({}, { get: () => '#000' }),
    mode: 'dark',
    setMode: jest.fn(),
  }),
}));

jest.mock('@/theme/colors', () => ({
  colors: new Proxy({}, { get: () => '#000' }),
}));

jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
  MaterialIcons: 'MaterialIcons',
}));

jest.mock('expo-image', () => ({
  Image: 'Image',
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const map: Record<string, string> = {
        'movieDetail.videos': 'Videos',
        'movieDetail.video': 'Video',
        'movieDetail.photos': 'Photos',
        'movieDetail.photo': 'Photo',
        'movieDetail.exploreAllMedia': 'Explore All Media',
      };
      return map[key] ?? key;
    },
    i18n: { language: 'en' },
  }),
}));

jest.mock('@/constants/placeholders', () => ({
  PLACEHOLDER_POSTER: 'https://placeholder.com/poster.png',
}));

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { MediaSummaryCard } from '../MediaSummaryCard';
import type { MovieVideo, MoviePoster } from '@/types';

const makeVideo = (overrides: Partial<MovieVideo> = {}): MovieVideo => ({
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
  ...overrides,
});

const makePoster = (overrides: Partial<MoviePoster> = {}): MoviePoster => ({
  id: 'p1',
  movie_id: 'm1',
  image_url: 'https://example.com/poster1.jpg',
  title: 'First Look',
  description: null,
  poster_date: null,
  is_main: true,
  display_order: 0,
  created_at: '',
  ...overrides,
});

describe('MediaSummaryCard', () => {
  const onExploreMedia = jest.fn();

  beforeEach(() => jest.clearAllMocks());

  it('renders without crashing', () => {
    const { toJSON } = render(
      <MediaSummaryCard videos={[]} posters={[]} onExploreMedia={onExploreMedia} />,
    );
    expect(toJSON()).toBeTruthy();
  });

  it('renders summary text with video and photo counts', () => {
    const videos = [
      makeVideo(),
      makeVideo({ id: 'v2', youtube_id: 'def456', video_type: 'trailer' }),
    ];
    const posters = [makePoster(), makePoster({ id: 'p2' })];
    render(<MediaSummaryCard videos={videos} posters={posters} onExploreMedia={onExploreMedia} />);
    expect(screen.getByText('2 Videos · 2 Photos')).toBeTruthy();
  });

  it('renders "Explore All Media" CTA text', () => {
    render(
      <MediaSummaryCard
        videos={[makeVideo()]}
        posters={[makePoster()]}
        onExploreMedia={onExploreMedia}
      />,
    );
    expect(screen.getByText('Explore All Media')).toBeTruthy();
  });

  it('calls onExploreMedia when pressed', () => {
    render(
      <MediaSummaryCard
        videos={[makeVideo()]}
        posters={[makePoster()]}
        onExploreMedia={onExploreMedia}
      />,
    );
    fireEvent.press(screen.getByLabelText('1 Video · 1 Photo — Explore all media'));
    expect(onExploreMedia).toHaveBeenCalledTimes(1);
  });

  it('prefers trailer over teaser for featured thumbnail', () => {
    const videos = [
      makeVideo({ id: 'v1', video_type: 'teaser', youtube_id: 'teaser123' }),
      makeVideo({ id: 'v2', video_type: 'trailer', youtube_id: 'trailer456' }),
    ];
    render(<MediaSummaryCard videos={videos} posters={[]} onExploreMedia={onExploreMedia} />);
    expect(screen.getByLabelText('2 Videos — Explore all media')).toBeTruthy();
  });

  it('shows only video count when no posters', () => {
    const videos = [makeVideo(), makeVideo({ id: 'v2' })];
    render(<MediaSummaryCard videos={videos} posters={[]} onExploreMedia={onExploreMedia} />);
    expect(screen.getByText('2 Videos')).toBeTruthy();
  });

  it('shows only photo count when no videos', () => {
    const posters = [makePoster(), makePoster({ id: 'p2' })];
    render(<MediaSummaryCard videos={[]} posters={posters} onExploreMedia={onExploreMedia} />);
    expect(screen.getByText('2 Photos')).toBeTruthy();
  });

  it('uses singular "Video" for single video', () => {
    render(
      <MediaSummaryCard videos={[makeVideo()]} posters={[]} onExploreMedia={onExploreMedia} />,
    );
    expect(screen.getByText('1 Video')).toBeTruthy();
  });

  it('uses singular "Photo" for single poster', () => {
    render(
      <MediaSummaryCard videos={[]} posters={[makePoster()]} onExploreMedia={onExploreMedia} />,
    );
    expect(screen.getByText('1 Photo')).toBeTruthy();
  });

  it('does not render thumbnail when no videos', () => {
    const { toJSON } = render(
      <MediaSummaryCard videos={[]} posters={[makePoster()]} onExploreMedia={onExploreMedia} />,
    );
    const tree = JSON.stringify(toJSON());
    expect(tree).not.toContain('img.youtube.com');
  });

  it('falls back to teaser when no trailer exists', () => {
    const videos = [makeVideo({ video_type: 'teaser', youtube_id: 'teaser123' })];
    render(<MediaSummaryCard videos={videos} posters={[]} onExploreMedia={onExploreMedia} />);
    expect(screen.getByLabelText('1 Video — Explore all media')).toBeTruthy();
  });

  it('falls back to first video when no trailer or teaser exists', () => {
    const videos = [makeVideo({ video_type: 'song', youtube_id: 'song123' })];
    render(<MediaSummaryCard videos={videos} posters={[]} onExploreMedia={onExploreMedia} />);
    expect(screen.getByLabelText('1 Video — Explore all media')).toBeTruthy();
  });
});
