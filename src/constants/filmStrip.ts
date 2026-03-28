import type { SemanticTheme } from '@shared/themes';

// ── Film strip dimensions (classic 35mm proportions) ────────────────────────────

/** @invariant rail width — left/right dark strips that hold sprocket holes */
export const RAIL_WIDTH = 30;

/** @invariant sprocket hole dimensions (square with rounded corners) */
export const SPROCKET_SIZE = 12;

/** @invariant corner radius of each sprocket hole */
export const SPROCKET_RADIUS = 3;

/** @invariant center-to-center vertical distance between sprocket holes */
export const SPROCKET_SPACING = 18;

/** @invariant corner radius of the content frame cutout */
export const FRAME_RADIUS = 14;

// ── Helpers ─────────────────────────────────────────────────────────────────────

/** @contract Returns the dark film material color for the current theme */
export function getFilmColor(theme: SemanticTheme): string {
  // Dark theme: subtle gray visible against black bg
  // Light theme: dark film strip — holes punch through as white, giving authentic reel look
  return theme.background === '#000000' ? '#2C2C2E' : '#9E9EA3';
}

/** @contract Returns usable content width between the two rails */
export function getContentWidth(screenWidth: number): number {
  return screenWidth - 2 * RAIL_WIDTH;
}
