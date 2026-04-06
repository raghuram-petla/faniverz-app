import { View, Text, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme';
import { colors } from '@/theme/colors';

// @contract renders a single craft rating row: craft label, editor stars (read-only),
// and user stars (interactive/tappable). Shows aggregate user average if available.
export interface CraftRatingRowProps {
  label: string;
  editorRating: number;
  userRating: number | null;
  avgUserRating: number | null;
  onRate: (rating: number) => void;
}

// @coupling used by EditorialReviewSection for each of the 5 crafts
export function CraftRatingRow({
  label,
  editorRating,
  userRating,
  avgUserRating,
  onRate,
}: CraftRatingRowProps) {
  const { theme } = useTheme();

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 8 }}>
      {/* Craft label */}
      <Text
        style={{ width: 100, fontSize: 13, fontWeight: '500', color: theme.textSecondary }}
        numberOfLines={1}
      >
        {label}
      </Text>

      {/* Editor rating (read-only stars) */}
      <View style={{ flexDirection: 'row', gap: 2, flex: 1 }}>
        {[1, 2, 3, 4, 5].map((star) => (
          <Ionicons
            key={`editor-${star}`}
            name={star <= editorRating ? 'star' : 'star-outline'}
            size={16}
            color={star <= editorRating ? colors.yellow400 : theme.textDisabled}
          />
        ))}
      </View>

      {/* User rating (tappable stars) */}
      <View style={{ flexDirection: 'row', gap: 2 }}>
        {[1, 2, 3, 4, 5].map((star) => (
          <Pressable
            key={`user-${star}`}
            onPress={() => onRate(star)}
            hitSlop={4}
            accessibilityLabel={`Rate ${label} ${star} stars`}
          >
            <Ionicons
              name={userRating && star <= userRating ? 'star' : 'star-outline'}
              size={14}
              color={userRating && star <= userRating ? colors.red600 : theme.textDisabled}
            />
          </Pressable>
        ))}
        {avgUserRating !== null && (
          <Text style={{ fontSize: 11, color: theme.textTertiary, marginLeft: 4 }}>
            {avgUserRating.toFixed(1)}
          </Text>
        )}
      </View>
    </View>
  );
}
