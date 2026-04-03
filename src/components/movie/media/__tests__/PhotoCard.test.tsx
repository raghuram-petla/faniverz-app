jest.mock('@/theme/colors', () => ({
  colors: new Proxy({}, { get: () => '#000' }),
}));

jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
}));

jest.mock('expo-image', () => ({
  Image: 'Image',
}));

jest.mock('expo-linear-gradient', () => ({
  LinearGradient: 'LinearGradient',
}));

const mockOpenImage = jest.fn();
jest.mock('@/providers/ImageViewerProvider', () => ({
  useImageViewer: () => ({ openImage: mockOpenImage, closeImage: jest.fn() }),
}));

const mockMeasureView = jest.fn();
jest.mock('@/utils/measureView', () => ({
  measureView: (...args: unknown[]) => mockMeasureView(...args),
}));

const mockGetImageUrl = jest.fn((url: string | null) => url);
jest.mock('@shared/imageUrl', () => ({
  get getImageUrl() {
    return mockGetImageUrl;
  },
}));

jest.mock('@/constants/placeholders', () => ({
  PLACEHOLDER_POSTER: 'https://placeholder.com/poster.png',
}));

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { PhotoCard } from '../PhotoCard';
import type { MoviePoster } from '@/types';

const makePoster = (overrides: Partial<MoviePoster> = {}): MoviePoster => ({
  id: 'p1',
  movie_id: 'm1',
  image_url: 'https://example.com/poster.jpg',
  title: 'First Look',
  description: null,
  poster_date: null,
  is_main_poster: false,
  is_main_backdrop: false,
  image_type: 'poster',
  tmdb_file_path: null,
  iso_639_1: null,
  width: null,
  height: null,
  vote_average: 0,
  display_order: 0,
  created_at: '',
  ...overrides,
});

const defaultStyles = {
  cardStyle: {},
  imageStyle: {},
  overlayStyle: {},
  titleStyle: {},
  badgeStyle: {},
  badgeTextStyle: {},
  badgeTextBlueStyle: {},
};

