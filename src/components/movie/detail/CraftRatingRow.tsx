import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme';
import { colors } from '@/theme/colors';

// @contract renders a single craft rating row: craft label + editor stars (read-only)
export interface CraftRatingRowProps {
  label: string;
  editorRating: number;
}

export function CraftRatingRow({ label, editorRating }: CraftRatingRowProps) {
  const { theme } = useTheme();

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 5 }}>
      <Text
        style={{ width: 110, fontSize: 14, fontWeight: '600', color: theme.textPrimary }}
        numberOfLines={1}
      >
        {label}
      </Text>
      <View style={{ flexDirection: 'row', gap: 4 }}>
        {[1, 2, 3, 4, 5].map((star) => (
          <Ionicons
            key={star}
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
  );
}
