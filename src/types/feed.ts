export type FeedFilterOption = 'all' | 'trailers' | 'songs' | 'posters' | 'bts' | 'surprise';

export interface FeedPillConfig {
  label: string;
  value: FeedFilterOption;
  activeColor: string;
}
