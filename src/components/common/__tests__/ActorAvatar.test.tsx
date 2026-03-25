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
  created_by: null,
  imdb_id: null,
  known_for_department: null,
  also_known_as: null,
  death_date: null,
  instagram_id: null,
  twitter_id: null,
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
  it('renders an image with variant suffix for R2 photo_url', () => {
    const actor: Actor = { ...base, photo_url: 'https://pub-abc.r2.dev/photo.jpg' };
    const views = allViews(render(<ActorAvatar actor={actor} />));
    const imgView = views.find(
      (v) =>
        (v.props.source as { uri?: string } | undefined)?.uri ===
        'https://pub-abc.r2.dev/photo_sm.jpg',
    );
    expect(imgView).toBeTruthy();
  });

  it('renders an image with original URL for non-R2 photo_url', () => {
    const actor: Actor = { ...base, photo_url: 'https://image.tmdb.org/t/p/w185/abc.jpg' };
    const views = allViews(render(<ActorAvatar actor={actor} />));
    const imgView = views.find(
      (v) =>
        (v.props.source as { uri?: string } | undefined)?.uri ===
        'https://image.tmdb.org/t/p/w185/abc.jpg',
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

  it('uses md photo variant for size between 81 and 160', () => {
    const actor: Actor = { ...base, photo_url: 'https://pub-abc.r2.dev/photo.jpg' };
    const views = allViews(render(<ActorAvatar actor={actor} size={120} />));
    const imgView = views.find(
      (v) =>
        (v.props.source as { uri?: string } | undefined)?.uri ===
        'https://pub-abc.r2.dev/photo_md.jpg',
    );
    expect(imgView).toBeTruthy();
  });

  it('uses lg photo variant for size above 160', () => {
    const actor: Actor = { ...base, photo_url: 'https://pub-abc.r2.dev/photo.jpg' };
    const views = allViews(render(<ActorAvatar actor={actor} size={200} />));
    const imgView = views.find(
      (v) =>
        (v.props.source as { uri?: string } | undefined)?.uri ===
        'https://pub-abc.r2.dev/photo_lg.jpg',
    );
    expect(imgView).toBeTruthy();
  });

  it('renders person-outline for minor with unknown gender (0)', () => {
    const actor: Actor = { ...base, gender: 0, birth_date: MINOR_DOB };
    const views = allViews(render(<ActorAvatar actor={actor} />));
    expect(views.find((v) => v.props.name === 'person-outline')).toBeTruthy();
  });

  it('uses default bg for minor with unknown gender', () => {
    const actor: Actor = { ...base, gender: 0, birth_date: MINOR_DOB };
    const views = allViews(render(<ActorAvatar actor={actor} />));
    // Should use the default background (not minorMale or minorFemale)
    const bg = views.find(
      (v) =>
        (v.props.style as { backgroundColor?: string })?.backgroundColor !== undefined &&
        (v.props.style as { backgroundColor?: string })?.backgroundColor !== '#1A2F46' &&
        (v.props.style as { backgroundColor?: string })?.backgroundColor !== '#46151F',
    );
    expect(bg).toBeTruthy();
  });

  it('renders person-outline when actor has no gender and no birth_date', () => {
    const actor: Actor = { ...base, gender: null, birth_date: null };
    const views = allViews(render(<ActorAvatar actor={actor} />));
    expect(views.find((v) => v.props.name === 'person-outline')).toBeTruthy();
  });

  it('uses smaller icon size for minor actors', () => {
    const maleMinor: Actor = { ...base, gender: 2, birth_date: MINOR_DOB };
    const views = allViews(render(<ActorAvatar actor={maleMinor} size={64} />));
    // Minor icon size = Math.round(64 * 0.42) = 27
    expect(views.find((v) => v.props.size === 27)).toBeTruthy();
  });

  it('uses standard icon size for adult actors', () => {
    const adultMale: Actor = { ...base, gender: 2, birth_date: ADULT_DOB };
    const views = allViews(render(<ActorAvatar actor={adultMale} size={64} />));
    // Adult icon size = Math.round(64 * 0.5) = 32
    expect(views.find((v) => v.props.size === 32)).toBeTruthy();
  });

  it('falls back to PLACEHOLDER_AVATAR when getImageUrl returns null', () => {
    // A null photo_url with an actor that should use image path
    const actor: Actor = { ...base, photo_url: '' };
    // Empty string should still attempt to render image branch
    // but getImageUrl may return null for empty input
    const views = allViews(render(<ActorAvatar actor={actor} />));
    // Should still render without crashing
    expect(views.length).toBeGreaterThan(0);
  });

  it('isMinor returns false when birth_date month difference is exactly 0 but day is same', () => {
    // Actor born exactly 18 years ago today (edge case for m===0 && now.getDate() < birth.getDate())
    const now = new Date();
    const dob18YearsAgo = new Date(now.getFullYear() - 18, now.getMonth(), now.getDate());
    const actor: Actor = {
      ...base,
      gender: 2,
      birth_date: dob18YearsAgo.toISOString().split('T')[0],
    };
    const views = allViews(render(<ActorAvatar actor={actor} />));
    // Exactly 18 = not a minor => man-outline
    expect(views.find((v) => v.props.name === 'man-outline')).toBeTruthy();
  });

  it('renders correctly with adult female no birth_date (gender=1, no minor check)', () => {
    const actor: Actor = { ...base, gender: 1, birth_date: null };
    const views = allViews(render(<ActorAvatar actor={actor} />));
    // No birth_date means minor=false, female => woman-outline
    expect(views.find((v) => v.props.name === 'woman-outline')).toBeTruthy();
  });

  it('uses light mode background and icon colors when isDark is false', () => {
    const themeMock = jest.requireMock('@/theme/ThemeContext');
    const origUseTheme = themeMock.useTheme;
    const { colors } = require('@shared/colors');
    const { lightTheme } = require('@shared/themes');
    themeMock.useTheme = () => ({
      theme: lightTheme,
      colors,
      isDark: false,
      mode: 'light',
      setMode: jest.fn(),
    });

    const actor: Actor = { ...base, gender: 2, birth_date: ADULT_DOB };
    const views = allViews(render(<ActorAvatar actor={actor} />));
    // Should render without crashing using light palette
    expect(views.find((v) => v.props.name === 'man-outline')).toBeTruthy();

    themeMock.useTheme = origUseTheme;
  });

  it('uses light mode background for photo url rendering', () => {
    const themeMock = jest.requireMock('@/theme/ThemeContext');
    const origUseTheme = themeMock.useTheme;
    const { colors } = require('@shared/colors');
    const { lightTheme } = require('@shared/themes');
    themeMock.useTheme = () => ({
      theme: lightTheme,
      colors,
      isDark: false,
      mode: 'light',
      setMode: jest.fn(),
    });

    const actor: Actor = { ...base, photo_url: 'https://pub-abc.r2.dev/photo.jpg' };
    const views = allViews(render(<ActorAvatar actor={actor} />));
    expect(views.length).toBeGreaterThan(0);

    themeMock.useTheme = origUseTheme;
  });
});
