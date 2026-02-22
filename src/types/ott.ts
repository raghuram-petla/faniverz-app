export interface Platform {
  id: number;
  name: string;
  slug: string;
  logo_url: string | null;
  base_deep_link: string | null;
  color: string;
  display_order: number;
}

export type OttReleaseSource = 'tmdb' | 'manual';

export interface OttRelease {
  id: number;
  movie_id: number;
  platform_id: number;
  ott_release_date: string;
  deep_link_url: string | null;
  is_exclusive: boolean;
  source: OttReleaseSource;
}

export interface OttReleaseWithPlatform extends OttRelease {
  platform: Platform;
}
