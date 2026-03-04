import { View, Text, TouchableOpacity } from 'react-native';
import { ActorAvatar } from '@/components/common/ActorAvatar';
import type { CastMember } from '@/types';
import { styles } from '../[id].styles';

interface CastTabProps {
  cast: CastMember[];
  crew: CastMember[];
  onActorPress: (actorId: string) => void;
}

export function CastTab({ cast, crew, onActorPress }: CastTabProps) {
  return (
    <View style={styles.castTab}>
      {cast.length > 0 && (
        <>
          <Text style={styles.castSectionLabel}>Cast</Text>
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
                {cm.role_name && <Text style={styles.castRole}>as {cm.role_name}</Text>}
              </View>
            </TouchableOpacity>
          ))}
        </>
      )}

      {crew.length > 0 && (
        <>
          <Text style={styles.castSectionLabel}>Crew</Text>
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
        <Text style={styles.emptyText}>No cast information available.</Text>
      )}
    </View>
  );
}
