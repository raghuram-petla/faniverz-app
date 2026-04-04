/** Centralized upload validation constants. Used by both upload-handler.ts and useImageUpload.ts.
 * @coupling: upload-handler.ts enforces these server-side; useImageUpload.ts enforces client-side.
 * Both must import from here — if a consumer hardcodes its own limit, the two layers disagree
 * and the user sees "file too large" from the server after the client allowed it.
 */

export const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
// @boundary: SVG is intentionally excluded — sharp can parse SVGs but the resize pipeline
// rasterizes them, producing blurry results. Admins needing SVG logos must convert first.
export const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
