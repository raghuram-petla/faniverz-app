import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme';
import { PLACEHOLDER_PHOTO } from '@/constants/placeholders';
import { getImageUrl } from '@shared/imageUrl';
import type { Actor } from '@shared/types';
import type { SemanticTheme } from '@shared/themes';

export interface SearchResultActorProps {
  actor: Actor;
  onPress: () => void;
}

export function SearchResultActor({ actor, onPress }: SearchResultActorProps) {
  const { theme } = useTheme();
  const styles = createStyles(theme);
  const photoUrl = getImageUrl(actor.photo_url, 'sm') ?? PLACEHOLDER_PHOTO;

  return (
    <TouchableOpacity style={styles.row} onPress={onPress} accessibilityLabel={actor.name}>
      <Image source={{ uri: photoUrl }} style={styles.photo} contentFit="cover" />
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>
          {actor.name}
        </Text>
        <Text style={styles.type}>
          <Ionicons name="person" size={12} color={theme.textTertiary} /> Actor
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
    photo: { width: 48, height: 48, borderRadius: 24, backgroundColor: t.input },
    info: { flex: 1, gap: 2 },
    name: { fontSize: 15, fontWeight: '600', color: t.textPrimary },
    type: { fontSize: 12, color: t.textTertiary },
  });
