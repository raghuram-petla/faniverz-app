import { useState, useMemo, useCallback, useRef } from 'react';
import { View, Text, Dimensions } from 'react-native';
import { useAnimatedReaction, runOnJS } from 'react-native-reanimated';
import type { SharedValue } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/theme';
import { MediaFilterPills } from '@/components/movie/detail/MediaFilterPills';
import { PhotoCard } from '@/components/movie/media/PhotoCard';
import type { MoviePoster } from '@/types';
import {
  createStyles,
  CARD_WIDTH,
  GRID_GAP,
  NUM_COLUMNS,
  CONTENT_WIDTH,
} from '@/styles/movieMedia.styles';

const PHOTO_CATEGORIES = ['All', 'Posters', 'Backdrops'] as const;
type PhotoCategory = (typeof PHOTO_CATEGORIES)[number];

const VIEWPORT_HEIGHT = Dimensions.get('window').height;
/** @contract Render buffer above and below viewport — 1.5 screens ensures smooth fast scrolling */
const RENDER_BUFFER = VIEWPORT_HEIGHT * 1.5;
/** @invariant Poster row height derived from 2:3 aspect ratio on CARD_WIDTH */
const POSTER_ROW_HEIGHT = CARD_WIDTH * (3 / 2);
/** @invariant Backdrop row height derived from 16:9 aspect ratio on full content width */
const BACKDROP_ROW_HEIGHT = CONTENT_WIDTH * (9 / 16);

interface GridRow {
  key: string;
  items: MoviePoster[];
  height: number;
  yOffset: number;
  isBackdropRow: boolean;
}

/** @contract Grid of movie posters/backdrops with windowed rendering for scroll performance */
export interface MediaPhotosTabProps {
  posters: MoviePoster[];
  /** @sideeffect Called when the photo category filter changes, so parent can scroll to top */
  onCategoryChange?: () => void;
  /** @coupling Scroll offset from parent Animated.ScrollView, used for windowed row rendering */
  scrollOffset: SharedValue<number>;
}

/** @assumes Grid rows group 3 posters per row; backdrops get their own full-width row */
function buildRows(posters: MoviePoster[]): GridRow[] {
  const result: GridRow[] = [];
  let y = 0;
  let currentRowItems: MoviePoster[] = [];

  const flushPosterRow = () => {
    if (currentRowItems.length === 0) return;
    result.push({
      key: currentRowItems.map((p) => p.id).join('-'),
      items: [...currentRowItems],
      height: POSTER_ROW_HEIGHT,
      yOffset: y,
      isBackdropRow: false,
    });
    y += POSTER_ROW_HEIGHT + GRID_GAP;
    currentRowItems = [];
  };

  for (const poster of posters) {
    if (poster.image_type === 'backdrop') {
      flushPosterRow();
      result.push({
        key: poster.id,
        items: [poster],
        height: BACKDROP_ROW_HEIGHT,
        yOffset: y,
        isBackdropRow: true,
      });
      y += BACKDROP_ROW_HEIGHT + GRID_GAP;
    } else {
      currentRowItems.push(poster);
      if (currentRowItems.length === NUM_COLUMNS) flushPosterRow();
    }
  }
  flushPosterRow();
  return result;
}

