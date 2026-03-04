// Semantic theme tokens — dark & light palettes
// Used by both mobile (React Native) and admin (Next.js/Tailwind).

export type ThemeMode = 'light' | 'dark' | 'system';

export interface SemanticTheme {
  // Backgrounds
  background: string;
  surface: string;
  surfaceElevated: string;
  surfaceMuted: string;
  input: string;
  inputHover: string;
  inputActive: string;

  // Text
  textPrimary: string;
  textSecondary: string;
  textTertiary: string;
  textDisabled: string;

  // Borders
  border: string;
  borderSubtle: string;

  // Overlays (same both themes)
  overlay: string;
  overlayHeavy: string;

  // Status bar
  statusBarStyle: 'light' | 'dark';
}

export const darkTheme: SemanticTheme = {
  background: '#000000',
  surface: '#18181B',
  surfaceElevated: 'rgba(255, 255, 255, 0.05)',
  surfaceMuted: 'rgba(255, 255, 255, 0.03)',
  input: 'rgba(255, 255, 255, 0.1)',
  inputHover: 'rgba(255, 255, 255, 0.15)',
  inputActive: 'rgba(255, 255, 255, 0.2)',

  textPrimary: '#FFFFFF',
  textSecondary: 'rgba(255, 255, 255, 0.6)',
  textTertiary: 'rgba(255, 255, 255, 0.4)',
  textDisabled: 'rgba(255, 255, 255, 0.2)',

  border: 'rgba(255, 255, 255, 0.1)',
  borderSubtle: 'rgba(255, 255, 255, 0.06)',

  overlay: 'rgba(0, 0, 0, 0.5)',
  overlayHeavy: 'rgba(0, 0, 0, 0.8)',

  statusBarStyle: 'light',
};

export const lightTheme: SemanticTheme = {
  background: '#FFFFFF',
  surface: '#F4F4F5',
  surfaceElevated: 'rgba(0, 0, 0, 0.03)',
  surfaceMuted: 'rgba(0, 0, 0, 0.02)',
  input: 'rgba(0, 0, 0, 0.06)',
  inputHover: 'rgba(0, 0, 0, 0.08)',
  inputActive: 'rgba(0, 0, 0, 0.12)',

  textPrimary: '#18181B',
  textSecondary: 'rgba(0, 0, 0, 0.6)',
  textTertiary: 'rgba(0, 0, 0, 0.4)',
  textDisabled: 'rgba(0, 0, 0, 0.2)',

  border: 'rgba(0, 0, 0, 0.1)',
  borderSubtle: 'rgba(0, 0, 0, 0.06)',

  overlay: 'rgba(0, 0, 0, 0.5)',
  overlayHeavy: 'rgba(0, 0, 0, 0.8)',

  statusBarStyle: 'dark',
};
