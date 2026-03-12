import { View, Text, TouchableOpacity, ViewStyle, TextStyle } from 'react-native';
import Animated, { FadeIn, FadeOut, Layout } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme';
import { useAnimationsEnabled } from '@/hooks/useAnimationsEnabled';

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
  const animationsEnabled = useAnimationsEnabled();

  const entering = animationsEnabled ? FadeIn.duration(200) : undefined;
  const exiting = animationsEnabled ? FadeOut.duration(150) : undefined;
  const layout = animationsEnabled ? Layout.springify() : undefined;

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
        <Animated.View key={g} entering={entering} exiting={exiting} layout={layout}>
          <TouchableOpacity style={styles.activePill} onPress={() => onToggleGenre(g)}>
            <Text style={styles.activePillText}>{g}</Text>
            <Ionicons name="close" size={14} color={colors.red400} />
          </TouchableOpacity>
        </Animated.View>
      ))}
      {selectedPlatforms.map((p) => {
        const platform = platforms.find((pl) => pl.id === p);
        return (
          <Animated.View key={p} entering={entering} exiting={exiting} layout={layout}>
            <TouchableOpacity style={styles.activePill} onPress={() => onTogglePlatform(p)}>
              <Text style={styles.activePillText}>{platform?.name ?? p}</Text>
              <Ionicons name="close" size={14} color={colors.red400} />
            </TouchableOpacity>
          </Animated.View>
        );
      })}
      {selectedProductionHouses.map((phId) => {
        const ph = productionHouses.find((p) => p.id === phId);
        return (
          <Animated.View key={phId} entering={entering} exiting={exiting} layout={layout}>
            <TouchableOpacity
              style={styles.activePill}
              onPress={() => onToggleProductionHouse(phId)}
            >
              <Text style={styles.activePillText}>{ph?.name ?? phId}</Text>
              <Ionicons name="close" size={14} color={colors.red400} />
            </TouchableOpacity>
          </Animated.View>
        );
      })}
      <TouchableOpacity onPress={onClearAll}>
        <Text style={styles.clearAllLink}>Clear All</Text>
      </TouchableOpacity>
    </View>
  );
}
