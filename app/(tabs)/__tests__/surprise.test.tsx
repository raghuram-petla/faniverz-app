jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 47, bottom: 34, left: 0, right: 0 }),
}));

jest.mock('@/features/surprise/hooks', () => ({
  useSurpriseContent: jest.fn(),
}));

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), back: jest.fn() }),
}));

import React from 'react';
import { render, screen } from '@testing-library/react-native';
import SurpriseScreen from '../surprise';
import { useSurpriseContent } from '@/features/surprise/hooks';

const mockUseSurpriseContent = useSurpriseContent as jest.Mock;

const mockContent = [
  {
    id: 'content-1',
    title: 'Pushpa Theme Song',
    description: 'The iconic theme from Pushpa',
    youtube_id: 'abc123',
    category: 'song' as const,
    duration: '4:32',
    views: 5_200_000,
    created_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 'content-2',
    title: 'RRR Behind The Scenes',
    description: null,
    youtube_id: 'def456',
    category: 'bts' as const,
    duration: '12:15',
    views: 980_000,
    created_at: '2024-01-02T00:00:00Z',
  },
  {
    id: 'content-3',
    title: 'Director Interview',
    description: 'SS Rajamouli speaks about his vision',
    youtube_id: 'ghi789',
    category: 'interview' as const,
    duration: '22:00',
    views: 320_000,
    created_at: '2024-01-03T00:00:00Z',
  },
];

describe('SurpriseScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseSurpriseContent.mockReturnValue({ data: [], isLoading: false });
  });

  it('renders "Surprise Content" header', () => {
    render(<SurpriseScreen />);

    expect(screen.getByText('Surprise Content')).toBeTruthy();
  });

  it('renders category pills', () => {
    render(<SurpriseScreen />);

    expect(screen.getByText('All')).toBeTruthy();
    expect(screen.getByText('Songs')).toBeTruthy();
    expect(screen.getByText('Short Films')).toBeTruthy();
    expect(screen.getByText('BTS')).toBeTruthy();
    expect(screen.getByText('Interviews')).toBeTruthy();
  });

  it('renders content cards when data exists', () => {
    mockUseSurpriseContent.mockReturnValue({ data: mockContent, isLoading: false });

    render(<SurpriseScreen />);

    // First item is the featured video; the rest go into the grid
    expect(screen.getByText('Pushpa Theme Song')).toBeTruthy();
    expect(screen.getByText('RRR Behind The Scenes')).toBeTruthy();
    expect(screen.getByText('Director Interview')).toBeTruthy();
  });

  it('shows fun fact box', () => {
    render(<SurpriseScreen />);

    expect(screen.getByText('Did you know?')).toBeTruthy();
  });
});
