export type SurpriseCategory = 'song' | 'short-film' | 'bts' | 'interview' | 'trailer';

export interface SurpriseContent {
  id: string;
  title: string;
  description: string | null;
  youtube_id: string;
  category: SurpriseCategory;
  duration: string | null;
  views: number;
  created_at: string;
}
