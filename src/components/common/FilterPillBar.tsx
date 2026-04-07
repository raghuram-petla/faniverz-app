import { useCallback, useEffect, useMemo, useRef } from 'react';
import { ScrollView, TouchableOpacity, Text, type LayoutChangeEvent } from 'react-native';
import { useTheme } from '@/theme';
import { colors } from '@/theme/colors';
import { createFilterPillBarStyles } from './FilterPillBar.styles';

/** @contract Configuration for a single filter pill */
export interface FilterPillConfig {
  label: string;
  value: string;
  /** @edge Per-pill color override; falls back to defaultActiveColor prop or red600 */
  activeColor?: string;
}

/** @contract Single source of truth for horizontal scrollable filter pill bars */
export interface FilterPillBarProps {
  pills: FilterPillConfig[];
  activeValue: string;
  onSelect: (value: string) => void;
  /** @edge Default active background color when pill config has no activeColor */
  defaultActiveColor?: string;
  /** @coupling Set false when parent manages scroll container (e.g. compact layouts) */
  showBackground?: boolean;
}

/**
 * @contract Shared filter pill bar — always renders white text on active colored background.
 * @invariant Active pill text is always colors.white regardless of theme (dark or light).
 * @coupling Used by Feed, Surprise, and Media screens — changes here affect all filter UIs.
 */
export function FilterPillBar({
  pills,
  activeValue,
  onSelect,
  defaultActiveColor = colors.red600,
  showBackground = true,
}: FilterPillBarProps) {
  const { theme } = useTheme();
  const styles = useMemo(() => createFilterPillBarStyles(theme), [theme]);
  const scrollRef = useRef<ScrollView>(null);
  const pillLayouts = useRef<Map<string, { x: number; width: number }>>(new Map());
  const scrollWidth = useRef(0);

  const handleScrollLayout = useCallback((e: LayoutChangeEvent) => {
    scrollWidth.current = e.nativeEvent.layout.width;
  }, []);

  // @sideeffect Auto-scroll to keep the active pill visible (e.g. when pager swipe changes tab)
  useEffect(() => {
    const layout = pillLayouts.current.get(activeValue);
    /* istanbul ignore next -- scrollRef.current is null in test environment */
    if (!layout || !scrollRef.current || scrollWidth.current === 0) return;
    /* istanbul ignore next */
    const targetX = layout.x - scrollWidth.current / 2 + layout.width / 2;
    /* istanbul ignore next */
    scrollRef.current.scrollTo({ x: Math.max(0, targetX), animated: true });
  }, [activeValue]);

  return (
    <ScrollView
      ref={scrollRef}
      horizontal
      showsHorizontalScrollIndicator={false}
      style={[styles.scroll, !showBackground && { backgroundColor: 'transparent' }]}
      contentContainerStyle={styles.scrollContent}
      onLayout={handleScrollLayout}
    >
      {pills.map((pill) => {
        const active = activeValue === pill.value;
        const pillColor = pill.activeColor ?? defaultActiveColor;
        return (
          <TouchableOpacity
            key={pill.value}
            onLayout={(e) => {
              const { x, width } = e.nativeEvent.layout;
              pillLayouts.current.set(pill.value, { x, width });
            }}
            style={[
              styles.pill,
              active ? { backgroundColor: pillColor, borderColor: pillColor } : styles.pillInactive,
            ]}
            onPress={() => onSelect(pill.value)}
            activeOpacity={0.75}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            accessibilityLabel={`Filter by ${pill.label}`}
          >
            <Text style={[styles.pillText, active && styles.pillTextActive]}>{pill.label}</Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}
