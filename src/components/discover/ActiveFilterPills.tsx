import { View, Text, TouchableOpacity, ViewStyle, TextStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme';

export interface ActiveFilterPillsProps {
  selectedGenres: string[];
  selectedPlatforms: string[];
  selectedProductionHouses: string[];
  platforms: { id: string; name: string }[];
  productionHouses: { id: string; name: string }[];
  onToggleGenre: (genre: string) => void;
  onTogglePlatform: (platformId: string) => void;
  onToggleProductionHouse: (phId: string) => void;
  onClearAll: () => void;
  styles: Record<string, ViewStyle | TextStyle>;
}

export function ActiveFilterPills({
  selectedGenres,
  selectedPlatforms,
  selectedProductionHouses,
  platforms,
  productionHouses,
  onToggleGenre,
  onTogglePlatform,
  onToggleProductionHouse,
  onClearAll,
  styles,
}: ActiveFilterPillsProps) {
  const { colors } = useTheme();

  if (
    selectedGenres.length === 0 &&
    selectedPlatforms.length === 0 &&
    selectedProductionHouses.length === 0
  ) {
    return null;
  }

  return (
    <View style={styles.activePills}>
      {selectedGenres.map((g) => (
        <TouchableOpacity key={g} style={styles.activePill} onPress={() => onToggleGenre(g)}>
          <Text style={styles.activePillText}>{g}</Text>
          <Ionicons name="close" size={14} color={colors.red400} />
        </TouchableOpacity>
      ))}
      {selectedPlatforms.map((p) => {
        const platform = platforms.find((pl) => pl.id === p);
        return (
          <TouchableOpacity key={p} style={styles.activePill} onPress={() => onTogglePlatform(p)}>
            <Text style={styles.activePillText}>{platform?.name ?? p}</Text>
            <Ionicons name="close" size={14} color={colors.red400} />
          </TouchableOpacity>
        );
      })}
      {selectedProductionHouses.map((phId) => {
        const ph = productionHouses.find((p) => p.id === phId);
        return (
          <TouchableOpacity
            key={phId}
            style={styles.activePill}
            onPress={() => onToggleProductionHouse(phId)}
          >
            <Text style={styles.activePillText}>{ph?.name ?? phId}</Text>
            <Ionicons name="close" size={14} color={colors.red400} />
          </TouchableOpacity>
        );
      })}
      <TouchableOpacity onPress={onClearAll}>
        <Text style={styles.clearAllLink}>Clear All</Text>
      </TouchableOpacity>
    </View>
  );
}
