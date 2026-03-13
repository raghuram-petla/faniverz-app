'use client';
import { useState } from 'react';
import {
  DEVICES,
  FEED_CONTENT_TYPE_COLORS,
  FEED_CONTENT_TYPE_LABELS,
  type DeviceConfig,
} from '@shared/constants';
import { colors } from '@shared/colors';
import { DeviceFrame } from '@/components/preview/DeviceFrame';
import { DeviceSelector } from '@/components/preview/DeviceSelector';
import type { NewsFeedItem } from '@/lib/types';

const FEED_TABS = ['All', 'Trailers', 'Songs', 'Posters', 'BTS', 'Updates'];
const MUTED_TEXT = colors.gray500;
const ZINC_700 = colors.zinc700;

export interface FeedMobilePreviewProps {
  items: NewsFeedItem[];
}

export function FeedMobilePreview({ items }: FeedMobilePreviewProps) {
  const [device, setDevice] = useState<DeviceConfig>(DEVICES[0]);
  const displayItems = items.slice(0, 10);

  return (
    <div className="flex flex-col items-center gap-4">
      <DeviceSelector selected={device} onChange={setDevice} />
      <DeviceFrame device={device} maxWidth={300}>
        <div
          style={{
            background: colors.black,
            height: '100%',
            overflowY: 'auto',
            fontFamily: 'system-ui',
          }}
        >
          {/* Header */}
          <div
            style={{ padding: '60px 16px 12px', display: 'flex', alignItems: 'center', gap: 10 }}
          >
            <div style={previewStyles.iconBadge}>
              <span style={{ fontSize: 14 }}>F</span>
            </div>
            <div>
              <div style={{ color: colors.white, fontSize: 18, fontWeight: 700 }}>Faniverz</div>
              <div style={{ color: MUTED_TEXT, fontSize: 10 }}>Movie Updates</div>
            </div>
          </div>

          {/* Pills */}
          <div style={previewStyles.pillRow}>
            {FEED_TABS.map((tab, i) => (
              <div
                key={tab}
                style={{
                  ...previewStyles.pill,
                  ...(i === 0 ? previewStyles.pillActive : previewStyles.pillInactive),
                }}
              >
                <span
                  style={{
                    fontSize: 9,
                    fontWeight: 500,
                    color: i === 0 ? colors.white : MUTED_TEXT,
                  }}
                >
                  {tab}
                </span>
              </div>
            ))}
          </div>

          {/* Feed list (single column, X-style) */}
          <div style={{ padding: '0 0 60px' }}>
            {displayItems.map((item) => (
              <PreviewFeedCard key={item.id} item={item} />
            ))}
          </div>
        </div>
      </DeviceFrame>
    </div>
  );
}

function PreviewFeedCard({ item }: { item: NewsFeedItem }) {
  const color = FEED_CONTENT_TYPE_COLORS[item.content_type] ?? colors.red600;
  const label = FEED_CONTENT_TYPE_LABELS[item.content_type] ?? item.content_type;
  const movieName = item.movie?.title;

  return (
    <div style={previewStyles.post}>
      {/* Pinned / Featured label */}
      {item.is_pinned ? (
        <div style={previewStyles.statusLabel}>
          <span style={{ fontSize: 8, color: MUTED_TEXT }}>📌 Pinned</span>
        </div>
      ) : item.is_featured ? (
        <div style={previewStyles.statusLabel}>
          <span style={{ fontSize: 8, color: colors.yellow400 }}>⭐ Featured</span>
        </div>
      ) : null}

      {/* Header: badge + movie + time */}
      <div style={previewStyles.headerRow}>
        <div style={{ ...previewStyles.typeBadge, background: color }}>
          <span style={previewStyles.typeBadgeText}>{label}</span>
        </div>
        {movieName ? (
          <>
            <span style={previewStyles.movieName}>{movieName}</span>
            <span style={{ fontSize: 8, color: MUTED_TEXT }}>·</span>
          </>
        ) : null}
        <span style={{ fontSize: 8, color: MUTED_TEXT }}>2h</span>
      </div>

      {/* Title */}
      <div style={previewStyles.cardTitle}>{item.title}</div>

      {/* Thumbnail */}
      {item.thumbnail_url ? (
        <div
          style={
            !item.youtube_id ? previewStyles.posterMediaContainer : previewStyles.mediaContainer
          }
        >
          <img src={item.thumbnail_url} alt="" style={previewStyles.thumbImg} />
        </div>
      ) : null}

      {/* Action bar */}
      <div style={previewStyles.actionBar}>
        <span style={{ fontSize: 8, color: MUTED_TEXT }}>▲ {item.upvote_count ?? 0}</span>
        <span style={{ fontSize: 8, color: MUTED_TEXT }}>▼ {item.downvote_count ?? 0}</span>
        <span style={{ fontSize: 8, color: MUTED_TEXT }}>👁 {item.view_count ?? 0}</span>
        <span style={{ fontSize: 8, color: MUTED_TEXT }}>💬 {item.comment_count ?? 0}</span>
      </div>

      {/* Separator */}
      <div style={previewStyles.separator} />
    </div>
  );
}

const previewStyles: Record<string, React.CSSProperties> = {
  iconBadge: {
    width: 30,
    height: 30,
    borderRadius: 8,
    background: colors.red600,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: colors.white,
    fontWeight: 700,
    fontSize: 16,
  },
  pillRow: {
    display: 'flex',
    gap: 6,
    padding: '0 16px 10px',
    overflowX: 'auto',
  },
  pill: {
    padding: '4px 10px',
    borderRadius: 12,
    whiteSpace: 'nowrap',
  },
  pillActive: {
    background: colors.red600,
  },
  pillInactive: {
    background: colors.zinc900,
    border: `1px solid ${ZINC_700}`,
  },
  post: {
    padding: '0 16px',
  },
  statusLabel: {
    paddingTop: 6,
    paddingLeft: 2,
  },
  headerRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    paddingTop: 8,
  },
  typeBadge: {
    padding: '1px 5px',
    borderRadius: 4,
    flexShrink: 0,
  },
  typeBadgeText: {
    fontSize: 7,
    fontWeight: 700,
    color: colors.white,
    textTransform: 'uppercase',
  },
  movieName: {
    fontSize: 10,
    fontWeight: 700,
    color: colors.white,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  cardTitle: {
    fontSize: 10,
    fontWeight: 400,
    color: colors.white,
    marginTop: 3,
    lineHeight: '14px',
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
  },
  mediaContainer: {
    marginTop: 6,
    borderRadius: 8,
    overflow: 'hidden',
    aspectRatio: '16/9',
    background: colors.zinc900,
  },
  posterMediaContainer: {
    marginTop: 6,
    borderRadius: 8,
    overflow: 'hidden',
    aspectRatio: '40/51',
    background: colors.zinc900,
  },
  thumbImg: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  actionBar: {
    display: 'flex',
    gap: 12,
    paddingTop: 6,
    paddingBottom: 4,
  },
  separator: {
    height: 1,
    background: colors.zinc900,
    marginTop: 6,
  },
};
