import { View, Text, TextInput, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/theme';
import { HomeButton } from '@/components/common/HomeButton';
import { createStyles } from '@/styles/discover.styles';
import { FILTER_TABS } from '@/components/discover/DiscoverFilterModal';
import type { MovieStatus } from '@/types';

export interface DiscoverSearchHeaderProps {
  insetTop: number;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedFilter: 'all' | MovieStatus;
  onFilterChange: (filter: 'all' | MovieStatus) => void;
  onBack: () => void;
}

export function DiscoverSearchHeader({
  insetTop,
  searchQuery,
  onSearchChange,
  selectedFilter,
  onFilterChange,
  onBack,
}: DiscoverSearchHeaderProps) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const styles = createStyles(theme);

  return (
    <>
      <View style={[styles.header, { paddingTop: insetTop + 12 }]}>
        <View style={styles.headerTitleRow}>
          <TouchableOpacity style={styles.backButton} onPress={onBack} accessibilityLabel="Go back">
            <Ionicons name="chevron-back" size={24} color={theme.textPrimary} />
          </TouchableOpacity>
          <HomeButton />
          <Text style={styles.screenTitle}>{t('discover.title')}</Text>
        </View>
        <View style={styles.searchInputContainer}>
          <Ionicons name="search" size={18} color={theme.textTertiary} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder={t('discover.searchPlaceholder')}
            placeholderTextColor={theme.textTertiary}
            value={searchQuery}
            onChangeText={onSearchChange}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => onSearchChange('')}>
              <Ionicons name="close-circle" size={18} color={theme.textTertiary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View style={styles.tabRow}>
        {FILTER_TABS.map((tab) => (
          <TouchableOpacity
            key={tab.value}
            style={[styles.tabButton, selectedFilter === tab.value && styles.tabButtonActive]}
            onPress={() => onFilterChange(tab.value)}
          >
            <Text
              style={[
                styles.tabButtonText,
                selectedFilter === tab.value && styles.tabButtonTextActive,
              ]}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </>
  );
}
