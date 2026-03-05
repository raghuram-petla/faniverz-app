import { View, Text, TouchableOpacity, Linking } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme';
import { getPlatformLogo } from '@/constants/platformLogos';
import { formatDate } from '@/utils/formatDate';
import type { MoviePlatform, MovieStatus } from '@/types';
import { createStyles } from '../_styles/[id].styles';

interface WatchOnSectionProps {
  platforms: MoviePlatform[];
  movieStatus: MovieStatus;
  releaseDate: string;
}

export function WatchOnSection({ platforms, movieStatus, releaseDate }: WatchOnSectionProps) {
  const { theme, colors } = useTheme();
  const styles = createStyles(theme);
  return (
    <>
      {platforms.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Watch On</Text>
          <View style={styles.watchOnRow}>
            {platforms.map((mp) => {
              const p = mp.platform;
              if (!p) return null;
              const logo = getPlatformLogo(p.id);
              return (
                <TouchableOpacity
                  key={p.id}
                  style={[styles.watchOnButton, { backgroundColor: p.color }]}
                  onPress={() => Linking.openURL('https://example.com')}
                  accessibilityLabel={`Watch on ${p.name}`}
                >
                  {logo ? (
                    <Image source={logo} style={styles.watchOnLogo} contentFit="contain" />
                  ) : (
                    <Text style={styles.watchOnLogoText}>{p.logo}</Text>
                  )}
                  <View>
                    <Text style={styles.watchOnName}>{p.name}</Text>
                    <Text style={styles.watchOnStream}>Stream Now</Text>
                  </View>
                  <Ionicons
                    name="open-outline"
                    size={16}
                    color={colors.white}
                    style={{ marginLeft: 'auto' }}
                  />
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
            <Text style={styles.releaseAlertTitle}>Upcoming Release</Text>
            <Text style={styles.releaseAlertDate}>Releasing on {formatDate(releaseDate)}</Text>
          </View>
        </View>
      )}
    </>
  );
}
