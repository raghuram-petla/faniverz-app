import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/theme';

export default function TabLayout() {
  const { theme, colors } = useTheme();
  const { t } = useTranslation();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        animation: 'none',
        tabBarActiveTintColor: colors.red600,
        tabBarInactiveTintColor: theme.textSecondary,
        // @assumes: height 80 + paddingBottom 20 accommodates the iPhone home indicator
        // (34pt). On Android (no home indicator), the extra padding creates a slightly
        // taller tab bar than stock Material Design, but this is a deliberate design choice
        // for visual consistency across platforms.
        tabBarStyle: {
          backgroundColor: theme.surface,
          borderTopColor: theme.border,
          borderTopWidth: 1,
          height: 80,
          paddingBottom: 20,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t('tabs.home'),
          tabBarIcon: ({ color, size }) => <Ionicons name="home" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="spotlight"
        options={{
          title: t('tabs.spotlight'),
          tabBarIcon: ({ color, size }) => <Ionicons name="star" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="calendar"
        options={{
          title: t('tabs.calendar'),
          tabBarIcon: ({ color, size }) => <Ionicons name="calendar" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="watchlist"
        options={{
          title: t('tabs.watchlist'),
          tabBarIcon: ({ color, size }) => <Ionicons name="bookmark" size={size} color={color} />,
        }}
      />
      {/* @coupling: href=null hides these tabs from the tab bar but keeps them
          routable via router.push('/(tabs)/feed'). Removing these Screen declarations
          entirely would cause Expo Router to auto-generate tab entries from the file
          system, making hidden tabs suddenly appear in the tab bar. */}
      <Tabs.Screen
        name="feed"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="surprise"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t('tabs.profile'),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-circle" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
