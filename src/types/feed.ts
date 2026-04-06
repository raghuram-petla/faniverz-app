export type FeedFilterOption =
  | 'all'
  | 'trailers'
  | 'songs'
  | 'posters'
  | 'bts'
  | 'surprise'
  | 'updates'
  | 'editorial';

export interface FeedPillConfig {
  label: string;
  value: FeedFilterOption;
  activeColor: string;
}
