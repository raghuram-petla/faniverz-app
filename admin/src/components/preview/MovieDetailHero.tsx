'use client';
import { HERO_HEIGHT, MOVIE_STATUS_CONFIG, DETAIL_GRADIENT } from '@shared/constants';
import { colors } from '@shared/colors';
import type { MovieStatus } from '@shared/types';

interface MovieDetailHeroProps {
  title: string;
  backdropUrl: string;
  posterUrl: string;
  movieStatus: MovieStatus;
  rating: number;
  reviewCount: number;
  runtime: number | null;
  certification: string | null;
  releaseDate: string | null;
  gradientCss: string;
  objectPosition: string;
  posterObjectPosition?: string;
}

/** @coupling mirrors the mobile MovieDetailScreen hero section — backdrop, poster, metadata */
export function MovieDetailHero({
  title,
  backdropUrl,
  posterUrl,
  movieStatus,
  rating,
  reviewCount,
  runtime,
  certification,
  releaseDate,
  gradientCss,
  objectPosition,
  posterObjectPosition,
}: MovieDetailHeroProps) {
  /** @nullable releaseDate may be null for TBD movies */
  const year = releaseDate ? new Date(releaseDate).getFullYear() : null;
  /** @sync MOVIE_STATUS_CONFIG must have entries for all MovieStatus enum values */
  const config = MOVIE_STATUS_CONFIG[movieStatus];

  return (
    <div
      style={{
        width: '100%',
        height: HERO_HEIGHT,
        position: 'relative',
      }}
    >
      {/** @edge falls back to posterUrl when backdropUrl is missing */}
      {(backdropUrl || posterUrl) && (
        <img
          src={backdropUrl || posterUrl}
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

      {/* Floating header */}
      <div
        style={{
          position: 'absolute',
          top: 59,
          left: 16,
          right: 16,
          display: 'flex',
          justifyContent: 'space-between',
          zIndex: 2,
        }}
      >
        <div style={{ display: 'flex', gap: 8 }}>
          {(['‹', '🏠'] as const).map((icon, i) => (
            <div
              key={i}
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: colors.black50,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: colors.white,
                fontSize: i === 0 ? 18 : 14,
              }}
            >
              {icon}
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {(['🔗', '🔖'] as const).map((icon, i) => (
            <div
              key={i}
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: colors.black50,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: colors.white,
                fontSize: 14,
              }}
            >
              {icon}
            </div>
          ))}
        </div>
      </div>

      {/* Movie info overlay */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          padding: '0 16px 16px',
          display: 'flex',
          gap: 16,
        }}
      >
        {posterUrl && (
          <img
            src={posterUrl}
            alt=""
            style={{
              width: 100,
              aspectRatio: '2/3',
              borderRadius: 12,
              objectFit: 'cover',
              objectPosition: posterObjectPosition ?? 'center',
              flexShrink: 0,
            }}
          />
        )}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-end',
            gap: 4,
          }}
        >
          <span
            style={{
              backgroundColor: config.color,
              color: colors.white,
              fontSize: 10,
              fontWeight: 700,
              textTransform: 'uppercase',
              padding: '3px 10px',
              borderRadius: 12,
              alignSelf: 'flex-start',
            }}
          >
            {config.label}
          </span>
          <div
            style={{
              fontSize: 28,
              fontWeight: 800,
              color: colors.white,
              lineHeight: 1.1,
              overflow: 'hidden',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
            }}
          >
            {title}
          </div>
          {rating > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ color: colors.yellow400, fontSize: 16 }}>★</span>
              <span style={{ color: colors.white, fontSize: 16, fontWeight: 700 }}>{rating}</span>
              <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14 }}>
                ({reviewCount} reviews)
              </span>
            </div>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {year && <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)' }}>{year}</span>}
            {runtime != null && (
              <>
                <span style={{ color: 'rgba(255,255,255,0.6)' }}>|</span>
                <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)' }}>{runtime}m</span>
              </>
            )}
            {certification && (
              <>
                <span style={{ color: 'rgba(255,255,255,0.6)' }}>|</span>
                <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)' }}>
                  {certification}
                </span>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/** @boundary converts shared gradient config (colors[] + locations[]) to CSS linear-gradient string */
export function buildGradientCss(gradientConfig: typeof DETAIL_GRADIENT): string {
  const { colors: gc, locations: gl } = gradientConfig;
  const stops = gc.map((c, i) => `${c} ${gl[i] * 100}%`).join(', ');
  return `linear-gradient(to bottom, ${stops})`;
}
