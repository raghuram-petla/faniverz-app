export interface UserProfile {
  id: string;
  display_name: string | null;
  email: string | null;
  phone: string | null;
  location: string | null;
  bio: string | null;
  avatar_url: string | null;
  preferred_lang: string;
  is_admin: boolean;
  created_at: string;
  updated_at: string;
}

export interface FavoriteActor {
  user_id: string;
  actor_id: string;
  created_at: string;
}
