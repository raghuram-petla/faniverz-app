const FONT_FAMILY = {
  en: {
    regular: 'Inter-Regular',
    bold: 'Inter-Bold',
  },
  te: {
    regular: 'NotoSansTelugu-Regular',
    bold: 'NotoSansTelugu-Bold',
  },
};

export const getFontFamily = (locale: string, weight: 'regular' | 'bold' = 'regular') => {
  const lang = locale.startsWith('te') ? 'te' : 'en';
  return FONT_FAMILY[lang][weight];
};

export const fontSize = {
  xs: 10,
  sm: 12,
  md: 14,
  lg: 16,
  xl: 18,
  '2xl': 20,
  '3xl': 24,
  '4xl': 28,
  '5xl': 32,
} as const;

export const fontWeight = {
  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
};
