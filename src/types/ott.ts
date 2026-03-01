export interface OTTPlatform {
  id: string;
  name: string;
  logo: string;
  color: string;
  display_order: number;
}

export interface MoviePlatform {
  movie_id: string;
  platform_id: string;
  available_from: string | null;
  platform?: OTTPlatform;
}
