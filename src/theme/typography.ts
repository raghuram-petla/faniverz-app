import { TextStyle } from 'react-native';

export const fontFamily = {
  regular: 'Inter-Regular',
  bold: 'Inter-Bold',
  teluguRegular: 'NotoSansTelugu-Regular',
  teluguBold: 'NotoSansTelugu-Bold',
} as const;

export const typography: Record<string, TextStyle> = {
  // Headings
  h1: {
    fontFamily: fontFamily.bold,
    fontSize: 32,
    lineHeight: 40,
    fontWeight: '700',
  },
  h2: {
    fontFamily: fontFamily.bold,
    fontSize: 24,
    lineHeight: 32,
    fontWeight: '700',
  },
  h3: {
    fontFamily: fontFamily.bold,
    fontSize: 20,
    lineHeight: 28,
    fontWeight: '700',
  },
  h4: {
    fontFamily: fontFamily.bold,
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '700',
  },

  // Body
  bodyLg: {
    fontFamily: fontFamily.regular,
    fontSize: 16,
    lineHeight: 24,
  },
  body: {
    fontFamily: fontFamily.regular,
    fontSize: 14,
    lineHeight: 20,
  },
  bodySm: {
    fontFamily: fontFamily.regular,
    fontSize: 12,
    lineHeight: 16,
  },

  // Labels
  label: {
    fontFamily: fontFamily.bold,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
  },
  labelSm: {
    fontFamily: fontFamily.bold,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
  },

  // Caption
  caption: {
    fontFamily: fontFamily.regular,
    fontSize: 10,
    lineHeight: 14,
  },
} as const;

export type Typography = typeof typography;
