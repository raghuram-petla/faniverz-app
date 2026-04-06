import { View, Text, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme';
import { colors } from '@/theme/colors';
import { useTranslation } from 'react-i18next';

// @contract renders a single craft rating as two rows:
// Row 1: craft label + editor stars (read-only)
// Row 2: "Your rating" label + user stars (tappable) + avg user rating
export interface CraftRatingRowProps {
  label: string;
  editorRating: number;
  userRating: number | null;
  avgUserRating: number | null;
  onRate: (rating: number) => void;
}

export function CraftRatingRow({
  label,
  editorRating,
  userRating,
  avgUserRating,
  onRate,
}: CraftRatingRowProps) {
  const { theme } = useTheme();
  const { t } = useTranslation();

  return (
    <View style={{ paddingVertical: 6 }}>
      {/* Row 1: craft label + editor stars */}
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <Text
          style={{ width: 110, fontSize: 14, fontWeight: '600', color: theme.textPrimary }}
          numberOfLines={1}
        >
          {label}
        </Text>
        <View style={{ flexDirection: 'row', gap: 4 }}>
          {[1, 2, 3, 4, 5].map((star) => (
            <Ionicons
              key={`editor-${star}`}
              name={star <= editorRating ? 'star' : 'star-outline'}
              size={20}
              color={star <= editorRating ? colors.yellow400 : theme.textDisabled}
            />
          ))}
        </View>
        <Text style={{ fontSize: 13, color: theme.textTertiary, marginLeft: 6 }}>
          ({editorRating})
        </Text>
      </View>

      {/* Row 2: user tappable stars */}
      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4, paddingLeft: 110 }}>
        <View style={{ flexDirection: 'row', gap: 4 }}>
          {[1, 2, 3, 4, 5].map((star) => (
            <Pressable
              key={`user-${star}`}
              onPress={() => onRate(star)}
              hitSlop={6}
              accessibilityLabel={`Rate ${label} ${star} stars`}
            >
              <Ionicons
                name={userRating && star <= userRating ? 'star' : 'star-outline'}
                size={18}
                color={userRating && star <= userRating ? colors.red600 : theme.textDisabled}
              />
            </Pressable>
          ))}
        </View>
        <Text style={{ fontSize: 11, color: theme.textTertiary, marginLeft: 6 }}>
          {userRating
            ? t('editorial.yourRating', 'Your rating')
            : t('editorial.tapToRate', 'Tap to rate')}
        </Text>
      </View>
    </View>
  );
}
