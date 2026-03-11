import { StyleSheet } from 'react-native';
import type { SemanticTheme } from '@shared/themes';

export const NAV_BAR_HEIGHT = 48;
export const COLLAPSED_BAR_HEIGHT = 56;
export const IMAGE_EXPANDED = 120;
export const IMAGE_COLLAPSED = 48;
export const COLLAPSE_SCROLL_DISTANCE = 140;
// marginTop(12) + approx text line height(30) + marginBottom(8)
export const HERO_NAME_PLACEHOLDER_HEIGHT = 50;

export const createStyles = (t: SemanticTheme) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: t.background },
    safeArea: { backgroundColor: t.background, zIndex: 10 },

    // Fixed nav bar
    navBar: {
      height: NAV_BAR_HEIGHT,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      backgroundColor: t.background,
      zIndex: 10,
    },
    navLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    navButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: t.input,
      alignItems: 'center',
      justifyContent: 'center',
    },
    navPlaceholder: { width: 40 },

    // Collapsed bar background — floating avatar + name provide content
    collapsedBar: {
      position: 'absolute',
      left: 0,
      right: 0,
      height: COLLAPSED_BAR_HEIGHT,
      backgroundColor: t.background,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: t.border,
      zIndex: 5,
    },

    // Floating avatar (absolutely positioned, animated via transforms)
    floatingAvatar: {
      position: 'absolute',
      width: IMAGE_EXPANDED,
      height: IMAGE_EXPANDED,
      zIndex: 6,
    },

    // Floating name (absolutely positioned, animated via transforms)
    floatingName: {
      position: 'absolute',
      zIndex: 6,
    },
    floatingNameText: {
      fontSize: 24,
      fontWeight: '800',
      color: t.textPrimary,
    },

    // Hero section (inside ScrollView)
    hero: {
      alignItems: 'center',
      paddingTop: 16,
      paddingBottom: 20,
      paddingHorizontal: 16,
    },
    heroNamePlaceholder: {
      height: HERO_NAME_PLACEHOLDER_HEIGHT,
    },
  });
