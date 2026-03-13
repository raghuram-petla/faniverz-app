'use client';
import { HERO_HEIGHT, MOVIE_STATUS_CONFIG, SPOTLIGHT_GRADIENT } from '@shared/constants';
import { colors } from '@shared/colors';
import type { MovieStatus } from '@shared/types';

interface SpotlightPreviewProps {
  title: string;
  backdropUrl: string;
  movieStatus: MovieStatus;
  rating: number;
  runtime: number | null;
  certification: string | null;
  releaseDate: string | null;
  focusX: number | null;
  focusY: number | null;
}

/** @coupling mirrors mobile SpotlightCard layout — must stay visually in sync with app/ */
export function SpotlightPreview({
  title,
  backdropUrl,
  movieStatus,
  rating,
  runtime,
  certification,
  releaseDate,
  focusX,
  focusY,
}: SpotlightPreviewProps) {
  /** @nullable releaseDate may be null for unreleased or TBD movies */
  const year = releaseDate ? new Date(releaseDate).getFullYear() : null;
  /** @sync MOVIE_STATUS_CONFIG must have entries for all MovieStatus values */
  const config = MOVIE_STATUS_CONFIG[movieStatus];
  /** @coupling SPOTLIGHT_GRADIENT from constants must match the gradient used in mobile app */
  const gradientCss = `linear-gradient(to bottom, ${SPOTLIGHT_GRADIENT.join(', ')})`;
  /** @nullable focusX/focusY null when admin hasn't set a focal point; defaults to center */
  const objectPosition =
    focusX != null && focusY != null
      ? `${Math.round(focusX * 100)}% ${Math.round(focusY * 100)}%`
      : 'center';

  return (
    <div
      style={{
        width: '100%',
        height: HERO_HEIGHT,
        position: 'relative',
        backgroundColor: colors.black,
      }}
    >
      {/* Backdrop */}
      {backdropUrl && (
        <img
          src={backdropUrl}
          alt=""
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            objectPosition,
          }}
          draggable={false}
        />
      )}

      {/* Gradient overlay */}
      <div style={{ position: 'absolute', inset: 0, background: gradientCss }} />

      {/* Content overlay */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          padding: '0 16px 56px',
          display: 'flex',
          flexDirection: 'column',
          gap: 4,
        }}
      >
        {/* Badges */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <span
            style={{
              backgroundColor: config.color,
              color: colors.white,
              fontSize: 12,
              fontWeight: 700,
              textTransform: 'uppercase',
              padding: '4px 12px',
              borderRadius: 20,
            }}
          >
            {config.label}
          </span>
          {rating > 0 && (
            <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: 14, fontWeight: 600 }}>
              ★ {rating}
            </span>
          )}
        </div>

        {/* Title */}
        <div
          style={{
            fontSize: 36,
            fontWeight: 800,
            color: colors.white,
            marginBottom: 4,
            lineHeight: 1.1,
            overflow: 'hidden',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
          }}
        >
          {title}
        </div>

        {/* Meta */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          {year && <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.7)' }}>{year}</span>}
          {runtime != null && (
            <>
              <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.7)' }}>•</span>
              <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.7)' }}>{runtime}m</span>
            </>
          )}
          {certification && (
            <>
              <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.7)' }}>•</span>
              <span
                style={{
                  fontSize: 12,
                  color: 'rgba(255,255,255,0.7)',
                  border: `1px solid ${colors.white30}`,
                  borderRadius: 4,
                  padding: '2px 8px',
                }}
              >
                {certification}
              </span>
            </>
          )}
        </div>

        {/* Buttons */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
          <div
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: colors.white,
              height: 48,
              borderRadius: 24,
              gap: 8,
            }}
          >
            {/** @edge CTA label changes based on movie status (theatrical vs streaming) */}
            <span style={{ fontSize: 16, fontWeight: 600, color: colors.black }}>
              {movieStatus === 'in_theaters' ? '🎫 Get Tickets' : '▶ Watch Now'}
            </span>
          </div>
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 24,
              border: `1px solid ${colors.white30}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: colors.white,
              fontSize: 18,
            }}
          >
            ℹ
          </div>
        </div>
      </div>

      {/* Pagination dots */}
      <div
        style={{
          position: 'absolute',
          bottom: 24,
          left: 0,
          right: 0,
          display: 'flex',
          justifyContent: 'center',
          gap: 8,
        }}
      >
        <div style={{ width: 32, height: 6, borderRadius: 3, backgroundColor: colors.white }} />
        <div style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: colors.white30 }} />
        <div style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: colors.white30 }} />
      </div>
    </div>
  );
}
