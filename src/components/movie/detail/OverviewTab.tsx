import { View, Text, TouchableOpacity, Linking } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme';
import type { MovieWithDetails } from '@/types/movie';
import { createStyles } from '@/styles/movieDetail.styles';
import { getImageUrl } from '@shared/imageUrl';

interface OverviewTabProps {
  movie: MovieWithDetails;
  hasMedia: boolean;
  onSwitchToMedia: () => void;
}

export function OverviewTab({ movie, hasMedia, onSwitchToMedia }: OverviewTabProps) {
  const { theme, colors } = useTheme();
  const styles = createStyles(theme);
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
            <Text style={styles.infoLabel}>Director</Text>
            <Text style={styles.infoValue}>{movie.director}</Text>
          </View>
        )}
        {movie.certification && (
          <View style={styles.infoCard}>
            <Ionicons name="shield-checkmark" size={20} color={theme.textSecondary} />
            <Text style={styles.infoLabel}>Certification</Text>
            <Text style={styles.infoValue}>{movie.certification}</Text>
          </View>
        )}
      </View>

      {movie.productionHouses.length > 0 && (
        <View style={styles.productionHousesRow}>
          <Text style={styles.productionHousesLabel}>Production</Text>
          <View style={styles.productionHousesList}>
            {movie.productionHouses.map((ph) => (
              <View key={ph.id} style={styles.productionHouseChip}>
                {ph.logo_url && (
                  <Image
                    source={{ uri: getImageUrl(ph.logo_url, 'sm')! }}
                    style={styles.productionHouseLogo}
                    contentFit="cover"
                  />
                )}
                <Text style={styles.productionHouseName}>{ph.name}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {hasMedia && movie.videos.length > 0 ? (
        (() => {
          const firstVideo =
            movie.videos.find((v) => v.video_type === 'trailer') ??
            movie.videos.find((v) => v.video_type === 'teaser') ??
            movie.videos[0];
          return (
            <TouchableOpacity
              style={styles.videoPreviewCard}
              onPress={onSwitchToMedia}
              accessibilityLabel={`${firstVideo.title} — tap for more videos`}
            >
              <View style={styles.videoPreviewThumb}>
                <Image
                  source={{
                    uri: `https://img.youtube.com/vi/${firstVideo.youtube_id}/mqdefault.jpg`,
                  }}
                  style={styles.videoPreviewImage}
                  contentFit="cover"
                />
                <View style={styles.videoPreviewPlay}>
                  <Ionicons name="play-circle" size={40} color={colors.white} />
                </View>
              </View>
              <View style={styles.videoPreviewInfo}>
                <Text style={styles.videoPreviewTitle} numberOfLines={1}>
                  {firstVideo.title}
                </Text>
                <Text style={styles.videoPreviewSubtitle}>
                  {movie.videos.length} video{movie.videos.length !== 1 ? 's' : ''} — Tap for all
                </Text>
              </View>
            </TouchableOpacity>
          );
        })()
      ) : movie.trailer_url ? (
        <TouchableOpacity
          style={styles.trailerButton}
          onPress={() => Linking.openURL(movie.trailer_url!)}
        >
          <Ionicons name="play" size={20} color={colors.red400} />
          <Text style={styles.trailerButtonText}>Watch Trailer</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}
