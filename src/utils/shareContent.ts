import { Platform, Share } from 'react-native';

// @contract Content types map 1:1 to Expo Router routes and web URL paths.
// @coupling Route paths must match: /movie/:id, /actor/:id, /production-house/:id, /post/:id, /user/:id
export type ShareableContentType = 'movie' | 'actor' | 'production-house' | 'post' | 'user';

export interface ShareContentParams {
  type: ShareableContentType;
  id: string;
  title: string;
  /** Optional subtitle (e.g., year for movies, role for actors) */
  subtitle?: string;
  /** Optional rating string (e.g., "4.2★") */
  rating?: string;
}

const BASE_URL = 'https://faniverz.com';

// @boundary Builds a deep-linkable URL and invokes the native share sheet.
// @edge iOS Share API supports separate `url` field; Android only uses `message`.
export async function shareContent(params: ShareContentParams): Promise<void> {
  const { type, id, title, subtitle, rating } = params;
  const url = `${BASE_URL}/${type}/${id}`;

  const parts = [title];
  if (subtitle) parts[0] = `${title} (${subtitle})`;
  if (rating) parts.push(rating);

  const headline = parts.join(' — ');
  const text = `${headline}\n\nCheck it out on Faniverz!`;

  if (Platform.OS === 'ios') {
    // @edge iOS shows url separately in share sheet — pass it as `url` to avoid duplication
    await Share.share({ message: text, url }).catch(() => {});
  } else {
    await Share.share({ message: `${text}\n${url}` }).catch(() => {});
  }
}
