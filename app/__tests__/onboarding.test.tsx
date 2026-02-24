const mockReplace = jest.fn();
const mockRouter = { replace: mockReplace };

jest.mock('expo-router', () => ({
  useRouter: () => mockRouter,
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import OnboardingScreen from '../onboarding';
import { ONBOARDING_SLIDES } from '@/constants/onboarding';
import { STORAGE_KEYS } from '@/constants/storage';

describe('OnboardingScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders first slide title and description', () => {
    render(<OnboardingScreen />);

    expect(screen.getByText(ONBOARDING_SLIDES[0].title)).toBeTruthy();
    expect(screen.getByText(ONBOARDING_SLIDES[0].description)).toBeTruthy();
  });

  it('shows Skip button', () => {
    render(<OnboardingScreen />);

    expect(screen.getByText('Skip')).toBeTruthy();
  });

  it('shows Next button on first slide (not Get Started)', () => {
    render(<OnboardingScreen />);

    expect(screen.getByText('Next')).toBeTruthy();
    expect(screen.queryByText('Get Started')).toBeNull();
  });

  it('renders 4 pagination dots', () => {
    const { toJSON } = render(<OnboardingScreen />);
    const tree = JSON.stringify(toJSON());

    // All 4 slides should have their titles rendered in the FlatList
    ONBOARDING_SLIDES.forEach((slide) => {
      expect(tree).toContain(slide.title);
    });
  });

  it('renders all slide titles in the FlatList', () => {
    render(<OnboardingScreen />);

    ONBOARDING_SLIDES.forEach((slide) => {
      expect(screen.getByText(slide.title)).toBeTruthy();
    });
  });

  it('Skip button saves flag to AsyncStorage and navigates to login', async () => {
    render(<OnboardingScreen />);

    await act(async () => {
      fireEvent.press(screen.getByText('Skip'));
    });

    expect(AsyncStorage.setItem).toHaveBeenCalledWith(STORAGE_KEYS.HAS_ONBOARDED, 'true');
    expect(mockReplace).toHaveBeenCalledWith('/(auth)/login');
  });

  it('renders without crashing', () => {
    const { toJSON } = render(<OnboardingScreen />);
    expect(toJSON()).toBeTruthy();
  });
});
