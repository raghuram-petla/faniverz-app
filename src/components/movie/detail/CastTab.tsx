import { View, Text, TouchableOpacity } from 'react-native';
import { ActorAvatar } from '@/components/common/ActorAvatar';
import type { CastMember } from '@/types';
import { useTheme } from '@/theme';
import { createStyles } from '@/styles/movieDetail.styles';
import { useTranslation } from 'react-i18next';

/** @contract Renders cast and crew sections with avatar rows; shows empty state when both are empty */
interface CastTabProps {
  cast: CastMember[];
  crew: CastMember[];
  /** @assumes actorId is valid — caller navigates to actor detail screen */
  onActorPress: (actorId: string) => void;
}

export function CastTab({ cast: rawCast, crew: rawCrew, onActorPress }: CastTabProps) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const styles = createStyles(theme);
  // @boundary Filters out entries where actor was deleted to prevent ghost rows with null data
  const cast = rawCast.filter((cm) => cm.actor);
  const crew = rawCrew.filter((cm) => cm.actor);
  return (
    <View style={styles.castTab}>
      {cast.length > 0 && (
        <>
          <Text style={styles.castSectionLabel}>{t('movie.cast')}</Text>
          {cast.map((cm) => (
            <TouchableOpacity
              key={cm.id}
              style={styles.castItem}
              /** @nullable cm.actor may be null if actor record was deleted; tap is no-op */
              onPress={() => cm.actor?.id && onActorPress(cm.actor.id)}
              activeOpacity={0.7}
            >
              <ActorAvatar actor={cm.actor} size={64} />
              <View style={styles.castInfo}>
                <Text style={styles.castName} numberOfLines={1}>
                  {cm.actor?.name}
                </Text>
                {cm.role_name && (
                  <Text style={styles.castRole}>{t('movie.asRole', { role: cm.role_name })}</Text>
                )}
              </View>
            </TouchableOpacity>
          ))}
        </>
      )}

      {crew.length > 0 && (
        <>
          <Text style={styles.castSectionLabel}>{t('movie.crew')}</Text>
          {crew.map((cm) => (
            <TouchableOpacity
              key={cm.id}
              style={styles.castItem}
              onPress={() => cm.actor?.id && onActorPress(cm.actor.id)}
              activeOpacity={0.7}
            >
              <ActorAvatar actor={cm.actor} size={64} />
              <View style={styles.castInfo}>
                <Text style={styles.castName} numberOfLines={1}>
                  {cm.actor?.name}
                </Text>
                {cm.role_name && <Text style={styles.castRole}>{cm.role_name}</Text>}
              </View>
            </TouchableOpacity>
          ))}
        </>
      )}

      {cast.length === 0 && crew.length === 0 && (
        <Text style={styles.emptyText}>{t('movie.noCastInfo')}</Text>
      )}
    </View>
  );
}
