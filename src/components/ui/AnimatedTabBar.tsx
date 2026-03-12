import { useEffect } from 'react';
import { View, Text, TouchableOpacity, Dimensions } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { useAnimationsEnabled } from '@/hooks/useAnimationsEnabled';
import { useTheme } from '@/theme';
import { colors as palette } from '@/theme/colors';
import { animatedTabBarStyles as styles } from './AnimatedTabBar.styles';

export interface AnimatedTabBarProps<T extends string> {
  tabs: T[];
  labels: Record<T, string>;
  activeTab: T;
  onTabPress: (tab: T) => void;
}

const SCREEN_W = Dimensions.get('window').width;
const TAB_BAR_INNER_W = SCREEN_W - 32 - 8; // marginHorizontal 16 each side + padding 4 each side

export function AnimatedTabBar<T extends string>({
  tabs,
  labels,
  activeTab,
  onTabPress,
}: AnimatedTabBarProps<T>) {
  const { theme } = useTheme();
  const animationsEnabled = useAnimationsEnabled();
  const tabCount = tabs.length;
  const singleTabWidth = TAB_BAR_INNER_W / tabCount;
  const tabIndicatorX = useSharedValue(tabs.indexOf(activeTab) * singleTabWidth);

  useEffect(() => {
    const target = tabs.indexOf(activeTab) * singleTabWidth;
    tabIndicatorX.value = animationsEnabled ? withTiming(target, { duration: 200 }) : target;
  }, [activeTab, animationsEnabled, tabs, singleTabWidth, tabIndicatorX]);

  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: tabIndicatorX.value }],
  }));

  return (
    <View style={[styles.tabBar, { backgroundColor: theme.surfaceElevated }]}>
      <Animated.View
        style={[
          styles.tabIndicator,
          { width: singleTabWidth, backgroundColor: palette.red600 },
          indicatorStyle,
        ]}
      />
      {tabs.map((tab) => (
        <TouchableOpacity
          key={tab}
          style={styles.tab}
          onPress={() => onTabPress(tab)}
          accessibilityRole="tab"
          accessibilityState={{ selected: activeTab === tab }}
        >
          <Text
            style={[
              styles.tabText,
              { color: theme.textSecondary },
              activeTab === tab && styles.tabTextActive,
            ]}
          >
            {labels[tab]}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}
