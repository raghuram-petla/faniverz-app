import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme';
import { PLACEHOLDER_POSTER } from '@/constants/placeholders';
import { getImageUrl } from '@shared/imageUrl';
import { useTranslation } from 'react-i18next';
import type { OTTPlatform } from '@shared/types';
import type { SemanticTheme } from '@shared/themes';

export interface SearchResultPlatformProps {
  platform: OTTPlatform;
  onPress: () => void;
}

// @boundary: renders a single OTT platform row in universal search results
// @contract: platform.logo_url is used for the image; falls back to PLACEHOLDER_POSTER when null
export function SearchResultPlatform({ platform, onPress }: SearchResultPlatformProps) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const styles = createStyles(theme);
  /** @nullable logo_url — falls back to PLACEHOLDER_POSTER for platforms without logos */
  const logoUrl = getImageUrl(platform.logo_url, 'sm', 'PLATFORMS') ?? PLACEHOLDER_POSTER;

  return (
    <TouchableOpacity style={styles.row} onPress={onPress} accessibilityLabel={platform.name}>
      <Image source={{ uri: logoUrl }} style={styles.logo} contentFit="cover" />
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>
          {platform.name}
        </Text>
        <Text style={styles.type}>
          <Ionicons name="tv-outline" size={12} color={theme.textTertiary} /> {t('search.platform')}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const createStyles = (t: SemanticTheme) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingVertical: 10,
      paddingHorizontal: 16,
    },
    logo: { width: 48, height: 48, borderRadius: 10, backgroundColor: t.input },
    info: { flex: 1, gap: 2 },
    name: { fontSize: 15, fontWeight: '600', color: t.textPrimary },
    type: { fontSize: 12, color: t.textTertiary },
  });
