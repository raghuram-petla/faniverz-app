'use client';
import { DETAIL_GRADIENT } from '@shared/constants';
import { colors } from '@shared/colors';
import type { MovieStatus } from '@shared/types';
import { MovieDetailHero, buildGradientCss } from './MovieDetailHero';

interface MovieDetailPreviewProps {
  title: string;
  backdropUrl: string;
  posterUrl: string;
  movieStatus: MovieStatus;
  rating: number;
  reviewCount: number;
  runtime: number | null;
  certification: string | null;
  releaseDate: string | null;
  focusX: number | null;
  focusY: number | null;
}

/** @coupling mirrors mobile MovieDetailScreen layout — backdrop + poster + metadata + tabs */
export function MovieDetailPreview({
  title,
  backdropUrl,
  posterUrl,
  movieStatus,
  rating,
  reviewCount,
  runtime,
  certification,
  releaseDate,
  focusX,
  focusY,
}: MovieDetailPreviewProps) {
  const gradientCss = buildGradientCss(DETAIL_GRADIENT);

  /** @nullable focusX/focusY are null when admin hasn't set a focal point; defaults to center */
  const objectPosition =
    focusX != null && focusY != null
      ? `${Math.round(focusX * 100)}% ${Math.round(focusY * 100)}%`
      : 'center';

  return (
    <div style={{ width: '100%', backgroundColor: colors.black, minHeight: '100%' }}>
      <MovieDetailHero
        title={title}
        backdropUrl={backdropUrl}
        posterUrl={posterUrl}
        movieStatus={movieStatus}
        rating={rating}
        reviewCount={reviewCount}
        runtime={runtime}
        certification={certification}
        releaseDate={releaseDate}
        gradientCss={gradientCss}
        objectPosition={objectPosition}
      />

      {/* Tabs bar */}
      <div
        style={{
          display: 'flex',
          padding: '12px 16px',
          gap: 0,
        }}
      >
        {['Overview', 'Cast', 'Reviews'].map((tab, i) => (
          <div
            key={tab}
            style={{
              flex: 1,
              textAlign: 'center',
              padding: '10px 0',
              fontSize: 14,
              fontWeight: 600,
              borderRadius: 8,
              backgroundColor: i === 0 ? colors.red600 : 'transparent',
              color: i === 0 ? colors.white : 'rgba(255,255,255,0.5)',
            }}
          >
            {tab}
          </div>
        ))}
      </div>
    </div>
  );
}
