import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme';
import { PLACEHOLDER_POSTER } from '@/constants/placeholders';
import { getImageUrl } from '@shared/imageUrl';
import { useTranslation } from 'react-i18next';
import type { ProductionHouse } from '@shared/types';
import type { SemanticTheme } from '@shared/themes';

export interface SearchResultProductionHouseProps {
  house: ProductionHouse;
  onPress: () => void;
}

export function SearchResultProductionHouse({ house, onPress }: SearchResultProductionHouseProps) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const styles = createStyles(theme);
  /** @nullable logo_url — falls back to PLACEHOLDER_POSTER for studios without logos */
  const logoUrl = getImageUrl(house.logo_url, 'sm', 'PRODUCTION_HOUSES') ?? PLACEHOLDER_POSTER;

  return (
    <TouchableOpacity style={styles.row} onPress={onPress} accessibilityLabel={house.name}>
      <Image source={{ uri: logoUrl }} style={styles.logo} contentFit="cover" />
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>
          {house.name}
        </Text>
        <Text style={styles.type}>
          <Ionicons name="business" size={12} color={theme.textTertiary} />{' '}
          {t('search.productionHouse')}
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
