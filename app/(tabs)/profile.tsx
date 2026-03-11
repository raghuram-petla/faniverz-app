import { useRef } from 'react';
import { ScrollView, View, Text, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import Constants from 'expo-constants';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
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
import { createStyles } from '@/styles/tabs/profile.styles';
import { getImageUrl } from '@shared/imageUrl';
import type { FeedEntityType } from '@shared/types';

interface MenuItem {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  route: string;
  badge?: string;
}

const MENU_ITEMS: MenuItem[] = [
  { icon: 'create-outline', label: 'Edit Profile', route: '/profile/edit' },
  { icon: 'at-outline', label: 'Username', route: '/profile/username' },
  { icon: 'notifications-outline', label: 'Notifications', route: '/notifications' },
  { icon: 'star-outline', label: 'My Reviews', route: '/profile/reviews' },
  { icon: 'settings-outline', label: 'Settings', route: '/profile/settings' },
  { icon: 'people-outline', label: 'Following', route: '/profile/following' },
  { icon: 'time-outline', label: 'Activity', route: '/profile/activity' },
  { icon: 'heart-outline', label: 'Favorite Actors', route: '/profile/favorite-actors' },
  { icon: 'eye-outline', label: 'Watched Movies', route: '/profile/watched' },
  { icon: 'person-outline', label: 'Account Details', route: '/profile/account' },
];

export default function ProfileScreen() {
  const { theme, colors } = useTheme();
  const styles = createStyles(theme);
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const { data: profile, refetch: refetchProfile } = useProfile();

  const isLoggedIn = !!user;

  const displayName = profile?.display_name ?? user?.email?.split('@')[0] ?? 'Guest';
  const usernameDisplay = profile?.username ? `@${profile.username}` : null;
  const email = user?.email ?? '';
  const avatarUrl = getImageUrl(profile?.avatar_url ?? null, 'md') ?? PLACEHOLDER_AVATAR;
  const memberSince = formatMemberSince(user?.created_at);

  const userId = user?.id ?? '';
  const { data: watchlistItems = [], refetch: refetchWatchlist } = useWatchlist(userId);
  const { data: userReviews = [], refetch: refetchReviews } = useUserReviews(userId);
  const { data: enrichedFollows = [] } = useEnrichedFollows();
  const unreadCount = useUnreadCount(userId);
  const { refreshing, onRefresh } = useRefresh(refetchProfile, refetchWatchlist, refetchReviews);
  const { pullDistance, isRefreshing, handlePullScroll, handleScrollEndDrag } = usePullToRefresh(
    onRefresh,
    refreshing,
  );
  const scrollRef = useRef<ScrollView>(null);
  useScrollToTop(scrollRef);

  const watchlistCount = watchlistItems.length;
  const reviewsCount = userReviews.length;
  const avgRating =
    reviewsCount > 0 ? userReviews.reduce((sum, r) => sum + r.rating, 0) / reviewsCount : 0;

  const menuItems = MENU_ITEMS.map((item) =>
    item.label === 'Notifications' && unreadCount > 0
      ? { ...item, badge: String(unreadCount) }
      : item,
  );

  const handleEntityPress = (entityType: FeedEntityType, entityId: string) => {
    const routes: Record<FeedEntityType, string> = {
      movie: `/movie/${entityId}`,
      actor: `/actor/${entityId}`,
      production_house: `/production-house/${entityId}`,
      user: `/profile`,
    };
    router.push(routes[entityType] as Parameters<typeof router.push>[0]);
  };

  // Guest view — login/signup prompt only
  if (!isLoggedIn) {
    return (
      <View style={[styles.container, styles.guestContainer, { paddingTop: insets.top + 16 }]}>
        <View style={styles.guestContent}>
          <Ionicons name="person-circle-outline" size={100} color={theme.textDisabled} />
          <Text style={styles.guestTitle}>Sign in to Faniverz</Text>
          <Text style={styles.guestSubtitle}>
            Create an account to track your watchlist, write reviews, and more
          </Text>
          <TouchableOpacity
            style={styles.loginButton}
            activeOpacity={0.85}
            onPress={() => router.push('/(auth)/login' as Parameters<typeof router.push>[0])}
          >
            <Ionicons name="log-in-outline" size={20} color={colors.white} />
            <Text style={styles.loginText}>Sign In / Sign Up</Text>
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
              <Text style={styles.menuItemLabel}>Settings</Text>
            </View>
            <View style={styles.menuItemRight}>
              <Ionicons name="chevron-forward" size={18} color={theme.textTertiary} />
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerVersion}>
            Faniverz v{Constants.expoConfig?.version ?? '1.0.0'}
          </Text>
          <Text style={styles.footerTagline}>Your Movie Companion</Text>
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
              <Text style={styles.statValue}>{watchlistCount}</Text>
              <Text style={styles.statLabel}>Watchlist</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{reviewsCount}</Text>
              <Text style={styles.statLabel}>Reviews</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <View style={styles.ratingRow}>
                <Ionicons name="star" size={14} color={colors.yellow400} />
                <Text style={styles.statValue}>{avgRating.toFixed(1)}</Text>
              </View>
              <Text style={styles.statLabel}>Avg Rating</Text>
            </View>
          </View>
        </View>

        {/* User info */}
        <View style={styles.userInfo}>
          <Text style={styles.displayName}>{displayName}</Text>
          {usernameDisplay && <Text style={styles.usernameText}>{usernameDisplay}</Text>}
          <Text style={styles.emailText}>{email}</Text>
          <Text style={styles.memberSince}>Member since {memberSince}</Text>
        </View>
      </View>

      {/* Following Section */}
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
              <Text style={styles.menuItemLabel}>{item.label}</Text>
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
          Faniverz v{Constants.expoConfig?.version ?? '1.0.0'}
        </Text>
        <Text style={styles.footerTagline}>Your Movie Companion</Text>
      </View>
    </ScrollView>
  );
}
