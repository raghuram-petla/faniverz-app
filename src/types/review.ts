export interface Review {
  id: number;
  user_id: string;
  movie_id: number;
  rating: number;
  title: string | null;
  body: string | null;
  is_spoiler: boolean;
  created_at: string;
  updated_at: string;
}

export interface ReviewInsert {
  movie_id: number;
  rating: number;
  title?: string;
  body?: string;
  is_spoiler?: boolean;
}

export interface ReviewUpdate {
  rating?: number;
  title?: string;
  body?: string;
  is_spoiler?: boolean;
}

export interface ReviewSummary {
  average_rating: number;
  total_count: number;
  user_has_reviewed: boolean;
}

export type ReviewSortOption = 'recent' | 'highest' | 'lowest';
