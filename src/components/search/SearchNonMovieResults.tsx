import { View } from 'react-native';
import type { SharedValue } from 'react-native-reanimated';
import { PullToRefreshIndicator } from '@/components/common/PullToRefreshIndicator';
import { SearchResultActor } from '@/components/search/SearchResultActor';
import { SearchResultProductionHouse } from '@/components/search/SearchResultProductionHouse';
import { SearchResultPlatform } from '@/components/search/SearchResultPlatform';
import type { Actor, ProductionHouse, OTTPlatform } from '@shared/types';

export interface SearchNonMovieResultsProps {
  actors: Actor[];
  houses: ProductionHouse[];
  platforms: OTTPlatform[];
  // @contract: hasDivider is true when there are also movie results to separate
  hasDivider: boolean;
  dividerStyle: object;
  // @sync: SharedValue — driven by usePullToRefresh worklet, same as PullToRefreshIndicator expects
  pullDistance: SharedValue<number>;
  isRefreshing: SharedValue<boolean>;
  refreshing: boolean;
  onActorPress: (actor: Actor) => void;
  onHousePress: (house: ProductionHouse) => void;
  // @contract: onPlatformPress receives the platform id for navigation
  onPlatformPress: (platform: OTTPlatform) => void;
}

// @boundary: renders actor, production house, and platform rows above the movie list
// @coupling: PullToRefreshIndicator, SearchResultActor, SearchResultProductionHouse, SearchResultPlatform
export function SearchNonMovieResults({
  actors,
  houses,
  platforms,
  hasDivider,
  dividerStyle,
  pullDistance,
  isRefreshing,
  refreshing,
  onActorPress,
  onHousePress,
  onPlatformPress,
}: SearchNonMovieResultsProps) {
  return (
    <View>
      <PullToRefreshIndicator
        pullDistance={pullDistance}
        isRefreshing={isRefreshing}
        refreshing={refreshing}
      />
      {actors.map((actor) => (
        <SearchResultActor key={actor.id} actor={actor} onPress={() => onActorPress(actor)} />
      ))}
      {houses.map((house) => (
        <SearchResultProductionHouse
          key={house.id}
          house={house}
          onPress={() => onHousePress(house)}
        />
      ))}
      {platforms.map((platform) => (
        <SearchResultPlatform
          key={platform.id}
          platform={platform}
          onPress={() => onPlatformPress(platform)}
        />
      ))}
      {hasDivider && <View style={dividerStyle} />}
    </View>
  );
}
