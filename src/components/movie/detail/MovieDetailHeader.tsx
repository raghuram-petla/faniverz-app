import { View, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme';
import { HomeButton } from '@/components/common/HomeButton';
import { createStyles } from '@/styles/movieDetail.styles';

interface MovieDetailHeaderProps {
  insetsTop: number;
  isWatchlisted: boolean;
  onBack: () => void;
  onShare: () => void;
  onToggleWatchlist: () => void;
}

export function MovieDetailHeader({
  insetsTop,
  isWatchlisted,
  onBack,
  onShare,
  onToggleWatchlist,
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
        <TouchableOpacity style={styles.heroButton} onPress={onShare} accessibilityLabel="Share">
          <Ionicons name="share-outline" size={22} color={colors.white} />
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
      </View>
    </View>
  );
}
