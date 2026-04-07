import { View, Text, TouchableOpacity, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// @contract Props mirror the nullable external IDs from the actors table (TMDB external_ids endpoint)
export interface ActorSocialLinksProps {
  imdbId?: string | null;
  instagramId?: string | null;
  twitterId?: string | null;
  styles: {
    socialLinksRow: object;
    socialButton: object;
    socialButtonText: object;
  };
  textPrimaryColor: string;
}

// @boundary Renders clickable social media link buttons for an actor's external profiles.
// @edge Only renders the row if at least one link is present.
export function ActorSocialLinks({
  imdbId,
  instagramId,
  twitterId,
  styles,
  textPrimaryColor,
}: ActorSocialLinksProps) {
  if (!imdbId && !instagramId && !twitterId) return null;

  return (
    <View style={styles.socialLinksRow}>
      {imdbId && (
        <TouchableOpacity
          style={styles.socialButton}
          onPress={() => Linking.openURL(`https://www.imdb.com/name/${imdbId}`)}
          accessibilityLabel="IMDb profile"
          testID="social-imdb"
        >
          <Text style={styles.socialButtonText}>IMDb</Text>
        </TouchableOpacity>
      )}
      {instagramId && (
        <TouchableOpacity
          style={styles.socialButton}
          onPress={() => Linking.openURL(`https://www.instagram.com/${instagramId}`)}
          accessibilityLabel="Instagram profile"
          testID="social-instagram"
        >
          <Ionicons name="logo-instagram" size={18} color={textPrimaryColor} />
        </TouchableOpacity>
      )}
      {twitterId && (
        <TouchableOpacity
          style={styles.socialButton}
          onPress={() => Linking.openURL(`https://twitter.com/${twitterId}`)}
          accessibilityLabel="Twitter profile"
          testID="social-twitter"
        >
          <Ionicons name="logo-twitter" size={18} color={textPrimaryColor} />
        </TouchableOpacity>
      )}
    </View>
  );
}
