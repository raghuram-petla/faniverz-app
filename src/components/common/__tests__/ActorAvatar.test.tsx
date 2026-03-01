import React from 'react';
import { render } from '@testing-library/react-native';
import { ActorAvatar } from '../ActorAvatar';
import { Actor } from '@/types';

// In Jest: expo-image's Image and @expo/vector-icons' Ionicons are both mocked as
// React Native View. We inspect rendered View props to verify correct behaviour.

const base: Actor = {
  id: 'a1',
  tmdb_person_id: 1,
  name: 'Test Actor',
  photo_url: null,
  birth_date: null,
  person_type: 'actor',
  gender: null,
  biography: null,
  place_of_birth: null,
  height_cm: null,
  created_at: '',
};

const ADULT_DOB = '1990-01-01';
const MINOR_DOB = new Date(Date.now() - 10 * 365.25 * 24 * 60 * 60 * 1000)
  .toISOString()
  .split('T')[0]; // ~10 years old

function allViews(queries: ReturnType<typeof render>) {
  const { View } = require('react-native');
  return queries.UNSAFE_getAllByType(View) as { props: Record<string, unknown> }[];
}

describe('ActorAvatar', () => {
  it('renders an image when photo_url is set', () => {
    const actor: Actor = { ...base, photo_url: 'https://example.com/photo.jpg' };
    const views = allViews(render(<ActorAvatar actor={actor} />));
    // expo-image Image mocked as View; source.uri should be present
    const imgView = views.find(
      (v) =>
        (v.props.source as { uri?: string } | undefined)?.uri === 'https://example.com/photo.jpg',
    );
    expect(imgView).toBeTruthy();
  });

  it('renders man-outline for adult male without photo', () => {
    const actor: Actor = { ...base, gender: 2, birth_date: ADULT_DOB };
    const views = allViews(render(<ActorAvatar actor={actor} />));
    expect(views.find((v) => v.props.name === 'man-outline')).toBeTruthy();
  });

  it('renders woman-outline for adult female without photo', () => {
    const actor: Actor = { ...base, gender: 1, birth_date: ADULT_DOB };
    const views = allViews(render(<ActorAvatar actor={actor} />));
    expect(views.find((v) => v.props.name === 'woman-outline')).toBeTruthy();
  });

  it('renders person-outline for minor male without photo', () => {
    const actor: Actor = { ...base, gender: 2, birth_date: MINOR_DOB };
    const views = allViews(render(<ActorAvatar actor={actor} />));
    expect(views.find((v) => v.props.name === 'person-outline')).toBeTruthy();
  });

  it('renders person-outline for minor female without photo', () => {
    const actor: Actor = { ...base, gender: 1, birth_date: MINOR_DOB };
    const views = allViews(render(<ActorAvatar actor={actor} />));
    expect(views.find((v) => v.props.name === 'person-outline')).toBeTruthy();
  });

  it('uses dark-blue background for minor male', () => {
    const actor: Actor = { ...base, gender: 2, birth_date: MINOR_DOB };
    const views = allViews(render(<ActorAvatar actor={actor} />));
    expect(
      views.find(
        (v) => (v.props.style as { backgroundColor?: string })?.backgroundColor === '#1A2F46',
      ),
    ).toBeTruthy();
  });

  it('uses dark-rose background for minor female', () => {
    const actor: Actor = { ...base, gender: 1, birth_date: MINOR_DOB };
    const views = allViews(render(<ActorAvatar actor={actor} />));
    expect(
      views.find(
        (v) => (v.props.style as { backgroundColor?: string })?.backgroundColor === '#46151F',
      ),
    ).toBeTruthy();
  });

  it('uses dark-purple background for adult female', () => {
    const actor: Actor = { ...base, gender: 1, birth_date: ADULT_DOB };
    const views = allViews(render(<ActorAvatar actor={actor} />));
    expect(
      views.find(
        (v) => (v.props.style as { backgroundColor?: string })?.backgroundColor === '#2D1F3A',
      ),
    ).toBeTruthy();
  });

  it('renders person-outline when gender is unknown (0)', () => {
    const actor: Actor = { ...base, gender: 0, birth_date: ADULT_DOB };
    const views = allViews(render(<ActorAvatar actor={actor} />));
    expect(views.find((v) => v.props.name === 'person-outline')).toBeTruthy();
  });

  it('renders with default size 64', () => {
    const views = allViews(render(<ActorAvatar actor={base} />));
    expect(
      views.find(
        (v) =>
          (v.props.style as { width?: number })?.width === 64 &&
          (v.props.style as { height?: number })?.height === 64,
      ),
    ).toBeTruthy();
  });

  it('respects custom size prop', () => {
    const views = allViews(render(<ActorAvatar actor={base} size={48} />));
    expect(
      views.find(
        (v) =>
          (v.props.style as { width?: number })?.width === 48 &&
          (v.props.style as { height?: number })?.height === 48,
      ),
    ).toBeTruthy();
  });

  it('renders gracefully when actor is undefined', () => {
    expect(() => render(<ActorAvatar actor={undefined} />)).not.toThrow();
  });
});
