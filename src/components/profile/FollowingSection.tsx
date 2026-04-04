import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme';
import { colors as palette } from '@/theme/colors';
import { PLACEHOLDER_POSTER, PLACEHOLDER_PHOTO } from '@/constants/placeholders';
import { getImageUrl, entityTypeToBucket } from '@shared/imageUrl';
import { useTranslation } from 'react-i18next';
import { ENTITY_FOLLOWING_LABEL_KEYS } from '@/constants/entityLabels';
import type { EnrichedFollow, FeedEntityType } from '@shared/types';
import type { SemanticTheme } from '@shared/themes';

export interface FollowingSectionProps {
  follows: EnrichedFollow[];
  onEntityPress: (entityType: FeedEntityType, entityId: string) => void;
  onViewAll: () => void;
}

// @contract imported from @/constants/entityLabels — do not redefine locally

/** @invariant shows at most 6 items in the preview grid; overflow triggers "See more" link */
const MAX_PREVIEW = 6;

export function FollowingSection({ follows, onEntityPress, onViewAll }: FollowingSectionProps) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const styles = createStyles(theme);

  /** @edge empty follows array renders nothing — parent should handle the empty state */
  if (follows.length === 0) return null;

  const preview = follows.slice(0, MAX_PREVIEW);
  /** @sync groups all follows by entity_type for category chip counts */
  const grouped = new Map<FeedEntityType, number>();
  for (const f of follows) {
    grouped.set(f.entity_type, (grouped.get(f.entity_type) ?? 0) + 1);
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('profile.following')}</Text>
        <TouchableOpacity onPress={onViewAll} accessibilityLabel="View all following">
          <Text style={styles.viewAll}>{t('profile.viewAll', { count: follows.length })}</Text>
        </TouchableOpacity>
      </View>

      {/* Category chips */}
      <View style={styles.chips}>
        {Array.from(grouped.entries()).map(([type, count]) => (
          <View key={type} style={styles.chip}>
            <Text style={styles.chipText}>
              {count} {t(ENTITY_FOLLOWING_LABEL_KEYS[type] ?? '')}
            </Text>
          </View>
        ))}
      </View>

      {/* Preview grid */}
      <View style={styles.grid}>
        {preview.map((f) => {
          /** @contract actors get photo placeholder; all other entity types get poster placeholder */
          const placeholder = f.entity_type === 'actor' ? PLACEHOLDER_PHOTO : PLACEHOLDER_POSTER;
          const imageUrl =
            getImageUrl(f.image_url, 'sm', entityTypeToBucket(f.entity_type)) ?? placeholder;
          return (
            <TouchableOpacity
              key={`${f.entity_type}:${f.entity_id}`}
              style={styles.item}
              onPress={() => onEntityPress(f.entity_type, f.entity_id)}
              accessibilityLabel={f.name}
            >
              <Image
                source={{ uri: imageUrl }}
                style={[
                  styles.image,
                  f.entity_type === 'actor' ? styles.imageRound : styles.imageSquare,
                ]}
                contentFit="cover"
                transition={200}
              />
              <Text style={styles.name} numberOfLines={1}>
                {f.name}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {follows.length > MAX_PREVIEW && (
        <TouchableOpacity style={styles.moreButton} onPress={onViewAll}>
          <Ionicons name="chevron-forward" size={16} color={palette.red500} />
          <Text style={styles.moreText}>
            {t('profile.seeMore', { count: follows.length - MAX_PREVIEW })}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const createStyles = (t: SemanticTheme) =>
  StyleSheet.create({
    container: {
      backgroundColor: t.surface,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: t.border,
      padding: 16,
      marginBottom: 16,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
    },
    title: {
      fontSize: 17,
      fontWeight: '700',
      color: t.textPrimary,
    },
    viewAll: {
      fontSize: 13,
      fontWeight: '600',
      color: palette.red500,
    },
    chips: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginBottom: 12,
    },
    chip: {
      backgroundColor: t.input,
      borderRadius: 12,
      paddingHorizontal: 10,
      paddingVertical: 4,
    },
    chipText: {
      fontSize: 12,
      fontWeight: '600',
      color: t.textSecondary,
    },
    grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
    },
    item: {
      width: '30%',
      alignItems: 'center',
      gap: 6,
    },
    image: {
      width: 56,
      height: 56,
      backgroundColor: t.input,
    },
    imageRound: {
      borderRadius: 28,
    },
    imageSquare: {
      borderRadius: 12,
    },
    name: {
      fontSize: 11,
      fontWeight: '500',
      color: t.textPrimary,
      textAlign: 'center',
    },
    moreButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 4,
      marginTop: 12,
    },
    moreText: {
      fontSize: 13,
      fontWeight: '600',
      color: palette.red500,
    },
  });
