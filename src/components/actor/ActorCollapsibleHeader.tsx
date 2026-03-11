import { View, Text, TouchableOpacity } from 'react-native';
import Animated, { useAnimatedStyle, interpolate, Extrapolation } from 'react-native-reanimated';
import type { SharedValue } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme';
import { ActorAvatar } from '@/components/common/ActorAvatar';
import { HomeButton } from '@/components/common/HomeButton';
import { createStyles } from '@/styles/actorDetail.styles';

const EXPANDED_HEIGHT = 180;
const COLLAPSE_DISTANCE = 100;

export interface ActorCollapsibleHeaderProps {
  name: string;
  photoUrl: string | null;
  scrollOffset: SharedValue<number>;
  insetTop: number;
  onBack: () => void;
  onPhotoPress?: () => void;
  rightContent?: React.ReactNode;
}

export function ActorCollapsibleHeader({
  name,
  photoUrl,
  scrollOffset,
  insetTop,
  onBack,
  onPhotoPress,
  rightContent,
}: ActorCollapsibleHeaderProps) {
  const { theme } = useTheme();
  const styles = createStyles(theme);

  const expandedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollOffset.value, [0, COLLAPSE_DISTANCE], [1, 0], Extrapolation.CLAMP),
    transform: [
      {
        scale: interpolate(
          scrollOffset.value,
          [0, COLLAPSE_DISTANCE],
          [1, 0.6],
          Extrapolation.CLAMP,
        ),
      },
    ],
  }));

  const collapsedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      scrollOffset.value,
      [COLLAPSE_DISTANCE * 0.6, COLLAPSE_DISTANCE],
      [0, 1],
      Extrapolation.CLAMP,
    ),
  }));

  return (
    <View style={{ height: EXPANDED_HEIGHT + insetTop }}>
      {/* Nav row — always visible */}
      <View style={[styles.navRow, { top: insetTop, left: 16, right: 16, zIndex: 2 }]}>
        <TouchableOpacity style={styles.navButton} onPress={onBack} accessibilityLabel="Go back">
          <Ionicons name="chevron-back" size={24} color={theme.textPrimary} />
        </TouchableOpacity>

        {/* Collapsed: small avatar + name inline */}
        <Animated.View
          style={[{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }, collapsedStyle]}
        >
          <ActorAvatar actor={{ name, photo_url: photoUrl } as never} size={32} />
          <Text
            style={{ color: theme.textPrimary, fontSize: 16, fontWeight: '700' }}
            numberOfLines={1}
          >
            {name}
          </Text>
        </Animated.View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {rightContent}
          <HomeButton />
        </View>
      </View>

      {/* Expanded: centered avatar */}
      <Animated.View style={[styles.avatarCenter, { marginTop: insetTop + 44 }, expandedStyle]}>
        {photoUrl && onPhotoPress ? (
          <TouchableOpacity onPress={onPhotoPress} activeOpacity={0.8} testID="avatar-tap">
            <ActorAvatar actor={{ name, photo_url: photoUrl } as never} size={120} />
          </TouchableOpacity>
        ) : (
          <ActorAvatar actor={{ name, photo_url: photoUrl } as never} size={120} />
        )}
      </Animated.View>
    </View>
  );
}
