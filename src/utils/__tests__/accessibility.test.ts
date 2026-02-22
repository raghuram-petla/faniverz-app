import {
  movieRatingLabel,
  movieCardLabel,
  watchlistButtonLabel,
  calendarDayLabel,
  reviewCountLabel,
} from '../accessibility';

describe('Accessibility helpers', () => {
  describe('movieRatingLabel', () => {
    it('returns correct label', () => {
      expect(movieRatingLabel(4)).toBe('Rating: 4 out of 5');
      expect(movieRatingLabel(3, 10)).toBe('Rating: 3 out of 10');
    });
  });

  describe('movieCardLabel', () => {
    it('returns label with genres', () => {
      expect(movieCardLabel('Test Movie', '2026-03-15', ['Action', 'Drama'])).toBe(
        'Test Movie, releasing 2026-03-15, genres: Action, Drama'
      );
    });

    it('returns label without genres', () => {
      expect(movieCardLabel('Test Movie', '2026-03-15', [])).toBe(
        'Test Movie, releasing 2026-03-15'
      );
    });
  });

  describe('watchlistButtonLabel', () => {
    it('returns add label', () => {
      expect(watchlistButtonLabel(false, 'Movie X')).toBe('Add Movie X to watchlist');
    });

    it('returns remove label', () => {
      expect(watchlistButtonLabel(true, 'Movie X')).toBe('Remove Movie X from watchlist');
    });
  });

  describe('calendarDayLabel', () => {
    it('returns no releases for 0', () => {
      expect(calendarDayLabel(15, 0)).toBe('Day 15, no releases');
    });

    it('returns singular for 1', () => {
      expect(calendarDayLabel(15, 1)).toBe('Day 15, 1 release');
    });

    it('returns plural for multiple', () => {
      expect(calendarDayLabel(15, 3)).toBe('Day 15, 3 releases');
    });
  });

  describe('reviewCountLabel', () => {
    it('returns no reviews for 0', () => {
      expect(reviewCountLabel(0)).toBe('No reviews');
    });

    it('returns singular', () => {
      expect(reviewCountLabel(1)).toBe('1 review');
    });

    it('returns plural', () => {
      expect(reviewCountLabel(10)).toBe('10 reviews');
    });
  });
});
