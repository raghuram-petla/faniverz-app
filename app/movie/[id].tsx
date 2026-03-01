import { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Dimensions,
  Share,
  Linking,
  Modal,
  TextInput,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '@/theme/colors';
import { useMovieDetail } from '@/features/movies/hooks/useMovieDetail';
import { useAuth } from '@/features/auth/providers/AuthProvider';
import { useIsWatchlisted, useWatchlistMutations } from '@/features/watchlist/hooks';
import { useMovieReviews, useReviewMutations } from '@/features/reviews/hooks';
import { StarRating } from '@/components/ui/StarRating';
import { ActorAvatar } from '@/components/common/ActorAvatar';
import { getPlatformLogo } from '@/constants/platformLogos';
import { getReleaseTypeLabel } from '@/constants/releaseType';
import { formatDate } from '@/utils/formatDate';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const HERO_HEIGHT = 500;

type TabName = 'overview' | 'cast' | 'reviews';

export default function MovieDetailScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const userId = user?.id ?? '';

  const { data: movie } = useMovieDetail(id ?? '');
  const { data: watchlistEntry } = useIsWatchlisted(userId, id ?? '');
  const { add: addWatchlist, remove: removeWatchlist } = useWatchlistMutations();
  const { data: reviews = [] } = useMovieReviews(id ?? '');
  const { create: createReview, helpful: helpfulMutation } = useReviewMutations();

  const [activeTab, setActiveTab] = useState<TabName>('overview');
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewTitle, setReviewTitle] = useState('');
  const [reviewBody, setReviewBody] = useState('');
  const [containsSpoiler, setContainsSpoiler] = useState(false);

  const isWatchlisted = !!watchlistEntry;

  if (!movie) return null;

  const handleShare = async () => {
    const text = `${movie.title} (${new Date(movie.release_date).getFullYear()}) — ${movie.rating}★\n${movie.synopsis?.slice(0, 100) ?? ''}\n\nTrack it on Faniverz!`;
    await Share.share({ message: text });
  };

  const handleToggleWatchlist = () => {
    if (!userId) return;
    if (isWatchlisted) {
      removeWatchlist.mutate({ userId, movieId: movie.id });
    } else {
      addWatchlist.mutate({ userId, movieId: movie.id });
    }
  };

  const handleSubmitReview = () => {
    if (!userId || reviewRating === 0) return;
    createReview.mutate({
      user_id: userId,
      movie_id: movie.id,
      rating: reviewRating,
      title: reviewTitle,
      body: reviewBody,
      contains_spoiler: containsSpoiler,
    });
    setShowReviewModal(false);
    setReviewRating(0);
    setReviewTitle('');
    setReviewBody('');
    setContainsSpoiler(false);
  };

  const releaseYear = new Date(movie.release_date).getFullYear();
  const tabs: TabName[] = ['overview', 'cast', 'reviews'];

  return (
    <View style={styles.screen}>
      <StatusBar style="light" />
      {/* Fixed black cover over status bar — prevents scroll content entering safe area zone */}
      <View style={[styles.safeAreaCover, { height: insets.top }]} />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: insets.top }}
      >
        {/* Hero */}
        <View style={styles.hero}>
          <Image
            source={{ uri: movie.backdrop_url ?? movie.poster_url ?? undefined }}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            contentPosition={
              movie.backdrop_focus_x != null && movie.backdrop_focus_y != null
                ? {
                    left: `${Math.round(movie.backdrop_focus_x * 100)}%`,
                    top: `${Math.round(movie.backdrop_focus_y * 100)}%`,
                  }
                : undefined
            }
          />
          <LinearGradient
            colors={['rgba(0,0,0,0.3)', 'rgba(0,0,0,0.1)', 'rgba(0,0,0,0.7)', 'rgba(0,0,0,1)']}
            locations={[0, 0.2, 0.6, 1]}
            style={StyleSheet.absoluteFill}
          />

          {/* Movie info overlay */}
          <View style={styles.heroInfo}>
            <View style={styles.heroInfoRow}>
              <Image
                source={{ uri: movie.poster_url ?? undefined }}
                style={styles.heroPoster}
                contentFit="cover"
              />
              <View style={styles.heroInfoText}>
                <View style={styles.statusBadge}>
                  <Text style={styles.statusBadgeText}>
                    {getReleaseTypeLabel(movie.release_type)}
                  </Text>
                </View>
                <Text style={styles.heroTitle} numberOfLines={2}>
                  {movie.title}
                </Text>
                {movie.rating > 0 && (
                  <View style={styles.heroRatingRow}>
                    <Ionicons name="star" size={20} color={colors.yellow400} />
                    <Text style={styles.heroRatingValue}>{movie.rating}</Text>
                    <Text style={styles.heroReviewCount}>({movie.review_count} reviews)</Text>
                  </View>
                )}
                <View style={styles.heroMetaRow}>
                  <Text style={styles.heroMeta}>{releaseYear}</Text>
                  {movie.runtime ? (
                    <>
                      <Text style={styles.heroMetaDot}>|</Text>
                      <Text style={styles.heroMeta}>{movie.runtime}m</Text>
                    </>
                  ) : null}
                  {movie.certification && (
                    <>
                      <Text style={styles.heroMetaDot}>|</Text>
                      <Text style={styles.heroMeta}>{movie.certification}</Text>
                    </>
                  )}
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* Watch On */}
        {movie.platforms.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Watch On</Text>
            <View style={styles.watchOnRow}>
              {movie.platforms.map((mp) => {
                const p = mp.platform;
                if (!p) return null;
                const logo = getPlatformLogo(p.id);
                return (
                  <TouchableOpacity
                    key={p.id}
                    style={[styles.watchOnButton, { backgroundColor: p.color }]}
                    onPress={() => Linking.openURL('https://example.com')}
                    accessibilityLabel={`Watch on ${p.name}`}
                  >
                    {logo ? (
                      <Image source={logo} style={styles.watchOnLogo} contentFit="contain" />
                    ) : (
                      <Text style={styles.watchOnLogoText}>{p.logo}</Text>
                    )}
                    <View>
                      <Text style={styles.watchOnName}>{p.name}</Text>
                      <Text style={styles.watchOnStream}>Stream Now</Text>
                    </View>
                    <Ionicons
                      name="open-outline"
                      size={16}
                      color={colors.white}
                      style={{ marginLeft: 'auto' }}
                    />
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* Release Alert for upcoming */}
        {movie.release_type === 'upcoming' && (
          <View style={styles.releaseAlert}>
            <Ionicons name="alert-circle" size={24} color={colors.blue400} />
            <View style={{ flex: 1 }}>
              <Text style={styles.releaseAlertTitle}>Upcoming Release</Text>
              <Text style={styles.releaseAlertDate}>
                Releasing on {formatDate(movie.release_date)}
              </Text>
            </View>
          </View>
        )}

        {/* Tabs */}
        <View style={styles.tabBar}>
          {tabs.map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, activeTab === tab && styles.tabActive]}
              onPress={() => setActiveTab(tab)}
            >
              <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Tab Content */}
        <View style={styles.tabContent}>
          {activeTab === 'overview' && (
            <View style={styles.overviewTab}>
              {movie.synopsis && <Text style={styles.synopsis}>{movie.synopsis}</Text>}
              {movie.genres.length > 0 && (
                <View style={styles.genreRow}>
                  {movie.genres.map((g) => (
                    <View key={g} style={styles.genrePill}>
                      <Text style={styles.genrePillText}>{g}</Text>
                    </View>
                  ))}
                </View>
              )}
              <View style={styles.infoGrid}>
                {movie.director && (
                  <View style={styles.infoCard}>
                    <Ionicons name="videocam" size={20} color={colors.white60} />
                    <Text style={styles.infoLabel}>Director</Text>
                    <Text style={styles.infoValue}>{movie.director}</Text>
                  </View>
                )}
                {movie.certification && (
                  <View style={styles.infoCard}>
                    <Ionicons name="shield-checkmark" size={20} color={colors.white60} />
                    <Text style={styles.infoLabel}>Certification</Text>
                    <Text style={styles.infoValue}>{movie.certification}</Text>
                  </View>
                )}
              </View>
              {movie.trailer_url && (
                <TouchableOpacity
                  style={styles.trailerButton}
                  onPress={() => Linking.openURL(movie.trailer_url!)}
                >
                  <Ionicons name="play" size={20} color={colors.red400} />
                  <Text style={styles.trailerButtonText}>Watch Trailer</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {activeTab === 'cast' && (
            <View style={styles.castTab}>
              {/* Cast section */}
              {movie.cast.length > 0 && (
                <>
                  <Text style={styles.castSectionLabel}>Cast</Text>
                  {movie.cast.map((cm) => (
                    <View key={cm.id} style={styles.castItem}>
                      <ActorAvatar actor={cm.actor} size={64} />
                      <View style={styles.castInfo}>
                        <Text style={styles.castName}>{cm.actor?.name}</Text>
                        {cm.role_name && <Text style={styles.castRole}>as {cm.role_name}</Text>}
                      </View>
                    </View>
                  ))}
                </>
              )}

              {/* Crew section */}
              {movie.crew.length > 0 && (
                <>
                  <Text style={styles.castSectionLabel}>Crew</Text>
                  {movie.crew.map((cm) => (
                    <View key={cm.id} style={styles.castItem}>
                      <ActorAvatar actor={cm.actor} size={64} />
                      <View style={styles.castInfo}>
                        <Text style={styles.castName}>{cm.actor?.name}</Text>
                        {cm.role_name && <Text style={styles.castRole}>{cm.role_name}</Text>}
                      </View>
                    </View>
                  ))}
                </>
              )}

              {movie.cast.length === 0 && movie.crew.length === 0 && (
                <Text style={styles.emptyText}>No cast information available.</Text>
              )}
            </View>
          )}

          {activeTab === 'reviews' && (
            <View style={styles.reviewsTab}>
              {/* Rating Summary */}
              <View style={styles.ratingSummary}>
                <Ionicons name="star" size={32} color={colors.yellow400} />
                <Text style={styles.ratingSummaryValue}>{movie.rating}</Text>
                <Text style={styles.ratingSummaryMax}>/5</Text>
                <Text style={styles.ratingSummaryCount}>({movie.review_count} reviews)</Text>
              </View>

              <TouchableOpacity
                style={styles.writeReviewButton}
                onPress={() => setShowReviewModal(true)}
              >
                <Ionicons name="create" size={20} color={colors.white} />
                <Text style={styles.writeReviewText}>Write Review</Text>
              </TouchableOpacity>

              {reviews.map((review) => (
                <View key={review.id} style={styles.reviewCard}>
                  <View style={styles.reviewHeader}>
                    <View style={styles.reviewAvatar}>
                      <Ionicons name="person" size={16} color={colors.white60} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.reviewUserName}>
                        {review.profile?.display_name ?? 'User'}
                      </Text>
                      <StarRating rating={review.rating} size={12} />
                    </View>
                    <Text style={styles.reviewDate}>{formatDate(review.created_at)}</Text>
                  </View>
                  {review.title && <Text style={styles.reviewTitle}>{review.title}</Text>}
                  {review.body && (
                    <Text style={styles.reviewBody} numberOfLines={4}>
                      {review.body}
                    </Text>
                  )}
                  {review.contains_spoiler && (
                    <View style={styles.spoilerBadge}>
                      <Text style={styles.spoilerBadgeText}>Contains Spoiler</Text>
                    </View>
                  )}
                  <TouchableOpacity
                    style={styles.helpfulButton}
                    onPress={() => {
                      if (userId) {
                        helpfulMutation.mutate({ userId, reviewId: review.id });
                      }
                    }}
                    accessibilityLabel={`Mark review as helpful, ${review.helpful_count} found helpful`}
                  >
                    <Ionicons name="thumbs-up-outline" size={14} color={colors.white40} />
                    <Text style={styles.helpfulText}>{review.helpful_count}</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Fixed header — outside ScrollView so it never scrolls away, paddingTop pushes below status bar */}
      <View style={[styles.heroHeader, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity
          style={styles.heroButton}
          onPress={() => router.back()}
          accessibilityLabel="Go back"
        >
          <Ionicons name="arrow-back" size={22} color={colors.white} />
        </TouchableOpacity>
        <View style={styles.heroHeaderRight}>
          <TouchableOpacity
            style={styles.heroButton}
            onPress={handleShare}
            accessibilityLabel="Share"
          >
            <Ionicons name="share-outline" size={22} color={colors.white} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.heroButton, isWatchlisted && styles.heroButtonActive]}
            onPress={handleToggleWatchlist}
            accessibilityLabel={isWatchlisted ? 'Remove from watchlist' : 'Add to watchlist'}
          >
            <Ionicons
              name={isWatchlisted ? 'bookmark' : 'bookmark-outline'}
              size={22}
              color={colors.white}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Write Review Modal */}
      <Modal visible={showReviewModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Write Review</Text>
              <TouchableOpacity onPress={() => setShowReviewModal(false)}>
                <Ionicons name="close" size={24} color={colors.white} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalMovieInfo}>
              <Image
                source={{ uri: movie.poster_url ?? undefined }}
                style={styles.modalPoster}
                contentFit="cover"
              />
              <View>
                <Text style={styles.modalMovieTitle}>{movie.title}</Text>
                <Text style={styles.modalMovieMeta}>
                  {releaseYear} • {movie.director}
                </Text>
              </View>
            </View>

            <View style={styles.modalStars}>
              <StarRating rating={reviewRating} size={40} interactive onRate={setReviewRating} />
            </View>

            <TextInput
              style={styles.modalInput}
              placeholder="Review Title"
              placeholderTextColor={colors.white40}
              value={reviewTitle}
              onChangeText={setReviewTitle}
            />

            <TextInput
              style={[styles.modalInput, styles.modalTextArea]}
              placeholder="Write your review..."
              placeholderTextColor={colors.white40}
              multiline
              numberOfLines={6}
              textAlignVertical="top"
              value={reviewBody}
              onChangeText={setReviewBody}
            />

            <TouchableOpacity
              style={styles.spoilerToggle}
              onPress={() => setContainsSpoiler(!containsSpoiler)}
            >
              <View style={[styles.toggleTrack, containsSpoiler && styles.toggleTrackActive]}>
                <View style={[styles.toggleThumb, containsSpoiler && styles.toggleThumbActive]} />
              </View>
              <Text style={styles.spoilerToggleText}>Contains Spoiler</Text>
            </TouchableOpacity>

            <View style={styles.modalButtons}>
              <TouchableOpacity onPress={() => setShowReviewModal(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalSubmitButton, reviewRating === 0 && { opacity: 0.5 }]}
                onPress={handleSubmitReview}
                disabled={reviewRating === 0}
              >
                <Text style={styles.modalSubmitText}>Submit</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.black },
  hero: { height: HERO_HEIGHT, width: SCREEN_WIDTH },
  safeAreaCover: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    backgroundColor: colors.black,
  },
  heroHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    zIndex: 50,
  },
  heroHeaderRight: { flexDirection: 'row', gap: 8 },
  heroButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.black50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroButtonActive: { backgroundColor: colors.red600 },
  heroInfo: {
    position: 'absolute',
    bottom: 0,
    left: 16,
    right: 16,
    paddingBottom: 16,
  },
  heroInfoRow: { flexDirection: 'row', gap: 16 },
  heroPoster: { width: 112, aspectRatio: 2 / 3, borderRadius: 12 },
  heroInfoText: { flex: 1, justifyContent: 'flex-end' },
  statusBadge: {
    backgroundColor: colors.red600,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  statusBadgeText: {
    color: colors.white,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  heroTitle: { fontSize: 28, fontWeight: '800', color: colors.white, marginBottom: 8 },
  heroRatingRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  heroRatingValue: { fontSize: 20, fontWeight: '700', color: colors.white },
  heroReviewCount: { fontSize: 14, color: colors.white60 },
  heroMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  heroMeta: { fontSize: 14, color: colors.white60 },
  heroMetaDot: { fontSize: 14, color: colors.white40 },

  section: { paddingHorizontal: 16, marginTop: 24 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: colors.white, marginBottom: 12 },
  watchOnRow: { gap: 8 },
  watchOnButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
  },
  watchOnLogo: { width: 40, height: 40, borderRadius: 8 },
  watchOnLogoText: { fontSize: 20, fontWeight: '700', color: colors.white },
  watchOnName: { fontSize: 14, fontWeight: '600', color: colors.white },
  watchOnStream: { fontSize: 12, color: 'rgba(255,255,255,0.7)' },

  releaseAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginHorizontal: 16,
    marginTop: 24,
    padding: 16,
    backgroundColor: colors.blue600_20,
    borderWidth: 1,
    borderColor: colors.blue600_30,
    borderRadius: 12,
  },
  releaseAlertTitle: { fontSize: 14, fontWeight: '600', color: colors.white },
  releaseAlertDate: { fontSize: 14, color: colors.blue400 },

  tabBar: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 24,
    backgroundColor: colors.white5,
    borderRadius: 12,
    padding: 4,
  },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 8 },
  tabActive: { backgroundColor: colors.red600 },
  tabText: { fontSize: 14, fontWeight: '600', color: colors.white60 },
  tabTextActive: { color: colors.white },

  tabContent: { paddingHorizontal: 16, paddingTop: 20, paddingBottom: 120 },

  overviewTab: { gap: 20 },
  synopsis: { fontSize: 15, color: 'rgba(255,255,255,0.8)', lineHeight: 24 },
  genreRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  genrePill: {
    backgroundColor: colors.white10,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  genrePillText: { color: colors.white, fontSize: 14 },
  infoGrid: { flexDirection: 'row', gap: 12 },
  infoCard: {
    flex: 1,
    backgroundColor: colors.white5,
    borderRadius: 12,
    padding: 16,
    gap: 4,
  },
  infoLabel: { fontSize: 12, color: colors.white60 },
  infoValue: { fontSize: 14, fontWeight: '600', color: colors.white },
  trailerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.red600_20,
    paddingVertical: 14,
    borderRadius: 12,
  },
  trailerButtonText: { color: colors.red400, fontSize: 16, fontWeight: '600' },

  castTab: { gap: 16 },
  castSectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.white40,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 4,
    marginTop: 4,
  },
  castItem: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  castInfo: { flex: 1, gap: 2 },
  castName: { fontSize: 16, fontWeight: '600', color: colors.white },
  castRole: { fontSize: 14, color: colors.white60 },
  emptyText: { color: colors.white40, fontSize: 14, textAlign: 'center', paddingVertical: 24 },

  reviewsTab: { gap: 16 },
  ratingSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 24,
    backgroundColor: colors.white5,
    borderRadius: 12,
  },
  ratingSummaryValue: { fontSize: 36, fontWeight: '700', color: colors.white },
  ratingSummaryMax: { fontSize: 20, color: colors.white60, marginTop: 8 },
  ratingSummaryCount: { fontSize: 14, color: colors.white60, marginTop: 8, marginLeft: 4 },
  writeReviewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.red600,
    paddingVertical: 14,
    borderRadius: 12,
  },
  writeReviewText: { color: colors.white, fontSize: 16, fontWeight: '600' },
  reviewCard: {
    padding: 16,
    backgroundColor: colors.white5,
    borderRadius: 12,
    gap: 8,
  },
  reviewHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  reviewAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.white10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reviewUserName: { fontSize: 14, fontWeight: '600', color: colors.white },
  reviewDate: { fontSize: 12, color: colors.white40 },
  reviewTitle: { fontSize: 16, fontWeight: '600', color: colors.white },
  reviewBody: { fontSize: 14, color: 'rgba(255,255,255,0.7)', lineHeight: 20 },
  spoilerBadge: {
    backgroundColor: colors.orange600_20,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  spoilerBadgeText: { fontSize: 12, fontWeight: '600', color: colors.orange500 },
  helpfulButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
  },
  helpfulText: { fontSize: 12, color: colors.white40 },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.black95,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.zinc900,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    gap: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalTitle: { fontSize: 20, fontWeight: '700', color: colors.white },
  modalMovieInfo: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  modalPoster: { width: 56, height: 84, borderRadius: 8 },
  modalMovieTitle: { fontSize: 16, fontWeight: '600', color: colors.white },
  modalMovieMeta: { fontSize: 14, color: colors.white60 },
  modalStars: { alignItems: 'center' },
  modalInput: {
    backgroundColor: colors.white5,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.white,
  },
  modalTextArea: { height: 120 },
  spoilerToggle: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  toggleTrack: {
    width: 48,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.white20,
    justifyContent: 'center',
    padding: 2,
  },
  toggleTrackActive: { backgroundColor: colors.red600 },
  toggleThumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.white,
  },
  toggleThumbActive: { alignSelf: 'flex-end' },
  spoilerToggleText: { fontSize: 16, color: colors.white },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalCancelText: { color: colors.white60, fontSize: 16 },
  modalSubmitButton: {
    backgroundColor: colors.red600,
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 12,
  },
  modalSubmitText: { color: colors.white, fontSize: 16, fontWeight: '600' },
});
