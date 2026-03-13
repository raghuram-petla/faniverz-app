import { useEffect } from 'react';
import { Text, TouchableOpacity } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme';
import { useAnimationsEnabled } from '@/hooks/useAnimationsEnabled';
import { createStyles } from '@/styles/tabs/watchlist.styles';
import type { WatchlistEntry } from '@/types';

export type WatchlistListItem =
  | {
      type: 'section-header';
      key: string;
      sectionKey: string;
      title: string;
      iconName: React.ComponentProps<typeof Ionicons>['name'];
      iconColor: string;
    }
  | { type: 'available'; key: string; entry: WatchlistEntry }
  | { type: 'upcoming'; key: string; entry: WatchlistEntry }
  | { type: 'watched'; key: string; entry: WatchlistEntry };

export interface SectionTitleProps {
  iconName: React.ComponentProps<typeof Ionicons>['name'];
  iconColor: string;
  title: string;
  collapsed?: boolean;
  onToggle?: () => void;
}

export function SectionTitle({
  iconName,
  iconColor,
  title,
  collapsed,
  onToggle,
}: SectionTitleProps) {
  const { theme } = useTheme();
  const styles = createStyles(theme);
  const animationsEnabled = useAnimationsEnabled();
  const rot = useSharedValue(collapsed ? 0 : 90);
  /** @sideeffect animates chevron rotation: 0deg when collapsed, 90deg when expanded */
  useEffect(() => {
    const deg = collapsed ? 0 : 90;
    rot.value = animationsEnabled ? withTiming(deg, { duration: 200 }) : deg;
  }, [collapsed, rot, animationsEnabled]);
  const chevStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${rot.value}deg` }] }));
  return (
    <TouchableOpacity style={styles.sectionHeader} onPress={onToggle} activeOpacity={0.7}>
      <Ionicons name={iconName} size={20} color={iconColor} />
      <Text style={[styles.sectionTitle, { flex: 1 }]}>{title}</Text>
      <Animated.View style={chevStyle}>
        <Ionicons name="chevron-forward" size={18} color={theme.textTertiary} />
      </Animated.View>
    </TouchableOpacity>
  );
}
