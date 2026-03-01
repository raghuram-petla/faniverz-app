// Re-export shared types — single source of truth in shared/types.ts
export type {
  ReleaseType,
  Certification,
  WatchlistStatus,
  Movie,
  MovieTheatricalRun,
  Actor,
  CastMember,
  ActorCredit,
  OTTPlatform,
  MoviePlatform,
  WatchlistEntry,
} from '@shared/types';

// App-specific composite type (not shared with admin)
import type { Movie, CastMember, MoviePlatform } from '@shared/types';

export interface MovieWithDetails extends Movie {
  cast: CastMember[];
  crew: CastMember[];
  platforms: MoviePlatform[];
}
