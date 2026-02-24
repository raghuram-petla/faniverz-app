import { useCallback, useRef, useState } from 'react';
import {
  Dimensions,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ViewabilityConfig,
  type ViewToken,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { ONBOARDING_SLIDES, type OnboardingSlide } from '@/constants/onboarding';
import { STORAGE_KEYS } from '@/constants/storage';
import { colors } from '@/theme/colors';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const viewabilityConfig: ViewabilityConfig = {
  itemVisiblePercentThreshold: 50,
};

export default function OnboardingScreen() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList<OnboardingSlide>>(null);
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0 && viewableItems[0].index != null) {
        setCurrentIndex(viewableItems[0].index);
      }
    },
    [],
  );

  const completeOnboarding = useCallback(async () => {
    await AsyncStorage.setItem(STORAGE_KEYS.HAS_ONBOARDED, 'true');
    router.replace('/(auth)/login');
  }, [router]);

  const handleNext = useCallback(() => {
    if (currentIndex < ONBOARDING_SLIDES.length - 1) {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1, animated: true });
    } else {
      completeOnboarding();
    }
  }, [currentIndex, completeOnboarding]);

  const handleSkip = useCallback(() => {
    completeOnboarding();
  }, [completeOnboarding]);

  const isLastSlide = currentIndex === ONBOARDING_SLIDES.length - 1;

  const renderSlide = useCallback(
    ({ item }: { item: OnboardingSlide }) => (
      <View style={styles.slide}>
        <LinearGradient
          colors={[...item.gradientColors]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradient}
        >
          <View style={styles.iconContainer}>
            <View style={styles.iconCircle}>
              <Ionicons
                name={item.icon as keyof typeof Ionicons.glyphMap}
                size={64}
                color={colors.white}
              />
            </View>
          </View>
          <Text style={styles.title}>{item.title}</Text>
          <Text style={styles.description}>{item.description}</Text>
        </LinearGradient>
      </View>
    ),
    [],
  );

  return (
    <View style={styles.container}>
      <FlatList
        ref={flatListRef}
        data={[...ONBOARDING_SLIDES]}
        renderItem={renderSlide}
        keyExtractor={(_, index) => index.toString()}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        bounces={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        getItemLayout={(_, index) => ({
          length: SCREEN_WIDTH,
          offset: SCREEN_WIDTH * index,
          index,
        })}
      />
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 16 }]}>
        <View style={styles.pagination}>
          {ONBOARDING_SLIDES.map((_, index) => (
            <View
              key={index}
              style={[styles.dot, index === currentIndex ? styles.dotActive : styles.dotInactive]}
            />
          ))}
        </View>
        <View style={styles.buttonRow}>
          <Pressable onPress={handleSkip} style={styles.skipButton}>
            <Text style={styles.skipText}>Skip</Text>
          </Pressable>
          <Pressable onPress={handleNext} style={styles.nextButton}>
            <Text style={styles.nextText}>{isLastSlide ? 'Get Started' : 'Next'}</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.black,
  },
  slide: {
    width: SCREEN_WIDTH,
    flex: 1,
  },
  gradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  iconContainer: {
    marginBottom: 32,
  },
  iconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.white10,
    borderWidth: 1,
    borderColor: colors.white20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.white,
    textAlign: 'center',
    marginBottom: 12,
  },
  description: {
    fontSize: 18,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    lineHeight: 26,
    maxWidth: 320,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginBottom: 24,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  dotActive: {
    width: 32,
    backgroundColor: colors.white,
  },
  dotInactive: {
    width: 8,
    backgroundColor: colors.white30,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  skipButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  skipText: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  nextButton: {
    backgroundColor: colors.white,
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 28,
  },
  nextText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.black,
  },
});
