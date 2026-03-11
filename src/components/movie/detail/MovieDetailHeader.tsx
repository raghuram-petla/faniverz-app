import { View, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme';
import { colors as palette } from '@/theme/colors';
import { HomeButton } from '@/components/common/HomeButton';
import { createStyles } from '@/styles/movieDetail.styles';

interface MovieDetailHeaderProps {
  insetsTop: number;
  isWatchlisted: boolean;
  isFollowing: boolean;
  onBack: () => void;
  onShare: () => void;
  onToggleWatchlist: () => void;
  onToggleFollow: () => void;
  movieTitle?: string;
}

export function MovieDetailHeader({
  insetsTop,
  isWatchlisted,
  isFollowing,
  onBack,
  onShare,
  onToggleWatchlist,
  onToggleFollow,
  movieTitle,
}: MovieDetailHeaderProps) {
  const { theme, colors } = useTheme();
  const styles = createStyles(theme);
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
          style={[styles.heroButton, isFollowing && styles.heroButtonActive]}
          onPress={onToggleFollow}
          accessibilityLabel={
            isFollowing
              ? `Following ${movieTitle ?? 'movie'}, tap to unfollow`
              : `Follow ${movieTitle ?? 'movie'}`
          }
        >
          <Ionicons
            name={isFollowing ? 'checkmark-circle' : 'person-add-outline'}
            size={22}
            color={isFollowing ? palette.green500 : colors.white}
          />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.heroButton, isWatchlisted && styles.heroButtonActive]}
          onPress={onToggleWatchlist}
          accessibilityLabel={isWatchlisted ? 'Remove from watchlist' : 'Add to watchlist'}
        >
          <Ionicons
            name={isWatchlisted ? 'bookmark' : 'bookmark-outline'}
            size={22}
            color={colors.white}
          />
        </TouchableOpacity>
        <TouchableOpacity style={styles.heroButton} onPress={onShare} accessibilityLabel="Share">
          <Ionicons name="share-outline" size={22} color={colors.white} />
        </TouchableOpacity>
      </View>
    </View>
  );
}
