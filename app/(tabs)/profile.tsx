import { ScrollView, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useAuth } from '@/features/auth/providers/AuthProvider';
import { useProfile } from '@/features/auth/hooks/useProfile';
import { useEmailAuth } from '@/features/auth/hooks/useEmailAuth';
import { colors } from '@/theme/colors';

const PLACEHOLDER_AVATAR = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200';

interface MenuItem {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  route: string;
  badge?: string;
}

const MENU_ITEMS: MenuItem[] = [
  { icon: 'create-outline', label: 'Edit Profile', route: '/profile/edit' },
  { icon: 'notifications-outline', label: 'Notifications', route: '/notifications', badge: '3' },
  { icon: 'star-outline', label: 'My Reviews', route: '/profile/reviews' },
  { icon: 'settings-outline', label: 'Settings', route: '/profile/settings' },
  { icon: 'heart-outline', label: 'Favorite Actors', route: '/profile/favorite-actors' },
  { icon: 'eye-outline', label: 'Watched Movies', route: '/profile/watched' },
];

function formatMemberSince(dateString: string | null | undefined): string {
  if (!dateString) return 'Unknown';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

export default function ProfileScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const { signOut, isLoading: isSigningOut } = useEmailAuth();

  const isLoggedIn = !!user;

  const displayName = profile?.display_name ?? user?.email?.split('@')[0] ?? 'Guest User';
  const email = user?.email ?? 'guest@example.com';
  const avatarUrl = profile?.avatar_url ?? PLACEHOLDER_AVATAR;
  const memberSince = formatMemberSince(user?.created_at);

  const watchlistCount = 0;
  const reviewsCount = 0;
  const avgRating = 0;

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch {
      // error is handled inside useEmailAuth
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
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
          {isLoggedIn && <Text style={styles.memberSince}>Member since {memberSince}</Text>}
        </View>
      </View>

      {/* Menu Items */}
      <View style={styles.menuCard}>
        {MENU_ITEMS.map((item, index) => (
          <TouchableOpacity
            key={item.route}
            style={[styles.menuItem, index < MENU_ITEMS.length - 1 && styles.menuItemBorder]}
            activeOpacity={0.7}
            onPress={() => router.push(item.route as Parameters<typeof router.push>[0])}
          >
            <View style={styles.menuItemLeft}>
              <Ionicons name={item.icon} size={20} color={colors.white60} />
              <Text style={styles.menuItemLabel}>{item.label}</Text>
            </View>
            <View style={styles.menuItemRight}>
              {item.badge ? (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{item.badge}</Text>
                </View>
              ) : null}
              <Ionicons name="chevron-forward" size={18} color={colors.white40} />
            </View>
          </TouchableOpacity>
        ))}
      </View>

      {/* Auth Buttons */}
      {isLoggedIn ? (
        <TouchableOpacity
          style={styles.logoutButton}
          activeOpacity={0.8}
          onPress={handleSignOut}
          disabled={isSigningOut}
        >
          <Ionicons name="log-out-outline" size={20} color={colors.red500} />
          <Text style={styles.logoutText}>{isSigningOut ? 'Logging out…' : 'Logout'}</Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.loginSection}>
          <TouchableOpacity
            style={styles.loginButton}
            activeOpacity={0.85}
            onPress={() => router.push('/auth/login' as Parameters<typeof router.push>[0])}
          >
            <Ionicons name="log-in-outline" size={20} color={colors.white} />
            <Text style={styles.loginText}>Login / Sign Up</Text>
          </TouchableOpacity>
          <Text style={styles.loginHint}>
            Create an account to sync your data and unlock more features
          </Text>
        </View>
      )}

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerVersion}>Faniverz v1.0.0</Text>
        <Text style={styles.footerTagline}>Your Telugu Cinema Companion</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.black,
  },
  contentContainer: {
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 40,
  },

  // Profile Card
  profileCard: {
    backgroundColor: colors.zinc900,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.white10,
    padding: 24,
    marginBottom: 16,
  },
  profileTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
    marginBottom: 16,
  },

  // Avatar
  avatarWrapper: {
    position: 'relative',
    flexShrink: 0,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    borderColor: colors.zinc900,
  },
  cameraButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.red600,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Stats
  statsRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingTop: 4,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: colors.white10,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.white,
    lineHeight: 24,
  },
  statLabel: {
    fontSize: 11,
    color: colors.white60,
    marginTop: 2,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },

  // User info
  userInfo: {
    borderTopWidth: 1,
    borderTopColor: colors.white10,
    paddingTop: 12,
  },
  displayName: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.white,
  },
  emailText: {
    fontSize: 13,
    color: colors.white60,
    marginTop: 2,
  },
  memberSince: {
    fontSize: 12,
    color: colors.white40,
    marginTop: 4,
  },

  // Menu Card
  menuCard: {
    backgroundColor: colors.zinc900,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.white10,
    overflow: 'hidden',
    marginBottom: 16,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  menuItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.white5,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  menuItemLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.white,
  },
  menuItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  // Badge
  badge: {
    backgroundColor: colors.red600,
    borderRadius: 999,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.white,
  },

  // Logout
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: colors.red600_20,
    borderRadius: 12,
    paddingVertical: 16,
    marginBottom: 16,
  },
  logoutText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.red500,
  },

  // Login
  loginSection: {
    marginBottom: 16,
    gap: 10,
  },
  loginButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderRadius: 16,
    paddingVertical: 16,
    // Gradient fallback — LinearGradient would require expo-linear-gradient;
    // using red600 as solid fallback consistent with the app's primary colour.
    backgroundColor: colors.red600,
  },
  loginText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.white,
  },
  loginHint: {
    fontSize: 13,
    color: colors.white50,
    textAlign: 'center',
  },

  // Footer
  footer: {
    alignItems: 'center',
    marginTop: 16,
    gap: 4,
  },
  footerVersion: {
    fontSize: 13,
    color: colors.white40,
  },
  footerTagline: {
    fontSize: 12,
    color: colors.white30,
  },
});
