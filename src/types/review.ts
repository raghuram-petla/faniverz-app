import { UserProfile } from './user';
import { Movie } from './movie';

export interface Review {
  id: string;
  movie_id: string;
  user_id: string;
  rating: number;
  title: string | null;
  body: string | null;
  contains_spoiler: boolean;
  helpful_count: number;
  created_at: string;
  updated_at: string;
  profile?: Pick<UserProfile, 'id' | 'display_name' | 'avatar_url'>;
  movie?: Pick<Movie, 'id' | 'title' | 'poster_url'>;
}

export interface ReviewHelpful {
  user_id: string;
  review_id: string;
}

export interface CreateReviewInput {
  user_id: string;
  movie_id: string;
  rating: number;
  title?: string;
  body?: string;
  contains_spoiler?: boolean;
}

export interface UpdateReviewInput {
  rating?: number;
  title?: string;
  body?: string;
  contains_spoiler?: boolean;
}
