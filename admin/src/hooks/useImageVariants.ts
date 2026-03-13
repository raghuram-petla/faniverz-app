'use client';
import { useState, useCallback, useEffect } from 'react';
import { getImageUrl, type ImageSize } from '@shared/imageUrl';
import { VARIANT_SPECS, type VariantType } from '@/lib/variant-config';

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

function buildVariants(originalUrl: string, variantType: VariantType): VariantInfo[] {
  const specs = VARIANT_SPECS[variantType];
  const sizes: ImageSize[] = ['original', 'sm', 'md', 'lg'];

  return sizes.map((size, i) => ({
    label: SIZE_LABELS[size],
    url: getImageUrl(originalUrl, size) ?? originalUrl,
    width: size === 'original' ? null : specs[i - 1].width,
    quality: size === 'original' ? null : specs[i - 1].quality,
    status: 'checking' as const,
  }));
}

export function useImageVariants(originalUrl: string | null, variantType: VariantType) {
  const [variants, setVariants] = useState<VariantInfo[]>([]);
  const [isChecking, setIsChecking] = useState(false);

  const checkAvailability = useCallback(
    async (url: string) => {
      const built = buildVariants(url, variantType);
      setVariants(built);
      setIsChecking(true);

      try {
        const res = await fetch('/api/image-check', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ urls: built.map((v) => v.url) }),
        });
        const data = await res.json();
        const statusMap = new Map<string, CheckStatus>(
          data.results?.map((r: { url: string; status: CheckStatus }) => [r.url, r.status]) ?? [],
        );

        setVariants((prev) => prev.map((v) => ({ ...v, status: statusMap.get(v.url) ?? 'error' })));
      } catch {
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
