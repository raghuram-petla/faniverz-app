/** Centralized upload validation constants. Used by both upload-handler.ts and useImageUpload.ts. */

export const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
export const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
export const MAX_FILE_SIZE_LABEL = '5 MB';
