// NOTE: Keep in sync with image-resize.ts (which uses Sharp, server-only).
// This file is client-safe and used by the ImageVariantsPanel component.

export interface VariantSpec {
  suffix: string;
  width: number;
  quality: number;
}

export type VariantType = 'poster' | 'backdrop' | 'photo';

export const VARIANT_SPECS: Record<VariantType, VariantSpec[]> = {
  poster: [
    { suffix: '_sm', width: 200, quality: 80 },
    { suffix: '_md', width: 400, quality: 85 },
    { suffix: '_lg', width: 800, quality: 90 },
  ],
  backdrop: [
    { suffix: '_sm', width: 480, quality: 80 },
    { suffix: '_md', width: 960, quality: 85 },
    { suffix: '_lg', width: 1920, quality: 90 },
  ],
  photo: [
    { suffix: '_sm', width: 100, quality: 80 },
    { suffix: '_md', width: 200, quality: 85 },
    { suffix: '_lg', width: 400, quality: 90 },
  ],
};
