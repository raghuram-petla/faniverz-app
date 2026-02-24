export const ONBOARDING_SLIDES = [
  {
    icon: 'film-outline' as const,
    title: 'Your Telugu Cinema Hub',
    description:
      'Discover every Telugu movie release\u2014theaters and streaming platforms, all in one place',
    gradientColors: ['#DC2626', '#EA580C', '#F59E0B'] as const,
  },
  {
    icon: 'calendar-outline' as const,
    title: 'Never Miss a Release',
    description: 'Get notified before your favorite movies hit theaters or start streaming on OTT',
    gradientColors: ['#7C3AED', '#EC4899', '#EF4444'] as const,
  },
  {
    icon: 'star-outline' as const,
    title: 'Reviews from Real Fans',
    description: 'Read honest reviews from fellow Telugu movie lovers before you watch',
    gradientColors: ['#2563EB', '#06B6D4', '#14B8A6'] as const,
  },
  {
    icon: 'heart-outline' as const,
    title: 'Your Personal Watchlist',
    description: "Save movies to your watchlist and get reminders when they're available to watch",
    gradientColors: ['#DB2777', '#F43F5E', '#DC2626'] as const,
  },
] as const;

export type OnboardingSlide = (typeof ONBOARDING_SLIDES)[number];
