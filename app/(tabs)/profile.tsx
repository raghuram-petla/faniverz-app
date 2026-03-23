import { useRef, useMemo } from 'react';
import { ScrollView, View, Text, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import Constants from 'expo-constants';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/features/auth/providers/AuthProvider';
import { useProfile } from '@/features/auth/hooks/useProfile';
import { useWatchlist } from '@/features/watchlist/hooks';
import { useUserReviews } from '@/features/reviews/hooks';
import { useUnreadCount } from '@/features/notifications/hooks';
import { useTheme } from '@/theme';
import { PullToRefreshIndicator } from '@/components/common/PullToRefreshIndicator';
import { useRefresh } from '@/hooks/useRefresh';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { useScrollToTop } from '@react-navigation/native';
import { PLACEHOLDER_AVATAR } from '@/constants/placeholders';
import { formatMemberSince } from '@/utils/formatDate';
import { useEnrichedFollows } from '@/features/feed';
import { FollowingSection } from '@/components/profile/FollowingSection';
import { AnimatedNumber } from '@/components/ui/AnimatedNumber';
import { createStyles } from '@/styles/tabs/profile.styles';
import { getImageUrl } from '@shared/imageUrl';
import type { FeedEntityType } from '@shared/types';

interface MenuItem {
  icon: keyof typeof Ionicons.glyphMap;
  labelKey: string;
  route: string;
  badge?: string;
}

const MENU_ITEM_DEFS: Omit<MenuItem, 'badge'>[] = [
  { icon: 'create-outline', labelKey: 'profile.editProfile', route: '/profile/edit' },
  { icon: 'at-outline', labelKey: 'profile.username', route: '/profile/username' },
  { icon: 'notifications-outline', labelKey: 'profile.notifications', route: '/notifications' },
  { icon: 'star-outline', labelKey: 'profile.myReviews', route: '/profile/reviews' },
  { icon: 'settings-outline', labelKey: 'profile.settings', route: '/profile/settings' },
  { icon: 'people-outline', labelKey: 'profile.following', route: '/profile/following' },
  { icon: 'time-outline', labelKey: 'profile.activity', route: '/profile/activity' },
  { icon: 'heart-outline', labelKey: 'profile.favoriteActors', route: '/profile/favorite-actors' },
  { icon: 'eye-outline', labelKey: 'profile.watchedMovies', route: '/profile/watched' },
  { icon: 'person-outline', labelKey: 'profile.accountDetails', route: '/profile/account' },
];

// @boundary Profile tab — dual-mode: guest view (login prompt) vs authenticated view (stats + menu)
// @coupling useProfile, useWatchlist, useUserReviews, useEnrichedFollows, useUnreadCount — five data sources
export default function ProfileScreen() {
  const { theme, colors } = useTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  // @nullable profile can be null during initial load or if backend profile row is missing
  const { data: profile, refetch: refetchProfile } = useProfile();

  const isLoggedIn = !!user;

  // @edge Fallback chain: display_name -> email prefix -> 'Guest' literal
  const displayName = profile?.display_name ?? user?.email?.split('@')[0] ?? 'Guest';
  // @nullable usernameDisplay is null when profile has no username set
  const usernameDisplay = profile?.username ? `@${profile.username}` : null;
  const email = user?.email ?? '';
  // @nullable avatar_url can be null — falls back to PLACEHOLDER_AVATAR constant
  const avatarUrl = getImageUrl(profile?.avatar_url ?? null, 'md', 'AVATARS') ?? PLACEHOLDER_AVATAR;
  const memberSince = formatMemberSince(user?.created_at);

  const userId = user?.id ?? '';
  const { data: watchlistItems = [], refetch: refetchWatchlist } = useWatchlist(userId);
  const { data: userReviews = [], refetch: refetchReviews } = useUserReviews(userId);
  const { data: enrichedFollows = [] } = useEnrichedFollows();
  const unreadCount = useUnreadCount(userId);
  const { refreshing, onRefresh } = useRefresh(refetchProfile, refetchWatchlist, refetchReviews);
  const {
    pullDistance,
    isRefreshing,
    handleScrollBeginDrag,
    handlePullScroll,
    handleScrollEndDrag,
  } = usePullToRefresh(onRefresh, refreshing);
  const scrollRef = useRef<ScrollView>(null);
  useScrollToTop(scrollRef);

  const watchlistCount = watchlistItems.length;
  const reviewsCount = userReviews.length;
  // @edge avgRating defaults to 0 when no reviews to avoid division by zero
  const avgRating =
    reviewsCount > 0 ? userReviews.reduce((sum, r) => sum + r.rating, 0) / reviewsCount : 0;

  // @contract Only the notifications menu item gets a badge; value is unread notification count
  const menuItems = useMemo(
    () =>
      MENU_ITEM_DEFS.map((item) => ({
        ...item,
        badge:
          item.labelKey === 'profile.notifications' && unreadCount > 0
            ? String(unreadCount)
            : undefined,
      })),
    [unreadCount, t],
  );

  // @contract Maps all FeedEntityType values to routes; user always goes to own profile (not /user/:id)
  const handleEntityPress = (entityType: FeedEntityType, entityId: string) => {
    const routes: Record<FeedEntityType, string> = {
      movie: `/movie/${entityId}`,
      actor: `/actor/${entityId}`,
      production_house: `/production-house/${entityId}`,
      user: `/profile`,
    };
    router.push(routes[entityType] as Parameters<typeof router.push>[0]);
  };

  // @boundary Guest view — only shows login button + settings; no profile data or menu items
  if (!isLoggedIn) {
    return (
      <View style={[styles.container, styles.guestContainer, { paddingTop: insets.top + 16 }]}>
        <View style={styles.guestContent}>
          <Ionicons name="person-circle-outline" size={100} color={theme.textDisabled} />
          <Text style={styles.guestTitle}>{t('profile.signInTitle')}</Text>
          <Text style={styles.guestSubtitle}>{t('profile.signInSubtitle')}</Text>
          <TouchableOpacity
            style={styles.loginButton}
            activeOpacity={0.85}
            onPress={() => router.push('/(auth)/login' as Parameters<typeof router.push>[0])}
          >
            <Ionicons name="log-in-outline" size={20} color={colors.white} />
            <Text style={styles.loginText}>{t('auth.signIn')}</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.menuCard}>
          <TouchableOpacity
            style={styles.menuItem}
            activeOpacity={0.7}
            onPress={() => router.push('/profile/settings' as Parameters<typeof router.push>[0])}
          >
            <View style={styles.menuItemLeft}>
              <Ionicons name="settings-outline" size={20} color={theme.textSecondary} />
              <Text style={styles.menuItemLabel}>{t('profile.settings')}</Text>
            </View>
            <View style={styles.menuItemRight}>
              <Ionicons name="chevron-forward" size={18} color={theme.textTertiary} />
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerVersion}>
            {t('profile.version', { version: Constants.expoConfig?.version ?? '1.0.0' })}
          </Text>
          <Text style={styles.footerTagline}>{t('profile.tagline')}</Text>
        </View>
      </View>
    );
  }

  return (
    <ScrollView
      ref={scrollRef}
      style={styles.container}
      contentContainerStyle={[styles.contentContainer, { paddingTop: insets.top + 16 }]}
      showsVerticalScrollIndicator={false}
      onScroll={handlePullScroll}
      onScrollBeginDrag={handleScrollBeginDrag}
      onScrollEndDrag={handleScrollEndDrag}
      scrollEventThrottle={16}
    >
      <PullToRefreshIndicator
        pullDistance={pullDistance}
        isRefreshing={isRefreshing}
        refreshing={refreshing}
      />
      {/* Profile Card */}
      <View style={styles.profileCard}>
        <View style={styles.profileTop}>
          {/* Avatar with camera button */}
          <View style={styles.avatarWrapper}>
            <Image
              source={{ uri: avatarUrl }}
              style={styles.avatar}
              contentFit="cover"
              transition={200}
            />
            <TouchableOpacity
              style={styles.cameraButton}
              activeOpacity={0.8}
              onPress={() => router.push('/profile/edit')}
            >
              <Ionicons name="camera-outline" size={14} color={colors.white} />
            </TouchableOpacity>
          </View>

          {/* Stats row */}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <AnimatedNumber style={styles.statValue} value={watchlistCount} />
              <Text style={styles.statLabel}>{t('profile.watchlistStat')}</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <AnimatedNumber style={styles.statValue} value={reviewsCount} />
              <Text style={styles.statLabel}>{t('profile.reviewsStat')}</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <View style={styles.ratingRow}>
                <Ionicons name="star" size={14} color={colors.yellow400} />
                <AnimatedNumber style={styles.statValue} value={avgRating} decimals={1} />
              </View>
              <Text style={styles.statLabel}>{t('profile.avgRating')}</Text>
            </View>
          </View>
        </View>

        {/* User info */}
        <View style={styles.userInfo}>
          <Text style={styles.displayName} numberOfLines={1}>
            {displayName}
          </Text>
          {usernameDisplay && <Text style={styles.usernameText}>{usernameDisplay}</Text>}
          <Text style={styles.emailText}>{email}</Text>
          <Text style={styles.memberSince}>{t('profile.memberSince', { date: memberSince })}</Text>
        </View>
      </View>

      {/* @edge Following section only renders when user has at least one follow */}
      {enrichedFollows.length > 0 && (
        <FollowingSection
          follows={enrichedFollows}
          onEntityPress={handleEntityPress}
          onViewAll={() => router.push('/profile/following' as Parameters<typeof router.push>[0])}
        />
      )}

      {/* Menu Items */}
      <View style={styles.menuCard}>
        {menuItems.map((item) => (
          <TouchableOpacity
            key={item.route}
            style={[styles.menuItem, styles.menuItemBorder]}
            activeOpacity={0.7}
            onPress={() => router.push(item.route as Parameters<typeof router.push>[0])}
          >
            <View style={styles.menuItemLeft}>
              <Ionicons name={item.icon} size={20} color={theme.textSecondary} />
              <Text style={styles.menuItemLabel}>{t(item.labelKey)}</Text>
            </View>
            <View style={styles.menuItemRight}>
              {item.badge ? (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{item.badge}</Text>
                </View>
              ) : null}
              <Ionicons name="chevron-forward" size={18} color={theme.textTertiary} />
            </View>
          </TouchableOpacity>
        ))}
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerVersion}>
          {t('profile.version', { version: Constants.expoConfig?.version ?? '1.0.0' })}
        </Text>
        <Text style={styles.footerTagline}>{t('profile.tagline')}</Text>
      </View>
    </ScrollView>
  );
}
