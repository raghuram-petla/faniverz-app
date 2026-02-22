export interface Profile {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  preferred_lang: string;
  notify_watchlist: boolean;
  notify_ott: boolean;
  notify_digest: boolean;
  is_admin: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProfileUpdate {
  display_name?: string;
  avatar_url?: string;
  preferred_lang?: string;
  notify_watchlist?: boolean;
  notify_ott?: boolean;
  notify_digest?: boolean;
}