describe('PhotoCard', () => {
  const onSourceHide = jest.fn();
  const onSourceShow = jest.fn();

  beforeEach(() => jest.clearAllMocks());

  it('renders poster with title and accessibility label', () => {
    render(
      <PhotoCard
        poster={makePoster({ id: 'p1', title: 'My Poster' })}
        {...defaultStyles}
        isHidden={false}
        onSourceHide={onSourceHide}
        onSourceShow={onSourceShow}
      />,
    );
    expect(screen.getByLabelText('View My Poster')).toBeTruthy();
    expect(screen.getByText('My Poster')).toBeTruthy();
  });

  it('shows Main Poster badge when is_main_poster is true', () => {
    render(
      <PhotoCard
        poster={makePoster({ is_main_poster: true })}
        {...defaultStyles}
        isHidden={false}
        onSourceHide={onSourceHide}
        onSourceShow={onSourceShow}
      />,
    );
    expect(screen.getByText('Main Poster')).toBeTruthy();
  });

  it('shows Main Backdrop badge when is_main_backdrop is true', () => {
    render(
      <PhotoCard
        poster={makePoster({ is_main_backdrop: true, image_type: 'backdrop' })}
        {...defaultStyles}
        isHidden={false}
        onSourceHide={onSourceHide}
        onSourceShow={onSourceShow}
      />,
    );
    expect(screen.getByText('Main Backdrop')).toBeTruthy();
  });

  it('does not show badges when neither is main', () => {
    render(
      <PhotoCard
        poster={makePoster()}
        {...defaultStyles}
        isHidden={false}
        onSourceHide={onSourceHide}
        onSourceShow={onSourceShow}
      />,
    );
    expect(screen.queryByText('Main Poster')).toBeNull();
    expect(screen.queryByText('Main Backdrop')).toBeNull();
  });

  it('calls openImage via measureView on press', () => {
    mockMeasureView.mockImplementation(
      (
        _ref: unknown,
        onMeasured: (layout: { x: number; y: number; width: number; height: number }) => void,
      ) => {
        onMeasured({ x: 10, y: 20, width: 100, height: 150 });
      },
    );
    render(
      <PhotoCard
        poster={makePoster({ id: 'p-press', title: 'Press Me' })}
        {...defaultStyles}
        isHidden={false}
        onSourceHide={onSourceHide}
        onSourceShow={onSourceShow}
      />,
    );
    fireEvent.press(screen.getByLabelText('View Press Me'));
    expect(mockOpenImage).toHaveBeenCalledWith(
      expect.objectContaining({
        borderRadius: 0,
        isLandscape: false,
        sourceLayout: { x: 10, y: 20, width: 100, height: 150 },
      }),
    );
    mockMeasureView.mockReset();
  });

  it('passes isLandscape true for backdrop image type', () => {
    mockMeasureView.mockImplementation(
      (
        _ref: unknown,
        onMeasured: (layout: { x: number; y: number; width: number; height: number }) => void,
      ) => {
        onMeasured({ x: 0, y: 0, width: 300, height: 169 });
      },
    );
    render(
      <PhotoCard
        poster={makePoster({ id: 'bd', image_type: 'backdrop', title: 'BD' })}
        {...defaultStyles}
        isHidden={false}
        onSourceHide={onSourceHide}
        onSourceShow={onSourceShow}
      />,
    );
    fireEvent.press(screen.getByLabelText('View BD'));
    expect(mockOpenImage).toHaveBeenCalledWith(expect.objectContaining({ isLandscape: true }));
    mockMeasureView.mockReset();
  });

  it('calls onSourceHide and onSourceShow from openImage callbacks', () => {
    mockMeasureView.mockImplementation(
      (
        _ref: unknown,
        onMeasured: (layout: { x: number; y: number; width: number; height: number }) => void,
      ) => {
        onMeasured({ x: 0, y: 0, width: 100, height: 150 });
      },
    );
    render(
      <PhotoCard
        poster={makePoster({ id: 'hide-test', title: 'Hide' })}
        {...defaultStyles}
        isHidden={false}
        onSourceHide={onSourceHide}
        onSourceShow={onSourceShow}
      />,
    );
    fireEvent.press(screen.getByLabelText('View Hide'));
    const args = mockOpenImage.mock.calls[0][0];
    args.onSourceHide();
    expect(onSourceHide).toHaveBeenCalledWith('hide-test');
    args.onSourceShow();
    expect(onSourceShow).toHaveBeenCalled();
    mockMeasureView.mockReset();
  });

  it('uses BACKDROPS bucket for backdrop getImageUrl call', () => {
    render(
      <PhotoCard
        poster={makePoster({ image_type: 'backdrop' })}
        {...defaultStyles}
        isHidden={false}
        onSourceHide={onSourceHide}
        onSourceShow={onSourceShow}
      />,
    );
    expect(mockGetImageUrl).toHaveBeenCalledWith(expect.anything(), 'md', 'BACKDROPS');
  });

  it('uses POSTERS bucket for poster getImageUrl call', () => {
    render(
      <PhotoCard
        poster={makePoster({ image_type: 'poster' })}
        {...defaultStyles}
        isHidden={false}
        onSourceHide={onSourceHide}
        onSourceShow={onSourceShow}
      />,
    );
    expect(mockGetImageUrl).toHaveBeenCalledWith(expect.anything(), 'md', 'POSTERS');
  });

  it('uses PLACEHOLDER_POSTER when getImageUrl returns null', () => {
    mockGetImageUrl.mockReturnValue(null);
    render(
      <PhotoCard
        poster={makePoster({ title: 'No URL' })}
        {...defaultStyles}
        isHidden={false}
        onSourceHide={onSourceHide}
        onSourceShow={onSourceShow}
      />,
    );
    expect(screen.getByLabelText('View No URL')).toBeTruthy();
    mockGetImageUrl.mockImplementation((url: string | null) => url);
  });

  it('does not call openImage when ref is null (measureView not invoked)', () => {
    render(
      <PhotoCard
        poster={makePoster({ title: 'Null Ref' })}
        {...defaultStyles}
        isHidden={false}
        onSourceHide={onSourceHide}
        onSourceShow={onSourceShow}
      />,
    );
    fireEvent.press(screen.getByLabelText('View Null Ref'));
    expect(mockOpenImage).not.toHaveBeenCalled();
  });
});
