import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme';
import { PLACEHOLDER_POSTER } from '@/constants/placeholders';
import { getImageUrl } from '@shared/imageUrl';
import type { ProductionHouse } from '@shared/types';
import type { SemanticTheme } from '@shared/themes';

export interface SearchResultProductionHouseProps {
  house: ProductionHouse;
  onPress: () => void;
}

export function SearchResultProductionHouse({ house, onPress }: SearchResultProductionHouseProps) {
  const { theme } = useTheme();
  const styles = createStyles(theme);
  const logoUrl = getImageUrl(house.logo_url, 'sm') ?? PLACEHOLDER_POSTER;

  return (
    <TouchableOpacity style={styles.row} onPress={onPress} accessibilityLabel={house.name}>
      <Image source={{ uri: logoUrl }} style={styles.logo} contentFit="cover" />
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>
          {house.name}
        </Text>
        <Text style={styles.type}>
          <Ionicons name="business" size={12} color={theme.textTertiary} /> Production House
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
