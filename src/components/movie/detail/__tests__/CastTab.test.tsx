import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { CastTab } from '../CastTab';

jest.mock('@/styles/movieDetail.styles', () => ({
  createStyles: () => new Proxy({}, { get: () => ({}) }),
}));

jest.mock('@/components/common/ActorAvatar', () => {
  const { View } = require('react-native');
  return { ActorAvatar: () => <View /> };
});

jest.mock('@/theme/colors', () => ({
  colors: new Proxy({}, { get: () => '#000' }),
}));

const mockCast = [
  { id: 'c1', role_name: 'Pushpa Raj', actor: { id: 'a1', name: 'Allu Arjun', photo_url: null } },
  {
    id: 'c2',
    role_name: 'Bhanwar Singh Shekhawat',
    actor: { id: 'a2', name: 'Fahadh Faasil', photo_url: null },
  },
];

const mockCrew = [
  { id: 'cr1', role_name: 'Director', actor: { id: 'a3', name: 'Sukumar', photo_url: null } },
];

const baseProps = { cast: mockCast as any, crew: mockCrew as any, onActorPress: jest.fn() };

describe('CastTab', () => {
  it('renders "Cast" section label when cast exists', () => {
    render(<CastTab {...baseProps} />);
    expect(screen.getByText('Cast')).toBeTruthy();
  });

  it('renders "Crew" section label when crew exists', () => {
    render(<CastTab {...baseProps} />);
    expect(screen.getByText('Crew')).toBeTruthy();
  });

  it('renders actor names', () => {
    render(<CastTab {...baseProps} />);
    expect(screen.getByText('Allu Arjun')).toBeTruthy();
    expect(screen.getByText('Fahadh Faasil')).toBeTruthy();
  });

  it('renders role names with "as" prefix for cast', () => {
    render(<CastTab {...baseProps} />);
    expect(screen.getByText(/as Pushpa Raj/)).toBeTruthy();
  });

  it('shows empty message when no cast or crew', () => {
    render(<CastTab cast={[]} crew={[]} onActorPress={jest.fn()} />);
    expect(screen.getByText('No cast information available.')).toBeTruthy();
  });

  it('calls onActorPress when cast item is pressed', () => {
    const onActorPress = jest.fn();
    render(<CastTab {...baseProps} onActorPress={onActorPress} />);
    fireEvent.press(screen.getByText('Allu Arjun'));
    expect(onActorPress).toHaveBeenCalledWith('a1');
  });

  it('calls onActorPress when crew item is pressed', () => {
    const onActorPress = jest.fn();
    render(<CastTab {...baseProps} onActorPress={onActorPress} />);
    fireEvent.press(screen.getByText('Sukumar'));
    expect(onActorPress).toHaveBeenCalledWith('a3');
  });

  it('does not call onActorPress when crew actor has no id', () => {
    const onActorPress = jest.fn();
    const crewNoId = [
      { id: 'cr2', role_name: 'Producer', actor: { id: null, name: 'Unknown', photo_url: null } },
    ];
    render(<CastTab cast={[]} crew={crewNoId as any} onActorPress={onActorPress} />);
    fireEvent.press(screen.getByText('Unknown'));
    expect(onActorPress).not.toHaveBeenCalled();
  });
});
