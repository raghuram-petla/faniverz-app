'use client';
import { ACTOR_AVATAR_SIZE, GENDER_LABELS } from '@shared/constants';
import { colors } from '@shared/colors';
import { getImageUrl } from '@shared/imageUrl';

interface ActorDetailPreviewProps {
  name: string;
  photoUrl: string;
  personType: 'actor' | 'technician';
  gender: number | null;
  birthDate: string;
  placeOfBirth: string;
  heightCm: number | null;
  biography: string;
}

/** @coupling mirrors mobile ActorDetailScreen layout — must stay visually in sync with app/ */
export function ActorDetailPreview({
  name,
  photoUrl,
  personType,
  gender,
  birthDate,
  placeOfBirth,
  heightCm,
  biography,
}: ActorDetailPreviewProps) {
  /** @nullable gender 0 means "Not set" per TMDB convention; treated as falsy */
  const genderLabel = gender ? GENDER_LABELS[gender] : null;
  const typeLabel = personType === 'technician' ? 'Technician' : 'Actor';
  /** @edge hasBioInfo controls whether the bio info card renders at all */
  const hasBioInfo = birthDate || placeOfBirth || heightCm;

  /** @assumes birthDate is a valid ISO date string when non-empty */
  const formattedDate = birthDate
    ? new Date(birthDate).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : null;

  return (
    <div
      style={{
        width: '100%',
        minHeight: '100%',
        backgroundColor: colors.black,
        padding: '71px 16px 48px',
      }}
    >
      {/* Header with nav buttons + centered avatar */}
      <div style={{ position: 'relative', marginBottom: 16 }}>
        {/* Nav row (absolute left) */}
        <div style={{ position: 'absolute', left: 0, top: 0, display: 'flex', gap: 8, zIndex: 1 }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: colors.white10,
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
              backgroundColor: colors.white10,
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

        {/* Centered avatar */}
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 4 }}>
          <div
            /** @sync ACTOR_AVATAR_SIZE from @shared/constants must match mobile avatar dimensions */
            style={{
              width: ACTOR_AVATAR_SIZE,
              height: ACTOR_AVATAR_SIZE,
              borderRadius: ACTOR_AVATAR_SIZE / 2,
              backgroundColor: colors.white10,
              overflow: 'hidden',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {photoUrl ? (
              <img
                src={getImageUrl(photoUrl, 'original', 'ACTORS') ?? photoUrl}
                alt=""
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : (
              <span style={{ fontSize: 48, color: colors.white40 }}>👤</span>
            )}
          </div>
        </div>
      </div>

      {/* Name */}
      <div
        style={{
          fontSize: 24,
          fontWeight: 800,
          color: colors.white,
          textAlign: 'center',
          marginBottom: 8,
        }}
      >
        {/** @edge shows placeholder text when name is empty (during initial form state) */}
        {name || 'Actor Name'}
      </div>

      {/* Badges */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          gap: 8,
          marginBottom: 20,
        }}
      >
        <span
          style={{
            backgroundColor: colors.red600,
            color: colors.white,
            fontSize: 12,
            fontWeight: 700,
            textTransform: 'uppercase',
            padding: '4px 12px',
            borderRadius: 12,
          }}
        >
          {typeLabel}
        </span>
        {genderLabel && (
          <span
            style={{
              backgroundColor: colors.white10,
              color: colors.white60,
              fontSize: 12,
              fontWeight: 600,
              padding: '4px 12px',
              borderRadius: 12,
            }}
          >
            {genderLabel}
          </span>
        )}
      </div>

      {/* Bio info card */}
      {hasBioInfo && (
        <div
          style={{
            backgroundColor: colors.white5,
            borderRadius: 12,
            padding: 16,
            marginBottom: 24,
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
          }}
        >
          {formattedDate && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 14, color: colors.white40 }}>📅</span>
              <span style={{ fontSize: 14, color: colors.white40 }}>Born</span>
              <span style={{ fontSize: 14, fontWeight: 600, color: colors.white }}>
                {formattedDate}
              </span>
            </div>
          )}
          {placeOfBirth && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 14, color: colors.white40 }}>📍</span>
              <span style={{ fontSize: 14, color: colors.white40 }}>From</span>
              <span style={{ fontSize: 14, fontWeight: 600, color: colors.white }}>
                {placeOfBirth}
              </span>
            </div>
          )}
          {heightCm != null && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 14, color: colors.white40 }}>📏</span>
              <span style={{ fontSize: 14, color: colors.white40 }}>Height</span>
              <span style={{ fontSize: 14, fontWeight: 600, color: colors.white }}>
                {heightCm} cm
              </span>
            </div>
          )}
        </div>
      )}

      {/* Biography / About */}
      {biography && (
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: colors.white, marginBottom: 8 }}>
            About
          </div>
          <div
            style={{
              fontSize: 14,
              color: 'rgba(255,255,255,0.7)',
              lineHeight: '22px',
              overflow: 'hidden',
              display: '-webkit-box',
              WebkitLineClamp: 4,
              WebkitBoxOrient: 'vertical',
            }}
          >
            {biography}
          </div>
          <div style={{ fontSize: 14, fontWeight: 600, color: colors.red400, marginTop: 6 }}>
            Read more
          </div>
        </div>
      )}

      {/* Filmography placeholder */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <span style={{ fontSize: 18, fontWeight: 700, color: colors.white }}>Filmography</span>
        <span
          style={{
            backgroundColor: colors.red600,
            borderRadius: 999,
            padding: '2px 8px',
            fontSize: 12,
            fontWeight: 700,
            color: colors.white,
            minWidth: 24,
            textAlign: 'center',
          }}
        >
          —
        </span>
      </div>

      <div
        style={{
          padding: 24,
          textAlign: 'center',
          color: colors.white40,
          fontSize: 14,
        }}
      >
        Filmography will appear here
      </div>
    </div>
  );
}
