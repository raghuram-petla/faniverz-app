import { View, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme';
import { colors as palette } from '@/theme/colors';
import { HomeButton } from '@/components/common/HomeButton';
import { createStyles } from '@/styles/movieDetail.styles';

/** @contract Floating header over hero image with back, home, follow/watchlist, and share buttons */
interface MovieDetailHeaderProps {
  /** @coupling Must include safe area top inset — caller uses useSafeAreaInsets() */
  insetsTop: number;
  actionType: 'follow' | 'watchlist';
  isActionActive: boolean;
  onBack: () => void;
  onShare: () => void;
  /** @sideeffect Toggles follow/watchlist mutation — caller handles auth gating */
  onToggleAction: () => void;
  /** @nullable Falls back to 'movie' in accessibility labels when title not yet loaded */
  movieTitle?: string;
}

/** @assumes Rendered over hero image with rgba backgrounds — white icons required for contrast */
export function MovieDetailHeader({
  insetsTop,
  actionType,
  isActionActive,
  onBack,
  onShare,
  onToggleAction,
  movieTitle,
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
      <View style={styles.heroHeaderLeft}>
        <TouchableOpacity style={styles.heroButton} onPress={onBack} accessibilityLabel="Go back">
          <Ionicons name="arrow-back" size={22} color={colors.white} />
        </TouchableOpacity>
        <HomeButton style={styles.heroButton} iconColor={colors.white} />
      </View>
      <View style={styles.heroHeaderRight}>
        <TouchableOpacity
          style={[styles.heroButton, isActionActive && styles.heroButtonActive]}
          onPress={onToggleAction}
          accessibilityLabel={accessibilityLabel}
        >
          <Ionicons
            name={iconName}
            size={22}
            color={isActionActive ? palette.green500 : colors.white}
          />
        </TouchableOpacity>
        <TouchableOpacity style={styles.heroButton} onPress={onShare} accessibilityLabel="Share">
          <Ionicons name="share-outline" size={22} color={colors.white} />
        </TouchableOpacity>
      </View>
    </View>
  );
}
