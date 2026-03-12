import { View, Text, StyleSheet } from 'react-native';
import type { ViewStyle, TextStyle } from 'react-native';

export interface GenreListProps {
  genres: string[];
  maxItems?: number;
  separator?: string;
  containerStyle?: ViewStyle;
  textStyle?: TextStyle;
  pillStyle?: ViewStyle;
}

export function GenreList({
  genres,
  maxItems = 2,
  separator,
  containerStyle,
  textStyle,
  pillStyle,
}: GenreListProps) {
  if (genres.length === 0) return null;

  const visible = genres.slice(0, maxItems);

  // Separator mode (e.g., "Action • Drama")
  if (separator) {
    return (
      <Text style={[styles.text, textStyle]} numberOfLines={1}>
        {visible.join(separator)}
      </Text>
    );
  }

  // Pill mode (default)
  return (
    <View style={[styles.container, containerStyle]}>
      {visible.map((genre) => (
        <Text key={genre} style={[styles.text, textStyle, pillStyle]}>
          {genre}
        </Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  text: {
    fontSize: 12,
  },
});
