'use client';
import { useState, useCallback, useEffect, useRef } from 'react';
import { getImageUrl, type ImageSize, type ImageBucket } from '@shared/imageUrl';
import { VARIANT_SPECS, type VariantType } from '@/lib/variant-config';
import { supabase } from '@/lib/supabase-browser';

export interface VariantInfo {
  label: string;
  url: string;
  width: number | null;
  quality: number | null;
  status: 'checking' | 'ok' | 'missing' | 'error';
}

type CheckStatus = 'ok' | 'missing' | 'error';

const SIZE_LABELS: Record<string, string> = {
  original: 'Original',
  sm: 'SM',
  md: 'MD',
  lg: 'LG',
};

// @contract: always returns exactly 4 variants (original, sm, md, lg) with initial status 'checking'
// @assumes: specs array has at least 3 entries (sm, md, lg); original is index 0 so specs[i-1] is safe for i>=1
function buildVariants(
  originalUrl: string,
  variantType: VariantType,
  bucket: ImageBucket,
): VariantInfo[] {
  const specs = VARIANT_SPECS[variantType];
  const sizes: ImageSize[] = ['original', 'sm', 'md', 'lg'];

  return sizes.map((size, i) => ({
    label: SIZE_LABELS[size],
    url: getImageUrl(originalUrl, size, bucket) ?? originalUrl,
    width: size === 'original' ? null : specs[i - 1].width,
    quality: size === 'original' ? null : specs[i - 1].quality,
    status: 'checking' as const,
  }));
}

// @boundary: POSTs to /api/image-check to verify variant availability via HEAD requests
// @nullable: originalUrl — when null, variants are cleared and no check is performed
// @sideeffect: fires network request on mount and whenever originalUrl/variantType changes
export function useImageVariants(
  originalUrl: string | null,
  variantType: VariantType,
  bucket: ImageBucket,
) {
  const [variants, setVariants] = useState<VariantInfo[]>([]);
  const [isChecking, setIsChecking] = useState(false);

  // @contract: accepts a cancelled ref so callers can abort stale async calls on cleanup
  const checkAvailability = useCallback(
    async (url: string, cancelledRef?: { current: boolean }) => {
      const built = buildVariants(url, variantType, bucket);
      /* v8 ignore start */
      if (cancelledRef?.current) return;
      /* v8 ignore stop */
      setVariants(built);

      // @edge skip API call if URLs couldn't be resolved (bare relative keys without base URL)
      if (built.some((v) => !v.url.startsWith('http'))) {
        if (!cancelledRef?.current) {
          setVariants((prev) => prev.map((v) => ({ ...v, status: 'error' as const })));
        }
        return;
      }

      if (!cancelledRef?.current) setIsChecking(true);

      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        // @edge: skip check if session expired — avoids sending "Bearer undefined"
        if (!session?.access_token) {
          setIsChecking(false);
          return;
        }
        if (cancelledRef?.current) return;
        const res = await fetch('/api/image-check', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ urls: built.map((v) => v.url) }),
        });

        if (cancelledRef?.current) return;

        if (!res.ok) {
          const errBody = await res.json().catch(() => ({}));
          console.error('[useImageVariants] API error:', res.status, errBody);
          if (!cancelledRef?.current) {
            setVariants((prev) => prev.map((v) => ({ ...v, status: 'error' as const })));
          }
          return;
        }

        const data = await res.json();
        if (cancelledRef?.current) return;

        const statusMap = new Map<string, CheckStatus>(
          data.results?.map((r: { url: string; status: CheckStatus }) => [r.url, r.status]) ?? [],
        );

        setVariants((prev) => prev.map((v) => ({ ...v, status: statusMap.get(v.url) ?? 'error' })));
      } catch {
        // @edge: network failure marks all variants as 'error' rather than leaving them 'checking'
        if (!cancelledRef?.current) {
          setVariants((prev) => prev.map((v) => ({ ...v, status: 'error' as const })));
        }
      } finally {
        if (!cancelledRef?.current) setIsChecking(false);
      }
    },
    [variantType, bucket],
  );

  // @sync: cancelled flag prevents stale async results from overwriting state when originalUrl
  // changes (e.g. admin quickly switching between images in the poster gallery)
  useEffect(() => {
    if (!originalUrl) {
      setVariants([]);
      setIsChecking(false);
      return;
    }
    const cancelledRef = { current: false };
    void checkAvailability(originalUrl, cancelledRef);
    return () => {
      cancelledRef.current = true;
    };
  }, [originalUrl, checkAvailability]);

  // @sync: recheck cancels previous in-flight recheck so rapid clicks don't race
  const recheckRef = useRef<{ current: boolean }>({ current: false });
  const recheck = useCallback(() => {
    recheckRef.current.current = true; // cancel previous recheck
    const ref = { current: false };
    recheckRef.current = ref; // track the new one
    if (originalUrl) void checkAvailability(originalUrl, ref);
  }, [originalUrl, checkAvailability]);

  const readyCount = variants.filter((v) => v.status === 'ok').length;
  const totalCount = variants.length;

  return { variants, isChecking, readyCount, totalCount, recheck };
}
