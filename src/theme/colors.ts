export const lightColors = {
  background: '#FFFFFF',
  surface: '#F5F5F5',
  surfaceElevated: '#FFFFFF',
  text: '#1A1A1A',
  textSecondary: '#666666',
  textTertiary: '#999999',
  primary: '#6200EE',
  primaryLight: '#BB86FC',
  secondary: '#03DAC6',
  accent: '#FF6D00',
  error: '#B00020',
  success: '#00C853',
  warning: '#FFD600',
  border: '#E0E0E0',
  divider: '#EEEEEE',
  // Calendar dot colors
  dotTheatrical: '#FFB300', // gold
  dotOttPremiere: '#2196F3', // blue
  dotOttOriginal: '#9C27B0', // purple
  // Tab bar
  tabBarBackground: '#FFFFFF',
  tabBarActive: '#6200EE',
  tabBarInactive: '#999999',
};

export const darkColors = {
  background: '#121212',
  surface: '#1E1E1E',
  surfaceElevated: '#2C2C2C',
  text: '#FFFFFF',
  textSecondary: '#B3B3B3',
  textTertiary: '#808080',
  primary: '#BB86FC',
  primaryLight: '#6200EE',
  secondary: '#03DAC6',
  accent: '#FF6D00',
  error: '#CF6679',
  success: '#00E676',
  warning: '#FFD600',
  border: '#333333',
  divider: '#2C2C2C',
  // Calendar dot colors
  dotTheatrical: '#FFD54F', // gold (lighter for dark bg)
  dotOttPremiere: '#64B5F6', // blue (lighter)
  dotOttOriginal: '#CE93D8', // purple (lighter)
  // Tab bar
  tabBarBackground: '#1E1E1E',
  tabBarActive: '#BB86FC',
  tabBarInactive: '#808080',
};

export type ColorPalette = typeof lightColors;
