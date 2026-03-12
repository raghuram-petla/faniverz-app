import { View, Text, TouchableOpacity } from 'react-native';
import { ActorAvatar } from '@/components/common/ActorAvatar';
import type { CastMember } from '@/types';
import { useTheme } from '@/theme';
import { createStyles } from '@/styles/movieDetail.styles';
import { useTranslation } from 'react-i18next';

interface CastTabProps {
  cast: CastMember[];
  crew: CastMember[];
  onActorPress: (actorId: string) => void;
}

export function CastTab({ cast, crew, onActorPress }: CastTabProps) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const styles = createStyles(theme);
  return (
    <View style={styles.castTab}>
      {cast.length > 0 && (
        <>
          <Text style={styles.castSectionLabel}>{t('movie.cast')}</Text>
          {cast.map((cm) => (
            <TouchableOpacity
              key={cm.id}
              style={styles.castItem}
              onPress={() => cm.actor?.id && onActorPress(cm.actor.id)}
              activeOpacity={0.7}
            >
              <ActorAvatar actor={cm.actor} size={64} />
              <View style={styles.castInfo}>
                <Text style={styles.castName}>{cm.actor?.name}</Text>
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
                <Text style={styles.castName}>{cm.actor?.name}</Text>
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
