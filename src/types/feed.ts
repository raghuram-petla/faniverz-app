export type FeedFilterOption =
  | 'all'
  | 'trailers'
  | 'songs'
  | 'posters'
  | 'bts'
  | 'surprise'
  | 'updates';

export interface FeedPillConfig {
  label: string;
  value: FeedFilterOption;
  activeColor: string;
}
