// Shared color palette — single source of truth for mobile + admin
// Plain hex/rgba values only — no framework-specific dependencies.

export const colors = {
  // Base
  black: '#000000',
  white: '#FFFFFF',
  zinc900: '#18181B',

  // Primary
  red600: '#DC2626',
  red500: '#EF4444',
  red400: '#F87171',

  // Accent
  purple600: '#9333EA',
  blue600: '#2563EB',
  blue500: '#3B82F6',
  blue400: '#60A5FA',
  yellow400: '#FACC15',
  green500: '#22C55E',
  green600: '#16A34A',
  orange500: '#F97316',
  orange600: '#EA580C',
  pink600: '#DB2777',
  gray500: '#6B7280',

  // White opacity variants
  white60: 'rgba(255, 255, 255, 0.6)',
  white50: 'rgba(255, 255, 255, 0.5)',
  white40: 'rgba(255, 255, 255, 0.4)',
  white30: 'rgba(255, 255, 255, 0.3)',
  white20: 'rgba(255, 255, 255, 0.2)',
  white10: 'rgba(255, 255, 255, 0.1)',
  white5: 'rgba(255, 255, 255, 0.05)',

  // Red opacity variants
  red600_20: 'rgba(220, 38, 38, 0.2)',
  red600_30: 'rgba(220, 38, 38, 0.3)',
  purple600_20: 'rgba(147, 51, 234, 0.2)',
  blue600_20: 'rgba(37, 99, 235, 0.2)',
  blue600_30: 'rgba(37, 99, 235, 0.3)',
  green600_20: 'rgba(22, 163, 74, 0.2)',
  orange600_20: 'rgba(234, 88, 12, 0.2)',
  black50: 'rgba(0, 0, 0, 0.5)',
  black80: 'rgba(0, 0, 0, 0.8)',
  black95: 'rgba(0, 0, 0, 0.95)',

  // Status colors
  status: {
    theatrical: '#DC2626', // red-600
    ott: '#9333EA', // purple-600
    upcoming: '#2563EB', // blue-600
    ended: '#6B7280', // gray-500
  },

  // OTT Platform colors
  platform: {
    aha: '#FF6B00',
    netflix: '#E50914',
    prime: '#00A8E1',
    hotstar: '#0F1014',
    zee5: '#8E3ED6',
    sunnxt: '#FF6600',
    sonyliv: '#0078FF',
    etvwin: '#FF0000',
  },
} as const;

export type Colors = typeof colors;
