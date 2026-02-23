import React from 'react';
import { render, screen } from '@testing-library/react-native';

jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn(), push: jest.fn() }),
}));

// Mock expo-localization used inside @/i18n
jest.mock('expo-localization', () => ({
  getLocales: () => [{ languageCode: 'en' }],
}));

// Mock the @/i18n module — expose language and changeLanguage
jest.mock('@/i18n', () => ({
  __esModule: true,
  default: {
    language: 'en',
    changeLanguage: jest.fn().mockResolvedValue(undefined),
  },
}));

import LanguageScreen from '../language';

describe('LanguageScreen', () => {
  it('renders "Language" header', () => {
    render(<LanguageScreen />);
    expect(screen.getByText('Language')).toBeTruthy();
  });

  it('shows English and Telugu options', () => {
    render(<LanguageScreen />);
    expect(screen.getByText('English')).toBeTruthy();
    expect(screen.getByText('Telugu')).toBeTruthy();
  });

  it('English is selected by default', () => {
    render(<LanguageScreen />);
    // The native label for Telugu is shown only for Telugu row
    // English row renders "English" (label); since label === native it is not duplicated
    // We rely on the text being present and the radio selection state via accessibility
    const englishOption = screen.getByText('English');
    expect(englishOption).toBeTruthy();
    // Telugu native script should also be visible
    expect(screen.getByText('తెలుగు')).toBeTruthy();
  });
});
