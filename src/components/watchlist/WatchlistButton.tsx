import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { useWatchlistStatus, useToggleWatchlist } from '@/features/watchlist/hooks';

interface WatchlistButtonProps {
  userId: string | undefined;
  movieId: number;
}

export default function WatchlistButton({ userId, movieId }: WatchlistButtonProps) {
  const { colors } = useTheme();
  const { data: isWatchlisted = false } = useWatchlistStatus(userId, movieId);
  const { mutate: toggle, isPending } = useToggleWatchlist();

  if (!userId) return null;

  const handlePress = () => {
    if (isPending) return;
    toggle({ userId, movieId, isCurrentlyWatchlisted: isWatchlisted });
  };

  return (
    <TouchableOpacity
      testID="watchlist-button"
      style={[styles.fab, { backgroundColor: isWatchlisted ? colors.accent : colors.primary }]}
      onPress={handlePress}
      accessibilityLabel={isWatchlisted ? 'Remove from watchlist' : 'Add to watchlist'}
      accessibilityRole="button"
    >
      <Text testID="watchlist-icon" style={styles.icon}>
        {isWatchlisted ? '♥' : '♡'}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  icon: {
    fontSize: 24,
    color: '#FFFFFF',
  },
});
