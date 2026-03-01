'use client';
import { HERO_HEIGHT, RELEASE_TYPE_CONFIG, DETAIL_GRADIENT } from '@shared/constants';
import { colors } from '@shared/colors';
import type { ReleaseType } from '@shared/types';

interface MovieDetailPreviewProps {
  title: string;
  backdropUrl: string;
  posterUrl: string;
  releaseType: ReleaseType;
  rating: number;
  reviewCount: number;
  runtime: number | null;
  certification: string | null;
  releaseDate: string;
  focusX: number | null;
  focusY: number | null;
  onFocusClick?: (x: number, y: number) => void;
}

export function MovieDetailPreview({
  title,
  backdropUrl,
  posterUrl,
  releaseType,
  rating,
  reviewCount,
  runtime,
  certification,
  releaseDate,
  focusX,
  focusY,
  onFocusClick,
}: MovieDetailPreviewProps) {
  const year = new Date(releaseDate).getFullYear();
  const config = RELEASE_TYPE_CONFIG[releaseType];

  // Build CSS gradient matching mobile's 4-stop gradient with locations
  const { colors: gc, locations: gl } = DETAIL_GRADIENT;
  const gradientStops = gc.map((c, i) => `${c} ${gl[i] * 100}%`).join(', ');
  const gradientCss = `linear-gradient(to bottom, ${gradientStops})`;

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
    <div style={{ width: '100%', backgroundColor: colors.black, minHeight: '100%' }}>
      {/* Hero section */}
      <div
        style={{
          width: '100%',
          height: HERO_HEIGHT,
          position: 'relative',
          cursor: onFocusClick ? 'crosshair' : 'default',
        }}
        onClick={handleClick}
      >
        {/* Backdrop */}
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

        {/* Gradient */}
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
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: colors.black50,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: colors.white,
                fontSize: 18,
              }}
            >
              ‹
            </div>
            <div
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
              🏠
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <div
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
              🔗
            </div>
            <div
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
              🔖
            </div>
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
          {/* Poster */}
          {posterUrl && (
            <img
              src={posterUrl}
              alt=""
              style={{
                width: 100,
                aspectRatio: '2/3',
                borderRadius: 12,
                objectFit: 'cover',
                flexShrink: 0,
              }}
            />
          )}

          {/* Info */}
          <div
            style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', gap: 4 }}
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
              <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)' }}>{year}</span>
              {runtime && (
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
