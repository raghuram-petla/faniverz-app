import { View, Text, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '@/theme';
import type { MovieWithDetails } from '@/types/movie';
import { createStyles } from '@/styles/movieDetail.styles';
import { getImageUrl } from '@shared/imageUrl';
import { PLACEHOLDER_POSTER } from '@/constants/placeholders';
import { useTranslation } from 'react-i18next';
import { MediaSummaryCard } from './MediaSummaryCard';
import { formatCompactCurrency } from '@/utils/formatCurrency';

/** @contract Renders synopsis, genres, info grid, production houses, and media summary/trailer */
export interface OverviewTabProps {
  /** @assumes movie is fully hydrated with videos, posters, productionHouses relations */
  movie: MovieWithDetails;
  onExploreMedia: () => void;
}

/** @nullable tmdb_vote_average shown only when app rating is 0 and review_count is 0 */
const shouldShowTmdbRating = (movie: MovieWithDetails): boolean =>
  movie.rating === 0 && movie.review_count === 0 && (movie.tmdb_vote_average ?? 0) > 0;

export function OverviewTab({ movie, onExploreMedia }: OverviewTabProps) {
  const { t } = useTranslation();
  const { theme, colors } = useTheme();
  const styles = createStyles(theme);
  const router = useRouter();
  /** @invariant hasMedia determines whether MediaSummaryCard or legacy trailer button renders */
  const hasMedia = movie.videos.length > 0 || movie.posters.length > 0;

  return (
    <View style={styles.overviewTab}>
      {movie.tagline ? (
        <Text style={styles.tagline} numberOfLines={2}>
          {movie.tagline}
        </Text>
      ) : null}
      {movie.synopsis && (
        <Text style={styles.synopsis} numberOfLines={6}>
          {movie.synopsis}
        </Text>
      )}
      {shouldShowTmdbRating(movie) && (
        <View style={styles.tmdbRatingRow}>
          <Ionicons name="star" size={14} color={colors.yellow400} />
          <Text style={styles.tmdbRatingText}>TMDB {movie.tmdb_vote_average?.toFixed(1)}/10</Text>
        </View>
      )}
      {movie.collection_name ? (
        <View style={styles.collectionBadge}>
          <Ionicons name="layers-outline" size={14} color={theme.textSecondary} />
          <Text style={styles.collectionBadgeText}>{movie.collection_name}</Text>
        </View>
      ) : null}
      {(movie.genres ?? []).length > 0 && (
        <View style={styles.genreRow}>
          {(movie.genres ?? []).map((g) => (
            <View key={g} style={styles.genrePill}>
              <Text style={styles.genrePillText}>{g}</Text>
            </View>
          ))}
        </View>
      )}
      <View style={styles.infoGrid}>
        {movie.director && (
          <View style={styles.infoCard}>
            <Ionicons name="videocam" size={20} color={theme.textSecondary} />
            <Text style={styles.infoLabel}>{t('movie.director')}</Text>
            <Text style={styles.infoValue} numberOfLines={1}>
              {movie.director}
            </Text>
          </View>
        )}
        {movie.certification && (
          <View style={styles.infoCard}>
            <Ionicons name="shield-checkmark" size={20} color={theme.textSecondary} />
            <Text style={styles.infoLabel}>{t('movie.certification')}</Text>
            <Text style={styles.infoValue}>{movie.certification}</Text>
          </View>
        )}
      </View>
      {/** @nullable budget/revenue shown only when > 0 */}
      {(movie.budget != null && movie.budget > 0) ||
      (movie.revenue != null && movie.revenue > 0) ? (
        <View style={styles.infoGrid}>
          {movie.budget != null && movie.budget > 0 && (
            <View style={styles.infoCard}>
              <Ionicons name="wallet-outline" size={20} color={theme.textSecondary} />
              <Text style={styles.infoLabel}>{t('movie.budget')}</Text>
              <Text style={styles.infoValue}>{formatCompactCurrency(movie.budget)}</Text>
            </View>
          )}
          {movie.revenue != null && movie.revenue > 0 && (
            <View style={styles.infoCard}>
              <Ionicons name="cash-outline" size={20} color={theme.textSecondary} />
              <Text style={styles.infoLabel}>{t('movie.revenue')}</Text>
              <Text style={styles.infoValue}>{formatCompactCurrency(movie.revenue)}</Text>
            </View>
          )}
        </View>
      ) : null}

      {/** @sideeffect Production house chips navigate to /production-house/:id on press */}
      {movie.productionHouses.length > 0 && (
        <View style={styles.productionHousesRow}>
          <Text style={styles.productionHousesLabel}>{t('movie.production')}</Text>
          <View style={styles.productionHousesList}>
            {movie.productionHouses.map((ph) => (
              <TouchableOpacity
                key={ph.id}
                style={styles.productionHouseChip}
                onPress={() => router.push(`/production-house/${ph.id}`)}
                activeOpacity={0.7}
                accessibilityLabel={`Go to ${ph.name}`}
              >
                {ph.logo_url && (
                  <Image
                    source={{
                      uri:
                        getImageUrl(ph.logo_url, 'sm', 'PRODUCTION_HOUSES') ?? PLACEHOLDER_POSTER,
                    }}
                    style={styles.productionHouseLogo}
                    contentFit="cover"
                  />
                )}
                <Text style={styles.productionHouseName}>{ph.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {hasMedia && (
        <MediaSummaryCard
          videos={movie.videos}
          posters={movie.posters}
          onExploreMedia={onExploreMedia}
        />
      )}
    </View>
  );
}
