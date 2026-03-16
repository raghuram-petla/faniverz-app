'use client';
import { useState, useCallback, useEffect } from 'react';
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

  const checkAvailability = useCallback(
    async (url: string) => {
      const built = buildVariants(url, variantType, bucket);
      setVariants(built);
      setIsChecking(true);

      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        const res = await fetch('/api/image-check', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({ urls: built.map((v) => v.url) }),
        });

        if (!res.ok) {
          const errBody = await res.json().catch(() => ({}));
          console.error('[useImageVariants] API error:', res.status, errBody);
          setVariants((prev) => prev.map((v) => ({ ...v, status: 'error' as const })));
          return;
        }

        const data = await res.json();
        const statusMap = new Map<string, CheckStatus>(
          data.results?.map((r: { url: string; status: CheckStatus }) => [r.url, r.status]) ?? [],
        );

        setVariants((prev) => prev.map((v) => ({ ...v, status: statusMap.get(v.url) ?? 'error' })));
      } catch {
        // @edge: network failure marks all variants as 'error' rather than leaving them 'checking'
        setVariants((prev) => prev.map((v) => ({ ...v, status: 'error' as const })));
      } finally {
        setIsChecking(false);
      }
    },
    [variantType],
  );

  useEffect(() => {
    if (originalUrl) {
      void checkAvailability(originalUrl);
    } else {
      setVariants([]);
    }
  }, [originalUrl, checkAvailability]);

  const recheck = useCallback(() => {
    if (originalUrl) void checkAvailability(originalUrl);
  }, [originalUrl, checkAvailability]);

  const readyCount = variants.filter((v) => v.status === 'ok').length;
  const totalCount = variants.length;

  return { variants, isChecking, readyCount, totalCount, recheck };
}
