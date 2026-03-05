import { ScrollView, View, Text, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/features/auth/providers/AuthProvider';
import { useProfile } from '@/features/auth/hooks/useProfile';
import { useWatchlist } from '@/features/watchlist/hooks';
import { useUserReviews } from '@/features/reviews/hooks';
import { useUnreadCount } from '@/features/notifications/hooks';
import { useTheme } from '@/theme';
import { PLACEHOLDER_AVATAR } from '@/constants/placeholders';
import { formatMemberSince } from '@/utils/formatDate';
import { createStyles } from '@/styles/tabs/profile.styles';

interface MenuItem {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  route: string;
  badge?: string;
}

const MENU_ITEMS: MenuItem[] = [
  { icon: 'create-outline', label: 'Edit Profile', route: '/profile/edit' },
  { icon: 'notifications-outline', label: 'Notifications', route: '/notifications' },
  { icon: 'star-outline', label: 'My Reviews', route: '/profile/reviews' },
  { icon: 'settings-outline', label: 'Settings', route: '/profile/settings' },
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
  const { data: profile } = useProfile();

  const isLoggedIn = !!user;

  const displayName = profile?.display_name ?? user?.email?.split('@')[0] ?? 'Guest';
  const email = user?.email ?? '';
  const avatarUrl = profile?.avatar_url ?? PLACEHOLDER_AVATAR;
  const memberSince = formatMemberSince(user?.created_at);

  const userId = user?.id ?? '';
  const { data: watchlistItems = [] } = useWatchlist(userId);
  const { data: userReviews = [] } = useUserReviews(userId);
  const unreadCount = useUnreadCount(userId);

  const watchlistCount = watchlistItems.length;
  const reviewsCount = userReviews.length;
  const avgRating =
    reviewsCount > 0 ? userReviews.reduce((sum, r) => sum + r.rating, 0) / reviewsCount : 0;

  const menuItems = MENU_ITEMS.map((item) =>
    item.label === 'Notifications' && unreadCount > 0
      ? { ...item, badge: String(unreadCount) }
      : item,
  );

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
            <Text style={styles.loginText}>Login / Sign Up</Text>
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
          <Text style={styles.footerVersion}>Faniverz v1.0.0</Text>
          <Text style={styles.footerTagline}>Your Telugu Cinema Companion</Text>
        </View>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.contentContainer, { paddingTop: insets.top + 16 }]}
      showsVerticalScrollIndicator={false}
    >
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
          <Text style={styles.emailText}>{email}</Text>
          <Text style={styles.memberSince}>Member since {memberSince}</Text>
        </View>
      </View>

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
        <Text style={styles.footerVersion}>Faniverz v1.0.0</Text>
        <Text style={styles.footerTagline}>Your Telugu Cinema Companion</Text>
      </View>
    </ScrollView>
  );
}
