import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/theme';
import { colors as palette } from '@/theme/colors';
import { getMovieStatusLabel, getMovieStatusColor } from '@/constants';
import { deriveMovieStatus } from '@shared/movieStatus';
import { PlatformBadge } from '@/components/ui/PlatformBadge';
import { getImageUrl } from '@shared/imageUrl';
import { PLACEHOLDER_POSTER } from '@/constants/placeholders';
import { getMovieActionType } from '@/hooks/useMovieAction';
import { createStyles } from './HeroCarousel.styles';
import type { Movie, OTTPlatform } from '@/types';

export interface HeroSlideProps {
  movie: Movie;
  platforms: OTTPlatform[];
  isFollowed: boolean;
  isInWatchlist: boolean;
  onWatchNow: () => void;
  onActionToggle: (actionType: 'follow' | 'watchlist') => void;
}

export function HeroSlide({
  movie,
  platforms,
  isFollowed,
  isInWatchlist,
  onWatchNow,
  onActionToggle,
}: HeroSlideProps) {
  const { theme, colors } = useTheme();
  const styles = createStyles(theme);

  const releaseYear = movie.release_date ? new Date(movie.release_date).getFullYear() : null;
  const status = deriveMovieStatus(movie, platforms.length);
  const actionType = getMovieActionType(status);
  const isActionActive = actionType === 'follow' ? isFollowed : isInWatchlist;

  return (
    <View style={styles.slide}>
      <Image
        source={{
          uri:
            getImageUrl(movie.backdrop_url, 'md') ??
            getImageUrl(movie.poster_url, 'md') ??
            PLACEHOLDER_POSTER,
        }}
        style={styles.backdrop}
        contentFit="cover"
        contentPosition={
          (movie.spotlight_focus_x ?? movie.backdrop_focus_x) != null &&
          (movie.spotlight_focus_y ?? movie.backdrop_focus_y) != null
            ? {
                left: `${Math.round(((movie.spotlight_focus_x ?? movie.backdrop_focus_x) as number) * 100)}%`,
                top: `${Math.round(((movie.spotlight_focus_y ?? movie.backdrop_focus_y) as number) * 100)}%`,
              }
            : undefined
        }
      />

      <LinearGradient
        colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.4)', 'rgba(0,0,0,1)']}
        style={StyleSheet.absoluteFill}
      />

      <View style={styles.content}>
        {/* Badges row */}
        <View style={styles.badgeRow}>
          {(status === 'in_theaters' || status === 'streaming') && (
            <View style={[styles.typeBadge, { backgroundColor: getMovieStatusColor(status) }]}>
              <Text style={styles.typeBadgeText}>{getMovieStatusLabel(status)}</Text>
            </View>
          )}
          {movie.rating > 0 && (
            <View style={styles.ratingBadge}>
              <Ionicons name="star" size={14} color={colors.yellow400} />
              <Text style={styles.ratingText}>{movie.rating}</Text>
            </View>
          )}
        </View>

        {/* Title */}
        <Text style={styles.title} numberOfLines={2}>
          {movie.title}
        </Text>

        {/* Meta info */}
        <View style={styles.metaRow}>
          <Text style={styles.metaText}>{releaseYear}</Text>
          <Text style={styles.metaDot}>•</Text>
          {movie.runtime ? (
            <>
              <Text style={styles.metaText}>{movie.runtime}m</Text>
              <Text style={styles.metaDot}>•</Text>
            </>
          ) : null}
          {movie.certification && (
            <View style={styles.certBadge}>
              <Text style={styles.certText}>{movie.certification}</Text>
            </View>
          )}
        </View>

        {/* OTT Platforms */}
        {platforms.length > 0 && (
          <View style={styles.platformRow}>
            <Text style={styles.platformLabel}>Watch on:</Text>
            {platforms.map((p) => (
              <PlatformBadge key={p.id} platform={p} size={28} />
            ))}
          </View>
        )}

        {/* Buttons */}
        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={styles.watchButton}
            onPress={onWatchNow}
            accessibilityRole="button"
            accessibilityLabel={status === 'in_theaters' ? 'Get Tickets' : 'Watch Now'}
          >
            <Ionicons
              name={status === 'in_theaters' ? 'ticket-outline' : 'play'}
              size={20}
              color={palette.black}
            />
            <Text style={styles.watchButtonText}>
              {status === 'in_theaters' ? 'Get Tickets' : 'Watch Now'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => onActionToggle(actionType)}
            accessibilityRole="button"
            accessibilityLabel={
              isActionActive
                ? actionType === 'follow'
                  ? `Following ${movie.title}, tap to unfollow`
                  : `${movie.title} saved, tap to remove`
                : actionType === 'follow'
                  ? `Follow ${movie.title}`
                  : `Save ${movie.title}`
            }
          >
            <Ionicons
              name={
                isActionActive
                  ? actionType === 'follow'
                    ? 'heart'
                    : 'bookmark'
                  : actionType === 'follow'
                    ? 'heart-outline'
                    : 'bookmark-outline'
              }
              size={16}
              color={isActionActive ? palette.green500 : palette.black}
            />
            <Text
              style={[
                styles.actionButtonText,
                { color: isActionActive ? palette.green500 : palette.black },
              ]}
            >
              {isActionActive
                ? actionType === 'follow'
                  ? 'Following'
                  : 'Saved'
                : actionType === 'follow'
                  ? 'Follow'
                  : 'Save'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.infoButton}
            onPress={onWatchNow}
            accessibilityRole="button"
            accessibilityLabel="More Info"
          >
            <Ionicons name="chevron-forward" size={22} color={palette.black} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}
