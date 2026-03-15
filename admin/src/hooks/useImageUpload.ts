'use client';
import { useState } from 'react';
import { MAX_FILE_SIZE } from '@/lib/upload-config';
import { supabase } from '@/lib/supabase-browser';

/** Standalone upload utility for non-hook contexts (e.g. createMovieEditHandlers) */
// @boundary: POSTs FormData to the given API endpoint with auth token; expects { url } response
// @invariant: file size must be <= MAX_FILE_SIZE (5 MB) — validated before upload
// @edge: server may return 200 without a url field — treated as an error
export async function uploadImage(file: File, endpoint: string): Promise<string> {
  if (file.size > MAX_FILE_SIZE) {
    throw new Error('File too large. Maximum size is 5 MB.');
  }
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const body = new FormData();
  body.append('file', file);
  const headers: Record<string, string> = {};
  if (session?.access_token) {
    headers['Authorization'] = `Bearer ${session.access_token}`;
  }
  const res = await fetch(endpoint, { method: 'POST', body, headers });
  const data = (await res.json()) as { url?: string; error?: string };
  if (!res.ok) throw new Error(data.error ?? 'Upload failed');
  if (!data.url) throw new Error('Upload succeeded but no URL returned');
  return data.url;
}

/** React hook wrapping uploadImage with uploading state */
// @contract: uploading is true only during the fetch; always resets via finally
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
