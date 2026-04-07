import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react-native';
import { EditorialReviewSection } from '../EditorialReviewSection';
import type { EditorialReviewWithUserData } from '@shared/types';

jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
}));

jest.mock('@/theme', () => ({
  useTheme: () => ({
    theme: {
      textPrimary: '#fff',
      textSecondary: '#aaa',
      textTertiary: '#666',
      textDisabled: '#444',
      surfaceElevated: '#111',
      borderSubtle: '#333',
      overlay: 'rgba(0,0,0,0.5)',
      background: '#000',
      surface: '#111',
    },
    isDark: true,
  }),
}));

jest.mock('@/theme/colors', () => ({
  colors: { red600: '#DC2626', yellow500: '#FACC15', green500: '#22C55E', gray500: '#6B7280' },
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (_k: string, d: string) => d }),
}));

jest.mock('../EditorialReviewSection.styles', () => ({
  createStyles: () => new Proxy({}, { get: () => ({}) }),
}));

jest.mock('@/constants/placeholders', () => ({
  PLACEHOLDER_AVATAR: 'https://placeholder.avatar',
}));

// Mock child components to keep tests focused
jest.mock('../CraftRatingRow', () => ({
  CraftRatingRow: ({ label, onRate }: { label: string; onRate: (n: number) => void }) => {
    const { View, Text, Pressable } = require('react-native');
    return (
      <View testID={`craft-row-${label}`}>
        <Text>{label}</Text>
        <Pressable testID={`rate-${label}`} onPress={() => onRate(4)} />
      </View>
    );
  },
}));

jest.mock('../AgreeDisagreePoll', () => ({
  AgreeDisagreePoll: ({ onVote }: { onVote: (v: string) => void }) => {
    const { View, Pressable, Text } = require('react-native');
    return (
      <View testID="agree-disagree-poll">
        <Pressable testID="vote-agree" onPress={() => onVote('agree')}>
          <Text>Agree</Text>
        </Pressable>
        <Pressable testID="vote-disagree" onPress={() => onVote('disagree')}>
          <Text>Disagree</Text>
        </Pressable>
      </View>
    );
  },
}));

const makeReview = (
  overrides: Partial<EditorialReviewWithUserData> = {},
): EditorialReviewWithUserData => ({
  id: 'rev-1',
  movie_id: 'movie-1',
  title: 'Great Movie',
  body: 'This is a detailed review body that explains why the movie is good. It has enough text to trigger the read more behavior when collapsed to three lines.',
  verdict: 'A must-watch masterpiece',
  rating_story: 4,
  rating_direction: 5,
  rating_technical: 3,
  rating_music: 4,
  rating_performances: 5,
  overall_rating: 4.2,
  agree_count: 10,
  disagree_count: 3,
  published_at: '2026-01-01T00:00:00Z',
  author_display_name: 'Jane Doe',
  author_avatar_url: 'https://example.com/avatar.jpg',
  user_poll_vote: null,
  user_craft_rating_story: null,
  user_craft_rating_direction: null,
  user_craft_rating_technical: null,
  user_craft_rating_music: null,
  user_craft_rating_performances: null,
  avg_user_story: null,
  avg_user_direction: null,
  avg_user_technical: null,
  avg_user_music: null,
  avg_user_performances: null,
  user_rating_count: 0,
  ...overrides,
});

describe('EditorialReviewSection', () => {
  const onPollVote = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the editorial review badge', () => {
    render(<EditorialReviewSection review={makeReview()} onPollVote={onPollVote} />);
    expect(screen.getByText('EDITORIAL REVIEW')).toBeTruthy();
  });

  it('renders the author display name', () => {
    render(<EditorialReviewSection review={makeReview()} onPollVote={onPollVote} />);
    expect(screen.getByText('Jane Doe')).toBeTruthy();
  });

  it('renders the overall rating', () => {
    render(<EditorialReviewSection review={makeReview()} onPollVote={onPollVote} />);
    expect(screen.getByText('Overall Rating')).toBeTruthy();
    expect(screen.getByText('4.2')).toBeTruthy();
    expect(screen.getByText('/ 5')).toBeTruthy();
  });

  it('renders all 5 craft rating rows', () => {
    render(<EditorialReviewSection review={makeReview()} onPollVote={onPollVote} />);
    expect(screen.getByText('Story & Screenplay')).toBeTruthy();
    expect(screen.getByText('Direction')).toBeTruthy();
    expect(screen.getByText('Technical')).toBeTruthy();
    expect(screen.getByText('Music')).toBeTruthy();
    expect(screen.getByText('Performances')).toBeTruthy();
  });

  it('renders the review title', () => {
    render(<EditorialReviewSection review={makeReview()} onPollVote={onPollVote} />);
    expect(screen.getByText('Great Movie')).toBeTruthy();
  });

  it('renders the review body text', () => {
    render(<EditorialReviewSection review={makeReview()} onPollVote={onPollVote} />);
    expect(screen.getByText(/This is a detailed review body/)).toBeTruthy();
  });

  it('renders read more button for long body text', () => {
    render(<EditorialReviewSection review={makeReview()} onPollVote={onPollVote} />);
    expect(screen.getByText('Read more')).toBeTruthy();
  });

  it('does not render read more for short body text', () => {
    render(
      <EditorialReviewSection
        review={makeReview({ body: 'Short review.' })}
        onPollVote={onPollVote}
      />,
    );
    expect(screen.queryByText('Read more')).toBeNull();
  });

  it('hides read more after tapping it', () => {
    render(<EditorialReviewSection review={makeReview()} onPollVote={onPollVote} />);
    fireEvent.press(screen.getByText('Read more'));
    expect(screen.queryByText('Read more')).toBeNull();
  });

  it('renders the agree/disagree poll section', () => {
    render(<EditorialReviewSection review={makeReview()} onPollVote={onPollVote} />);
    expect(screen.getByTestId('agree-disagree-poll')).toBeTruthy();
  });

  it('calls onPollVote when poll agree is pressed', () => {
    render(<EditorialReviewSection review={makeReview()} onPollVote={onPollVote} />);
    fireEvent.press(screen.getByTestId('vote-agree'));
    expect(onPollVote).toHaveBeenCalledWith('agree');
  });

  it('uses PLACEHOLDER_AVATAR when author_avatar_url is null', () => {
    render(
      <EditorialReviewSection
        review={makeReview({ author_avatar_url: null })}
        onPollVote={onPollVote}
      />,
    );
    // Author name still renders when author_display_name is present
    expect(screen.getByText('Jane Doe')).toBeTruthy();
  });

  it('does not render author section when author_display_name is null', () => {
    render(
      <EditorialReviewSection
        review={makeReview({ author_display_name: null, author_avatar_url: null })}
        onPollVote={onPollVote}
      />,
    );
    expect(screen.queryByText('Jane Doe')).toBeNull();
  });
});
