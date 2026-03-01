import { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Pressable,
  ActivityIndicator,
  StyleSheet,
  Modal,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ScreenHeader from '@/components/common/ScreenHeader';
import { ActorAvatar } from '@/components/common/ActorAvatar';
import { EmptyState } from '@/components/ui/EmptyState';
import { useActorDetail } from '@/features/actors/hooks';
import { colors } from '@/theme/colors';
import { formatDate } from '@/utils/formatDate';

const GENDER_LABELS: Record<number, string> = {
  1: 'Female',
  2: 'Male',
  3: 'Non-binary',
};

export default function ActorDetailScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { actor, filmography, isLoading } = useActorDetail(id ?? '');
  const [showPhoto, setShowPhoto] = useState(false);
  const [bioExpanded, setBioExpanded] = useState(false);

  if (isLoading) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top + 12 }]}>
        <ScreenHeader title="" />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.red600} testID="loading-indicator" />
        </View>
      </View>
    );
  }

  if (!actor) return null;

  const genderLabel = actor.gender ? GENDER_LABELS[actor.gender] : null;
  const personTypeLabel = actor.person_type === 'technician' ? 'Technician' : 'Actor';
  const hasBioInfo = actor.birth_date || actor.place_of_birth || actor.height_cm;

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 12 }]}
      showsVerticalScrollIndicator={false}
    >
      <ScreenHeader title={actor.name} />

      {/* Avatar — tappable when photo exists */}
      <View style={styles.avatarContainer}>
        {actor.photo_url ? (
          <TouchableOpacity
            onPress={() => setShowPhoto(true)}
            activeOpacity={0.8}
            testID="avatar-tap"
          >
            <ActorAvatar actor={actor} size={120} />
          </TouchableOpacity>
        ) : (
          <ActorAvatar actor={actor} size={120} />
        )}
      </View>

      {/* Type badge */}
      <View style={styles.badgeRow}>
        <View style={styles.typeBadge}>
          <Text style={styles.typeBadgeText}>{personTypeLabel}</Text>
        </View>
        {genderLabel && (
          <View style={styles.genderBadge}>
            <Text style={styles.genderBadgeText}>{genderLabel}</Text>
          </View>
        )}
      </View>

      {/* Bio info card */}
      {hasBioInfo && (
        <View style={styles.bioCard}>
          {actor.birth_date && (
            <View style={styles.bioRow}>
              <Ionicons name="calendar-outline" size={16} color={colors.white40} />
              <Text style={styles.bioLabel}>Born</Text>
              <Text style={styles.bioValue}>{formatDate(actor.birth_date)}</Text>
            </View>
          )}
          {actor.place_of_birth && (
            <View style={styles.bioRow}>
              <Ionicons name="location-outline" size={16} color={colors.white40} />
              <Text style={styles.bioLabel}>From</Text>
              <Text style={styles.bioValue} numberOfLines={2}>
                {actor.place_of_birth}
              </Text>
            </View>
          )}
          {actor.height_cm != null && (
            <View style={styles.bioRow}>
              <Ionicons name="resize-outline" size={16} color={colors.white40} />
              <Text style={styles.bioLabel}>Height</Text>
              <Text style={styles.bioValue}>{actor.height_cm} cm</Text>
            </View>
          )}
        </View>
      )}

      {/* Biography / About */}
      {actor.biography ? (
        <View style={styles.aboutSection}>
          <Text style={styles.aboutTitle}>About</Text>
          <Text style={styles.aboutText} numberOfLines={bioExpanded ? undefined : 4}>
            {actor.biography}
          </Text>
          <TouchableOpacity onPress={() => setBioExpanded(!bioExpanded)} testID="bio-toggle">
            <Text style={styles.readMoreText}>{bioExpanded ? 'Show less' : 'Read more'}</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {/* Filmography */}
      <View style={styles.filmographyHeader}>
        <Text style={styles.filmographyTitle}>Filmography</Text>
        {filmography.length > 0 && (
          <View style={styles.countBadge}>
            <Text style={styles.countBadgeText}>{filmography.length}</Text>
          </View>
        )}
      </View>

      {filmography.length === 0 ? (
        <EmptyState
          icon="film-outline"
          title="No movies found"
          subtitle="This person's filmography will appear here."
        />
      ) : (
        <View style={styles.filmographyList}>
          {filmography.map((credit) => {
            const movie = credit.movie;
            if (!movie) return null;
            const year = new Date(movie.release_date).getFullYear();
            const roleText =
              credit.credit_type === 'cast' && credit.role_name
                ? `as ${credit.role_name}`
                : credit.role_name;
            return (
              <TouchableOpacity
                key={credit.id}
                style={styles.filmCard}
                onPress={() => router.push(`/movie/${movie.id}`)}
                activeOpacity={0.7}
                testID={`film-card-${movie.id}`}
              >
                <Image
                  source={{ uri: movie.poster_url ?? undefined }}
                  style={styles.filmPoster}
                  contentFit="cover"
                  transition={200}
                />
                <View style={styles.filmInfo}>
                  <Text style={styles.filmTitle} numberOfLines={2}>
                    {movie.title}
                  </Text>
                  <Text style={styles.filmYear}>{year}</Text>
                  {roleText && (
                    <Text style={styles.filmRole} numberOfLines={1}>
                      {roleText}
                    </Text>
                  )}
                  {movie.rating > 0 && (
                    <View style={styles.filmRatingRow}>
                      <Ionicons name="star" size={12} color={colors.yellow400} />
                      <Text style={styles.filmRatingValue}>{movie.rating}</Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {/* Full-screen photo modal */}
      <Modal visible={showPhoto} animationType="fade" transparent testID="photo-modal">
        <Pressable
          style={styles.photoOverlay}
          onPress={() => setShowPhoto(false)}
          testID="photo-overlay"
        >
          <TouchableOpacity
            style={[styles.photoCloseButton, { top: insets.top + 12 }]}
            onPress={() => setShowPhoto(false)}
            accessibilityLabel="Close photo"
            testID="photo-close"
          >
            <Ionicons name="close" size={28} color={colors.white} />
          </TouchableOpacity>
          <Pressable onPress={(e) => e.stopPropagation()}>
            <Image
              source={{ uri: actor.photo_url ?? undefined }}
              style={styles.photoFull}
              contentFit="contain"
            />
          </Pressable>
        </Pressable>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.black },
  content: { paddingHorizontal: 16, paddingBottom: 48 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  avatarContainer: { alignItems: 'center', marginBottom: 12 },
  badgeRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 20,
  },
  typeBadge: {
    backgroundColor: colors.red600,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  typeBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.white,
    textTransform: 'uppercase',
  },
  genderBadge: {
    backgroundColor: colors.white10,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  genderBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.white60,
  },

  bioCard: {
    backgroundColor: colors.white5,
    borderRadius: 12,
    padding: 16,
    gap: 12,
    marginBottom: 24,
  },
  bioRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  bioLabel: { fontSize: 14, color: colors.white40 },
  bioValue: { fontSize: 14, fontWeight: '600', color: colors.white, flex: 1 },

  aboutSection: { marginBottom: 24 },
  aboutTitle: { fontSize: 18, fontWeight: '700', color: colors.white, marginBottom: 8 },
  aboutText: { fontSize: 14, color: 'rgba(255,255,255,0.7)', lineHeight: 22 },
  readMoreText: { fontSize: 14, fontWeight: '600', color: colors.red400, marginTop: 6 },

  filmographyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  filmographyTitle: { fontSize: 18, fontWeight: '700', color: colors.white },
  countBadge: {
    backgroundColor: colors.red600,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
    minWidth: 24,
    alignItems: 'center',
  },
  countBadgeText: { fontSize: 12, fontWeight: '700', color: colors.white },

  filmographyList: { gap: 12 },
  filmCard: {
    flexDirection: 'row',
    gap: 12,
    padding: 12,
    borderRadius: 12,
    backgroundColor: colors.zinc900,
    borderWidth: 1,
    borderColor: colors.white10,
  },
  filmPoster: {
    width: 64,
    aspectRatio: 2 / 3,
    borderRadius: 8,
  },
  filmInfo: { flex: 1, justifyContent: 'center', gap: 2 },
  filmTitle: { fontSize: 16, fontWeight: '600', color: colors.white },
  filmYear: { fontSize: 13, color: colors.white40 },
  filmRole: { fontSize: 13, color: colors.white60 },
  filmRatingRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  filmRatingValue: { fontSize: 13, fontWeight: '600', color: colors.white60 },

  // Photo modal
  photoOverlay: {
    flex: 1,
    backgroundColor: colors.black95,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoCloseButton: {
    position: 'absolute',
    right: 16,
    zIndex: 10,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.white10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoFull: {
    width: '90%',
    aspectRatio: 3 / 4,
    borderRadius: 16,
  },
});
