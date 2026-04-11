import { View, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated from 'react-native-reanimated';
import { useTheme } from '@/theme';
import { colors as palette } from '@/theme/colors';
import { HomeButton } from '@/components/common/HomeButton';
import { createStyles } from '@/styles/movieDetail.styles';
import type { LayoutChangeEvent } from 'react-native';

/**
 * @contract Fixed nav bar at top of movie detail — always visible.
 * Background fades from transparent to solid as user scrolls past the hero.
 */
interface MovieDetailHeaderProps {
  /** @coupling Must include safe area top inset — caller uses useSafeAreaInsets() */
  insetsTop: number;
  actionType: 'follow' | 'watchlist';
  isActionActive: boolean;
  onBack: () => void;
  onShare: () => void;
  onToggleAction: () => void;
  movieTitle?: string;
  /** @coupling Animated style from useDetailScrollAnimations — controls bg opacity */
  navBarBgStyle: { opacity: number };
  onNavLeftLayout?: (e: LayoutChangeEvent) => void;
  onNavRightLayout?: (e: LayoutChangeEvent) => void;
}

export function MovieDetailHeader({
  insetsTop,
  actionType,
  isActionActive,
  onBack,
  onShare,
  onToggleAction,
  movieTitle,
  navBarBgStyle,
  onNavLeftLayout,
  onNavRightLayout,
}: MovieDetailHeaderProps) {
  const { theme, colors } = useTheme();
  const styles = createStyles(theme);

  const iconName = isActionActive
    ? actionType === 'follow'
      ? 'heart'
      : 'bookmark'
    : actionType === 'follow'
      ? 'heart-outline'
      : 'bookmark-outline';

  const accessibilityLabel = isActionActive
    ? actionType === 'follow'
      ? `Following ${movieTitle ?? 'movie'}, tap to unfollow`
      : `${movieTitle ?? 'movie'} saved, tap to remove`
    : actionType === 'follow'
      ? `Follow ${movieTitle ?? 'movie'}`
      : `Save ${movieTitle ?? 'movie'}`;

  return (
    <View style={[styles.heroHeader, { paddingTop: insetsTop + 8 }]}>
      {/* Solid background that fades in on scroll */}
      <Animated.View style={[styles.stickyNavBg, navBarBgStyle]} />

      <View style={styles.heroHeaderLeft} onLayout={onNavLeftLayout}>
        <TouchableOpacity style={styles.heroButton} onPress={onBack} accessibilityLabel="Go back">
          <Ionicons name="arrow-back" size={16} color={colors.white} />
        </TouchableOpacity>
        <HomeButton forceShow style={styles.heroButton} iconColor={colors.white} iconSize={16} />
      </View>
      <View style={styles.heroHeaderRight} onLayout={onNavRightLayout}>
        <TouchableOpacity
          style={[styles.heroButton, isActionActive && styles.heroButtonActive]}
          onPress={onToggleAction}
          accessibilityLabel={accessibilityLabel}
        >
          <Ionicons
            name={iconName}
            size={16}
            color={isActionActive ? palette.red500 : colors.white}
          />
        </TouchableOpacity>
        <TouchableOpacity style={styles.heroButton} onPress={onShare} accessibilityLabel="Share">
          <Ionicons name="share-outline" size={16} color={colors.white} />
        </TouchableOpacity>
      </View>
    </View>
  );
}
