import { View, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme';
import type { SemanticTheme } from '@shared/themes';

export const HOME_FEED_HEADER_CONTENT_HEIGHT = 52;

export interface HomeFeedHeaderChromeProps {
  insetTop: number;
  headerContentHeight?: number;
  interactive?: boolean;
  onSearchPress?: () => void;
  onNotificationsPress?: () => void;
}

type HeaderIconName = 'search' | 'notifications-outline';

// @contract Shared home-feed chrome used by both the real header and the image-viewer close mask.
export function HomeFeedHeaderChrome({
  insetTop,
  headerContentHeight = HOME_FEED_HEADER_CONTENT_HEIGHT,
  interactive = false,
  onSearchPress,
  onNotificationsPress,
}: HomeFeedHeaderChromeProps) {
  const { theme } = useTheme();
  const styles = createChromeStyles(theme);

  const renderButton = (label: string, icon: HeaderIconName, onPress?: () => void) => {
    if (interactive) {
      return (
        <TouchableOpacity
          style={styles.headerButton}
          onPress={onPress}
          accessibilityRole="button"
          accessibilityLabel={label}
        >
          <Ionicons name={icon} size={20} color={theme.textPrimary} />
        </TouchableOpacity>
      );
    }

    return (
      <View style={styles.headerButton}>
        <Ionicons name={icon} size={20} color={theme.textPrimary} />
      </View>
    );
  };

  return (
    <View
      style={[styles.header, { paddingTop: insetTop, height: insetTop + headerContentHeight }]}
      pointerEvents={interactive ? 'auto' : 'none'}
      importantForAccessibility={interactive ? 'auto' : 'no-hide-descendants'}
      testID="home-feed-header-chrome"
    >
      <Image
        source={require('../../../assets/logo-full.png')}
        style={styles.logoFull}
        contentFit="contain"
        accessibilityLabel={interactive ? 'Faniverz' : undefined}
      />
      <View style={styles.headerButtons}>
        {renderButton('Search', 'search', onSearchPress)}
        {renderButton('Notifications', 'notifications-outline', onNotificationsPress)}
      </View>
    </View>
  );
}

function createChromeStyles(t: SemanticTheme) {
  return {
    header: {
      paddingHorizontal: 10,
      flexDirection: 'row' as const,
      justifyContent: 'space-between' as const,
      alignItems: 'center' as const,
      paddingBottom: 4,
      backgroundColor: t.background,
    },
    logoFull: {
      height: 52,
      width: 146,
    },
    headerButtons: {
      flexDirection: 'row' as const,
      gap: 8,
    },
    headerButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: t.input,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
  };
}
