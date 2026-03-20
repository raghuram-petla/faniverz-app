// @contract: shared types for the validations feature (scan, fix, summary)

export type ScanEntity =
  | 'movies'
  | 'movie_images'
  | 'actors'
  | 'platforms'
  | 'production_houses'
  | 'profiles';

export interface ScanResult {
  id: string;
  entity: string;
  field: string;
  currentUrl: string;
  urlType: 'local' | 'external' | 'full_r2';
  originalExists: boolean | null;
  variants: { sm: boolean | null; md: boolean | null; lg: boolean | null };
  entityLabel: string;
  tmdbId: number | null;
}

export interface ScanResponse {
  results: ScanResult[];
  total: number;
}

export interface SummaryEntry {
  entity: string;
  field: string;
  total: number;
  external: number;
  local: number;
  nullCount: number;
}

export interface FixItem {
  id: string;
  entity: string;
  field: string;
  currentUrl: string;
  fixType: 'migrate_external' | 'regenerate_variants';
  tmdbId?: number;
}

export interface FixResult {
  id: string;
  field: string;
  status: 'fixed' | 'failed';
  newUrl?: string;
  error?: string;
}

export interface ScanProgress {
  entity: ScanEntity;
  scanned: number;
  total: number;
  isScanning: boolean;
}

export interface FixProgress {
  fixed: number;
  failed: number;
  total: number;
  isFixing: boolean;
}
