import { View, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme';
import { createStyles } from '../[id].styles';

interface MovieDetailHeaderProps {
  insetsTop: number;
  navIndex: number;
  isWatchlisted: boolean;
  onBack: () => void;
  onHome: () => void;
  onShare: () => void;
  onToggleWatchlist: () => void;
}

export function MovieDetailHeader({
  insetsTop,
  navIndex,
  isWatchlisted,
  onBack,
  onHome,
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
        {navIndex >= 2 && (
          <TouchableOpacity
            style={styles.heroButton}
            onPress={onHome}
            accessibilityLabel="Go to home"
            testID="home-button"
          >
            <Ionicons name="home-outline" size={22} color={colors.white} />
          </TouchableOpacity>
        )}
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
