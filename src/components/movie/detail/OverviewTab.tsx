import { View, Text, TouchableOpacity, Linking } from 'react-native';
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

export interface OverviewTabProps {
  movie: MovieWithDetails;
  onExploreMedia: () => void;
}

export function OverviewTab({ movie, onExploreMedia }: OverviewTabProps) {
  const { t } = useTranslation();
  const { theme, colors } = useTheme();
  const styles = createStyles(theme);
  const router = useRouter();
  const hasMedia = movie.videos.length > 0 || movie.posters.length > 0;

  return (
    <View style={styles.overviewTab}>
      {movie.synopsis && <Text style={styles.synopsis}>{movie.synopsis}</Text>}
      {movie.genres.length > 0 && (
        <View style={styles.genreRow}>
          {movie.genres.map((g) => (
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
                    source={{ uri: getImageUrl(ph.logo_url, 'sm') ?? PLACEHOLDER_POSTER }}
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

      {hasMedia ? (
        <MediaSummaryCard
          videos={movie.videos}
          posters={movie.posters}
          onExploreMedia={onExploreMedia}
        />
      ) : movie.trailer_url ? (
        <TouchableOpacity
          style={styles.trailerButton}
          onPress={() => Linking.openURL(movie.trailer_url ?? '')}
        >
          <Ionicons name="play" size={20} color={colors.red400} />
          <Text style={styles.trailerButtonText}>{t('movie.watchTrailer')}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}
