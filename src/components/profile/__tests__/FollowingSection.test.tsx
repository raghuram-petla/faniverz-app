import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { FollowingSection } from '../FollowingSection';
import type { EnrichedFollow } from '@shared/types';

jest.mock('@shared/imageUrl', () => ({
  posterBucket: (t?: string) => (t === 'backdrop' ? 'BACKDROPS' : 'POSTERS'),
  backdropBucket: (t?: string) => (t === 'poster' ? 'POSTERS' : 'BACKDROPS'),
  getImageUrl: (url: string | null) => url,
  entityTypeToBucket: (entityType: string) => entityType.toUpperCase(),
}));

const mockFollows: EnrichedFollow[] = [
  {
    entity_type: 'movie',
    entity_id: 'm1',
    name: 'Pushpa 2',
    image_url: 'poster1.jpg',
    created_at: '2026-01-01',
  },
  {
    entity_type: 'actor',
    entity_id: 'a1',
    name: 'Allu Arjun',
    image_url: 'photo1.jpg',
    created_at: '2026-01-02',
  },
  {
    entity_type: 'production_house',
    entity_id: 'ph1',
    name: 'Mythri',
    image_url: 'logo1.jpg',
    created_at: '2026-01-03',
  },
];

describe('FollowingSection', () => {
  const onEntityPress = jest.fn();
  const onViewAll = jest.fn();

  beforeEach(() => jest.clearAllMocks());

  it('renders nothing when follows is empty', () => {
    const { toJSON } = render(
      <FollowingSection follows={[]} onEntityPress={onEntityPress} onViewAll={onViewAll} />,
    );
    expect(toJSON()).toBeNull();
  });

  it('renders title and view all button', () => {
    render(
      <FollowingSection
        follows={mockFollows}
        onEntityPress={onEntityPress}
        onViewAll={onViewAll}
      />,
    );
    expect(screen.getByText('Following')).toBeTruthy();
    expect(screen.getByText('View All (3)')).toBeTruthy();
  });

  it('renders category chips', () => {
    render(
      <FollowingSection
        follows={mockFollows}
        onEntityPress={onEntityPress}
        onViewAll={onViewAll}
      />,
    );
    expect(screen.getByText('1 Movies')).toBeTruthy();
    expect(screen.getByText('1 Actors')).toBeTruthy();
    expect(screen.getByText('1 Studios')).toBeTruthy();
  });

  it('renders entity names', () => {
    render(
      <FollowingSection
        follows={mockFollows}
        onEntityPress={onEntityPress}
        onViewAll={onViewAll}
      />,
    );
    expect(screen.getByText('Pushpa 2')).toBeTruthy();
    expect(screen.getByText('Allu Arjun')).toBeTruthy();
    expect(screen.getByText('Mythri')).toBeTruthy();
  });

  it('calls onEntityPress when entity is tapped', () => {
    render(
      <FollowingSection
        follows={mockFollows}
        onEntityPress={onEntityPress}
        onViewAll={onViewAll}
      />,
    );
    fireEvent.press(screen.getByLabelText('Pushpa 2'));
    expect(onEntityPress).toHaveBeenCalledWith('movie', 'm1');
  });

  it('calls onViewAll when View All is tapped', () => {
    render(
      <FollowingSection
        follows={mockFollows}
        onEntityPress={onEntityPress}
        onViewAll={onViewAll}
      />,
    );
    fireEvent.press(screen.getByLabelText('View all following'));
    expect(onViewAll).toHaveBeenCalled();
  });

  it('shows "See more" when follows exceed MAX_PREVIEW', () => {
    const manyFollows = Array.from({ length: 8 }, (_, i) => ({
      entity_type: 'movie' as const,
      entity_id: `m${i}`,
      name: `Movie ${i}`,
      image_url: null,
      created_at: '2026-01-01',
    }));
    render(
      <FollowingSection
        follows={manyFollows}
        onEntityPress={onEntityPress}
        onViewAll={onViewAll}
      />,
    );
    expect(screen.getByText('See 5 more')).toBeTruthy();
  });
});
