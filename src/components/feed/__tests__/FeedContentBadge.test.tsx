import React from 'react';
import { render } from '@testing-library/react-native';
import { FeedContentBadge } from '../FeedContentBadge';

describe('FeedContentBadge', () => {
  it('renders badge with label text', () => {
    const { getByText } = render(<FeedContentBadge contentType="trailer" />);
    expect(getByText('Trailer')).toBeTruthy();
  });

  it('renders different content types with correct labels', () => {
    const typeToLabel: Record<string, string> = {
      trailer: 'Trailer',
      teaser: 'Teaser',
      glimpse: 'Glimpse',
      promo: 'Promo',
      song: 'Song',
      poster: 'Poster',
      bts: 'BTS',
      interview: 'Interview',
      event: 'Event',
      making: 'Making',
      'short-film': 'Short Film',
      update: 'Update',
      new_movie: 'New Movie',
      theatrical_release: 'In Theaters',
      ott_release: 'Now Streaming',
      rating_milestone: 'Milestone',
    };

    for (const [type, label] of Object.entries(typeToLabel)) {
      const { getByText, unmount } = render(<FeedContentBadge contentType={type} />);
      expect(getByText(label)).toBeTruthy();
      unmount();
    }
  });

  it('renders unknown content type as raw string', () => {
    const { getByText } = render(<FeedContentBadge contentType="custom_type" />);
    expect(getByText('custom_type')).toBeTruthy();
  });

  it('renders small size variant', () => {
    const { getByText } = render(<FeedContentBadge contentType="song" size="small" />);
    expect(getByText('Song')).toBeTruthy();
  });

  it('renders normal size by default', () => {
    const { getByText } = render(<FeedContentBadge contentType="poster" />);
    expect(getByText('Poster')).toBeTruthy();
  });

  it('applies correct background color for trailer', () => {
    const { toJSON } = render(<FeedContentBadge contentType="trailer" />);
    const json = JSON.stringify(toJSON());
    // trailer should use blue600
    expect(json.toLowerCase()).toContain('#2563eb');
  });

  it('applies correct background color for song', () => {
    const { toJSON } = render(<FeedContentBadge contentType="song" />);
    const json = JSON.stringify(toJSON());
    // song should use purple600
    expect(json.toLowerCase()).toContain('#9333ea');
  });

  it('applies correct background color for poster', () => {
    const { toJSON } = render(<FeedContentBadge contentType="poster" />);
    const json = JSON.stringify(toJSON());
    // poster should use green500
    expect(json.toLowerCase()).toContain('#22c55e');
  });

  it('uses default red color for unknown content type', () => {
    const { toJSON } = render(<FeedContentBadge contentType="something_unknown" />);
    const json = JSON.stringify(toJSON());
    // default should use red600
    expect(json.toLowerCase()).toContain('#dc2626');
  });
});
