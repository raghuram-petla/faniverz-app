'use client';
import { useState } from 'react';
import { DEVICES, type DeviceConfig } from '@shared/constants';
import { DeviceFrame } from '@/components/preview/DeviceFrame';
import { DeviceSelector } from '@/components/preview/DeviceSelector';
import type { NewsFeedItem } from '@/lib/types';

const FEED_TABS = ['All', 'Trailers', 'Songs', 'Posters', 'BTS', 'Surprise'];

const TYPE_COLORS: Record<string, string> = {
  trailer: '#2563EB',
  teaser: '#3B82F6',
  glimpse: '#60A5FA',
  promo: '#60A5FA',
  song: '#9333EA',
  poster: '#22C55E',
  bts: '#F97316',
  interview: '#F97316',
  event: '#EA580C',
  making: '#EA580C',
  'short-film': '#DB2777',
  update: '#6B7280',
};

export interface FeedMobilePreviewProps {
  items: NewsFeedItem[];
  featuredItems: NewsFeedItem[];
}

export function FeedMobilePreview({ items, featuredItems }: FeedMobilePreviewProps) {
  const [device, setDevice] = useState<DeviceConfig>(DEVICES[0]);
  const displayItems = items.slice(0, 10);

  return (
    <div className="flex flex-col items-center gap-4">
      <DeviceSelector selected={device} onChange={setDevice} />
      <DeviceFrame device={device} maxWidth={300}>
        <div
          style={{ background: '#000', height: '100%', overflowY: 'auto', fontFamily: 'system-ui' }}
        >
          {/* Header */}
          <div
            style={{ padding: '60px 16px 12px', display: 'flex', alignItems: 'center', gap: 10 }}
          >
            <div style={previewStyles.iconBadge}>
              <span style={{ fontSize: 14 }}>📰</span>
            </div>
            <div>
              <div style={{ color: '#fff', fontSize: 18, fontWeight: 700 }}>News Feed</div>
              <div style={{ color: '#888', fontSize: 10 }}>Latest Updates & Content</div>
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
                <span style={{ fontSize: 9, fontWeight: 500, color: i === 0 ? '#fff' : '#888' }}>
                  {tab}
                </span>
              </div>
            ))}
          </div>

          {/* Featured */}
          {featuredItems.length > 0 ? (
            <div style={{ padding: '8px 16px' }}>
              <div style={{ color: '#fff', fontSize: 12, fontWeight: 600, marginBottom: 8 }}>
                Featured
              </div>
              <div style={{ display: 'flex', gap: 8, overflowX: 'auto' }}>
                {featuredItems.slice(0, 3).map((item) => (
                  <PreviewFeaturedCard key={item.id} item={item} />
                ))}
              </div>
            </div>
          ) : null}

          {/* Grid */}
          <div style={previewStyles.grid}>
            {displayItems.map((item) => (
              <PreviewFeedCard key={item.id} item={item} />
            ))}
          </div>
        </div>
      </DeviceFrame>
    </div>
  );
}

function PreviewFeaturedCard({ item }: { item: NewsFeedItem }) {
  const color = TYPE_COLORS[item.content_type] ?? '#DC2626';
  return (
    <div style={previewStyles.featuredCard}>
      <div style={previewStyles.featuredThumb}>
        {item.thumbnail_url ? (
          <img src={item.thumbnail_url} alt="" style={previewStyles.thumbImg} />
        ) : (
          <div style={{ ...previewStyles.thumbPlaceholder }} />
        )}
        <div style={{ ...previewStyles.typeBadge, background: color }}>
          <span style={previewStyles.typeBadgeText}>{item.content_type}</span>
        </div>
      </div>
      <div style={{ padding: '6px 8px' }}>
        <div style={previewStyles.cardTitle}>{item.title}</div>
      </div>
    </div>
  );
}

function PreviewFeedCard({ item }: { item: NewsFeedItem }) {
  const color = TYPE_COLORS[item.content_type] ?? '#DC2626';
  return (
    <div style={previewStyles.card}>
      <div style={previewStyles.cardThumb}>
        {item.thumbnail_url ? (
          <img src={item.thumbnail_url} alt="" style={previewStyles.thumbImg} />
        ) : (
          <div style={previewStyles.thumbPlaceholder} />
        )}
        <div style={{ ...previewStyles.typeBadge, background: color }}>
          <span style={previewStyles.typeBadgeText}>{item.content_type}</span>
        </div>
      </div>
      <div style={{ padding: '6px 8px' }}>
        <div style={previewStyles.cardTitle}>{item.title}</div>
        {item.movie?.title ? <div style={previewStyles.movieLabel}>{item.movie.title}</div> : null}
      </div>
    </div>
  );
}

const previewStyles: Record<string, React.CSSProperties> = {
  iconBadge: {
    width: 30,
    height: 30,
    borderRadius: 8,
    background: '#DC2626',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
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
    background: '#DC2626',
  },
  pillInactive: {
    background: '#27272A',
    border: '1px solid #3F3F46',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 10,
    padding: '8px 16px 60px',
  },
  card: {
    borderRadius: 8,
    overflow: 'hidden',
    background: '#18181B',
  },
  cardThumb: {
    width: '100%',
    aspectRatio: '16/9',
    position: 'relative',
    overflow: 'hidden',
  },
  thumbImg: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  thumbPlaceholder: {
    width: '100%',
    height: '100%',
    background: '#1e1b4b',
  },
  featuredCard: {
    width: 200,
    borderRadius: 10,
    overflow: 'hidden',
    background: '#18181B',
    flexShrink: 0,
  },
  featuredThumb: {
    width: '100%',
    aspectRatio: '16/9',
    position: 'relative',
    overflow: 'hidden',
  },
  typeBadge: {
    position: 'absolute',
    top: 4,
    left: 4,
    padding: '1px 5px',
    borderRadius: 4,
  },
  typeBadgeText: {
    fontSize: 7,
    fontWeight: 700,
    color: '#fff',
    textTransform: 'uppercase',
  },
  cardTitle: {
    fontSize: 9,
    fontWeight: 600,
    color: '#fff',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  movieLabel: {
    fontSize: 8,
    color: '#888',
    marginTop: 2,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
};
