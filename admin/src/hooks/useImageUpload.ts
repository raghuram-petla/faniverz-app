'use client';
import { useState } from 'react';
import { MAX_FILE_SIZE } from '@/lib/upload-config';

/** Standalone upload utility for non-hook contexts (e.g. createMovieEditHandlers) */
export async function uploadImage(file: File, endpoint: string): Promise<string> {
  if (file.size > MAX_FILE_SIZE) {
    throw new Error('File too large. Maximum size is 5 MB.');
  }
  const body = new FormData();
  body.append('file', file);
  const res = await fetch(endpoint, { method: 'POST', body });
  const data = (await res.json()) as { url?: string; error?: string };
  if (!res.ok) throw new Error(data.error ?? 'Upload failed');
  return data.url!;
}

/** React hook wrapping uploadImage with uploading state */
export function useImageUpload(endpoint: string) {
  const [uploading, setUploading] = useState(false);

  async function upload(file: File): Promise<string> {
    setUploading(true);
    try {
      return await uploadImage(file, endpoint);
    } finally {
      setUploading(false);
    }
  }

  return { upload, uploading };
}
