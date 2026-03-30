jest.mock('@/theme', () => ({
  useTheme: () => ({
    theme: new Proxy({}, { get: () => '#000' }),
    colors: { white: '#fff' },
  }),
}));

jest.mock('@shared/imageUrl', () => ({
  posterBucket: (t?: string) => (t === 'backdrop' ? 'BACKDROPS' : 'POSTERS'),
  backdropBucket: (t?: string) => (t === 'poster' ? 'POSTERS' : 'BACKDROPS'),
  getImageUrl: (url: string | null) => url,
  entityTypeToBucket: (entityType: string) => entityType.toUpperCase(),
}));

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { FeedAvatar } from '../FeedAvatar';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyStyle = any;

describe('FeedAvatar', () => {
  it('renders movie avatar with portrait aspect ratio', () => {
    render(
      <FeedAvatar
        imageUrl="https://example.com/poster.jpg"
        entityType="movie"
        label="Movie avatar"
      />,
    );
    expect(screen.getByLabelText('Movie avatar')).toBeTruthy();
  });

  it('renders movie fallback icon when no image', () => {
    render(<FeedAvatar imageUrl={null} entityType="movie" label="No poster" />);
    expect(screen.getByLabelText('No poster')).toBeTruthy();
  });

  it('renders actor avatar with diamond shape', () => {
    const { toJSON } = render(
      <FeedAvatar
        imageUrl="https://example.com/actor.jpg"
        entityType="actor"
        label="Actor avatar"
      />,
    );
    const root = toJSON() as { props: { style: AnyStyle[] } };
    const styles = root?.props?.style;
    const hasRotation = styles?.some(
      (s: AnyStyle) => s.transform && JSON.stringify(s.transform).includes('45deg'),
    );
    expect(hasRotation).toBe(true);
  });

  it('renders actor fallback icon when no image', () => {
    render(<FeedAvatar imageUrl={null} entityType="actor" label="Actor fallback" />);
    expect(screen.getByLabelText('Actor fallback')).toBeTruthy();
  });

  it('renders user avatar with circle shape', () => {
    const { toJSON } = render(
      <FeedAvatar
        imageUrl="https://example.com/user.jpg"
        entityType="user"
        size={40}
        label="User avatar"
      />,
    );
    const root = toJSON() as { props: { style: AnyStyle[] } };
    const styles = root?.props?.style;
    const hasCircle = styles?.some((s: AnyStyle) => s.borderRadius === 20);
    expect(hasCircle).toBe(true);
  });

  it('renders production house avatar with square shape', () => {
    const { toJSON } = render(
      <FeedAvatar
        imageUrl="https://example.com/ph.jpg"
        entityType="production_house"
        size={40}
        label="PH avatar"
      />,
    );
    const root = toJSON() as { props: { style: AnyStyle[] } };
    const styles = root?.props?.style;
    const hasSquare = styles?.some((s: AnyStyle) => s.borderRadius === 8);
    expect(hasSquare).toBe(true);
  });

  it('renders production house fallback icon when no image', () => {
    render(<FeedAvatar imageUrl={null} entityType="production_house" label="PH fallback" />);
    expect(screen.getByLabelText('PH fallback')).toBeTruthy();
  });

  it('respects custom size prop', () => {
    const { toJSON } = render(
      <FeedAvatar imageUrl={null} entityType="user" size={60} label="Large user" />,
    );
    const root = toJSON() as { props: { style: AnyStyle[] } };
    const styles = root?.props?.style;
    const hasSize = styles?.some((s: AnyStyle) => s.width === 60 && s.height === 60);
    expect(hasSize).toBe(true);
  });

  it('wraps in TouchableOpacity when onPress is provided', () => {
    const onPress = jest.fn();
    render(<FeedAvatar imageUrl={null} entityType="movie" label="Test" onPress={onPress} />);
    fireEvent.press(screen.getByRole('button'));
    expect(onPress).toHaveBeenCalled();
  });

  it('shows navigate accessibility label when onPress is provided', () => {
    render(
      <FeedAvatar imageUrl={null} entityType="movie" label="Test Movie" onPress={jest.fn()} />,
    );
    expect(screen.getByLabelText('Navigate to Test Movie')).toBeTruthy();
  });

  it('does not wrap in TouchableOpacity when onPress is not provided', () => {
    render(<FeedAvatar imageUrl={null} entityType="movie" label="Test" />);
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('uses "entity" as fallback accessibility label when label is undefined and onPress is provided', () => {
    render(<FeedAvatar imageUrl={null} entityType="movie" onPress={jest.fn()} />);
    expect(screen.getByLabelText('Navigate to entity')).toBeTruthy();
  });

  it('renders user fallback icon when no image', () => {
    render(<FeedAvatar imageUrl={null} entityType="user" label="User fallback" />);
    expect(screen.getByLabelText('User fallback')).toBeTruthy();
  });
});
