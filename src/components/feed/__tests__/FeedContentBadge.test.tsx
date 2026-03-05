import React from 'react';
import { render } from '@testing-library/react-native';
import { FeedContentBadge } from '../FeedContentBadge';

describe('FeedContentBadge', () => {
  it('renders badge with label text', () => {
    const { getByText } = render(<FeedContentBadge contentType="trailer" />);
    expect(getByText('Trailer')).toBeTruthy();
  });

  it('renders different content types', () => {
    const types = [
      'trailer',
      'teaser',
      'song',
      'poster',
      'bts',
      'interview',
      'update',
      'short-film',
    ];
    for (const type of types) {
      const { unmount } = render(<FeedContentBadge contentType={type} />);
      unmount();
    }
  });

  it('renders small size variant', () => {
    const { getByText } = render(<FeedContentBadge contentType="song" size="small" />);
    expect(getByText('Song')).toBeTruthy();
  });

  it('renders normal size by default', () => {
    const { getByText } = render(<FeedContentBadge contentType="poster" />);
    expect(getByText('Poster')).toBeTruthy();
  });
});
