/**
 * @contract Wrapper component integrating smart pagination with FlashList or FlatList.
 * Wires up onEndReached, onEndReachedThreshold, and optional onViewableItemsChanged.
 *
 * @assumes Screens with custom scroll handlers (home feed with collapsible header,
 * video autoplay, etc.) should use the hooks directly instead of this component.
 *
 * @coupling Uses useSmartPagination for dynamic threshold calculation.
 */
import React from 'react';
import {
  FlatList,
  ActivityIndicator,
  View,
  type NativeSyntheticEvent,
  type NativeScrollEvent,
  type ViewToken,
  type ViewabilityConfig,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useSmartPagination } from '@/hooks/useSmartPagination';
import type { SmartPaginationConfig } from '@/constants/paginationConfig';
import { styles } from './SmartList.styles';

export interface SmartListProps<TItem> {
  data: TItem[];
  renderItem: (info: { item: TItem; index: number }) => React.ReactElement | null;
  keyExtractor: (item: TItem, index: number) => string;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  fetchNextPage: () => void;
  config: SmartPaginationConfig;
  variant: 'flash' | 'flat';
  numColumns?: number;
  ListHeaderComponent?: React.ComponentType | React.ReactElement | null;
  ListEmptyComponent?: React.ComponentType | React.ReactElement | null;
  ListFooterComponent?: React.ComponentType | React.ReactElement | null;
  onScroll?: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
  contentContainerStyle?: StyleProp<ViewStyle>;
  showsVerticalScrollIndicator?: boolean;
  /** FlashList onViewableItemsChanged — for comment prefetching */
  onViewableItemsChanged?: (info: { viewableItems: ViewToken[] }) => void;
  /** FlashList viewabilityConfig — must be a stable reference */
  viewabilityConfig?: ViewabilityConfig;
  /** FlashList drawDistance for render-ahead buffer */
  drawDistance?: number;
}

/** @contract Loading footer shown when fetching next page */
function LoadingFooter({ isFetchingNextPage }: { isFetchingNextPage: boolean }) {
  if (!isFetchingNextPage) return null;
  return (
    <View style={styles.loadingFooter}>
      <ActivityIndicator size="small" />
    </View>
  );
}

export function SmartList<TItem>({
  data,
  renderItem,
  keyExtractor,
  hasNextPage,
  isFetchingNextPage,
  fetchNextPage,
  config,
  variant,
  numColumns,
  ListHeaderComponent,
  ListEmptyComponent,
  ListFooterComponent,
  onScroll,
  contentContainerStyle,
  showsVerticalScrollIndicator,
  onViewableItemsChanged,
  viewabilityConfig,
  drawDistance,
}: SmartListProps<TItem>) {
  const { handleEndReached, onEndReachedThreshold } = useSmartPagination({
    totalItems: data.length,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
    config,
  });

  const footer = ListFooterComponent ?? <LoadingFooter isFetchingNextPage={isFetchingNextPage} />;

  if (variant === 'flash') {
    return (
      <FlashList
        data={data}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        numColumns={numColumns}
        onEndReached={handleEndReached}
        onEndReachedThreshold={onEndReachedThreshold}
        ListHeaderComponent={ListHeaderComponent}
        ListEmptyComponent={ListEmptyComponent}
        ListFooterComponent={footer}
        onScroll={onScroll}
        contentContainerStyle={contentContainerStyle}
        showsVerticalScrollIndicator={showsVerticalScrollIndicator}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        drawDistance={drawDistance}
      />
    );
  }

  return (
    <FlatList
      data={data}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      numColumns={numColumns}
      onEndReached={handleEndReached}
      onEndReachedThreshold={onEndReachedThreshold}
      ListHeaderComponent={ListHeaderComponent}
      ListEmptyComponent={ListEmptyComponent}
      ListFooterComponent={footer}
      onScroll={onScroll}
      contentContainerStyle={contentContainerStyle}
      showsVerticalScrollIndicator={showsVerticalScrollIndicator}
      onViewableItemsChanged={onViewableItemsChanged}
      viewabilityConfig={viewabilityConfig}
    />
  );
}
