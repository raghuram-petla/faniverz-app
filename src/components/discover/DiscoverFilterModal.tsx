import { View, Text, TouchableOpacity, Modal, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/theme';
import { PlatformBadge } from '@/components/ui/PlatformBadge';
import type { OTTPlatform, ProductionHouse } from '@/types';

interface DiscoverFilterModalProps {
  visible: boolean;
  platforms: OTTPlatform[];
  productionHouses: ProductionHouse[];
  selectedPlatforms: string[];
  selectedGenres: string[];
  selectedProductionHouses: string[];
  filteredCount: number;
  onTogglePlatform: (id: string) => void;
  onToggleGenre: (genre: string) => void;
  onToggleProductionHouse: (id: string) => void;
  onClearAll: () => void;
  onClose: () => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  styles: Record<string, any>;
}

/** @invariant genre list must stay in sync with the genres column values in the movies table */
/** @coupling admin panel uses the same genre list in admin/src/app/movies — changes must be mirrored */
export const GENRES = [
  'Action',
  'Drama',
  'Comedy',
  'Romance',
  'Thriller',
  'Horror',
  'Sci-Fi',
  'Fantasy',
  'Crime',
  'Family',
  'Adventure',
  'Historical',
];

export const SORT_OPTIONS = [
  { value: 'popular' as const, label: 'Popular' },
  { value: 'top_rated' as const, label: 'Rating' },
  { value: 'latest' as const, label: 'Latest' },
  { value: 'upcoming' as const, label: 'Upcoming' },
];

/** @coupling DiscoverSearchHeader imports FILTER_TABS for tab rendering */
export const FILTER_TABS = [
  { value: 'all' as const, label: 'All' },
  { value: 'in_theaters' as const, label: 'Theaters' },
  { value: 'streaming' as const, label: 'Streaming' },
  { value: 'upcoming' as const, label: 'Soon' },
];

export function DiscoverFilterModal({
  visible,
  platforms,
  productionHouses,
  selectedPlatforms,
  selectedGenres,
  selectedProductionHouses,
  filteredCount,
  onTogglePlatform,
  onToggleGenre,
  onToggleProductionHouse,
  onClearAll,
  onClose,
  styles,
}: DiscoverFilterModalProps) {
  const { theme, colors } = useTheme();
  const { t } = useTranslation();
  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{t('discover.filters')}</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={theme.textPrimary} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={styles.modalSectionTitle}>{t('discover.streamingPlatforms')}</Text>
            <View style={styles.platformGrid}>
              {platforms.map((p) => {
                const isSelected = selectedPlatforms.includes(p.id);
                return (
                  <TouchableOpacity
                    key={p.id}
                    style={[
                      styles.platformButton,
                      { backgroundColor: isSelected ? p.color : theme.surfaceElevated },
                    ]}
                    onPress={() => onTogglePlatform(p.id)}
                  >
                    <PlatformBadge platform={p} size={28} />
                    <Text style={styles.platformName}>{p.name}</Text>
                    {isSelected && (
                      <View style={styles.platformCheck}>
                        <Ionicons name="checkmark" size={14} color={colors.white} />
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={[styles.modalSectionTitle, { marginTop: 24 }]}>
              {t('discover.genres')}
            </Text>
            <View style={styles.genreGrid}>
              {GENRES.map((g) => {
                const isSelected = selectedGenres.includes(g);
                return (
                  <TouchableOpacity
                    key={g}
                    style={[styles.genrePill, isSelected && styles.genrePillActive]}
                    onPress={() => onToggleGenre(g)}
                  >
                    <Text style={[styles.genrePillText, isSelected && styles.genrePillTextActive]}>
                      {g}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {productionHouses.length > 0 && (
              <>
                <Text style={[styles.modalSectionTitle, { marginTop: 24 }]}>
                  {t('discover.productionHouses')}
                </Text>
                <View style={styles.genreGrid}>
                  {productionHouses.map((ph) => {
                    const isSelected = selectedProductionHouses.includes(ph.id);
                    return (
                      <TouchableOpacity
                        key={ph.id}
                        style={[styles.genrePill, isSelected && styles.genrePillActive]}
                        onPress={() => onToggleProductionHouse(ph.id)}
                      >
                        <Text
                          style={[styles.genrePillText, isSelected && styles.genrePillTextActive]}
                        >
                          {ph.name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </>
            )}
          </ScrollView>

          {/* @contract bottom actions: clear all resets filters in store; show results closes modal */}
          <View style={styles.modalActions}>
            <TouchableOpacity onPress={onClearAll}>
              <Text style={styles.clearFiltersText}>{t('discover.clearFilters')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.showResultsButton} onPress={onClose}>
              <Text style={styles.showResultsText}>
                {t('discover.showMovies', { count: filteredCount })}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
