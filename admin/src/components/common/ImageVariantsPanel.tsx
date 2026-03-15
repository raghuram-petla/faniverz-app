'use client';
import { useState } from 'react';
import { ChevronDown, ChevronRight, Copy, Check, RefreshCw, Loader2 } from 'lucide-react';
import { useImageVariants, type VariantInfo } from '@/hooks/useImageVariants';
import type { VariantType } from '@/lib/variant-config';

// @contract collapsible panel that checks CDN variant availability for a given original image
export interface ImageVariantsPanelProps {
  // @nullable null means no image uploaded yet — component renders nothing
  originalUrl: string | null;
  variantType: VariantType;
}

function StatusDot({ status }: { status: VariantInfo['status'] }) {
  if (status === 'checking') {
    return <Loader2 className="w-3 h-3 text-on-surface-muted animate-spin" />;
  }
  if (status === 'ok') {
    return <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />;
  }
  if (status === 'missing') {
    return <span className="w-2 h-2 rounded-full bg-red-500 inline-block" />;
  }
  return <span className="w-2 h-2 rounded-full bg-yellow-500 inline-block" />;
}

function SummaryDot({
  readyCount,
  totalCount,
  isChecking,
}: {
  readyCount: number;
  totalCount: number;
  isChecking: boolean;
}) {
  if (isChecking) return <Loader2 className="w-3 h-3 text-on-surface-muted animate-spin" />;
  if (readyCount === totalCount)
    return <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />;
  if (readyCount > 0) return <span className="w-2 h-2 rounded-full bg-yellow-500 inline-block" />;
  return <span className="w-2 h-2 rounded-full bg-red-500 inline-block" />;
}

function CopyButton({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);

  // @sideeffect writes to system clipboard; resets copied state after 1.5s
  async function handleCopy() {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="p-1 rounded hover:bg-surface-elevated text-on-surface-muted hover:text-on-surface transition-colors"
      title="Copy URL"
    >
      {copied ? <Check className="w-3 h-3 text-status-green" /> : <Copy className="w-3 h-3" />}
    </button>
  );
}

const LABEL_COLORS: Record<string, string> = {
  Original: 'bg-blue-600/20 text-status-blue',
  SM: 'bg-emerald-600/20 text-emerald-400',
  MD: 'bg-purple-600/20 text-status-purple',
  LG: 'bg-orange-600/20 text-status-orange',
};

function VariantRow({ variant, thumbnailUrl }: { variant: VariantInfo; thumbnailUrl: string }) {
  // @nullable variant.width — null means original (unresized) image
  const specs = variant.width ? `${variant.width}px @ q${variant.quality}` : 'Full size';

  return (
    <div className="flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-surface-elevated">
      <img
        src={thumbnailUrl}
        alt={variant.label}
        className="h-12 w-auto rounded bg-surface-elevated flex-shrink-0"
      />
      <span
        className={`text-xs font-medium px-2 py-0.5 rounded ${LABEL_COLORS[variant.label] ?? 'bg-surface-elevated text-on-surface-muted'}`}
      >
        {variant.label}
      </span>
      <span className="text-xs text-on-surface-muted w-24 flex-shrink-0">{specs}</span>
      <StatusDot status={variant.status} />
      <span className="text-xs text-on-surface-subtle truncate flex-1 min-w-0">{variant.url}</span>
      <CopyButton url={variant.url} />
    </div>
  );
}

export function ImageVariantsPanel({ originalUrl, variantType }: ImageVariantsPanelProps) {
  const [open, setOpen] = useState(false);
  const { variants, isChecking, readyCount, totalCount, recheck } = useImageVariants(
    originalUrl,
    variantType,
  );

  // @edge no image uploaded — render nothing
  if (!originalUrl) return null;

  const summaryText = isChecking
    ? 'Checking variants...'
    : `${readyCount}/${totalCount} variants ready`;

  // @edge fallback to first variant if SM doesn't exist
  const thumbnailUrl = variants.find((v) => v.label === 'SM')?.url ?? variants[0]?.url;

  return (
    <div className="mt-2 border border-outline-subtle rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-2 px-3 py-2 text-xs text-on-surface-muted hover:bg-surface-elevated transition-colors"
      >
        {open ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
        <SummaryDot readyCount={readyCount} totalCount={totalCount} isChecking={isChecking} />
        <span>Image Pipeline: {summaryText}</span>
      </button>

      {open && (
        <div className="border-t border-outline-subtle px-1 py-1 space-y-0.5">
          {variants.map((v) => (
            <VariantRow key={v.label} variant={v} thumbnailUrl={thumbnailUrl} />
          ))}
          <div className="flex justify-end px-2 py-1">
            <button
              type="button"
              onClick={recheck}
              disabled={isChecking}
              className="flex items-center gap-1.5 text-xs text-on-surface-muted hover:text-on-surface disabled:opacity-50 px-2 py-1 rounded hover:bg-surface-elevated transition-colors"
            >
              <RefreshCw className={`w-3 h-3 ${isChecking ? 'animate-spin' : ''}`} />
              Recheck
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
