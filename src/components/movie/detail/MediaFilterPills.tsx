import { ScrollView, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { colors } from '@/theme/colors';
import type { SemanticTheme } from '@shared/themes';

/** @contract Horizontal scrollable pill bar for filtering media by category */
export interface MediaFilterPillsProps {
  /** @assumes First category is always "All" — no validation enforced */
  categories: string[];
  active: string;
  onSelect: (category: string) => void;
  /** @coupling Theme passed directly instead of via hook — parent controls theming */
  theme: SemanticTheme;
}

export function MediaFilterPills({ categories, active, onSelect, theme }: MediaFilterPillsProps) {
  const styles = createPillStyles(theme);
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.scroll}
      contentContainerStyle={styles.scrollContent}
    >
      {categories.map((cat) => {
        const isActive = active === cat;
        return (
          <TouchableOpacity
            key={cat}
            style={[styles.pill, isActive ? styles.pillActive : styles.pillInactive]}
            onPress={() => onSelect(cat)}
            activeOpacity={0.75}
            accessibilityRole="button"
            accessibilityState={{ selected: isActive }}
            accessibilityLabel={`Filter by ${cat}`}
          >
            <Text style={[styles.pillText, isActive && styles.pillTextActive]}>{cat}</Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const createPillStyles = (t: SemanticTheme) =>
  StyleSheet.create({
    scroll: { flexGrow: 0 },
    scrollContent: { gap: 8, paddingBottom: 4 },
    pill: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 20,
      borderWidth: 1,
    },
    pillActive: {
      backgroundColor: colors.red600,
      borderColor: colors.red600,
    },
    pillInactive: {
      backgroundColor: t.surfaceElevated,
      borderColor: t.inputActive,
    },
    pillText: {
      fontSize: 13,
      fontWeight: '600',
      color: t.textSecondary,
    },
    pillTextActive: {
      color: colors.white,
    },
  });
