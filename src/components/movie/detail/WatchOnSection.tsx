import { View, Text, TouchableOpacity, Linking, Alert } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme';
import { getPlatformLogo } from '@/constants/platformLogos';
import { formatDate } from '@/utils/formatDate';
import { PLACEHOLDER_POSTER } from '@/constants/placeholders';
import type { MoviePlatform, MovieStatus } from '@/types';
import { createStyles } from '@/styles/movieDetail.styles';
import { useTranslation } from 'react-i18next';

interface WatchOnSectionProps {
  platforms: MoviePlatform[];
  movieStatus: MovieStatus;
  releaseDate: string | null;
}

export function WatchOnSection({ platforms, movieStatus, releaseDate }: WatchOnSectionProps) {
  const { theme, colors } = useTheme();
  const { t } = useTranslation();
  const styles = createStyles(theme);
  return (
    <>
      {platforms.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('movie.watchOn')}</Text>
          <View style={styles.watchOnRow}>
            {platforms.map((mp) => {
              const p = mp.platform;
              if (!p) return null;
              const logo = getPlatformLogo(p.id);
              return (
                <TouchableOpacity
                  key={p.id}
                  style={[styles.watchOnButton, { backgroundColor: p.color }]}
                  onPress={
                    mp.streaming_url?.startsWith('http')
                      ? () =>
                          Linking.openURL(mp.streaming_url!).catch(() =>
                            Alert.alert(t('common.error'), t('common.openLinkFailed')),
                          )
                      : undefined
                  }
                  activeOpacity={mp.streaming_url ? 0.7 : 1}
                  accessibilityLabel={`Watch on ${p.name}`}
                >
                  {logo ? (
                    <Image source={logo} style={styles.watchOnLogo} contentFit="contain" />
                  ) : p.logo_url ? (
                    <Image
                      source={{ uri: p.logo_url ?? PLACEHOLDER_POSTER }}
                      style={styles.watchOnLogo}
                      contentFit="contain"
                    />
                  ) : (
                    <Text style={styles.watchOnLogoText}>{p.logo}</Text>
                  )}
                  <View>
                    <Text style={styles.watchOnName}>{p.name}</Text>
                    <Text style={styles.watchOnStream}>
                      {mp.streaming_url ? t('movie.streamNow') : t('movie.available')}
                    </Text>
                  </View>
                  {mp.streaming_url && (
                    <Ionicons
                      name="open-outline"
                      size={16}
                      color={colors.white}
                      style={{ marginLeft: 'auto' }}
                    />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      )}

      {movieStatus === 'upcoming' && (
        <View style={styles.releaseAlert}>
          <Ionicons name="alert-circle" size={24} color={colors.blue400} />
          <View style={{ flex: 1 }}>
            <Text style={styles.releaseAlertTitle}>{t('movie.upcomingRelease')}</Text>
            <Text style={styles.releaseAlertDate}>
              {releaseDate
                ? t('movie.releasingOn', { date: formatDate(releaseDate) })
                : t('movie.releaseDateTba')}
            </Text>
          </View>
        </View>
      )}
    </>
  );
}
