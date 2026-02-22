import React from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { useTheme } from '@/theme/ThemeProvider';
import { getPosterUrl } from '@/features/movies/api/tmdb';
import type { MovieCast } from '@/types/movie';

interface CastCarouselProps {
  cast: MovieCast[];
}

function CastCard({ member }: { member: MovieCast }) {
  const { colors } = useTheme();
  const photoUrl = getPosterUrl(member.profile_path, 'small');

  return (
    <View testID="cast-card" style={styles.card}>
      {photoUrl ? (
        <Image
          testID="cast-photo"
          source={{ uri: photoUrl }}
          style={styles.photo}
          contentFit="cover"
        />
      ) : (
        <View testID="cast-photo-placeholder" style={[styles.photo, styles.placeholder]}>
          <Text style={styles.placeholderText}>{member.name[0]}</Text>
        </View>
      )}
      <Text testID="cast-name" style={[styles.name, { color: colors.text }]} numberOfLines={1}>
        {member.name_te ?? member.name}
      </Text>
      {member.character && (
        <Text style={[styles.character, { color: colors.textTertiary }]} numberOfLines={1}>
          {member.character}
        </Text>
      )}
      {member.role !== 'actor' && (
        <Text style={[styles.role, { color: colors.primary }]} numberOfLines={1}>
          {member.role.replace('_', ' ')}
        </Text>
      )}
    </View>
  );
}

export default function CastCarousel({ cast }: CastCarouselProps) {
  const { colors } = useTheme();

  if (cast.length === 0) return null;

  return (
    <View testID="cast-carousel" style={styles.container}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>Cast & Crew</Text>
      <FlatList
        horizontal
        data={cast}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => <CastCard member={item} />}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.list}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  list: {
    paddingHorizontal: 16,
  },
  card: {
    width: 80,
    marginRight: 12,
    alignItems: 'center',
  },
  photo: {
    width: 64,
    height: 64,
    borderRadius: 32,
  },
  placeholder: {
    backgroundColor: '#E0E0E0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 24,
    color: '#999999',
    fontWeight: '600',
  },
  name: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 6,
    textAlign: 'center',
  },
  character: {
    fontSize: 10,
    textAlign: 'center',
  },
  role: {
    fontSize: 10,
    textAlign: 'center',
    fontWeight: '600',
  },
});