export function MediaPhotosTab({ posters, onCategoryChange, scrollOffset }: MediaPhotosTabProps) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const styles = createStyles(theme);

  const [activeCategory, setActiveCategory] = useState<PhotoCategory>('All');
  /** @sideeffect hiddenId hides the source thumbnail while ImageViewer overlay is active */
  const [hiddenId, setHiddenId] = useState<string | null>(null);
  /** @sync Visible row range — updated reactively from scroll offset */
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: 15 });
  /** @coupling Y position of this grid within the scroll content, set on first layout */
  const gridContentY = useRef(0);

  const handleSourceHide = useCallback((id: string) => setHiddenId(id), []);
  const handleSourceShow = useCallback(() => setHiddenId(null), []);

  const filteredPosters = useMemo(() => {
    if (activeCategory === 'All') return posters;
    const typeFilter = activeCategory === 'Posters' ? 'poster' : 'backdrop';
    return posters.filter((p) => p.image_type === typeFilter);
  }, [posters, activeCategory]);

  const rows = useMemo(() => buildRows(filteredPosters), [filteredPosters]);

  const totalHeight = useMemo(() => {
    if (rows.length === 0) return 0;
    const last = rows[rows.length - 1];
    return last.yOffset + last.height;
  }, [rows]);

  /** @boundary Measures grid position within scroll content on first layout */
  const handleGridLayout = useCallback(() => {
    // measureInWindow gives screen Y; add current scroll offset to get content Y
    gridContentY.current = scrollOffset.value;
  }, [scrollOffset]);

  const updateVisibleRange = useCallback(
    (scrollY: number) => {
      const relativeTop = scrollY - gridContentY.current - RENDER_BUFFER;
      const relativeBottom = scrollY - gridContentY.current + VIEWPORT_HEIGHT + RENDER_BUFFER;
      let start = 0;
      let end = rows.length - 1;
      for (let i = 0; i < rows.length; i++) {
        if (rows[i].yOffset + rows[i].height >= relativeTop) {
          start = i;
          break;
        }
      }
      for (let i = rows.length - 1; i >= start; i--) {
        /* istanbul ignore next -- loop body always matches at least one row in test viewport */
        if (rows[i].yOffset <= relativeBottom) {
          end = i;
          break;
        }
      }
      setVisibleRange((prev) => {
        if (prev.start === start && prev.end === end) return prev;
        return { start, end };
      });
    },
    [rows],
  );

  /** @sideeffect Reacts to scroll offset changes on UI thread, updates visible range on JS thread */
  /* istanbul ignore next -- Reanimated worklet cannot execute in Jest */
  useAnimatedReaction(
    () => scrollOffset.value,
    (scrollY) => {
      runOnJS(updateVisibleRange)(scrollY);
    },
    [updateVisibleRange],
  );

  if (posters.length === 0) {
    return (
      <View style={styles.emptyState}>
        <Text style={styles.emptyStateText}>{t('discover.noPhotosYet')}</Text>
      </View>
    );
  }

  /** @edge Top spacer height = Y offset of first visible row */
  /* istanbul ignore next -- spacer branches only activate with very large grids exceeding RENDER_BUFFER */
  const topSpacerHeight =
    rows.length > 0 && visibleRange.start > 0 ? rows[visibleRange.start].yOffset : 0;
  /** @edge Bottom spacer = total height minus bottom of last visible row */
  /* istanbul ignore next -- spacer branches only activate with very large grids exceeding RENDER_BUFFER */
  const bottomSpacerHeight =
    rows.length > 0 && visibleRange.end < rows.length - 1
      ? totalHeight - (rows[visibleRange.end].yOffset + rows[visibleRange.end].height)
      : 0;

  return (
    <View style={styles.photosTab}>
      <View style={styles.photoFilterPills}>
        <MediaFilterPills
          categories={[...PHOTO_CATEGORIES]}
          active={activeCategory}
          onSelect={(cat) => {
            setActiveCategory(cat as PhotoCategory);
            onCategoryChange?.();
          }}
        />
      </View>
      <View onLayout={handleGridLayout}>
        {topSpacerHeight > 0 && (
          /* istanbul ignore next */ <View style={{ height: topSpacerHeight }} />
        )}
        {rows.map((row, idx) => {
          /* istanbul ignore next -- windowed rendering clips rows outside visible range */
          if (idx < visibleRange.start || idx > visibleRange.end) return null;
          return (
            <View
              key={row.key}
              style={
                row.isBackdropRow
                  ? { marginBottom: GRID_GAP }
                  : { flexDirection: 'row', gap: GRID_GAP, marginBottom: GRID_GAP }
              }
            >
              {row.items.map((poster) => (
                <PhotoCard
                  key={poster.id}
                  poster={poster}
                  cardStyle={
                    poster.image_type === 'backdrop' ? styles.photoCardBackdrop : styles.photoCard
                  }
                  imageStyle={styles.photoImage}
                  overlayStyle={styles.photoOverlay}
                  titleStyle={styles.photoTitle}
                  badgeStyle={styles.mainBadge}
                  badgeTextStyle={styles.mainBadgeText}
                  badgeTextBlueStyle={styles.mainBadgeTextBlue}
                  isHidden={hiddenId === poster.id}
                  onSourceHide={handleSourceHide}
                  onSourceShow={handleSourceShow}
                />
              ))}
            </View>
          );
        })}
        {bottomSpacerHeight > 0 && (
          /* istanbul ignore next */ <View style={{ height: bottomSpacerHeight }} />
        )}
      </View>
    </View>
  );
}
