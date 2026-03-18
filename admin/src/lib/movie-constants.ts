// @contract Shared movie constants used by both edit forms and filter panels
// @coupling Must stay in sync with mobile app's recognized genres

export const GENRES = [
  'Action',
  'Drama',
  'Comedy',
  'Romance',
  'Thriller',
  'Horror',
  'Sci-Fi',
  'Fantasy',
  'Crime',
  'Family',
  'Adventure',
  'Historical',
] as const;

export const LANGUAGE_OPTIONS = [
  { value: '', label: 'Not set' },
  { value: 'te', label: 'Telugu' },
  { value: 'hi', label: 'Hindi' },
  { value: 'ta', label: 'Tamil' },
  { value: 'kn', label: 'Kannada' },
  { value: 'ml', label: 'Malayalam' },
  { value: 'en', label: 'English' },
];

export const CERTIFICATION_OPTIONS = [
  { value: '', label: 'None' },
  { value: 'U', label: 'U' },
  { value: 'UA', label: 'UA' },
  { value: 'A', label: 'A' },
];
