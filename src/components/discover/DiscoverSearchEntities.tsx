import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/theme';
import { SearchResultActor } from '@/components/search/SearchResultActor';
import { SearchResultProductionHouse } from '@/components/search/SearchResultProductionHouse';
import { SearchResultPlatform } from '@/components/search/SearchResultPlatform';
import type { Actor, ProductionHouse, OTTPlatform } from '@shared/types';
import type { SemanticTheme } from '@shared/themes';

export interface DiscoverSearchEntitiesProps {
  actors: Actor[];
  productionHouses: ProductionHouse[];
  platforms: OTTPlatform[];
}

// @boundary: renders artist, production house, and platform results above the movie grid in Discover search
// @coupling: SearchResultActor, SearchResultProductionHouse, SearchResultPlatform
export function DiscoverSearchEntities({
  actors,
  productionHouses,
  platforms,
}: DiscoverSearchEntitiesProps) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const router = useRouter();
  const styles = createStyles(theme);

  const hasResults = actors.length > 0 || productionHouses.length > 0 || platforms.length > 0;
  if (!hasResults) return null;

  return (
    <View style={styles.container}>
      {actors.length > 0 && (
        <View>
          <Text style={styles.sectionTitle}>
            {t('search.actors')} ({actors.length})
          </Text>
          {actors.map((actor) => (
            <SearchResultActor
              key={actor.id}
              actor={actor}
              onPress={() => router.push(`/actor/${actor.id}`)}
            />
          ))}
        </View>
      )}
      {productionHouses.length > 0 && (
        <View>
          <Text style={styles.sectionTitle}>
            {t('search.studios')} ({productionHouses.length})
          </Text>
          {productionHouses.map((house) => (
            <SearchResultProductionHouse
              key={house.id}
              house={house}
              onPress={() => router.push(`/production-house/${house.id}`)}
            />
          ))}
        </View>
      )}
      {platforms.length > 0 && (
        <View>
          <Text style={styles.sectionTitle}>
            {t('search.platforms')} ({platforms.length})
          </Text>
          {platforms.map((platform) => (
            <SearchResultPlatform
              key={platform.id}
              platform={platform}
              onPress={() => router.push(`/platform/${platform.id}`)}
            />
          ))}
        </View>
      )}
      <View style={styles.divider} />
    </View>
  );
}

const createStyles = (t: SemanticTheme) =>
  StyleSheet.create({
    container: { marginBottom: 8 },
    sectionTitle: {
      fontSize: 13,
      fontWeight: '600',
      color: t.textSecondary,
      paddingHorizontal: 16,
      paddingTop: 12,
      paddingBottom: 4,
    },
    divider: {
      height: 1,
      backgroundColor: t.border,
      marginHorizontal: 16,
      marginTop: 8,
    },
  });
