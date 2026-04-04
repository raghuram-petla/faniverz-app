import {
  ENTITY_ACTION_LABEL_KEYS,
  ENTITY_FOLLOWING_LABEL_KEYS,
} from '../entityLabels';

describe('ENTITY_ACTION_LABEL_KEYS', () => {
  it('maps movie to profile.entityMovie', () => {
    expect(ENTITY_ACTION_LABEL_KEYS['movie']).toBe('profile.entityMovie');
  });

  it('maps actor to profile.entityActor', () => {
    expect(ENTITY_ACTION_LABEL_KEYS['actor']).toBe('profile.entityActor');
  });

  it('maps production_house to profile.entityStudio', () => {
    expect(ENTITY_ACTION_LABEL_KEYS['production_house']).toBe('profile.entityStudio');
  });

  it('maps feed_item to profile.entityPost', () => {
    expect(ENTITY_ACTION_LABEL_KEYS['feed_item']).toBe('profile.entityPost');
  });

  it('returns undefined for unknown entity types', () => {
    expect(ENTITY_ACTION_LABEL_KEYS['unknown']).toBeUndefined();
  });
});

describe('ENTITY_FOLLOWING_LABEL_KEYS', () => {
  it('maps movie to profile.followingMovies', () => {
    expect(ENTITY_FOLLOWING_LABEL_KEYS['movie']).toBe('profile.followingMovies');
  });

  it('maps actor to profile.followingActors', () => {
    expect(ENTITY_FOLLOWING_LABEL_KEYS['actor']).toBe('profile.followingActors');
  });

  it('maps production_house to profile.followingStudios', () => {
    expect(ENTITY_FOLLOWING_LABEL_KEYS['production_house']).toBe('profile.followingStudios');
  });

  it('maps user to profile.followingUsers', () => {
    expect(ENTITY_FOLLOWING_LABEL_KEYS['user']).toBe('profile.followingUsers');
  });

  it('returns undefined for unknown entity types', () => {
    expect(ENTITY_FOLLOWING_LABEL_KEYS['unknown']).toBeUndefined();
  });
});
