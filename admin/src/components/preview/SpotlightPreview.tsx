'use client';
import { HERO_HEIGHT, RELEASE_TYPE_CONFIG, SPOTLIGHT_GRADIENT } from '@shared/constants';
import { colors } from '@shared/colors';
import type { ReleaseType } from '@shared/types';

interface SpotlightPreviewProps {
  title: string;
  backdropUrl: string;
  releaseType: ReleaseType;
  rating: number;
  runtime: number | null;
  certification: string | null;
  releaseDate: string;
  focusX: number | null;
  focusY: number | null;
  onFocusClick?: (x: number, y: number) => void;
}

export function SpotlightPreview({
  title,
  backdropUrl,
  releaseType,
  rating,
  runtime,
  certification,
  releaseDate,
  focusX,
  focusY,
  onFocusClick,
}: SpotlightPreviewProps) {
  const year = new Date(releaseDate).getFullYear();
  const config = RELEASE_TYPE_CONFIG[releaseType];
  const gradientCss = `linear-gradient(to bottom, ${SPOTLIGHT_GRADIENT.join(', ')})`;
  const objectPosition =
    focusX != null && focusY != null
      ? `${Math.round(focusX * 100)}% ${Math.round(focusY * 100)}%`
      : 'center';

  function handleClick(e: React.MouseEvent<HTMLDivElement>) {
    if (!onFocusClick) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
    onFocusClick(x, y);
  }

  return (
    <div
      style={{
        width: '100%',
        height: HERO_HEIGHT,
        position: 'relative',
        backgroundColor: colors.black,
        cursor: onFocusClick ? 'crosshair' : 'default',
      }}
      onClick={handleClick}
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

      {/* Focus indicator */}
      {focusX != null && focusY != null && (
        <div
          style={{
            position: 'absolute',
            left: `${focusX * 100}%`,
            top: `${focusY * 100}%`,
            width: 12,
            height: 12,
            marginLeft: -6,
            marginTop: -6,
            borderRadius: '50%',
            border: '2px solid white',
            boxShadow: '0 0 4px rgba(0,0,0,0.8)',
            pointerEvents: 'none',
            zIndex: 5,
          }}
        />
      )}

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
          <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.7)' }}>{year}</span>
          {runtime && (
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
            <span style={{ fontSize: 16, fontWeight: 600, color: colors.black }}>
              {releaseType === 'theatrical' ? '🎫 Get Tickets' : '▶ Watch Now'}
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
